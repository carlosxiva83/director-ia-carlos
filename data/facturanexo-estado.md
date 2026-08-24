# FacturaNexo — estado para Director IA

Actualizado: 24/08/2026

## Decisión actual
- Mantener intacto el FacturaNexo de trabajo que ya contiene datos reales.
- Existe una FacturaNexo madre / plantilla maestra separada y limpia, destinada a servir como base para futuros clientes.
- La plantilla madre debe empezar sin clientes, proveedores, artículos ni documentos.
- La plantilla madre NO debe cargar ni sincronizar accidentalmente la copia compartida del FacturaNexo de trabajo. Si aparece el aviso de cargar copia compartida, la decisión actual es cancelar; hay que aislar esa sincronización antes de usar la plantilla para nuevos clientes.

## Panel Nexo
- Se ha preparado un panel de control provisional para futuras altas de empresas.
- El objetivo es que desde este panel se creen y gestionen los clientes de FacturaNexo.
- Por ahora se mantiene sin infraestructura de pago; más adelante se conectará a base de datos central, autenticación y seguridad profesional antes de comercializar.

## Director IA
- El Director IA debe conocer este estado y, en la siguiente fase, conectarse al Panel Nexo para ayudar con altas y control de clientes de FacturaNexo.
- No mezclar ni borrar los datos del FacturaNexo de trabajo al preparar la plantilla madre.
