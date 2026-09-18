export type BlogCategory = "Observatorio" | "Ahorro" | "Guías";

export type BlogPost = {
  slug: string;
  title: string;
  excerpt: string;
  category: BlogCategory;
  publishedAt: string;
  readingTime: string;
  featured?: boolean;
};

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "evolucion-gasolina-95-ultimos-30-dias",
    title: "La gasolina 95 en los últimos 30 días: una subida que se nota",
    excerpt:
      "Analizamos el histórico de precios disponible en GasolinaGo para entender cuánto ha cambiado el litro y dónde se encuentra el nivel más bajo.",
    category: "Observatorio",
    publishedAt: "2026-09-18",
    readingTime: "5 min",
    featured: true,
  },
  {
    slug: "cuanto-puedes-ahorrar-comparando-gasolineras",
    title: "Cuánto puedes ahorrar comparando gasolineras",
    excerpt:
      "Una diferencia pequeña por litro puede convertirse en varios euros por depósito. Te enseñamos a calcularlo sin complicaciones.",
    category: "Ahorro",
    publishedAt: "2026-09-16",
    readingTime: "4 min",
  },
  {
    slug: "por-que-cambia-precio-gasolina",
    title: "Por qué cambia tanto el precio de una gasolinera a otra",
    excerpt:
      "Ubicación, costes y estrategia comercial explican por qué dos estaciones cercanas pueden mostrar precios muy diferentes.",
    category: "Guías",
    publishedAt: "2026-09-12",
    readingTime: "6 min",
  },
];

export function getBlogPost(slug: string) {
  return BLOG_POSTS.find((post) => post.slug === slug);
}

export function formatBlogDate(date: string) {
  return new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Madrid",
  }).format(new Date(`${date}T12:00:00+02:00`));
}

