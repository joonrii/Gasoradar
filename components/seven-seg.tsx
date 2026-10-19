// Display de siete segmentos (como el de un surtidor o el tótem de precios).
// Sin JavaScript: se puede usar en componentes de servidor y de cliente.

const SEGMENTS: Record<string, string> = {
  "0": "abcdef", "1": "bc", "2": "abged", "3": "abgcd", "4": "fgbc", "5": "afgcd",
  "6": "afgedc", "7": "abc", "8": "abcdefg", "9": "abcdfg", "-": "g", " ": "",
};
const RECTS: Record<string, [number, number, number, number]> = {
  a: [4, 0, 12, 3.4], g: [4, 16.3, 12, 3.4], d: [4, 32.6, 12, 3.4],
  f: [0.4, 3.8, 3.4, 12.2], b: [16.2, 3.8, 3.4, 12.2], e: [0.4, 20, 3.4, 12.2], c: [16.2, 20, 3.4, 12.2],
};

export function SevenSeg({ text, label, className = "" }: { text: string; label?: string; className?: string }) {
  let x = 0;
  const cells: React.ReactNode[] = [];
  [...text].forEach((char, i) => {
    if (char === "," || char === ".") {
      cells.push(<rect key={i} className="on" x={x + 1} y={32.6} width={3.6} height={3.4} rx={1.2} />);
      x += 7;
      return;
    }
    const lit = SEGMENTS[char] ?? "";
    cells.push(
      <g key={i} transform={`translate(${x} 0) skewX(-6)`}>
        {Object.entries(RECTS).map(([segment, [rx, ry, w, h]]) => (
          <rect key={segment} className={lit.includes(segment) ? "on" : undefined} x={rx} y={ry} width={w} height={h} rx={1.4} />
        ))}
      </g>,
    );
    x += 23;
  });
  return (
    <svg className={`seg ${className}`} viewBox={`-2 -1 ${x + 2} 38`} preserveAspectRatio="xMaxYMid meet" role="img" aria-label={label ?? text.trim()}>
      {cells}
    </svg>
  );
}

export const padDisplay = (value: number, decimals: number, width: number) =>
  value.toFixed(decimals).replace(".", ",").padStart(width, " ");
