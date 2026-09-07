import { Readable } from 'node:stream';

const BASE='https://api.elevenlabs.io/v1/text-to-speech';

function clamp(n,min,max,def){return Number.isFinite(Number(n))?Math.min(max,Math.max(min,Number(n))):def}

export default async function handler(req,res){
  if(!['GET','POST'].includes(req.method)) return res.status(405).json({error:'method_not_allowed'});
  const key=process.env.ELEVENLABS_API_KEY;
  if(!key) return res.status(503).json({error:'elevenlabs_not_configured'});

  const src=req.method==='GET'?(req.query||{}):(req.body||{});
  const {voice_id,text,speed,stability,style,model_id,stable}=src;
  if(!voice_id||typeof voice_id!=='string') return res.status(400).json({error:'missing_voice_id'});
  const safeText=String(text||'').trim().slice(0,700);
  if(!safeText) return res.status(400).json({error:'missing_text'});

  const voiceSettings={
    stability:clamp(stability,.2,.85,.5),
    similarity_boost:.84,
    style:clamp(style,0,.6,.34),
    use_speaker_boost:true,
    speed:clamp(speed,.8,1.15,.96)
  };
  const allowedModels=new Set(['eleven_multilingual_v2','eleven_flash_v2_5']);
  const model=allowedModels.has(model_id)?model_id:'eleven_multilingual_v2';

  try{
    const r=await fetch(`${BASE}/${encodeURIComponent(voice_id)}/stream?output_format=mp3_44100_128`,{
      method:'POST',
      headers:{'xi-api-key':key,'Content-Type':'application/json'},
      body:JSON.stringify({text:safeText,model_id:model,voice_settings:voiceSettings})
    });
    if(!r.ok){const t=await r.text();return res.status(502).json({error:'elevenlabs_failed',detail:t.slice(0,500)});}

    res.statusCode=200;
    res.setHeader('Content-Type','audio/mpeg');
    res.setHeader('Cache-Control','no-store, no-transform');
    res.setHeader('X-Accel-Buffering','no');
    if(!r.body) return res.status(502).json({error:'empty_audio_stream'});

    // Stable mode buffers the whole MP3 before playback. It is a little slower to start,
    // but avoids chunk/rebuffer artifacts during demo recordings.
    if(String(stable)==='1' || String(stable).toLowerCase()==='true'){
      const bytes=Buffer.from(await r.arrayBuffer());
      res.setHeader('Content-Length',String(bytes.length));
      return res.end(bytes);
    }

    Readable.fromWeb(r.body).on('error',e=>{console.error('ElevenLabs stream error',e);try{res.end()}catch(_){}}).pipe(res);
  }catch(e){console.error('ElevenLabs TTS error',e);if(!res.headersSent)return res.status(500).json({error:'internal_error'});try{res.end()}catch(_){}}
}
