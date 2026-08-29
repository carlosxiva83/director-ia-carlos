import WebSocket from "ws";

const OPENAI_API_URL = "https://api.openai.com/v1";
const OPENAI_REALTIME_WS_URL = "wss://api.openai.com/v1/realtime";

const INSTRUCTIONS = `
Eres Nexo Voice, un asistente telefónico profesional para empresas en España.

REGLAS OBLIGATORIAS:
- Habla siempre en español de España, salvo que el cliente pida expresamente otro idioma.
- Nunca cambies al inglés por iniciativa propia.
- Preséntate de forma breve como asistente virtual de la empresa.
- Habla con una voz femenina natural, cálida, cercana y profesional.
- Suena humana y conversacional, sin tono robótico ni de locución publicitaria.
- Usa frases cortas y claras; estás atendiendo una llamada telefónica.
- No hables demasiado rápido.
- Deja pequeñas pausas naturales entre ideas.
- Escucha al cliente, espera a que termine y responde a lo que realmente ha dicho.
- Si el cliente te interrumpe, deja de hablar y atiende su nueva intervención.
- Mantén una conversación normal durante toda la llamada, no te limites al saludo inicial.
- No inventes horarios, precios, servicios, citas ni datos de clientes.
- Si todavía no tienes un dato empresarial necesario, dilo con naturalidad y ofrece tomar nota.
- Si no entiendes un nombre, teléfono, fecha u hora, pide confirmación.
- Antes de confirmar una reserva, modificación o cancelación, repite los datos esenciales.
- Si el usuario pregunta si eres una persona, indica claramente que eres un asistente virtual con inteligencia artificial.

OBJETIVO DE ESTA VERSIÓN:
Mantener una conversación telefónica fluida, natural y completamente en español de España. Tras el saludo, escucha al cliente y responde de forma breve y útil en cada turno.
`;

function getCallId(event) {
  return (
    event?.data?.call_id ||
    event?.data?.id ||
    event?.call_id ||
    event?.data?.call?.id ||
    null
  );
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function sendInitialGreeting(callId) {
  const apiKey = process.env.OPENAI_API_KEY;
  const url = `${OPENAI_REALTIME_WS_URL}?call_id=${encodeURIComponent(callId)}`;

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      await new Promise((resolve, reject) => {
        const ws = new WebSocket(url, {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "OpenAI-Beta": "realtime=v1",
          },
        });

        const timeout = setTimeout(() => {
          try { ws.close(); } catch {}
          reject(new Error("sideband_timeout"));
        }, 7000);

        let greetingDone = false;

        ws.on("open", () => {
          ws.send(JSON.stringify({
            type: "response.create",
            response: {
              output_modalities: ["audio"],
              instructions:
                "Saluda ahora, de forma natural y cálida, sin sonar como una grabación. Di: 'Hola, soy Nexo Voice, el asistente virtual de la empresa. ¿En qué puedo ayudarte hoy?'. Después deja de hablar y espera la respuesta del cliente.",
            },
          }));
        });

        ws.on("message", (data) => {
          try {
            const event = JSON.parse(data.toString());
            if (event?.type === "error") {
              clearTimeout(timeout);
              reject(new Error(event?.error?.message || "realtime_sideband_error"));
              return;
            }
            if (event?.type === "response.done" && !greetingDone) {
              greetingDone = true;
              clearTimeout(timeout);
              setTimeout(() => {
                try { ws.close(); } catch {}
                resolve();
              }, 250);
            }
          } catch {}
        });

        ws.on("error", (error) => {
          clearTimeout(timeout);
          reject(error);
        });
      });

      console.log("Nexo Voice: initial greeting completed", { callId, attempt });
      return true;
    } catch (error) {
      console.warn("Nexo Voice: sideband greeting attempt failed", {
        callId,
        attempt,
        message: error?.message || String(error),
      });
      if (attempt < 3) await sleep(350 * attempt);
    }
  }

  return false;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "method_not_allowed" });
  }

  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ ok: false, error: "missing_openai_api_key" });
  }

  try {
    const event = typeof req.body === "string" ? JSON.parse(req.body) : req.body;

    if (event?.type && event.type !== "realtime.call.incoming") {
      return res.status(200).json({ ok: true, ignored: event.type });
    }

    const callId = getCallId(event);
    if (!callId) {
      console.error("Nexo Voice: incoming webhook without call id", event);
      return res.status(400).json({ ok: false, error: "missing_call_id" });
    }

    const response = await fetch(
      `${OPENAI_API_URL}/realtime/calls/${encodeURIComponent(callId)}/accept`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "realtime",
          model: process.env.NEXO_VOICE_MODEL || "gpt-realtime-2.1",
          output_modalities: ["audio"],
          audio: {
            input: {
              noise_reduction: { type: "near_field" },
              turn_detection: {
                type: "server_vad",
                threshold: 0.5,
                prefix_padding_ms: 300,
                silence_duration_ms: 550,
                create_response: true,
                interrupt_response: true
              }
            },
            output: {
              voice: "marin",
              speed: 0.96
            }
          },
          max_output_tokens: 700,
          instructions: INSTRUCTIONS,
          tracing: "auto"
        })
      }
    );

    const text = await response.text();
    if (!response.ok) {
      console.error("Nexo Voice: OpenAI accept failed", response.status, text);
      return res.status(502).json({
        ok: false,
        error: "openai_accept_failed",
        status: response.status
      });
    }

    const greeted = await sendInitialGreeting(callId);

    return res.status(200).json({
      ok: true,
      accepted: true,
      greeted,
      call_id: callId
    });
  } catch (error) {
    console.error("Nexo Voice webhook error", error);
    return res.status(500).json({ ok: false, error: "internal_error" });
  }
}
