module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const apiKey = process.env.AI_GATEWAY_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'Falta configurar la clave de IA en Vercel.' });

  try {
    const { question = '', company = 'Todas', tasks = [], clients = [], projectStatus = null } = req.body || {};
    if (!String(question).trim()) return res.status(400).json({ error: 'Escribe una pregunta.' });

    const ecosystem = {
      empresa: {
        nombre: 'NEXOIA',
        tipo: 'Empresa paraguas de soluciones tecnológicas e inteligencia artificial',
        definicion: 'NEXOIA es una empresa de soluciones tecnológicas e inteligencia artificial pensada para ayudar a autónomos, comercios y empresas a trabajar de una forma más sencilla, automatizada y eficiente. No es un único programa: es un ecosistema de herramientas especializadas que pueden funcionar por separado o conectarse entre sí.',
        mision: 'Reducir tareas manuales, mejorar el control del negocio, automatizar procesos y mejorar la atención al cliente mediante software e inteligencia artificial.',
        lema: 'NEXOIA · Conectamos tu negocio con la inteligencia artificial.',
        ideaEcosistema: 'Cada producto NEXO resuelve una necesidad concreta del negocio. Director IA actúa como centro de mando y, a medida que evolucione el ecosistema, los productos podrán compartir información y coordinarse con permisos controlados.',
        ejemplo: 'Un restaurante podría utilizar ComandaNexo para pedidos, CitaNexo para reservas, Nexo Voice para atender llamadas y Director IA para supervisarlo todo desde un mismo lugar.'
      },
      reglas: {
        FacturaNexo: 'Solo lectura desde Director IA. No modificar código, configuración, base de datos ni despliegues sin autorización expresa de Carlos.',
        general: 'Conocer un sistema no significa tener permiso para modificarlo. Nunca asumir permisos de escritura.',
        nexoia: 'Cuando Carlos pregunte qué es NEXOIA o qué productos tiene, explicar primero que NEXOIA es el ecosistema o empresa paraguas y después describir sus productos de forma sencilla, práctica y conectada.'
      },
      herramientas: [
        { nombre: 'GitHub', funcion: 'Código fuente, repositorios, historial de cambios y versiones.', estado: 'En uso', proyectos: ['Director IA', 'FacturaNexo', 'CitaNexo y otros proyectos conectados'] },
        { nombre: 'Vercel', funcion: 'Publicación de webs y aplicaciones, despliegues y dominios técnicos.', estado: 'En uso', proyectos: ['Director IA', 'FacturaNexo', 'CitaNexo y aplicaciones web'] },
        { nombre: 'Supabase', funcion: 'Bases de datos, memoria en la nube y autenticación. El proyecto de Director IA está separado de FacturaNexo.', estado: 'Preparado; acceso de usuario aparcado temporalmente mientras se corrige el flujo de confirmación.', proyectos: ['Director IA y proyectos con bases separadas'] },
        { nombre: 'Twilio', funcion: 'Telefonía, números, llamadas entrantes y salientes y conexión telefónica del asistente.', estado: 'En configuración', proyectos: ['Nexo Voice / IA Voice'] },
        { nombre: 'Nexo Voice / IA Voice', funcion: 'Asistente telefónico con voz natural para atender llamadas, conversar con clientes y automatizar atención.', estado: 'En desarrollo y conexión', proyectos: ['Nexo Voice'] },
        { nombre: 'Vercel AI Gateway', funcion: 'Conecta Director IA con el modelo de inteligencia artificial que analiza datos y responde.', estado: 'En uso', proyectos: ['Director IA'] },
        { nombre: 'ChatGPT', funcion: 'Diseño, programación, revisión, estrategia y soporte durante la creación de productos.', estado: 'En uso', proyectos: ['Ecosistema completo'] }
      ],
      productos: [
        { nombre: 'Director IA', papel: 'Centro de mando del ecosistema', funcion: 'Asistente ejecutivo que ayuda a controlar proyectos, clientes, tareas, prioridades, información de los distintos programas y decisiones del negocio.', herramientas: ['GitHub', 'Vercel', 'Vercel AI Gateway', 'Supabase'], estado: 'Activo' },
        { nombre: 'FacturaNexo', papel: 'Facturación y administración', funcion: 'Programa de facturación y gestión para clientes, productos, presupuestos, albaranes, facturas y procesos administrativos.', herramientas: ['GitHub', 'Vercel'], estado: 'Activo', permiso: 'Solo lectura desde Director IA' },
        { nombre: 'CitaNexo', aliases: ['Citanexo'], papel: 'Reservas y agenda', funcion: 'Sistema de reservas y citas para negocios como peluquerías, clínicas, centros de estética, talleres y otros servicios con agenda. Permite gestionar horarios, servicios, trabajadores y disponibilidad.', herramientas: ['GitHub', 'Vercel'], estado: 'Activo / evolución' },
        { nombre: 'ComandaNexo', papel: 'Pedidos y hostelería', funcion: 'Pedidos desde móvil para consumo, recogida o reparto y envío de comandas a cocina o barra.', estado: 'En desarrollo' },
        { nombre: 'FichaNexo', papel: 'Control horario y trabajadores', funcion: 'Sistema para registrar entradas, salidas, fichajes, jornada laboral y gestión de horarios de trabajadores.', estado: 'Planificado / desarrollo' },
        { nombre: 'Nexo Voice / IA Voice', papel: 'Atención telefónica con inteligencia artificial', funcion: 'Asistente de voz telefónico natural para atender llamadas, conversar con clientes, responder preguntas, recoger información, gestionar reservas y automatizar tareas de atención telefónica.', herramientas: ['Twilio', 'IA de voz'], estado: 'En configuración ahora' },
        { nombre: 'Trabajadores Digitales Nexo', papel: 'Automatización por funciones', funcion: 'Asistentes de inteligencia artificial especializados en atención al cliente, seguimiento comercial, marketing, administración, pedidos, organización y soporte.', estado: 'Línea de producto en desarrollo' },
        { nombre: 'Hostelecan', funcion: 'Maquinaria de hostelería y servicio técnico.', estado: 'Activo', relacion: 'Negocio que puede utilizar soluciones NEXOIA' },
        { nombre: 'Tu Maquinaria Hostelería', funcion: 'Proyecto comercial de maquinaria de hostelería.', estado: 'Activo', relacion: 'Negocio que puede utilizar soluciones NEXOIA' },
        { nombre: 'Servicios Editoriales', funcion: 'Creación, corrección, maquetación y publicación de libros.', herramientas: ['IA', 'Amazon KDP', 'marketing'], estado: 'Activo', relacion: 'Negocio que puede utilizar soluciones NEXOIA' }
      ]
    };

    const system = `Eres Director IA, el asistente ejecutivo personal de Carlos. Respondes siempre en español natural, cercano, claro y práctico, como una conversación real entre un director ejecutivo y Carlos. Tu respuesta debe sonar bien tanto leída en pantalla como pronunciada en voz alta.

NEXOIA es la empresa paraguas del ecosistema. Cuando Carlos te pregunte qué es NEXOIA, qué programas tiene o cómo se conectan, debes explicar la visión completa del ecosistema y no limitarte a enumerar herramientas.

Tienes conocimiento del ecosistema de herramientas y productos de Carlos que se incluye en el contexto. Úsalo cuando te pregunte qué programa se utiliza, cómo se conectan los sistemas, qué proyecto depende de qué herramienta o cuál es el estado conocido. No inventes conexiones que no aparezcan en el contexto. Si algo no está confirmado, dilo.

FacturaNexo está protegido. Puedes consultar y explicar su estado, pero no debes indicar que puedes modificarlo ni asumir permiso de escritura sin autorización expresa de Carlos.

REGLAS DE ESTILO IMPORTANTES:
Usa solo texto plano. No uses Markdown, asteriscos, almohadillas, guiones de lista, viñetas ni símbolos de formato. Escribe frases cortas, naturales y fluidas. Si hay varias tareas, introdúcelas conversando. Evita respuestas robóticas. Sé breve salvo que Carlos pida detalle.

Ayudas a priorizar tareas, hacer seguimiento comercial, detectar oportunidades, preparar campañas, ordenar el trabajo y comprender el ecosistema técnico y comercial de NEXOIA. No inventes datos: si falta información, dilo y propón el siguiente paso.`;

    const context = {
      empresaSeleccionada: company,
      tareas: Array.isArray(tasks) ? tasks : [],
      clientes: Array.isArray(clients) ? clients : [],
      estadoProyecto: projectStatus,
      ecosistema: ecosystem
    };

    const messages = [
      { role: 'system', content: system },
      { role: 'user', content: `Contexto actual del panel y ecosistema:\n${JSON.stringify(context, null, 2)}\n\nPregunta de Carlos: ${question}` }
    ];

    async function callModel(model) {
      const response = await fetch('https://ai-gateway.vercel.sh/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ model, messages, temperature: 0.35, max_tokens: 900 })
      });
      const data = await response.json().catch(() => ({}));
      return { response, data };
    }

    const models = ['poolside/laguna-s-2.1-free', 'poolside/laguna-s-2.1-free', 'poolside/laguna-s-2.1'];
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
