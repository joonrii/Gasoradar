# ⛽ GasolinaGo

**Comparador de precios de carburante en tiempo real para toda España.**
Encuentra la gasolinera más barata cerca de ti, con datos oficiales del Ministerio actualizados a diario.

🔗 **[Ver la web en directo](https://gasoradar-teal.vercel.app/)**

---

## ¿Qué es?

GasolinaGo es una aplicación web que muestra los precios de las gasolineras de toda España, ordenadas de más barata a más cara según el combustible que elijas. Detecta tu ubicación para mostrarte las más cercanas, las sitúa en un mapa interactivo y registra la evolución de los precios día a día.

Nació de una necesidad real: las apps de gasolineras existentes son móviles, están cargadas de publicidad y no compiten en web. GasolinaGo apuesta por lo contrario: una web limpia, rápida y sin registro, centrada en una zona concreta.

---

## Qué hace

- 🗺️ **Mapa interactivo** con todas las gasolineras, coloreadas por precio (verde = barata, naranja = cara).
- 📍 **Geolocalización**: ordena las estaciones por cercanía y filtra por radio (5/10/25 km).
- 🔍 **Buscador inteligente** por localidad, marca o dirección, con autocompletado y tolerancia a la forma en que la Administración escribe los municipios (encuentra "Los Arcos" aunque el dato oficial diga "Arcos (Los)").
- 🥇 **Podio** de las tres gasolineras más baratas.
- 📊 **Histórico de precios**: gráfico de evolución que compara la media de cada territorio a lo largo del tiempo.
- 🔄 **Comparativa**: cada gasolinera indica si ha subido o bajado respecto a días anteriores.
- 📈 **Analítica y SEO** integrados para medir y captar visitas.

---

## Cómo está construido

El proyecto está diseñado para funcionar **sin coste de infraestructura** y **sin frameworks pesados**, priorizando el rendimiento y la mantenibilidad.

| Área | Tecnología |
|------|-----------|
| Frontend | HTML, CSS y JavaScript (sin framework, sin build) |
| Mapa | Leaflet + OpenStreetMap / CARTO |
| Gráficos | Chart.js |
| Backend | Función serverless en Vercel (proxy a la API oficial) |
| Automatización | GitHub Actions (recogida diaria de datos) |
| Datos | API de precios de carburantes del Ministerio para la Transición Ecológica |
| Analítica | Google Analytics 4 con consentimiento de cookies (RGPD) |
| Despliegue | Vercel |

---

## Decisiones técnicas interesantes

Estas son las partes del proyecto que resuelven un problema real, más allá de "pintar datos en pantalla":

**Proxy para sortear el CORS y proteger la API pública.**
La API del Ministerio no permite llamadas directas desde el navegador. Una función serverless actúa de intermediaria, limpia los datos (los precios vienen con coma decimal y los campos en español) y **cachea la respuesta 30 minutos**, de modo que la web aguanta mucho tráfico sin machacar un servicio público.

**Un pipeline de datos que se ejecuta solo.**
Un flujo de GitHub Actions descarga los precios cada mañana, calcula agregados (mínimo, medio y máximo por territorio y combustible) y los guarda versionados en el repositorio, generando además un CSV listo para análisis en herramientas de BI. Es un proceso ETL completo: extraer → transformar → guardar → visualizar.

**Normalización de datos del mundo real.**
Los datos oficiales tienen las inconsistencias típicas: municipios escritos como "Arcos (Los)", precios como texto con coma, campos vacíos. El buscador normaliza acentos, reordena artículos y compara por palabras, de forma que la experiencia de búsqueda es natural pese a la suciedad de los datos de origen.

**Cero dependencias de build.**
Toda la aplicación es un único archivo HTML autocontenido. No hay `npm install`, ni compilación, ni node_modules. Esto la hace trivial de desplegar, rapidísima de cargar y fácil de mantener.

---

## Arquitectura

```
Navegador  ──▶  Función serverless (Vercel)  ──▶  API del Ministerio
   │                     │
   │                     └── limpia + cachea 30 min
   │
   └──▶  datos/historico.json  ◀── GitHub Actions (diario)
                                    └── genera también CSV para BI
```

---

## Estado del proyecto

Proyecto personal en desarrollo activo. Actualmente cubre toda España mediante los datos oficiales del Ministerio.

**Próximos pasos:**
- Páginas por ciudad (migración a Next.js) para mejorar el posicionamiento en buscadores.
- Dashboard de análisis del histórico en Power BI.
- Calculadora de coste de repostaje según el depósito.

---

## Sobre el proyecto

Desarrollado como proyecto de aprendizaje y portfolio, aplicando datos abiertos a un problema cotidiano. El objetivo era construir un producto completo y funcional de principio a fin: desde el consumo y la limpieza de datos hasta el despliegue, la analítica y el SEO.

📊 Datos oficiales del Ministerio para la Transición Ecológica y el Reto Demográfico.
🗺️ Cartografía de OpenStreetMap.
