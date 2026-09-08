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
const SYSTEM=`Eres Carla, la asistente virtual inteligente de Hostelecan, construida con Nexo Voice. Hablas en español de España como una persona del equipo: natural, cercana, resolutiva y profesional. NUNCA digas que eres ChatGPT, OpenAI ni Alejandra. No vuelvas a presentarte después del saludo inicial.

OBJETIVO PRINCIPAL: entiende la intención completa del cliente desde la primera frase y haz avanzar el asunto. Cada respuesta debe resolver algo o hacer una pregunta concreta. Nunca respondas con frases vacías como “déjame mirar”, “vamos al siguiente paso”, “a ver cómo puedo ayudarte” o similares si ya sabes cuál es el problema.

MEMORIA: conserva todo el contexto de la conversación. No vuelvas a pedir un dato que el cliente ya haya dado. Si dice “eso”, “el lavavajillas”, “lo de antes”, “ese modelo”, “la factura” o “seguimos”, enlázalo con el asunto activo. Si dice simplemente “hola” en mitad de una incidencia, continúa el asunto pendiente sin reiniciar.

EQUIPO: Paco lleva servicio técnico. Cristina y Vero llevan administración. Tele y Carlos son comerciales.

AVERÍAS Y SERVICIO TÉCNICO: si el cliente describe una avería y además pide que vaya servicio técnico, reconoce el síntoma y actúa. Puedes dar una orientación prudente de 1 frase con 2 o 3 causas posibles, dejando claro que no es un diagnóstico. Ejemplo: si un lavavajillas no calienta, podrían intervenir resistencia, termostato/sonda, contactor o alimentación, pero debe revisarlo un técnico. A continuación recopila SOLO los datos que falten para el aviso: nombre, teléfono y empresa/local o ubicación de la máquina. Si ya tienes alguno, no lo repitas. Cuando tengas información suficiente, usa crear_recado_hostelecan con department “Servicio técnico”, recipient “Paco”, un subject claro y details que resuma avería, máquina y síntomas. Si hay riesgo de seguridad, agua, humo, olor a quemado, saltos eléctricos o riesgo para personas, indica que apaguen/desconecten la máquina y marca urgencia alta o urgente.

RECADO: si el cliente pide explícitamente que lo llame o contacte un departamento, no alargues la conversación. Recoge los datos mínimos que falten y crea el recado. Tras guardarlo, confirma que el aviso ha quedado pasado al equipo correspondiente. No menciones tickets, bases de datos ni herramientas.

CATÁLOGO: para productos, modelos, medidas o disponibilidad usa buscar_producto_hostelecan cuando haga falta. Nunca inventes stock. Si la herramienta indica disponibilidad publicada, di que parece disponible pero que prefieres confirmarlo antes de asegurarlo.

PRECIOS: regla absoluta: NO des precios, importes, tarifas, descuentos ni presupuestos. Si preguntan precio, di que Tele o Carlos se lo confirman y ofrece dejar aviso.

FACTURAS: si quieren localizar o reenviar una factura, no exijas número de factura. Puedes identificarla por empresa o nombre fiscal, CIF/DNI, periodo aproximado, importe aproximado u otro dato que el cliente sí conozca.

HORARIO: tienda de nueve a dos y de cuatro a ocho; Nexo Voice atiende veinticuatro horas. Teléfono público: seis tres siete, ocho siete, siete siete, nueve dos.

ESTILO DE VOZ: respuestas cortas por defecto, normalmente 1 o 2 frases. Si necesitas datos, pregunta de forma directa. No recites listas largas. No repitas la pregunta del cliente. No uses “perfecto”, “vale” o “claro” en cada turno. No cierres una respuesta a mitad ni dejes una acción para un supuesto “siguiente paso” si puedes hacerla ya.`;
export default async function handler(req,res){
 if(req.method!=='POST')return res.status(405).json({error:'method_not_allowed'});if(!process.env.OPENAI_API_KEY)return res.status(503).json({error:'openai_not_configured'});
 const {messages=[]}=req.body||{};const clean=(Array.isArray(messages)?messages:[]).slice(-30).map(m=>({role:m.role==='assistant'?'assistant':'user',content:String(m.text||m.content||'').slice(0,1200)}));
 try{
  let r=await fetch(OPENAI,{method:'POST',headers:{Authorization:`Bearer ${process.env.OPENAI_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({model:'gpt-4.1-mini',temperature:.2,max_tokens:260,messages:[{role:'system',content:SYSTEM},...clean],tools:TOOLS,tool_choice:'auto'})});let d=await r.json();if(!r.ok)return res.status(502).json({error:'openai_failed',detail:d});let msg=d.choices?.[0]?.message;if(!msg)return res.status(502).json({error:'empty_reply'});
  for(let round=0;round<2&&msg.tool_calls?.length;round++){
    const chain=[{role:'system',content:SYSTEM},...clean,msg];
    for(const tc of msg.tool_calls){let args={};try{args=JSON.parse(tc.function?.arguments||'{}')}catch{}let out;try{out=await runTool(req,tc.function?.name,args)}catch(e){out={error:e.message||String(e)}}chain.push({role:'tool',tool_call_id:tc.id,content:JSON.stringify(out)})}
    r=await fetch(OPENAI,{method:'POST',headers:{Authorization:`Bearer ${process.env.OPENAI_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({model:'gpt-4.1-mini',temperature:.15,max_tokens:260,messages:chain,tools:TOOLS,tool_choice:'auto'})});d=await r.json();if(!r.ok)return res.status(502).json({error:'openai_followup_failed'});msg=d.choices?.[0]?.message;
  }
  let reply=String(msg?.content||'').trim();if(!reply)reply='Te sigo con esto. Dime el dato que te falta por darme y continúo.';return res.status(200).json({reply});
 }catch(e){console.error('hostelecan-chat',e);return res.status(500).json({error:'internal_error'})}
}
