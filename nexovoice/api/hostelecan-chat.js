const OPENAI='https://api.openai.com/v1/chat/completions';
const INTAKE='https://jrsknjeuwwyucefcsckq.supabase.co/functions/v1/nexo-intake';
const TOOLS=[
 {type:'function',function:{name:'buscar_producto_hostelecan',description:'Busca productos reales del catálogo de Hostelecan por tipo, marca, modelo, medidas o características. Nunca uses esta herramienta para comunicar precios.',parameters:{type:'object',properties:{query:{type:'string'}},required:['query']}}},
 {type:'function',function:{name:'crear_recado_hostelecan',description:'Guarda un recado real en el panel de Hostelecan cuando el cliente necesita seguimiento humano.',parameters:{type:'object',properties:{department:{type:'string',enum:['Servicio técnico','Administración','Comercial','Consultas generales']},recipient:{type:'string'},caller_name:{type:'string'},caller_phone:{type:'string'},caller_company:{type:'string'},subject:{type:'string'},details:{type:'string'},reference_number:{type:'string'},urgency:{type:'string',enum:['low','normal','high','urgent']}},required:['department','details']}}}
];
function stripPrices(v){if(Array.isArray(v))return v.map(stripPrices);if(v&&typeof v==='object'){const o={};for(const [k,val] of Object.entries(v)){if(/price|precio|importe|cost|coste/i.test(k))continue;o[k]=stripPrices(val)}return o}return v}
async function runTool(req,name,args){
 if(name==='buscar_producto_hostelecan'){
   const host=req.headers.host;const proto=(req.headers['x-forwarded-proto']||'https').split(',')[0];
   const r=await fetch(`${proto}://${host}/api/hostelecan-products?q=${encodeURIComponent(String(args?.query||''))}`,{headers:{Accept:'application/json'}});const d=await r.json();if(!r.ok)throw new Error(d?.error||'catalog_error');return stripPrices(d);
 }
 if(name==='crear_recado_hostelecan'){
   const r=await fetch(INTAKE,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({business_id:'hostelecan',department:args?.department,recipient:args?.recipient||null,caller_name:args?.caller_name||null,caller_phone:args?.caller_phone||null,caller_company:args?.caller_company||null,subject:args?.subject||null,details:args?.details,reference_number:args?.reference_number||null,urgency:args?.urgency||'normal'})});const d=await r.json();if(!r.ok)throw new Error(d?.error||'message_error');return {saved:true,department:args?.department,recipient:args?.recipient||null};
 }
 throw new Error('unknown_tool');
}
const SYSTEM=`Eres Alejandra, la asistente virtual inteligente de Hostelecan, una empresa de maquinaria y equipamiento profesional para hostelería con presencia en Valencia e Ibiza y envíos a toda España. Hablas como una persona del equipo: natural, cercana, resolutiva y profesional, en español de España.

MEMORIA Y CONVERSACIÓN: recuerda toda la conversación. Nunca vuelvas a pedir un dato que el cliente ya haya dado. Si dice “ese”, “el otro”, “la factura”, “la máquina”, “lo de antes” o una referencia similar, resuelve usando el contexto. Si algo se entiende por contexto, no digas “no te entiendo”. Si falta un dato realmente imprescindible, pide solo ese dato. No reinicies la llamada ni vuelvas a presentarte.

INTELIGENCIA GENERAL: puedes mantener una conversación general y razonar con normalidad. Si preguntan algo que exige información actual no conectada, dilo brevemente en lugar de inventarlo. Prioriza siempre ayudar.

EQUIPO: Paco lleva servicio técnico. Cristina y Vero llevan administración. Tele y Carlos son comerciales. Si necesitan seguimiento humano, recoge solo los datos imprescindibles y usa crear_recado_hostelecan. Después de guardar el recado, confirma de forma humana y breve; no digas ticket, sistema o confirmado.

CATÁLOGO: para productos, modelos, medidas o disponibilidad usa buscar_producto_hostelecan cuando haga falta. Nunca inventes stock físico. Si la herramienta indica disponibilidad publicada, di que parece disponible pero que prefieres confirmarlo antes de asegurarlo.

PRECIOS: regla absoluta: NO des precios, importes, tarifas, descuentos ni presupuestos. Si preguntan precio, di que Tele o Carlos se lo confirman y ofrece dejar el aviso.

FACTURAS: si quieren localizar o reenviar una factura, no exijas número de factura. Puedes identificarla por empresa o nombre fiscal, CIF/DNI, periodo aproximado, importe aproximado u otro dato que el cliente sí conozca.

HORARIO: tienda de nueve a dos y de cuatro a ocho; Nexo Voice atiende veinticuatro horas. Teléfono público: seis tres siete, ocho siete, siete siete, nueve dos.

ESTILO DE VOZ: respuestas cortas por defecto, normalmente una o dos frases. No recites listas. No repitas la pregunta. No uses “perfecto”, “vale” o “claro” en cada turno. No suenes a guion ni a locución. Si el cliente cambia de tema, síguelo sin perder los asuntos anteriores.`;
export default async function handler(req,res){
 if(req.method!=='POST')return res.status(405).json({error:'method_not_allowed'});if(!process.env.OPENAI_API_KEY)return res.status(503).json({error:'openai_not_configured'});
 const {messages=[]}=req.body||{};const clean=(Array.isArray(messages)?messages:[]).slice(-24).map(m=>({role:m.role==='assistant'?'assistant':'user',content:String(m.text||m.content||'').slice(0,900)}));
 try{
  let r=await fetch(OPENAI,{method:'POST',headers:{Authorization:`Bearer ${process.env.OPENAI_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({model:'gpt-4.1-mini',temperature:.3,max_tokens:220,messages:[{role:'system',content:SYSTEM},...clean],tools:TOOLS,tool_choice:'auto'})});let d=await r.json();if(!r.ok)return res.status(502).json({error:'openai_failed',detail:d});let msg=d.choices?.[0]?.message;if(!msg)return res.status(502).json({error:'empty_reply'});
  if(msg.tool_calls?.length){const chain=[{role:'system',content:SYSTEM},...clean,msg];for(const tc of msg.tool_calls){let args={};try{args=JSON.parse(tc.function?.arguments||'{}')}catch{}let out;try{out=await runTool(req,tc.function?.name,args)}catch(e){out={error:e.message||String(e)}}chain.push({role:'tool',tool_call_id:tc.id,content:JSON.stringify(out)})}r=await fetch(OPENAI,{method:'POST',headers:{Authorization:`Bearer ${process.env.OPENAI_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({model:'gpt-4.1-mini',temperature:.25,max_tokens:220,messages:chain})});d=await r.json();if(!r.ok)return res.status(502).json({error:'openai_followup_failed'});msg=d.choices?.[0]?.message}
  let reply=String(msg?.content||'').trim();if(!reply)reply='Te sigo. Dime qué necesitas y lo vemos.';return res.status(200).json({reply});
 }catch(e){console.error('hostelecan-chat',e);return res.status(500).json({error:'internal_error'})}
}
