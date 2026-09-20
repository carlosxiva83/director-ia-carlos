// Independent copy of Carla's approved profile; the original is never modified.
const profile = require('../nexovoice/carla-voice-profile-approved.json');
module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({error:'Método no permitido'});
  const text = req.body?.text;
  if (typeof text !== 'string' || !text.trim() || text.length > 6000)
    return res.status(400).json({error:'Texto de voz no válido.'});
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) return res.status(503).json({error:'Falta conectar la voz de Carla en Director IA.'});
  try {
    let voice = process.env.DIRECTOR_CARLA_VOICE_ID;
    if (!voice) {
      const r = await fetch('https://api.elevenlabs.io/v1/voices', {headers:{'xi-api-key':key}, signal:AbortSignal.timeout(10000)});
      if (!r.ok) throw new Error('voices');
      const data = await r.json();
      const matches = (data.voices || []).filter(v => String(v.name || '').toLowerCase().startsWith('alejandra'));
      if (matches.length !== 1) return res.status(503).json({error:'Falta seleccionar la voz exacta de Carla.'});
      voice = matches[0].voice_id;
    }
    const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voice)}?output_format=mp3_44100_128`, {
      method:'POST', headers:{'xi-api-key':key,'Content-Type':'application/json'},
      body:JSON.stringify({text,model_id:profile.model_id,voice_settings:profile.voice_settings,seed:profile.seed}),
      signal:AbortSignal.timeout(45000)
    });
    if (!r.ok) throw new Error('tts');
    res.setHeader('Content-Type','audio/mpeg');
    return res.status(200).send(Buffer.from(await r.arrayBuffer()));
  } catch {
    return res.status(502).json({error:'No se pudo reproducir la voz de Carla. La respuesta sigue disponible en pantalla.'});
  }
};
