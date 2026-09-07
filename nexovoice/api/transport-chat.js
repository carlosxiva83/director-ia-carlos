const OPENAI='https://api.openai.com/v1/chat/completions';
const SHIPMENTS=['581742','936105','274869'];
const FINAL="Gracias a ti. Soy Carla, asistente de voz de Nexo Voice. Puedo atender llamadas, resolver consultas, consultar pedidos o expediciones, gestionar citas, recoger avisos, derivar llamadas y adaptarme a la información y procesos de prácticamente cualquier negocio. Si quieres ver cómo funcionaría en tu empresa, podemos prepararte una demo adaptada a tu caso.";
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
function naturalizeNumbers(text){
  let out=String(text||'');
  const repl=[
    [/16:00\s*[–-]\s*19:00/g,'entre las cuatro y las siete de la tarde'],
    [/16:00\s*[–-]\s*20:00/g,'entre las cuatro y las ocho de la tarde'],
    [/09:00\s*[–-]\s*14:00/g,'entre las nueve de la mañana y las dos de la tarde'],
    [/14:35/g,'a las dos y treinta y cinco de la tarde'],
    [/18:10/g,'a las seis y diez de la tarde'],
    [/21:20/g,'a las nueve y veinte de la noche'],
    [/16:00/g,'a las cuatro de la tarde'],[/19:00/g,'a las siete de la tarde'],[/20:00/g,'a las ocho de la tarde'],[/09:00/g,'a las nueve de la mañana'],[/14:00/g,'a las dos de la tarde'],
    [/581742/g,'cinco ocho uno siete cuatro dos'],[/936105/g,'nueve tres seis uno cero cinco'],[/274869/g,'dos siete cuatro ocho seis nueve']
  ];
  for(const [a,b] of repl) out=out.replace(a,b);
  return out;
}
function shouldClose(messages){
  const all=(Array.isArray(messages)?messages:[]).map(m=>String(m.text||m.content||'')).join(' ');
  const ids=SHIPMENTS.filter(id=>canonicalShipment(all)===id || all.replace(/\D/g,'').includes(id));
  const last=fold((messages||[]).slice(-1)[0]?.text||(messages||[]).slice(-1)[0]?.content||'');
  return ids.length>=2 && /(gracias|muchas gracias|perfecto|hasta luego|adios|eso es todo)/.test(last);
}
export default async function handler(req,res){
  if(req.method!=='POST') return res.status(405).json({error:'method_not_allowed'});
  if(!process.env.OPENAI_API_KEY) return res.status(503).json({error:'openai_not_configured'});
  const {messages=[]}=req.body||{};
  if(shouldClose(messages)) return res.status(200).json({reply:FINAL,end_demo:true});
  const clean=Array.isArray(messages)?messages.slice(-12).map(m=>{
    const role=m.role==='assistant'?'assistant':'user';
    let content=String(m.text||m.content||'').slice(0,500);
    if(role==='user'){
      const id=canonicalShipment(content);
      if(id) content += `\n[EXPEDICIÓN RECONOCIDA: ${id}]`;
    }
    return {role,content};
  }):[];
  const system=`Habla siempre en español de España. Te llamas Alejandra durante esta demostración y eres la asistente telefónica virtual de Transportes Nexo, empresa ficticia de una demo de Nexo Voice. Ya te has presentado al inicio: no vuelvas a presentarte salvo que te lo pregunten.

Habla natural, cercana, profesional y breve, como una empleada real. Entiende intención y contexto aunque el usuario no siga el guion literalmente. Responde en una sola frase siempre que sea posible.

EXPEDICIONES:
581742: Ana Martínez, Valencia, EN REPARTO, entrega hoy entre las cuatro y las siete de la tarde, 2 bultos, salida de Valencia a las dos y treinta y cinco de la tarde, sin incidencia.
936105: Javier Ruiz, Málaga, EN TRÁNSITO, entrega mañana entre las cuatro y las ocho de la tarde, 1 bulto, último movimiento en Córdoba a las seis y diez de la tarde, sin incidencia.
274869: Laura Sánchez, Sevilla, EN DELEGACIÓN DE DESTINO, entrega mañana entre las nueve de la mañana y las dos de la tarde, 3 bultos, llegada a Sevilla a las nueve y veinte de la noche, sin incidencia.

REGLAS IMPORTANTES DE VOZ:
- NUNCA escribas horas con cifras, dos puntos, guiones o rangos numéricos. Di siempre las horas con palabras naturales: por ejemplo, “entre las cuatro y las siete de la tarde”.
- NUNCA leas una expedición como un número grande. Si necesitas repetirla, di cada cifra por separado.
- Si aparece [EXPEDICIÓN RECONOCIDA: X], usa X como número correcto aunque la transcripción anterior sea rara.
- Si espera un envío, pide número si falta.
- Entiende los números aunque se digan cifra a cifra, separados o agrupados.
- Da solo el dato necesario, no toda la ficha.
- Para 936105, si pregunta por retraso: sigue en tránsito, último movimiento en Córdoba a las seis y diez de la tarde y no consta incidencia. No inventes causas.
- Si pide correo, pide email si falta; al recibirlo di que dejas preparada o solicitada la información, no que ya se envió.
- Cambios, llamada previa, dirección u horario: recoge solicitud y di que queda pendiente de confirmación.
- Bultos: Valencia 2, Málaga 1, Sevilla 3.
- Conductor, matrícula, GPS u hora exacta: dato no disponible.
- Número no localizado: pide revisarlo.
- No des precios.
- Mantén referencias como “ese”, “el de Málaga”, “el primero” o “el otro”.
- Si improvisa, síguele con naturalidad.`;
  try{
    const r=await fetch(OPENAI,{method:'POST',headers:{Authorization:`Bearer ${process.env.OPENAI_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({model:'gpt-4.1-nano',temperature:.25,max_tokens:80,messages:[{role:'system',content:system},...clean]})});
    const data=await r.json();
    if(!r.ok) return res.status(502).json({error:'openai_failed',detail:data});
    const reply=naturalizeNumbers(data.choices?.[0]?.message?.content?.trim());
    if(!reply) return res.status(502).json({error:'empty_reply'});
    return res.status(200).json({reply});
  }catch(e){console.error('transport-chat error',e);return res.status(500).json({error:'internal_error'});}
}
