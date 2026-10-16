"use client";

import { THEME_KEY } from "@/lib/theme";

export function ThemeToggle() {
  function toggle() {
    const root = document.documentElement;
    const current = root.dataset.theme ?? (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    const next = current === "dark" ? "light" : "dark";
    root.dataset.theme = next;
    try { localStorage.setItem(THEME_KEY, next); } catch { /* sin almacenamiento */ }
  }
  return (
    <button type="button" className="icon-btn gg-glass" onClick={toggle} aria-label="Cambiar entre tema claro y oscuro">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></svg>
    </button>
  );
}
