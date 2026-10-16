export const THEME_KEY = "gg-theme";

// Se ejecuta antes de pintar (ver app/layout.tsx) para evitar el parpadeo de tema.
export const themeBootScript = `try{var t=localStorage.getItem("${THEME_KEY}");if(t==="dark"||t==="light")document.documentElement.dataset.theme=t}catch(e){}`;
