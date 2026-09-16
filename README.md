# GasolinaGo

Comparador gratuito de precios de carburante en España. Usa datos oficiales del Ministerio, permite buscar por ciudad, comparar estaciones y abrir la ruta hacia la elegida.

**Web:** [gasolinago.com](https://gasolinago.com/)

## Objetivo del proyecto

GasolinaGo es un producto útil y, a la vez, un laboratorio personal para practicar desarrollo con IA, analítica digital, SEO y marketing de producto sin depender de inversión publicitaria.

La métrica principal es:

`usuarios con directions_click / usuarios activos`

## Qué incluye la V2

- Cobertura de España con más de 11.000 estaciones.
- Precios oficiales cacheados durante 30 minutos y copia local de respaldo.
- Búsqueda libre y selección exacta de municipio.
- Filtros para gasolina 95, gasolina 98, diésel A y diésel premium.
- Orden por precio o por distancia cuando el usuario autoriza su ubicación.
- Mapa OpenStreetMap con clustering y marcadores de precio.
- Comparación de cada estación con la media visible.
- Botón **Abrir ruta** como conversión principal.
- GA4 opcional, cargado únicamente después del consentimiento.
- `robots.txt`, sitemap y metadatos sociales.
- Directorio SEO con precios y rankings para las principales ciudades.

## Tecnología

| Área | Tecnología |
| --- | --- |
| Aplicación | Next.js 16, React 19 y TypeScript |
| Mapa | Leaflet, React Leaflet y OpenStreetMap |
| Datos | API pública de precios de carburantes del Ministerio |
| Analítica | Google Analytics 4 con consentimiento |
| Despliegue | Vercel |

## Desarrollo local

```bash
npm install
npm run dev
```

Verificaciones antes de publicar:

```bash
npm run lint
npm run build
```

## Arquitectura de datos

El navegador consulta `/api/stations`. La ruta obtiene en paralelo las 52 provincias, normaliza precios y coordenadas y entrega una respuesta homogénea. Si el servicio oficial falla, activa `datos/estaciones.json` para que la aplicación siga siendo utilizable.

Los eventos, parámetros y reglas de privacidad están documentados en [`docs/analytics-plan.md`](docs/analytics-plan.md).
El plan de captación orgánica está en [`docs/marketing-seo-plan.md`](docs/marketing-seo-plan.md).

## Estado

La V2 cubre el flujo principal completo: entrar, buscar, comparar, seleccionar y abrir una ruta. Las siguientes iteraciones deberían centrarse en SEO local, histórico por estación y experimentos medibles de adquisición y conversión.
