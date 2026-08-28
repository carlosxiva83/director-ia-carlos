# Nexo Voice v0.1

Primer backend estable para Nexo Voice usando telefonía SIP + OpenAI Realtime.

## Objetivo de esta versión

1. Recibir una llamada telefónica.
2. Aceptarla con OpenAI Realtime.
3. Mantener toda la conversación en español de España.
4. Evitar el antiguo puente WebSocket Twilio -> servidor -> OpenAI cuando SIP directo sea suficiente.
5. Dejar preparada la base para herramientas de reservas, cambios y cancelaciones.

## Endpoints

- `GET /api/health` — comprueba que el servicio está activo.
- `POST /api/incoming-call` — webhook para eventos `realtime.call.incoming` de OpenAI.

## Variables de entorno

- `OPENAI_API_KEY` — clave de API de OpenAI.
- `NEXO_VOICE_MODEL` — por defecto `gpt-realtime-2`.

## Flujo previsto

Número de empresa / Twilio -> SIP -> OpenAI Realtime -> webhook `realtime.call.incoming` -> `/api/incoming-call` -> aceptación de la llamada con instrucciones de Nexo Voice.

## Reglas actuales del asistente

- Español de España por defecto.
- No cambiar al inglés salvo petición explícita del cliente.
- Identificarse como asistente virtual cuando corresponda.
- No inventar horarios, precios ni disponibilidad.
- Confirmar datos críticos antes de reservar, modificar o cancelar.

## Próxima fase

- Verificar la firma de webhooks de OpenAI antes de producción.
- Configurar voz definitiva.
- Conectar número/SIP de Twilio.
- Añadir herramientas de empresa: horarios, servicios, precios y disponibilidad.
- Integración posterior con CitaNexo para crear, modificar y cancelar citas.
