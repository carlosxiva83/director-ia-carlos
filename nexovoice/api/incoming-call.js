import WebSocket from "ws";

const OPENAI_API_URL = "https://api.openai.com/v1";
const OPENAI_REALTIME_WS_URL = "wss://api.openai.com/v1/realtime";

const INSTRUCTIONS = `
Eres Nexo Voice, el asistente virtual de Auranexo.

REGLAS OBLIGATORIAS:
- Habla siempre en español de España, salvo que el cliente pida expresamente otro idioma.
- Nunca cambies al inglés por iniciativa propia.
- Preséntate de forma breve como Nexo Voice, el asistente virtual de Auranexo.
- La marca se escribe Auranexo, pero al hablar debes pronunciarla claramente como “Aura Nexo”, en dos palabras.
- Habla de forma natural, cálida, clara y profesional.
- Usa frases cortas; estás atendiendo una llamada telefónica.
- No inventes horarios, precios, servicios, citas ni datos de clientes.
- Si todavía no tienes un dato empresarial necesario, dilo con naturalidad y ofrece tomar nota.
- Si no entiendes un nombre, teléfono, fecha u hora, pide confirmación.
- Antes de confirmar una reserva, modificación o cancelación, repite los datos esenciales.
- Si el usuario pregunta si eres una persona, indica claramente que eres un asistente virtual con inteligencia artificial.
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

async function sendInitialGreeting(callId) {
  const apiKey = process.env.OPENAI_API_KEY;
  const url = `${OPENAI_REALTIME_WS_URL}?call_id=${encodeURIComponent(callId)}`;

  return await new Promise((resolve) => {
    let settled = false;
    let responseStarted = false;

    const finish = (ok, detail) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      try { ws.close(); } catch {}
      console.log("Nexo Voice greeting result", { callId, ok, detail });
      resolve(ok);
    };

    const ws = new WebSocket(url, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "OpenAI-Beta": "realtime=v1",
      },
    });

    const timeout = setTimeout(() => finish(responseStarted, "timeout"), 12000);

    ws.on("open", () => {
      ws.send(JSON.stringify({
        type: "response.create",
        response: {
          output_modalities: ["audio"],
          instructions:
            "Saluda ahora mismo, sin esperar a que el cliente hable. Di: 'Hola, soy Nexo Voice, el asistente virtual de Aura Nexo. ¿En qué puedo ayudarte?'. Habla en español de España, con tono natural y cálido.",
        },
      }));
    });

    ws.on("message", (raw) => {
      try {
        const event = JSON.parse(raw.toString());
        if (event?.type === "response.created" || event?.type === "response.output_audio.delta") {
          responseStarted = true;
        }
        if (event?.type === "response.done") {
          const status = event?.response?.status;
          finish(status !== "failed" && status !== "cancelled", status || "done");
        }
        if (event?.type === "error") {
          console.error("Nexo Voice sideband error", {
            callId,
            code: event?.error?.code,
            type: event?.error?.type,
            message: event?.error?.message,
          });
          finish(false, event?.error?.code || "sideband_error");
        }
      } catch (error) {
        console.warn("Nexo Voice sideband message parse error", error?.message || String(error));
      }
    });

    ws.on("error", (error) => {
      console.error("Nexo Voice sideband websocket error", { callId, message: error?.message || String(error) });
      finish(false, "websocket_error");
    });

    ws.on("close", () => {
      if (!settled) finish(responseStarted, "closed");
    });
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "method_not_allowed" });
  }

  if (!process.env.OPENAI_API_KEY) {
    console.error("Nexo Voice: OPENAI_API_KEY missing");
    return res.status(500).json({ ok: false, error: "missing_openai_api_key" });
  }

  try {
    const event = typeof req.body === "string" ? JSON.parse(req.body) : req.body;

    if (event?.type && event.type !== "realtime.call.incoming") {
      return res.status(200).json({ ok: true, ignored: event.type });
    }

    const callId = getCallId(event);
    if (!callId) {
      console.error("Nexo Voice: incoming webhook without call id");
      return res.status(400).json({ ok: false, error: "missing_call_id" });
    }

    const acceptBody = {
      type: "realtime",
      model: process.env.NEXO_VOICE_MODEL || "gpt-realtime-2",
      output_modalities: ["audio"],
      max_output_tokens: 700,
      instructions: INSTRUCTIONS,
    };

    const response = await fetch(
      `${OPENAI_API_URL}/realtime/calls/${encodeURIComponent(callId)}/accept`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(acceptBody),
      }
    );

    const text = await response.text();
    if (!response.ok) {
      console.error("Nexo Voice: OpenAI accept failed", {
        callId,
        status: response.status,
        body: text.slice(0, 1500),
      });
      return res.status(502).json({
        ok: false,
        error: "openai_accept_failed",
        status: response.status,
      });
    }

    console.log("Nexo Voice: call accepted", { callId, status: response.status });

    const greeted = await sendInitialGreeting(callId);
    if (!greeted) {
      console.warn("Nexo Voice: call accepted but initial greeting was not confirmed", { callId });
    }

    return res.status(200).json({
      ok: true,
      accepted: true,
      greeted,
      call_id: callId,
    });
  } catch (error) {
    console.error("Nexo Voice webhook error", error);
    return res.status(500).json({ ok: false, error: "internal_error" });
  }
}
