// Formatos de texto compartidos por servidor y navegador (sin dependencias).

// "BALLENOIL" → "Ballenoil"; las siglas cortas (BP, Q8) se mantienen.
export function displayBrand(brand: string) {
  return brand
    .trim()
    .split(/\s+/)
    .map((word) => (word.length <= 3 ? word : word.charAt(0) + word.slice(1).toLocaleLowerCase("es-ES")))
    .join(" ");
}

export function displayAddress(address: string) {
  return address
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[\s,]+$/, "")
    .toLocaleLowerCase("es-ES")
    .replace(/(^|[\s,(-])([a-záéíóúüñ])/g, (_, separator: string, letter: string) => `${separator}${letter.toLocaleUpperCase("es-ES")}`)
    .replace(/\b(Km|Sn|S\/n)\b/g, (match) => match.toLowerCase());
}

const DAY_NAMES: Record<string, string> = { L: "lun", M: "mar", X: "mié", J: "jue", V: "vie", S: "sáb", D: "dom" };

// "L-V: 06:00-23:00; S-D: 07:00-22:00" → "Lun–vie 06:00–23:00 · sáb–dom 07:00–22:00"
export function formatSchedule(schedule: string) {
  const text = schedule.trim();
  if (!text || /no disponible/i.test(text)) return "Horario no disponible";
  if (/^L\s*-\s*D\s*:\s*24\s*H$/i.test(text)) return "Abierta 24 horas";
  const parts = text.split(";").map((part) => {
    const match = part.trim().match(/^([LMXJVSD](?:\s*-\s*[LMXJVSD])?)\s*:\s*(.+)$/);
    if (!match) return part.trim();
    const days = match[1].split("-").map((day) => DAY_NAMES[day.trim()] ?? day.trim()).join("–");
    const hours = /24\s*H/i.test(match[2]) ? "24 h" : match[2].replace(/\s*-\s*/g, "–").trim();
    return `${days} ${hours}`;
  });
  const out = parts.join(" · ");
  return out.charAt(0).toLocaleUpperCase("es-ES") + out.slice(1);
}

export const isOpen24h = (schedule: string) => /^L\s*-\s*D\s*:\s*24\s*H$/i.test(schedule.trim());
