export function cellDisc(cx: number, cy: number, radius: number, cell: number) {
  if (radius <= 0) return "";
  const parts: string[] = [];
  const top = Math.floor((cy - radius) / cell) * cell;
  for (let y = top; y < cy + radius; y += cell) {
    const mid = Math.min(Math.abs(y + cell / 2 - cy), radius);
    const half = Math.sqrt(radius * radius - mid * mid);
    const x0 = Math.floor((cx - half) / cell) * cell;
    const x1 = Math.ceil((cx + half) / cell) * cell;
    if (x1 > x0) parts.push(`M${x0} ${y}H${x1}V${y + cell}H${x0}Z`);
  }
  return parts.join("");
}
