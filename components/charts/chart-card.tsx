"use client";

import { type ReactNode, useState } from "react";

export type ChartTable = { head: string[]; rows: string[][] };

// Tarjeta de gráfico con su "Ver tabla": cada valor se puede leer sin depender
// del color ni del ratón.
export function ChartCard({
  title,
  subtitle,
  table,
  legend,
  className = "",
  headerExtra,
  children,
}: {
  title?: ReactNode;
  subtitle?: ReactNode;
  table?: ChartTable;
  legend?: ReactNode;
  className?: string;
  headerExtra?: ReactNode;
  children: ReactNode;
}) {
  const [showTable, setShowTable] = useState(false);
  return (
    <section className={`gg-card chart-card ${className}`}>
      <header className="chart-card-head">
        <div>
          {title ? <h3>{title}</h3> : null}
          {subtitle ? <p>{subtitle}</p> : null}
          {headerExtra}
        </div>
        {table ? (
          <button type="button" className="table-toggle" onClick={() => setShowTable((value) => !value)} aria-pressed={showTable}>
            {showTable ? "Ver gráfico" : "Ver tabla"}
          </button>
        ) : null}
      </header>
      {legend ? <div className="chart-legend">{legend}</div> : null}
      {showTable && table ? (
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr>{table.head.map((cell) => <th key={cell}>{cell}</th>)}</tr></thead>
            <tbody>{table.rows.map((row, i) => <tr key={i}>{row.map((cell, j) => <td key={j}>{cell}</td>)}</tr>)}</tbody>
          </table>
        </div>
      ) : children}
    </section>
  );
}

export function LegendItem({ color, label, box = false }: { color: string; label: string; box?: boolean }) {
  return <span className="legend-item"><i className={box ? "box" : ""} style={{ background: color }} />{label}</span>;
}
