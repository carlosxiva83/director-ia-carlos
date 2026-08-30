const BASE='https://api.elevenlabs.io/v1/text-to-speech';
export default async function handler(req,res){
  if(req.method!=='POST') return res.status(405).json({error:'method_not_allowed'});
  const key=process.env.ELEVENLABS_API_KEY;
  if(!key) return res.status(503).json({error:'elevenlabs_not_configured'});
  const {voice_id,text}=req.body||{};
  if(!voice_id||typeof voice_id!=='string') return res.status(400).json({error:'missing_voice_id'});
  const safeText=String(text||'').trim().slice(0,500);
  if(!safeText) return res.status(400).json({error:'missing_text'});
  try{
    const r=await fetch(`${BASE}/${encodeURIComponent(voice_id)}/stream?output_format=mp3_44100_128`,{
      method:'POST',
      headers:{'xi-api-key':key,'Content-Type':'application/json'},
      body:JSON.stringify({text:safeText,model_id:'eleven_multilingual_v2',voice_settings:{stability:0.42,similarity_boost:0.82,style:0.28,use_speaker_boost:true}})
    });
    if(!r.ok){const t=await r.text();return res.status(502).json({error:'elevenlabs_failed',detail:t.slice(0,500)});}
    const buf=Buffer.from(await r.arrayBuffer());
    res.setHeader('Content-Type','audio/mpeg');res.setHeader('Cache-Control','no-store');
    return res.status(200).send(buf);
  }catch(e){console.error('ElevenLabs TTS error',e);return res.status(500).json({error:'internal_error'});}
}
