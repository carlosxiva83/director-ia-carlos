export const config={api:{bodyParser:false}};

async function readRawBody(req){
  const chunks=[];
  for await(const chunk of req) chunks.push(Buffer.isBuffer(chunk)?chunk:Buffer.from(chunk));
  return Buffer.concat(chunks);
}

export default async function handler(req,res){
  if(req.method!=='POST') return res.status(405).json({error:'method_not_allowed'});
  const key=process.env.OPENAI_API_KEY;
  if(!key) return res.status(503).json({error:'openai_not_configured'});

  try{
    const audio=await readRawBody(req);
    if(!audio.length) return res.status(400).json({error:'missing_audio'});
    const mime=(req.headers['content-type']||'audio/webm').split(';')[0];
    const ext=mime.includes('ogg')?'ogg':mime.includes('mp4')?'m4a':'webm';
    const form=new FormData();
    form.append('file',new Blob([audio],{type:mime}),`audio.${ext}`);
    form.append('model','gpt-4o-mini-transcribe');
    form.append('language','es');
    form.append('prompt','Conversación en español de España sobre Nexo Voice, Aura Nexo, citas, reservas, facturas, incidencias, logística y atención telefónica.');

    const r=await fetch('https://api.openai.com/v1/audio/transcriptions',{
      method:'POST',
      headers:{Authorization:`Bearer ${key}`},
      body:form
    });
    const text=await r.text();
    if(!r.ok){
      console.error('nexo-transcribe failed',r.status,text);
      return res.status(r.status).send(text||'transcription_failed');
    }
    let data={};
    try{data=JSON.parse(text)}catch{}
    return res.status(200).json({text:String(data.text||'').trim()});
  }catch(e){
    console.error('nexo-transcribe error',e);
    return res.status(500).json({error:'internal_error'});
  }
}
