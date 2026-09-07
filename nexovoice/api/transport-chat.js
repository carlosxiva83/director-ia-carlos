const OPENAI='https://api.openai.com/v1/chat/completions';
const SHIPMENTS=['581742','936105','274869'];
function fold(s){return String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim()}
function canonicalShipment(text){
  const raw=String(text||'');
  const digits=raw.replace(/\D/g,'');
  for(const id of SHIPMENTS){if(digits.includes(id))return id}
  const t=fold(raw);
  const aliases={
    '581742':['cinco ocho uno siete cuatro dos','quinientos ochenta y un mil setecientos cuarenta y dos','quinientos ochenta y uno setecientos cuarenta y dos','cincuenta y ocho diecisiete cuarenta y dos','cinco ochenta y uno siete cuarenta y dos'],
    '936105':['nueve tres seis uno cero cinco','novecientos treinta y seis mil ciento cinco','novecientos treinta y seis ciento cinco','noventa y tres sesenta y uno cero cinco','nueve treinta y seis uno cero cinco'],
    '274869':['dos siete cuatro ocho seis nueve','doscientos setenta y cuatro mil ochocientos sesenta y nueve','doscientos setenta y cuatro ochocientos sesenta y nueve','veintisiete cuarenta y ocho sesenta y nueve','dos setenta y cuatro ocho sesenta y nueve']
  };
  for(const [id,list] of Object.entries(aliases))if(list.some(a=>t.includes(a)))return id;
  return null;
}
export default async function handler(req,res){
  if(req.method!=='POST') return res.status(405).json({error:'method_not_allowed'});
  if(!process.env.OPENAI_API_KEY) return res.status(503).json({error:'openai_not_configured'});
  const {messages=[]}=req.body||{};
  const clean=Array.isArray(messages)?messages.slice(-12).map(m=>{
    const role=m.role==='assistant'?'assistant':'user';
    let content=String(m.text||m.content||'').slice(0,500);
    if(role==='user'){
      const id=canonicalShipment(content);
      if(id) content += `\n[EXPEDICIÓN RECONOCIDA: ${id}]`;
    }
    return {role,content};
  }):[];
  const system=`Habla siempre en español de España. Te llamas Alejandra y eres la asistente telefónica virtual de Transportes Nexo, empresa ficticia de una demo de Nexo Voice. Ya te has presentado al inicio: no vuelvas a presentarte salvo que te lo pregunten.

Habla natural, cercana, profesional y muy breve, como una empleada real. Entiende intención y contexto aunque el usuario no siga el guion literalmente. Responde en una sola frase siempre que sea posible y evita introducciones innecesarias.

EXPEDICIONES:
581742: Ana Martínez, Valencia, EN REPARTO, hoy 16:00–19:00, 2 bultos, salida Valencia 14:35, sin incidencia.
936105: Javier Ruiz, Málaga, EN TRÁNSITO, mañana 16:00–20:00, 1 bulto, último movimiento Córdoba 18:10, sin incidencia.
274869: Laura Sánchez, Sevilla, EN DELEGACIÓN DE DESTINO, mañana 09:00–14:00, 3 bultos, llegada Sevilla 21:20, sin incidencia.

REGLAS:
- Si aparece [EXPEDICIÓN RECONOCIDA: X], usa X como número correcto aunque la transcripción anterior sea rara.
- Si espera un envío, pide número si falta.
- Entiende los números aunque se digan cifra a cifra, separados o agrupados.
- Da solo el dato necesario, no toda la ficha.
- Para 936105, si pregunta por retraso: sigue en tránsito, último movimiento Córdoba 18:10, sin incidencia registrada. No inventes causas.
- Si pide correo, pide email si falta; al recibirlo di que dejas preparada/solicitada la información, no que ya se envió.
- Cambios, llamada previa, dirección u horario: recoge solicitud y di que queda pendiente de confirmación.
- Bultos: Valencia 2, Málaga 1, Sevilla 3.
- Conductor, matrícula, GPS u hora exacta: dato no disponible.
- Número no localizado: pide revisarlo.
- No des precios.
- Mantén referencias como “ese”, “el de Málaga”, “el primero” o “el otro”.
- Si improvisa, síguele con naturalidad.
- FINAL: si tras tratar varios envíos el usuario se despide con “gracias”, “muchas gracias”, “perfecto Alejandra” o equivalente, responde exactamente: “Gracias a ti. Esto es Nexo Voice: atiendo tus llamadas, entiendo a tus clientes, consulto información y mantengo el contexto de cada conversación. Mientras tu equipo trabaja, Nexo Voice se ocupa de las llamadas.”`;
  try{
    const r=await fetch(OPENAI,{method:'POST',headers:{Authorization:`Bearer ${process.env.OPENAI_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({model:'gpt-4.1-nano',temperature:.35,max_tokens:90,messages:[{role:'system',content:system},...clean]})});
    const data=await r.json();
    if(!r.ok) return res.status(502).json({error:'openai_failed',detail:data});
    const reply=data.choices?.[0]?.message?.content?.trim();
    if(!reply) return res.status(502).json({error:'empty_reply'});
    return res.status(200).json({reply});
  }catch(e){console.error('transport-chat error',e);return res.status(500).json({error:'internal_error'});}
}
