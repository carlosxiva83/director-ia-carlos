const OPENAI_API_URL = "https://api.openai.com/v1";

export const config = {
  api: {
    bodyParser: false
  }
};

async function readRawBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf8");
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).send("method_not_allowed");
  if (!process.env.OPENAI_API_KEY) return res.status(500).send("missing_openai_api_key");

  try {
    const sdp = await readRawBody(req);
    if (!sdp || !sdp.includes("v=0")) return res.status(400).send("missing_sdp");

    // Voice Lab can explicitly request the current premium model. The normal
    // production path keeps the environment/default model untouched.
    const requested = String(req.query?.model || "");
    const allowed = new Set(["gpt-realtime-2", "gpt-realtime-2.1"]);
    const model = allowed.has(requested) ? requested : (process.env.NEXO_VOICE_MODEL || "gpt-realtime-2");

    const response = await fetch(`${OPENAI_API_URL}/realtime/calls?model=${encodeURIComponent(model)}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/sdp"
      },
      body: sdp
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
