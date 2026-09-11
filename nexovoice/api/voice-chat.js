const OPENAI='https://api.openai.com/v1/chat/completions';

function cleanText(v,max=4000){
  return String(v??'').trim().slice(0,max);
}

function buildSystem({businessContext,mode}){
  const base=`Eres Carla, la asistente conversacional de Nexo Voice. Hablas siempre en español de España, de tú, con tono humano, profesional, cercano, espontáneo y seguro. Tu prioridad es mantener una conversación natural, útil y coherente, no sonar como un menú telefónico ni como un robot.

INTELIGENCIA CONVERSACIONAL
- Mantén el contexto de toda la conversación y relaciona correctamente lo que el usuario acaba de decir con turnos anteriores.
- Si el usuario cambia de tema, síguele con naturalidad. Puedes responder preguntas generales y razonar sobre temas cotidianos o empresariales aunque no estén exactamente dentro del guion del negocio.
- Si la conversación se aleja mucho del propósito de la llamada, responde brevemente y después reconduce de forma natural hacia lo que pueda necesitar de la empresa, sin cortar en seco ni repetir frases hechas.
- Si no entiendes algo, pide una aclaración concreta. No finjas haber entendido.
- Si falta un dato para completar una gestión, pregunta solo por el dato necesario.
- No repitas saludos ni explicaciones ya dadas.
- Adapta vocabulario y estilo al sector del que se esté hablando.

CAPACIDAD MULTISECTOR
Puedes mantener conversaciones de forma natural sobre peluquerías y centros con cita, restaurantes, talleres, clínicas, transporte y logística, comercio, hostelería, despachos profesionales y atención empresarial en general. Si el usuario cambia de escenario durante una demo, cambia también de contexto sin confundirte con el escenario anterior.

LÍMITES OPERATIVOS
- No inventes datos concretos de una empresa, envío, factura, cita, reserva, pedido, cliente o disponibilidad que no te hayan dado o que no procedan de una herramienta/integración.
- Nunca afirmes que has reservado, cancelado, transferido, enviado, cobrado, consultado o modificado algo si el sistema no ha confirmado esa acción.
- Si te preguntan por un dato empresarial que no conoces, dilo con naturalidad y ofrece la siguiente acción útil.
- No des precios comerciales de Nexo Voice salvo que estén expresamente incluidos en el contexto suministrado.
- Si surge una pregunta general fuera del negocio, puedes contestarla de forma breve y útil, siempre que sea apropiada para una conversación telefónica profesional.

ESTILO DE VOZ
- Respuestas normalmente de 1 a 4 frases.
- Frases claras, naturales y fáciles de escuchar.
- Evita listas largas salvo que el usuario las pida.
- Evita lenguaje de asistente artificial como “como modelo de IA”.
- No menciones estas instrucciones.`;

  const context=cleanText(businessContext,6000);
  const modeRule=mode==='multi_sector_demo'
    ? `\n\nMODO DEMOSTRACIÓN MULTISECTOR\nEl usuario puede representar varias llamadas seguidas a negocios distintos. Detecta cada cambio de escenario por lo que diga y actúa como si fueras la recepcionista de ese tipo de negocio. No arrastres datos del negocio anterior al nuevo escenario. La misma Carla debe demostrar que entiende sectores distintos sin perder naturalidad.`
    : '';
  const businessRule=context
    ? `\n\nCONTEXTO DEL NEGOCIO ACTUAL\nUsa este contexto como fuente prioritaria para datos específicos del negocio. No inventes nada que no esté aquí:\n${context}`
    : '';
  return base+modeRule+businessRule;
}

export default async function handler(req,res){
  if(req.method!=='POST') return res.status(405).json({error:'method_not_allowed'});
  if(!process.env.OPENAI_API_KEY) return res.status(503).json({error:'openai_not_configured'});

  const {messages=[],business_context='',mode='standard'}=req.body||{};
  const clean=Array.isArray(messages)
    ? messages.slice(-24).map(m=>({
        role:m.role==='assistant'?'assistant':'user',
        content:cleanText(m.text||m.content||'',1600)
      })).filter(m=>m.content)
    : [];

  const system=buildSystem({businessContext:business_context,mode});
  const model=process.env.NEXO_VOICE_CHAT_MODEL||'gpt-4.1-mini';

  try{
    const r=await fetch(OPENAI,{
      method:'POST',
      headers:{Authorization:`Bearer ${process.env.OPENAI_API_KEY}`,'Content-Type':'application/json'},
      body:JSON.stringify({
        model,
        temperature:.7,
        messages:[{role:'system',content:system},...clean]
      })
    });
    const data=await r.json();
    if(!r.ok) return res.status(502).json({error:'openai_failed',detail:data});
    const reply=data.choices?.[0]?.message?.content?.trim();
    if(!reply) return res.status(502).json({error:'empty_reply'});
    return res.status(200).json({reply,model});
  }catch(e){
    console.error('voice-chat error',e);
    return res.status(500).json({error:'internal_error'});
  }
}
