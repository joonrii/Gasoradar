# Plan de medición de GasolinaGo

## Objetivo

La métrica principal es el porcentaje de usuarios que encuentran una estación útil y pulsan **Abrir ruta**.

`tasa de salida = usuarios con directions_click / usuarios activos`

Esta métrica refleja una intención real de repostar, aunque no confirma una visita ni una compra.

## Embudo principal

1. `page_view`: entra en la web; lo registra GA4 automáticamente tras el consentimiento.
2. `radar_open`: recibe correctamente el listado de estaciones.
3. `search_city`, `location_enabled` o `fuel_change`: acota la decisión.
4. `station_view`: abre el detalle de una estación.
5. `directions_click`: abre la ruta hacia esa estación.

## Eventos y parámetros

| Evento | Cuándo se envía | Parámetros |
| --- | --- | --- |
| `radar_open` | Carga el listado o se acepta analítica después de cargarlo | `station_count`, `source` |
| `fuel_change` | Cambia el carburante | `combustible` |
| `search_city` | Elige una sugerencia exacta | `territorio` |
| `location_enabled` | Autoriza una ubicación válida | ninguno |
| `station_view` | Abre el detalle | `station_id`, `territorio`, `combustible` |
| `directions_click` | Pulsa **Abrir ruta** | `station_id`, `territorio`, `combustible` |

No se envían coordenadas, dirección postal, localidad ni texto libre a GA4.

## Configuración recomendada en GA4

1. Marcar `directions_click` como evento clave.
2. Crear dimensiones personalizadas para `territorio`, `combustible` y `source`.
3. Crear una métrica personalizada para `station_count` si resulta útil.
4. Excluir el tráfico interno durante las pruebas.
5. Validar todos los eventos con DebugView después de aceptar analítica.
6. Revisar semanalmente el embudo y anotar cada cambio de producto o campaña.

## Informes iniciales

- Conversión a `directions_click` por dispositivo, territorio y combustible.
- Uso de búsqueda, ubicación y filtros antes de la conversión.
- Ratio `station_view → directions_click` para medir la calidad del detalle.
- Errores de carga comparando `source = live` frente a `source = fallback`.

## Criterio de calidad

Cada evento tiene un significado único, un nombre estable y solo los parámetros necesarios. Cualquier cambio se documenta aquí antes de publicarse.
