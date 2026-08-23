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

    const system = `Eres Director IA, el asistente ejecutivo personal de Carlos. Respondes siempre en español, de forma clara, práctica y orientada a acción. Ayudas a priorizar tareas, hacer seguimiento comercial, detectar oportunidades, preparar campañas y ordenar el trabajo de sus empresas. No inventes datos: si falta información, dilo y propón el siguiente paso. Si te preguntan por pendientes o seguimientos, usa los datos recibidos del panel. Si hay varias acciones, ordénalas por prioridad y explica brevemente por qué.`;

    const context = {
      empresaSeleccionada: company,
      tareas: Array.isArray(tasks) ? tasks : [],
      clientes: Array.isArray(clients) ? clients : []
    };

    const response = await fetch('https://ai-gateway.vercel.sh/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'poolside/laguna-s-2.1-free',
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: `Contexto actual del panel:\n${JSON.stringify(context, null, 2)}\n\nPregunta de Carlos: ${question}` }
        ],
        temperature: 0.3,
        max_tokens: 700
      })
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.error('AI Gateway error', response.status, data);
      return res.status(502).json({ error: data?.error?.message || 'La IA no ha podido responder ahora mismo.' });
    }

    const answer = data?.choices?.[0]?.message?.content;
    if (!answer) return res.status(502).json({ error: 'La IA devolvió una respuesta vacía.' });
    return res.status(200).json({ answer });
  } catch (error) {
    console.error('Director IA error', error);
    return res.status(500).json({ error: 'Error interno del Director IA.' });
  }
};
