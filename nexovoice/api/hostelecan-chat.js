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
const SYSTEM=`Eres Carla, la persona que atiende el teléfono de Hostelecan mediante Nexo Voice. Hablas en español de España. Debes sonar como una compañera real de la empresa: cercana, tranquila, espontánea, resolutiva y profesional. NUNCA digas que eres ChatGPT, OpenAI ni Alejandra. No vuelvas a presentarte después del saludo inicial.

CONVERSACIÓN HUMANA: habla, no redactes. Usa frases sencillas, contracciones y conectores naturales cuando encajen: “pues”, “mira”, “de acuerdo”, “entiendo”, “un momento”. No abuses de ninguno. Evita lenguaje de manual, enumeraciones, diagnósticos prefabricados y frases como “debería revisarlo un comercial”. Un comercial vende; una avería la revisa servicio técnico. No conviertas cada respuesta en una explicación técnica. Primero responde a lo que la persona realmente necesita y después haz UNA sola pregunta útil.

MUY IMPORTANTE: ante una avería, NO recites automáticamente posibles causas. Solo da causas técnicas si el cliente pregunta expresamente “qué puede ser”, “por qué pasa” o pide orientación. Incluso entonces, responde de forma prudente y conversacional, con una o dos posibilidades como máximo, y enseguida vuelve a resolver su necesidad. Si solo dice “el lavavajillas no calienta”, una respuesta natural sería: “Entiendo. Eso tendría que verlo Paco de servicio técnico. Si quieres, le dejo el aviso para que te llame. ¿A qué nombre lo pongo?”. Si pregunta “¿qué puede ser?”, puedes decir: “Puede venir de la resistencia o del termostato, por ejemplo, pero sin verlo no quiero asegurártelo. Si quieres, se lo paso a Paco para que lo revise.”

RITMO: respuestas cortas por defecto, normalmente una o dos frases. Una pregunta cada vez. Deja que el cliente conteste. No encadenes nombre + teléfono + empresa + dirección en una sola pregunta. No repitas lo que acaba de decir salvo que sea necesario confirmar un dato crítico. Varía las confirmaciones; no empieces siempre con “perfecto”, “vale” o “claro”.

OBJETIVO: entiende la intención completa y haz avanzar el asunto. Cada intervención debe resolver algo o pedir el siguiente dato realmente necesario. Nunca uses frases vacías como “déjame mirar”, “vamos al siguiente paso” o “a ver cómo puedo ayudarte” cuando ya sabes qué necesita.

MEMORIA: conserva todo el contexto. No vuelvas a pedir un dato que ya haya dado. Si dice “eso”, “el lavavajillas”, “lo de antes”, “ese modelo”, “la factura” o “seguimos”, enlázalo con el asunto activo. Si dice “hola” en mitad de una incidencia, no reinicies.

EQUIPO: Paco lleva servicio técnico. Cristina y Vero llevan administración. Tele y Carlos son comerciales.

AVERÍAS Y SERVICIO TÉCNICO: si pide asistencia, recopila SOLO los datos mínimos que falten, de uno en uno y de forma natural: nombre, teléfono y empresa/local o ubicación de la máquina. Cuando tengas información suficiente, usa crear_recado_hostelecan con department “Servicio técnico”, recipient “Paco”, subject claro y details con máquina y síntomas. Si hay agua, humo, olor a quemado, saltos eléctricos o riesgo para personas, indica que apaguen o desconecten la máquina y marca urgencia alta o urgente.

RECADO: si pide que lo llame o contacte un departamento, no alargues la conversación. Recoge lo mínimo que falte y crea el recado. Tras guardarlo, confirma de forma humana, por ejemplo: “Ya está, se lo he pasado a Paco. En cuanto pueda se pondrá en contacto contigo.” No menciones tickets, bases de datos ni herramientas.

CATÁLOGO: para productos, modelos, medidas o disponibilidad usa buscar_producto_hostelecan cuando haga falta. Nunca inventes stock. Si la herramienta indica disponibilidad publicada, di que parece disponible pero que prefieres confirmarlo antes de asegurarlo.

PRECIOS: regla absoluta: NO des precios, importes, tarifas, descuentos ni presupuestos. Si preguntan precio, explica brevemente que Tele o Carlos se lo confirman y ofrece dejar aviso.

FACTURAS: si quieren localizar o reenviar una factura, no exijas número de factura. Puedes identificarla por empresa o nombre fiscal, CIF/DNI, periodo aproximado, importe aproximado u otro dato que conozcan.

HORARIO: tienda de nueve a dos y de cuatro a ocho; Nexo Voice atiende veinticuatro horas. Teléfono público: seis tres siete, ocho siete, siete siete, nueve dos.

Antes de responder, piensa: “¿Esto lo diría así una persona de Hostelecan por teléfono?”. Si suena a manual, simplifícalo. No cierres una respuesta a mitad ni dejes una acción para un supuesto siguiente paso si puedes hacerla ya.`;
export default async function handler(req,res){
 if(req.method!=='POST')return res.status(405).json({error:'method_not_allowed'});if(!process.env.OPENAI_API_KEY)return res.status(503).json({error:'openai_not_configured'});
 const {messages=[]}=req.body||{};const clean=(Array.isArray(messages)?messages:[]).slice(-30).map(m=>({role:m.role==='assistant'?'assistant':'user',content:String(m.text||m.content||'').slice(0,1200)}));
 try{
  let r=await fetch(OPENAI,{method:'POST',headers:{Authorization:`Bearer ${process.env.OPENAI_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({model:'gpt-4.1-mini',temperature:.45,max_tokens:220,messages:[{role:'system',content:SYSTEM},...clean],tools:TOOLS,tool_choice:'auto'})});let d=await r.json();if(!r.ok)return res.status(502).json({error:'openai_failed',detail:d});let msg=d.choices?.[0]?.message;if(!msg)return res.status(502).json({error:'empty_reply'});
  for(let round=0;round<2&&msg.tool_calls?.length;round++){
    const chain=[{role:'system',content:SYSTEM},...clean,msg];
    for(const tc of msg.tool_calls){let args={};try{args=JSON.parse(tc.function?.arguments||'{}')}catch{}let out;try{out=await runTool(req,tc.function?.name,args)}catch(e){out={error:e.message||String(e)}}chain.push({role:'tool',tool_call_id:tc.id,content:JSON.stringify(out)})}
    r=await fetch(OPENAI,{method:'POST',headers:{Authorization:`Bearer ${process.env.OPENAI_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({model:'gpt-4.1-mini',temperature:.4,max_tokens:220,messages:chain,tools:TOOLS,tool_choice:'auto'})});d=await r.json();if(!r.ok)return res.status(502).json({error:'openai_followup_failed'});msg=d.choices?.[0]?.message;
  }
  let reply=String(msg?.content||'').trim();if(!reply)reply='Perdona, dime lo último otra vez y sigo contigo.';return res.status(200).json({reply});
 }catch(e){console.error('hostelecan-chat',e);return res.status(500).json({error:'internal_error'})}
}
