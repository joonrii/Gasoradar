# Plan de medición de GasolinaGo

## Objetivo

La métrica principal del producto es el porcentaje de usuarios que encuentran una estación útil y pulsan **Cómo llegar**.

`tasa de salida = usuarios con directions_click / usuarios activos`

Esta métrica conecta el uso de la web con una intención real de repostar. No demuestra que la persona haya llegado o comprado combustible.

## Embudo principal

1. `page_view`: entra en la web.
2. `buscar_localidad`, `filtrar_distancia` o `usar_ubicacion`: acota la búsqueda.
3. `elegir_combustible`: cambia el carburante.
4. `directions_click`: abre la ruta hacia una estación.

## Eventos y parámetros

| Evento | Cuándo se envía | Parámetros útiles |
| --- | --- | --- |
| `elegir_territorio` | Selecciona provincia o toda la zona | `territorio` |
| `elegir_combustible` | Cambia el carburante | `combustible` |
| `buscar_localidad` | Elige una sugerencia de municipio | `localidad`, `territorio` |
| `filtrar_distancia` | Aplica un radio | `km` |
| `usar_ubicacion` | Autoriza una ubicación válida | sin coordenadas |
| `filtro_abiertas` | Activa “abiertas ahora” | — |
| `directions_click` | Pulsa “Cómo llegar” | `station_id`, `territorio`, `combustible`, `posicion` |

No se envían coordenadas, dirección postal ni texto libre a GA4.

## Informes iniciales

- Tasa de `directions_click` por dispositivo, territorio y combustible.
- Uso de buscador, ubicación y filtros antes de `directions_click`.
- Municipios elegidos en el autocompletado y su tasa de salida.
- Posición del resultado que genera el clic para saber si el ranking ayuda.

## Configuración de GA4

1. Marcar `directions_click` como evento clave.
2. Crear dimensiones personalizadas para `territorio`, `combustible` y `posicion`.
3. Excluir el tráfico interno durante las pruebas.
4. Validar los eventos con DebugView después de aceptar las cookies.
5. Revisar semanalmente el embudo y documentar cada cambio de producto o campaña.

## Criterio de calidad

Cada evento debe tener un significado único, un nombre estable y solo parámetros necesarios. Cualquier cambio se actualiza aquí antes de publicarse.
