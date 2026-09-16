"use client";

type EventParams = Record<string, string | number | boolean | undefined>;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export const CONSENT_KEY = "gasolinago_consent";

export function track(name: string, params: EventParams = {}) {
  if (typeof window === "undefined") return;
  if (window.localStorage.getItem(CONSENT_KEY) !== "yes") return;
  if (window.gtag) {
    window.gtag("event", name, params);
    return;
  }

  window.dataLayer = window.dataLayer ?? [];
  window.dataLayer.push(["event", name, params]);
}
