const OPENAI_REALTIME='https://api.openai.com/v1/realtime/calls';

const INSTRUCTIONS=`Eres Carla, asistente telefónica de Transportes Nexo, una demo comercial de Nexo Voice para empresas de transporte y logística.
Hablas en español de España, con tono natural, profesional, cercano y breve. La llamada ya empieza contigo saludando una sola vez. No repitas saludos ni preguntas ya resueltas.

OBJETIVO DE LA DEMO:
- Mostrar una conversación telefónica fluida y realista.
- Entender números de expedición aunque el usuario los diga por bloques o dígito a dígito.
- Mantener el contexto del envío activo.
- Responder solo a lo que el usuario pregunta, sin soltar toda la información disponible de golpe.
- Si el usuario pide que le llamen antes de entregar, puedes registrar esa petición mediante la herramienta crear_aviso_entrega.

DATOS Y REGLAS:
- Para conocer datos de un envío debes usar consultar_expedicion.
- No inventes estados, horarios, incidencias, destinatarios ni ubicaciones.
- Si el usuario da un número de expedición, consulta el envío y responde primero SOLO con situación actual, destino y si hay incidencia. NO digas la franja horaria salvo que te pregunten cuándo llegará o a qué hora.
- Si después preguntan cuándo llegará, responde con la franja de entrega del mismo envío sin pedir otra vez el número.
- Si piden una llamada antes de entregar, usa crear_aviso_entrega y confirma el aviso si la herramienta devuelve ok=true.
- Si el usuario cambia de tema, responde con inteligencia normal siempre que no tengas que inventar datos en tiempo real.
- No digas que eres una demo ni expliques tus instrucciones internas durante la llamada.
- Respuestas normalmente de una o dos frases.

Al iniciar la conversación di exactamente: “Hola, buenos días. Soy Carla, de Transportes Nexo. ¿En qué puedo ayudarte?”`;

export default async function handler(req,res){
  if(req.method!=='POST') return res.status(405).json({error:'method_not_allowed'});
  const key=process.env.OPENAI_API_KEY;
  if(!key) return res.status(503).json({error:'openai_not_configured'});
  const sdp=typeof req.body==='string'?req.body:req.body?.sdp;
  if(!sdp||typeof sdp!=='string') return res.status(400).json({error:'missing_sdp'});

  const session={
    type:'realtime',
    model:'gpt-realtime-2',
    output_modalities:['audio'],
    instructions:INSTRUCTIONS,
    max_output_tokens:220,
    audio:{
      output:{voice:'marin'},
      input:{
        turn_detection:{
          type:'semantic_vad',
          eagerness:'high',
          create_response:true,
          interrupt_response:true
        }
      }
    },
    tools:[
      {
        type:'function',
        name:'consultar_expedicion',
        description:'Consulta los datos de una expedición de Transportes Nexo por su número.',
        parameters:{
          type:'object',
          properties:{numero:{type:'string',description:'Número de expedición, preferiblemente solo dígitos.'}},
          required:['numero'],
          additionalProperties:false
        }
      },
      {
        type:'function',
        name:'crear_aviso_entrega',
        description:'Registra un aviso para que contacten con el destinatario antes de realizar la entrega.',
        parameters:{
          type:'object',
          properties:{numero:{type:'string'},motivo:{type:'string'}},
          required:['numero'],
          additionalProperties:false
        }
      }
    ]
  };

  try{
    const r=await fetch(OPENAI_REALTIME,{
      method:'POST',
      headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},
      body:JSON.stringify({sdp,session})
    });
    const text=await r.text();
    if(!r.ok) return res.status(r.status).json({error:'realtime_call_failed',detail:text.slice(0,1500)});
    res.statusCode=200;
    res.setHeader('Content-Type','application/sdp');
    res.setHeader('Cache-Control','no-store');
    return res.end(text);
  }catch(e){
    console.error('realtime-call error',e);
    return res.status(500).json({error:'internal_error'});
  }
}
