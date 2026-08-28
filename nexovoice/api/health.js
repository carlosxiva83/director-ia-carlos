export default function handler(req, res) {
  return res.status(200).json({
    ok: true,
    service: "nexo-voice",
    version: "0.1.0",
    language: "es-ES",
    model: process.env.NEXO_VOICE_MODEL || "gpt-realtime-2",
  });
}
