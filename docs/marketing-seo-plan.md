# Plan de marketing y SEO de GasolinaGo

Fecha de inicio: 16 de septiembre de 2026.

## Objetivo

Conseguir usuarios recurrentes sin inversión publicitaria y usar el proyecto como laboratorio de SEO, analítica y marketing de producto.

La métrica de negocio sigue siendo:

`usuarios con directions_click / usuarios activos`

Para adquisición orgánica se añaden tres métricas:

- clics orgánicos desde buscadores;
- páginas locales indexadas;
- porcentaje de visitantes orgánicos que pulsa `directions_click`.

## Punto de partida

- El dominio `gasolinago.com` todavía no muestra resultados indexados en buscadores.
- La portada entrega aproximadamente 2,67 MB de datos de estaciones.
- La API tarda alrededor de 4,0 s en la primera petición y 2,3 s en caliente desde el preview.
- La intención con mejor encaje es local: “gasolineras baratas en [ciudad] hoy”.
- Los competidores que posicionan crean páginas por provincia y localidad con precios, fecha, rankings y ahorro.

## Posicionamiento

**Promesa:** precios oficiales y una decisión clara, sin registro ni publicidad invasiva.

**Diferenciadores:**

- diseño más limpio que los comparadores tradicionales;
- fuente y metodología visibles;
- cálculo de ahorro frente a la media local;
- conexión directa entre comparar y abrir la ruta;
- análisis originales construidos sobre datos abiertos.

## Estrategia de búsquedas

### Prioridad 1: intención transaccional local

- gasolineras baratas en Madrid hoy;
- gasolina barata en Barcelona;
- precio gasolina 95 en Valencia;
- diésel barato en Sevilla;
- gasolinera más barata cerca de mí.

Estas búsquedas deben aterrizar en una página útil que responda sin obligar a manipular el mapa.

### Prioridad 2: comparativas y ahorro

- cuánto ahorro buscando una gasolinera barata;
- gasolina low cost vs Repsol / Cepsa;
- ciudades con mayor diferencia de precios;
- precio medio de la gasolina por ciudad.

### Prioridad 3: actualidad basada en datos

- dónde ha subido más la gasolina esta semana;
- gasolineras más baratas para un puente o una operación salida;
- diferencias de precio entre barrios, ciudades o provincias.

## Plan de 30 días

### Semana 1 — Indexación y medición

1. Verificar el dominio como propiedad de dominio en Google Search Console.
2. Enviar `https://www.gasolinago.com/sitemap.xml`.
3. Solicitar indexación de la portada, `/gasolineras` y cinco páginas de ciudad.
4. Configurar Bing Webmaster Tools importando la propiedad de Search Console.
5. Marcar `directions_click` como evento clave en GA4.
6. Crear dimensiones para `territorio`, `combustible`, `origin` y `source`.

### Semana 2 — SEO local

1. Publicar y revisar las primeras 20 páginas de ciudad.
2. Comprobar títulos, canonical, enlaces internos y datos estructurados.
3. Comparar en Search Console impresiones y consultas por ciudad.
4. Ampliar únicamente ciudades que tengan datos suficientes y contenido diferenciable.

### Semana 3 — Primer activo enlazable

Publicar un análisis propio, por ejemplo:

> “La diferencia entre la gasolinera más barata y la media en las 20 mayores ciudades de España”.

Debe incluir metodología, tabla descargable, fecha y hallazgos verificables. Es más fácil conseguir menciones con un dato original que promocionando un comparador genérico.

### Semana 4 — Distribución orgánica

1. Compartir el análisis desde el perfil personal de LinkedIn explicando el aprendizaje y enlazando el estudio.
2. Enviar una nota breve y personalizada a periodistas de consumo, motor y economía con dos datos relevantes, sin envío masivo.
3. Publicar en una comunidad relevante solo cuando el contenido responda a sus reglas y aporte datos, no como promoción vacía.
4. Reutilizar el hallazgo en una gráfica sencilla para X, LinkedIn y portfolio.

## Ciclo editorial mensual

- Semana 1: evolución nacional y ciudades con mayores cambios.
- Semana 2: comparación de marcas low cost y tradicionales.
- Semana 3: análisis local de una ciudad con demanda observada en Search Console.
- Semana 4: guía estacional — vacaciones, puente u operación salida.

Cada contenido debe enlazar a páginas locales y medir `directions_click`, no solo visitas.

## Qué no hacer

- No generar miles de páginas casi idénticas.
- No inventar reseñas ni afirmar que una estación es “mejor” solo por precio.
- No comprar enlaces ni publicar spam en foros.
- No crear artículos genéricos con IA sin datos propios.
- No medir el éxito solo por sesiones: importa que el usuario encuentre una estación útil.

## Objetivos de los primeros 90 días

| Métrica | Objetivo inicial |
| --- | ---: |
| Páginas locales válidas e indexadas | 20–50 |
| Impresiones orgánicas mensuales | 10.000 |
| CTR orgánico | ≥ 4 % |
| Conversión orgánica a `directions_click` | ≥ 8 % |
| Análisis de datos originales publicados | 3 |
| Menciones o enlaces editoriales reales | 3 |

Son objetivos de aprendizaje, no garantías. Se revisan con datos reales después de cuatro semanas.

## Fuentes de referencia

- [Google: guía SEO para desarrolladores](https://developers.google.com/search/docs/fundamentals/get-started-developers)
- [Google: guía básica de SEO](https://developers.google.com/search/docs/fundamentals/seo-starter-guide)
- [Google: estructura de URLs](https://developers.google.com/search/docs/crawling-indexing/url-structure)
- [Google Search Console](https://search.google.com/search-console/about)
