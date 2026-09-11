const OPENAI_REALTIME='https://api.openai.com/v1/realtime/calls';

export const config={api:{bodyParser:false}};

async function readRawBody(req){
  const chunks=[];
  for await(const chunk of req) chunks.push(Buffer.isBuffer(chunk)?chunk:Buffer.from(chunk));
  return Buffer.concat(chunks).toString('utf8');
}

export default async function handler(req,res){
  if(req.method!=='POST') return res.status(405).send('method_not_allowed');
  const key=process.env.OPENAI_API_KEY;
  if(!key) return res.status(503).send('openai_not_configured');

  try{
    const sdp=await readRawBody(req);
    if(!sdp||!sdp.includes('v=0')) return res.status(400).send('missing_sdp');

    const sessionConfig={
      type:'transcription',
      audio:{
        input:{
          transcription:{
            model:'gpt-live-transcribe',
            languages:['es'],
            delay:'low',
            prompt:'Conversación comercial en español de España sobre Nexo Voice, Aura Nexo, citas, reservas, facturas, incidencias, logística y atención telefónica.'
          },
          noise_reduction:{type:'near_field'},
          turn_detection:{
            type:'server_vad',
            threshold:0.72,
            prefix_padding_ms:350,
            silence_duration_ms:850
          }
        }
      }
    };

    const fd=new FormData();
    fd.set('sdp',sdp);
    fd.set('session',JSON.stringify(sessionConfig));

    const r=await fetch(OPENAI_REALTIME,{
      method:'POST',
      headers:{Authorization:`Bearer ${key}`},
      body:fd
    });

    const answer=await r.text();
    if(!r.ok){
      console.error('nexo-transcribe-call failed',r.status,answer);
      return res.status(r.status).send(answer||'transcription_call_failed');
    }

    res.setHeader('Content-Type','application/sdp');
    res.setHeader('Cache-Control','no-store');
    return res.status(200).send(answer);
  }catch(e){
    console.error('nexo-transcribe-call error',e);
    return res.status(500).send('internal_error');
  }
}
