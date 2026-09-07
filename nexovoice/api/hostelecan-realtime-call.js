const OPENAI_REALTIME='https://api.openai.com/v1/realtime/calls';
const INSTRUCTIONS=`Eres Carla, asistente virtual de Hostelecan, construida con Nexo Voice. Hablas en español de España, natural, profesional, cercana y breve. Mantienes el contexto y no repites preguntas ni datos ya dados.

HOSTELECAN:
- Servicio técnico: Paco.
- Administración: Cristina y Vero.
- Comercial: Tele y Carlos.
- Puedes orientar consultas generales y preparar recados.
- Para buscar productos reales usa buscar_producto_hostelecan. Nunca inventes productos ni precios.
- No debes decir precios. Si el usuario pregunta precio, ofrece pasar la consulta al equipo comercial.
- No garantices stock físico salvo que la herramienta lo confirme expresamente.
- Para dejar un recado usa crear_recado_hostelecan. Pide solo los datos necesarios y no vuelvas a pedir lo que ya tengas.
- Si el recado se guarda correctamente, confirma de forma natural que se lo pasarás al departamento o persona correspondiente.
- Respuestas normalmente de una o dos frases.
- Eres una IA; no finjas ser una persona.

Al iniciar di exactamente: “Hola, soy Carla, la asistente virtual de Hostelecan. ¿En qué puedo ayudarte?”`;
export default async function handler(req,res){if(req.method!=='POST')return res.status(405).json({error:'method_not_allowed'});const key=process.env.OPENAI_API_KEY;if(!key)return res.status(503).json({error:'openai_not_configured'});const sdp=typeof req.body==='string'?req.body:req.body?.sdp;if(!sdp||typeof sdp!=='string')return res.status(400).json({error:'missing_sdp'});const session={type:'realtime',model:'gpt-realtime-2',output_modalities:['audio'],instructions:INSTRUCTIONS,max_output_tokens:240,audio:{output:{voice:'marin'},input:{turn_detection:{type:'semantic_vad',eagerness:'medium',create_response:true,interrupt_response:true}}},tools:[{type:'function',name:'buscar_producto_hostelecan',description:'Busca productos en el catálogo de Hostelecan. No usar para dar precios.',parameters:{type:'object',properties:{consulta:{type:'string'}},required:['consulta'],additionalProperties:false}},{type:'function',name:'crear_recado_hostelecan',description:'Guarda un recado para el equipo de Hostelecan.',parameters:{type:'object',properties:{name:{type:'string'},phone:{type:'string'},company:{type:'string'},reason:{type:'string'},department:{type:'string'},priority:{type:'string'}},required:['reason'],additionalProperties:false}}]};try{const r=await fetch(OPENAI_REALTIME,{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify({sdp,session})});const text=await r.text();if(!r.ok)return res.status(r.status).json({error:'realtime_call_failed',detail:text.slice(0,1200)});res.statusCode=200;res.setHeader('Content-Type','application/sdp');res.setHeader('Cache-Control','no-store');return res.end(text)}catch(e){console.error('hostelecan-realtime-call error',e);return res.status(500).json({error:'internal_error'})}}
