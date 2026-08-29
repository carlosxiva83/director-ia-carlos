const OPENAI_API_URL = "https://api.openai.com/v1";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).send("method_not_allowed");
  }

  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).send("missing_openai_api_key");
  }

  try {
    // Vercel may expose application/sdp as a raw string or Buffer.
    let sdp;
    if (typeof req.body === "string") {
      sdp = req.body;
    } else if (Buffer.isBuffer(req.body)) {
      sdp = req.body.toString("utf8");
    } else if (req.body?.sdp) {
      sdp = req.body.sdp;
    }

    if (!sdp) return res.status(400).send("missing_sdp");

    const model = process.env.NEXO_VOICE_MODEL || "gpt-realtime-2";
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
