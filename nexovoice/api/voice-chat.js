const OPENAI='https://api.openai.com/v1/chat/completions';
export default async function handler(req,res){
  if(req.method!=='POST') return res.status(405).json({error:'method_not_allowed'});
  if(!process.env.OPENAI_API_KEY) return res.status(503).json({error:'openai_not_configured'});
  const {messages=[]}=req.body||{};
  const clean=Array.isArray(messages)?messages.slice(-14).map(m=>({role:m.role==='assistant'?'assistant':'user',content:String(m.text||m.content||'').slice(0,900)})):[];
  const system=`Eres Nexo Voice, un asistente telefónico empresarial español. Esta demo sirve para evaluar tu inteligencia y naturalidad con dos voces distintas. Habla siempre en español de España, de tú, con tono humano, profesional, cercano y espontáneo. Mantén el contexto de la conversación, recuerda lo que te han dicho y responde exactamente a lo que te preguntan. No repitas saludos en cada turno. Haz preguntas útiles cuando falte información. Puedes conversar sobre atención al cliente, reservas, citas, incidencias, pedidos, facturas, horarios, logística, llamadas, mensajes, soporte y cómo Nexo Voice se adaptaría a una empresa. Si te plantean una situación general, razona y responde con naturalidad. No inventes datos concretos de una empresa, envío, factura o cita. No des precios comerciales de Nexo Voice; indica que se prepara una propuesta según necesidades. Respuestas pensadas para voz: breves, naturales, normalmente 1 a 3 frases.`;
  try{
    const r=await fetch(OPENAI,{method:'POST',headers:{Authorization:`Bearer ${process.env.OPENAI_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({model:'gpt-4.1-mini',temperature:.65,messages:[{role:'system',content:system},...clean]})});
    const data=await r.json();
    if(!r.ok) return res.status(502).json({error:'openai_failed',detail:data});
    const reply=data.choices?.[0]?.message?.content?.trim();
    if(!reply) return res.status(502).json({error:'empty_reply'});
    return res.status(200).json({reply});
  }catch(e){console.error('voice-chat error',e);return res.status(500).json({error:'internal_error'});}
}
