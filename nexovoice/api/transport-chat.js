const OPENAI='https://api.openai.com/v1/chat/completions';
const SHIPMENTS=['581742','936105','274869'];
const FINAL="Gracias a ti. Soy Carla, asistente de voz de Nexo Voice. Puedo atender llamadas, resolver consultas, consultar pedidos o expediciones, gestionar citas, recoger avisos, derivar llamadas y adaptarme a la información y procesos de prácticamente cualquier negocio. Si quieres ver cómo funcionaría en tu empresa, podemos prepararte una demo adaptada a tu caso.";
function fold(s){return String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9@.]+/g,' ').trim()}
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
    [/14:35/g,'a las dos y treinta y cinco de la tarde'],[/18:10/g,'a las seis y diez de la tarde'],[/21:20/g,'a las nueve y veinte de la noche'],
    [/581742/g,'cinco ocho uno siete cuatro dos'],[/936105/g,'nueve tres seis uno cero cinco'],[/274869/g,'dos siete cuatro ocho seis nueve']
  ];
  for(const [a,b] of repl) out=out.replace(a,b);
  return out;
}
function shouldClose(messages){
  const all=(Array.isArray(messages)?messages:[]).map(m=>String(m.text||m.content||'')).join(' ');
  const ids=SHIPMENTS.filter(id=>all.replace(/\D/g,'').includes(id) || fold(all).includes(id));
  const last=fold((messages||[]).slice(-1)[0]?.text||(messages||[]).slice(-1)[0]?.content||'');
  return ids.length>=2 && /(gracias|muchas gracias|perfecto|hasta luego|adios|eso es todo)/.test(last);
}
function lastUser(messages){for(let i=(messages||[]).length-1;i>=0;i--){if((messages[i]?.role||'user')!=='assistant')return String(messages[i]?.text||messages[i]?.content||'')}return ''}
function contextShipment(messages){for(let i=(messages||[]).length-1;i>=0;i--){const id=canonicalShipment(messages[i]?.text||messages[i]?.content||'');if(id)return id}return null}
function fastReply(messages){
  const raw=lastUser(messages), t=fold(raw), direct=canonicalShipment(raw), ctx=direct||contextShipment((messages||[]).slice(0,-1));
  if(shouldClose(messages)) return {reply:FINAL,end_demo:true};
  if(direct==='581742') return {reply:'Sí, lo tengo. Está en reparto en Valencia y no consta ninguna incidencia.'};
  if(direct==='936105') return {reply:'Sí, lo tengo. Sigue en tránsito hacia Málaga y no consta ninguna incidencia.'};
  if(direct==='274869') return {reply:'Sí, ya está en la delegación de destino de Sevilla.'};
  if(/(cuando|cuando llega|cuando puede llegar|hora|entrega)/.test(t) && ctx==='581742') return {reply:'Está previsto para hoy, entre las cuatro y las siete de la tarde.'};
  if(/(llam|avis)/.test(t) && /(antes|entrega)/.test(t)) return {reply:'Sí, puedo dejar anotada la solicitud para que te llamen antes de entregar, pendiente de confirmación de la agencia.'};
  if(/(tard|retras|pasado algo|incidencia|problema)/.test(t) && ctx==='936105') return {reply:'No consta ninguna incidencia. El último movimiento fue en Córdoba a las seis y diez de la tarde y sigue en tránsito.'};
  if(/(correo|email|e mail)/.test(t) && !/@/.test(raw)) return {reply:'Claro. Dime el correo y te dejo preparada la información.'};
  if(/@/.test(raw)) return {reply:'Perfecto, dejo preparada la información para que te la envíen por correo.'};
  if(/(bulto|paquete)/.test(t) && ctx==='274869') return {reply:'Sí, son tres bultos.'};
  if(/(bulto|paquete)/.test(t) && ctx==='581742') return {reply:'Sí, son dos bultos.'};
  if(/(bulto|paquete)/.test(t) && ctx==='936105') return {reply:'Es un solo bulto.'};
  if(!ctx && /(envio|expedicion|pedido|paquete)/.test(t)) return {reply:'Claro. Dime el número de expedición y lo consulto.'};
  return null;
}
export default async function handler(req,res){
  if(req.method!=='POST') return res.status(405).json({error:'method_not_allowed'});
  if(!process.env.OPENAI_API_KEY) return res.status(503).json({error:'openai_not_configured'});
  const {messages=[]}=req.body||{};
  const instant=fastReply(messages); if(instant) return res.status(200).json(instant);
  const clean=Array.isArray(messages)?messages.slice(-10).map(m=>{
    const role=m.role==='assistant'?'assistant':'user';
    let content=String(m.text||m.content||'').slice(0,420);
    if(role==='user'){const id=canonicalShipment(content);if(id) content += `\n[EXPEDICIÓN RECONOCIDA: ${id}]`;}
    return {role,content};
  }):[];
  const system=`Habla siempre en español de España. Te llamas Alejandra durante esta demostración y eres la asistente telefónica virtual de Transportes Nexo. Habla natural, cercana, profesional y muy breve. Responde en una sola frase siempre que sea posible.
EXPEDICIONES: 581742 Valencia, en reparto, hoy entre las cuatro y las siete de la tarde, dos bultos, sin incidencia. 936105 Málaga, en tránsito, mañana entre las cuatro y las ocho de la tarde, un bulto, último movimiento Córdoba a las seis y diez de la tarde, sin incidencia. 274869 Sevilla, en delegación de destino, mañana entre las nueve de la mañana y las dos de la tarde, tres bultos, sin incidencia.
Nunca escribas horas con cifras ni leas expediciones como números grandes. Mantén el contexto, no inventes incidencias, causas, GPS, conductor ni hora exacta. No des precios.`;
  try{
    const r=await fetch(OPENAI,{method:'POST',headers:{Authorization:`Bearer ${process.env.OPENAI_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({model:'gpt-4.1-nano',temperature:.2,max_tokens:60,messages:[{role:'system',content:system},...clean]})});
    const data=await r.json();
    if(!r.ok) return res.status(502).json({error:'openai_failed',detail:data});
    const reply=naturalizeNumbers(data.choices?.[0]?.message?.content?.trim());
    if(!reply) return res.status(502).json({error:'empty_reply'});
    return res.status(200).json({reply});
  }catch(e){console.error('transport-chat error',e);return res.status(500).json({error:'internal_error'});}
}
