const OPENAI='https://api.openai.com/v1/responses';

function text(v){return String(v??'').trim()}
function outputText(data){
  const items=Array.isArray(data?.output)?data.output:[];
  for(const item of items){
    if(item?.type!=='message'||!Array.isArray(item.content)) continue;
    for(const part of item.content){
      if(part?.type==='output_text'&&typeof part.text==='string'&&part.text.trim()){
        return part.text.trim();
      }
    }
  }
  return '';
}

export default async function handler(req,res){
  if(req.method!=='POST') return res.status(405).json({error:'method_not_allowed'});
  const key=process.env.OPENAI_API_KEY;
  if(!key) return res.status(503).json({error:'openai_not_configured'});

  const message=text(req.body?.message).slice(0,3000);
  const preferredName=text(req.body?.preferredName).slice(0,80);
  const context=Array.isArray(req.body?.history)
    ? req.body.history.slice(-10).map(m=>({
        role:m?.role==='assistant'?'assistant':'user',
        content:text(m?.text||m?.content).slice(0,1000)
      }))
    : [];

  if(!message) return res.status(400).json({error:'missing_message'});

  const instructions=[
    'Eres Aura, el asistente personal y profesional de Aurenexo.',
    'Habla en español de España, de tú, con tono natural, cercano, competente y breve.',
    'Responde como una asistente general inteligente: puedes explicar, razonar, calcular y consultar información actual cuando sea necesario.',
    'Cuando la pregunta dependa de información reciente o cambiante, usa la búsqueda web.',
    'No inventes datos privados del usuario ni de sus empresas. Si un dato empresarial no está incluido en el contexto, dilo claramente.',
    'Las respuestas se leerán muchas veces con voz, así que evita formato recargado y normalmente responde en 1 a 4 párrafos cortos.',
    preferredName ? 'El usuario prefiere que le llames '+preferredName+'.' : ''
  ].filter(Boolean).join(' ');

  const input=[
    ...context,
    {role:'user',content:message}
  ];

  try{
    const r=await fetch(OPENAI,{
      method:'POST',
      headers:{
        Authorization:`Bearer ${key}`,
        'Content-Type':'application/json'
      },
      body:JSON.stringify({
        model:'gpt-5.6-luna',
        instructions,
        tools:[{type:'web_search'}],
        tool_choice:'auto',
        input,
        max_output_tokens:900
      })
    });

    const data=await r.json().catch(()=>({}));
    if(!r.ok){
      console.error('Aura general OpenAI error',data);
      return res.status(502).json({error:'openai_failed'});
    }

    const reply=outputText(data);
    if(!reply) return res.status(502).json({error:'empty_reply'});

    res.setHeader('Cache-Control','no-store');
    return res.status(200).json({reply});
  }catch(e){
    console.error('Aura general error',e);
    return res.status(500).json({error:'internal_error'});
  }
}
