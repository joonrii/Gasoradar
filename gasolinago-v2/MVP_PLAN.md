# GasolinaGo V2 — MVP

## Principio

La primera versión debe ser pequeña, rápida y medible. No se implementará un "GasolinaGo Score" ni cálculos complejos de coste de desplazamiento en el MVP.

## Objetivo del MVP

Responder muy bien a tres preguntas:

1. ¿Qué gasolineras hay cerca?
2. ¿Cuál tiene el precio más barato?
3. ¿Cómo ha evolucionado su precio?

## Funcionalidades incluidas

### Radar
- Mapa a pantalla completa.
- Clustering de estaciones.
- Clusters legibles en desktop y móvil.
- Al acercarse, mostrar estaciones individuales.
- Marcadores individuales con precio del combustible seleccionado.
- Filtros simples de combustible.
- Botón de ubicación del usuario.
- Selección de estación desde mapa/lista.

### Detalle de estación
- Nombre/marca.
- Dirección.
- Precio actual.
- Fecha/hora de actualización disponible.
- Comparación simple contra la media de la zona.
- Histórico de precio.
- Botón "Cómo llegar".

### Histórico
- 7 días, 30 días, 90 días y 1 año cuando haya datos suficientes.
- Gráfico sencillo y rápido.
- Variación frente al inicio del periodo.
- Indicador simple: por debajo / cerca / por encima de su media reciente.

### Búsqueda
- Buscar ciudad/provincia.
- Centrar el mapa en la zona.
- Mostrar sus estaciones.

### Datos
- España completa.
- Actualización automática mediante el pipeline existente.
- Mantener histórico diario por estación y combustible.

## Fuera del MVP

- GasolinaGo Score.
- Coste real del desplazamiento.
- Cálculo por litros/depósito.
- En mi ruta.
- Cuentas de usuario.
- Alertas/notificaciones.
- Suscripciones.
- IA.
- App nativa.
- Funcionalidades sociales.

## Métricas principales

Medir desde el inicio:

- page_view
- radar_open
- location_enabled
- search_city
- station_view
- history_open
- directions_click
- fuel_change

### North Star inicial

`directions_click / usuarios`

La señal principal de valor será que el usuario encuentre una estación y decida navegar hacia ella.

## Orden de implementación

1. Arreglar layout/mapa fullscreen.
2. Añadir clustering.
3. Marcadores con precio.
4. Filtros y búsqueda simples.
5. Ubicación del usuario.
6. Detalle de estación.
7. Histórico dentro del detalle.
8. España completa.
9. SEO local.
10. Analytics y experimentación.
