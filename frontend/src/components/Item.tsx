import React from "react";
export function Item({ title, detail, color = "", tag }: { title: string; detail: string; color?: string; tag?: string }) {
  return <article className="item"><div className="item-row"><strong>{title}</strong>{tag ? <span className={`tag ${color}`}>{tag}</span> : null}</div><span>{detail}</span></article>;
}

export function Metric({ value, label }: { value: React.ReactNode; label: React.ReactNode }) {
  return (
    <div className="metric">
      <div className="metric-value">{value}</div>
      <div className="metric-label">{label}</div>
    </div>
  );
}

export default Item;
