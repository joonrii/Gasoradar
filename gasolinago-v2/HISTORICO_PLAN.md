# GasolinaGo — Históricos de precios

Los históricos son una funcionalidad principal, no un añadido.

## Niveles

### Gasolinera
- precio actual por combustible
- evolución 7/30/90 días cuando haya datos suficientes
- variación absoluta y porcentual
- comparación con media de su ciudad/provincia
- indicador de precio habitual: barato / normal / caro

### Ciudad
- precio medio actual
- evolución de los últimos 30/90 días
- comparación con provincia y España
- combustible seleccionable

### Provincia / España
- precio medio por combustible
- evolución temporal
- ranking de provincias más baratas/caras

## UX

En la ficha de una gasolinera:

1. precio actual
2. estado del precio respecto a su histórico
3. gráfico
4. comparación con la zona
5. botón "Cómo llegar"

En móvil, el histórico se abre desde una tarjeta compacta para no quitar protagonismo al radar.

## Datos

Formato lógico diario:

`date | station_id | g95 | g98 | diesel | diesel_premium`

No guardar snapshots horarios si la fuente no aporta cambios con esa granularidad.

## Métricas derivadas

- cambio vs ayer
- cambio vs 7 días
- cambio vs 30 días
- media móvil 7/30 días
- percentil de precio de la estación dentro de su zona
- diferencia contra media de ciudad/provincia

## Principio

El histórico debe ayudar a responder una pregunta: "¿Es buen momento para repostar aquí?". No se trata solo de enseñar un gráfico.