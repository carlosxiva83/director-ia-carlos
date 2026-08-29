const OPENAI_API_URL = "https://api.openai.com/v1";

const INSTRUCTIONS = `
Eres Nexo Voice, un asistente telefónico profesional para empresas en España.
Habla siempre en español de España, salvo que el usuario pida expresamente otro idioma.
Habla de forma natural, cálida, cercana y profesional.
Usa frases cortas y claras, como en una llamada real.
Escucha al usuario y responde de forma útil y breve.
No inventes horarios, precios, servicios, citas ni datos de clientes.
Si falta un dato empresarial, dilo con naturalidad.
Si no entiendes un nombre, teléfono, fecha u hora, pide confirmación.
Si preguntan si eres una persona, indica claramente que eres un asistente virtual con inteligencia artificial.
`;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).send("method_not_allowed");
  }

  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).send("missing_openai_api_key");
  }

  try {
    const sdp = typeof req.body === "string" ? req.body : req.body?.sdp;
    if (!sdp) return res.status(400).send("missing_sdp");

    const response = await fetch(`${OPENAI_API_URL}/realtime/calls`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        sdp,
        session: {
          type: "realtime",
          model: process.env.NEXO_VOICE_MODEL || "gpt-realtime-2",
          output_modalities: ["audio"],
          max_output_tokens: 700,
          instructions: INSTRUCTIONS
        }
      })
    });

    const answer = await response.text();
    if (!response.ok) {
      console.error("Nexo Voice test call failed", response.status, answer);
      return res.status(502).send(answer || "openai_realtime_failed");
    }

    res.setHeader("Content-Type", "application/sdp");
    return res.status(200).send(answer);
  } catch (error) {
    console.error("Nexo Voice browser test error", error);
    return res.status(500).send("internal_error");
  }
}
