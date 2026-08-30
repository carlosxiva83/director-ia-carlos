const ELEVEN_API='https://api.elevenlabs.io/v2/voices';
export default async function handler(req,res){
  if(req.method!=='GET') return res.status(405).json({error:'method_not_allowed'});
  const key=process.env.ELEVENLABS_API_KEY;
  if(!key) return res.status(503).json({error:'elevenlabs_not_configured'});
  try{
    const r=await fetch(`${ELEVEN_API}?page_size=100`,{headers:{'xi-api-key':key}});
    const body=await r.text();
    if(!r.ok) return res.status(502).json({error:'elevenlabs_failed',detail:body.slice(0,500)});
    const data=JSON.parse(body);
    const voices=(data.voices||[]).map(v=>({voice_id:v.voice_id,name:v.name,category:v.category,labels:v.labels||{},description:v.description||''}));
    res.setHeader('Cache-Control','no-store');
    return res.status(200).json({voices});
  }catch(e){console.error('ElevenLabs voices error',e);return res.status(500).json({error:'internal_error'});}
}
