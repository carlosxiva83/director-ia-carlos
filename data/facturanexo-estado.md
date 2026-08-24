# FacturaNexo — estado para Director IA

Actualizado: 24/08/2026

## Estado Día 1
- Mantener intacto el FacturaNexo de trabajo que contiene los datos reales.
- FacturaNexo madre / plantilla maestra está separada para servir como base limpia de futuros clientes.
- La madre debe empezar sin clientes, proveedores, artículos ni documentos.
- Se ha reforzado el aislamiento de la madre: se ha retirado el módulo de sincronización compartida y bloqueado la sincronización para evitar cargar datos del FacturaNexo de trabajo.
- Cambios desplegados correctamente en Vercel.

## Limpieza de producto
- Los importadores se presentan como funciones propias de FacturaNexo.
- Etiquetas previstas: Importar clientes, Importar proveedores e Importar artículos.
- No mostrar FactuSOL como marca en los botones de la interfaz.
- Eliminar botones duplicados de importación.
- Mantener compatibilidad interna con XLS/XLSX procedentes de otros sistemas y ampliar posteriormente a CSV/plantillas genéricas.

## Panel Nexo
- Panel de control provisional disponible para futuras altas de empresas.
- Objetivo: crear y gestionar clientes de FacturaNexo desde un panel central.
- En una fase posterior se conectará a base de datos central, autenticación, multiempresa, permisos, backups y seguridad profesional.

## Enlaces operativos
- FacturaNexo madre: https://facturanexo.vercel.app/facturanexo-madre
- Panel Nexo: https://facturanexo.vercel.app/panel-control

## Director IA
- Debe usar este estado como referencia del proyecto FacturaNexo.
- No mezclar, borrar ni migrar los datos reales del FacturaNexo de trabajo sin una copia previa y autorización.
- Próxima fase: conectar Director IA con Panel Nexo para ayudar con altas y control de clientes.
