module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const apiKey = process.env.AI_GATEWAY_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'Falta configurar la clave de IA en Vercel.' });

  try {
    const { question = '', company = 'Todas', tasks = [], clients = [] } = req.body || {};
    if (!String(question).trim()) return res.status(400).json({ error: 'Escribe una pregunta.' });

    const system = `Eres Director IA, el asistente ejecutivo personal de Carlos. Respondes siempre en español natural, cercano, claro y práctico, como una conversación real entre un director ejecutivo y Carlos. Tu respuesta debe sonar bien tanto leída en pantalla como pronunciada en voz alta.

REGLAS DE ESTILO IMPORTANTES:
- Usa solo texto plano.
- No uses Markdown.
- No uses asteriscos, almohadillas, guiones de lista, viñetas, barras, emojis decorativos ni símbolos de formato.
- No escribas títulos tipo "TAREAS" o "PRIORIDAD" con símbolos.
- No digas nombres de signos ni generes caracteres que un lector de voz pueda pronunciar como "asterisco" o "almohadilla".
- Escribe frases cortas, naturales y fluidas.
- Si hay varias tareas, introdúcelas conversando: por ejemplo, "Tienes dos cosas pendientes. Primero... Después...".
- Evita respuestas robóticas o excesivamente formales.
- Sé breve salvo que Carlos pida detalle.

Ayudas a priorizar tareas, hacer seguimiento comercial, detectar oportunidades, preparar campañas y ordenar el trabajo de sus empresas. No inventes datos: si falta información, dilo y propón el siguiente paso. Si te preguntan por pendientes o seguimientos, usa los datos recibidos del panel. Si hay varias acciones, ordénalas por prioridad y explica brevemente por qué, siempre en lenguaje conversacional.`;

    const context = {
      empresaSeleccionada: company,
      tareas: Array.isArray(tasks) ? tasks : [],
      clientes: Array.isArray(clients) ? clients : []
    };

    const messages = [
      { role: 'system', content: system },
      { role: 'user', content: `Contexto actual del panel:\n${JSON.stringify(context, null, 2)}\n\nPregunta de Carlos: ${question}` }
    ];

    async function callModel(model) {
      const response = await fetch('https://ai-gateway.vercel.sh/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: 0.35,
          max_tokens: 700
        })
      });
      const data = await response.json().catch(() => ({}));
      return { response, data };
    }

    const models = [
      'poolside/laguna-s-2.1-free',
      'poolside/laguna-s-2.1-free',
      'poolside/laguna-s-2.1'
    ];

    let lastError = 'La IA no ha podido responder ahora mismo.';

    for (const model of models) {
      const { response, data } = await callModel(model);
      if (response.ok) {
        let answer = data?.choices?.[0]?.message?.content;
        if (answer) {
          answer = String(answer)
            .replace(/[*#_`~>]/g, '')
            .replace(/^\s*[-•]\s*/gm, '')
            .replace(/\n{3,}/g, '\n\n')
            .trim();
          return res.status(200).json({ answer, model });
        }
        lastError = 'La IA devolvió una respuesta vacía.';
        continue;
      }
      lastError = data?.error?.message || lastError;
      console.error('AI Gateway error', model, response.status, data);
      if (![429, 500, 502, 503, 504].includes(response.status)) break;
      await new Promise(resolve => setTimeout(resolve, 450));
    }

    return res.status(502).json({ error: lastError });
  } catch (error) {
    console.error('Director IA error', error);
    return res.status(500).json({ error: 'Error interno del Director IA.' });
  }
};
