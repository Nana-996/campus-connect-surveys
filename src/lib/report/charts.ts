// Vector charts drawn straight into a jsPDF document.
// No html2canvas, no DOM dependency, no render race — and crisp when printed.

export type ChartDatum = { label: string; count: number };

export const REPORT_PALETTE = [
  "#1f4d33", // deep forest green (primary)
  "#4a6b52",
  "#7c9a6b", // sage
  "#b8c47a", // warm lime highlight
  "#c98a4b",
  "#8e7a5a",
  "#6b8e9e",
  "#a47b4c",
];

export const INK = "#241f1a";
export const MUTED = "#6f675d";
export const PAPER = "#faf6ee";
export const RULE = "#ddd4c6";

type Doc = any; // jsPDF instance (dynamically imported by callers)

function hex(doc: Doc, setter: "setFillColor" | "setDrawColor" | "setTextColor", color: string) {
  const h = color.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  doc[setter](r, g, b);
}

export const fill = (doc: Doc, c: string) => hex(doc, "setFillColor", c);
export const stroke = (doc: Doc, c: string) => hex(doc, "setDrawColor", c);
export const ink = (doc: Doc, c: string) => hex(doc, "setTextColor", c);

function truncate(doc: Doc, text: string, maxWidth: number) {
  let t = text;
  while (t.length > 1 && doc.getTextWidth(t) > maxWidth) t = t.slice(0, -1);
  return t.length < text.length ? `${t.slice(0, -1)}…` : t;
}

/** Wrap a label onto at most `maxLines` lines, ellipsising the final line. */
function wrapLabel(doc: Doc, text: string, maxWidth: number, maxLines = 2): string[] {
  const lines: string[] = doc.splitTextToSize(String(text ?? ""), maxWidth);
  if (lines.length <= maxLines) return lines;
  const kept = lines.slice(0, maxLines);
  kept[maxLines - 1] = truncate(doc, `${kept[maxLines - 1]} …`, maxWidth);
  return kept;
}

const share = (count: number, total: number) => (total > 0 ? Math.round((count / total) * 1000) / 10 : 0);

/** Height a horizontal-bar chart will occupy — call before drawing to reserve space. */
export function measureHorizontalBars(data: ChartDatum[], rowHeight = 24) {
  return Math.max(1, data.length) * rowHeight;
}

/** Horizontal bars with wrapped label, count and percentage on each row. */
export function drawHorizontalBars(
  doc: Doc,
  opts: {
    x: number; y: number; w: number; data: ChartDatum[]; palette?: string[]; rowHeight?: number; total?: number;
  },
): number {
  const { x, y, w, data } = opts;
  const palette = opts.palette ?? REPORT_PALETTE;
  const rowH = opts.rowHeight ?? 24;
  const labelW = Math.min(170, w * 0.4);
  const valueW = 62;
  const barMaxW = w - labelW - valueW;
  const max = Math.max(1, ...data.map((d) => d.count));
  const total = opts.total ?? data.reduce((a, b) => a + b.count, 0);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);

  data.forEach((d, i) => {
    const rowY = y + i * rowH;
    ink(doc, INK);
    const lines = wrapLabel(doc, d.label, labelW - 8, 2);
    lines.forEach((ln, li) => doc.text(ln, x, rowY + 8 + li * 9));
    const barW = Math.max(1, (d.count / max) * barMaxW);
    fill(doc, "#efe9dd");
    doc.roundedRect(x + labelW, rowY + 2, barMaxW, 10, 2, 2, "F");
    fill(doc, palette[i % palette.length]);
    doc.roundedRect(x + labelW, rowY + 2, barW, 10, 2, 2, "F");
    ink(doc, MUTED);
    doc.text(`${d.count} · ${share(d.count, total)}%`, x + w, rowY + 9.5, { align: "right" });
  });

  return measureHorizontalBars(data, rowH);
}

/** Vertical columns — good for ratings and ordered scales. */
export function drawColumns(
  doc: Doc,
  opts: { x: number; y: number; w: number; h: number; data: ChartDatum[]; palette?: string[] },
): number {
  const { x, y, w, h, data } = opts;
  const palette = opts.palette ?? REPORT_PALETTE;
  const max = Math.max(1, ...data.map((d) => d.count));
  const plotH = h - 20;
  const slot = w / Math.max(1, data.length);
  const barW = Math.min(46, slot * 0.6);

  stroke(doc, RULE);
  doc.setLineWidth(0.5);
  doc.line(x, y + plotH, x + w, y + plotH);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  const total = data.reduce((a, b) => a + b.count, 0);

  data.forEach((d, i) => {
    const barH = (d.count / max) * (plotH - 20);
    const bx = x + i * slot + (slot - barW) / 2;
    fill(doc, palette[i % palette.length]);
    doc.roundedRect(bx, y + plotH - barH, barW, Math.max(barH, 0.8), 2, 2, "F");
    ink(doc, MUTED);
    doc.setFontSize(7.5);
    doc.text(`${d.count} · ${share(d.count, total)}%`, bx + barW / 2, y + plotH - barH - 4, { align: "center" });
    ink(doc, INK);
    doc.setFontSize(8);
    wrapLabel(doc, d.label, slot - 4, 2).forEach((ln, li) =>
      doc.text(ln, bx + barW / 2, y + plotH + 10 + li * 9, { align: "center" }),
    );
  });

  return h;
}

/** Donut with a side legend. Good for a small number of categories. */
export function drawDonut(
  doc: Doc,
  opts: { x: number; y: number; size: number; data: ChartDatum[]; palette?: string[]; legendWidth?: number },
): number {
  const { x, y, size, data } = opts;
  const palette = opts.palette ?? REPORT_PALETTE;
  const total = data.reduce((a, b) => a + b.count, 0);
  const cx = x + size / 2;
  const cy = y + size / 2;
  const rOuter = size / 2;
  const rInner = rOuter * 0.56;

  if (total > 0) {
    let angle = -Math.PI / 2;
    data.forEach((d, i) => {
      if (d.count <= 0) return;
      const sweep = (d.count / total) * Math.PI * 2;
      fill(doc, palette[i % palette.length]);
      // Approximate the slice with a polygon fan — reliable across jsPDF versions.
      const steps = Math.max(2, Math.ceil((sweep / (Math.PI * 2)) * 96));
      const pts: Array<[number, number]> = [];
      for (let s = 0; s <= steps; s++) {
        const a = angle + (sweep * s) / steps;
        pts.push([cx + Math.cos(a) * rOuter, cy + Math.sin(a) * rOuter]);
      }
      for (let s = steps; s >= 0; s--) {
        const a = angle + (sweep * s) / steps;
        pts.push([cx + Math.cos(a) * rInner, cy + Math.sin(a) * rInner]);
      }
      drawPolygon(doc, pts);
      angle += sweep;
    });
  }
  fill(doc, "#ffffff");
  doc.circle(cx, cy, rInner, "F");
  ink(doc, INK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(String(total), cx, cy + 1, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  ink(doc, MUTED);
  doc.text("responses", cx, cy + 9, { align: "center" });

  // Legend
  const lx = x + size + 16;
  const lw = opts.legendWidth ?? 180;
  doc.setFontSize(8.5);
  data.forEach((d, i) => {
    const ly = y + 6 + i * 13;
    fill(doc, palette[i % palette.length]);
    doc.roundedRect(lx, ly - 5.5, 7, 7, 1.5, 1.5, "F");
    ink(doc, INK);
    const share = total ? Math.round((d.count / total) * 1000) / 10 : 0;
    doc.text(truncate(doc, `${d.label}`, lw - 60), lx + 12, ly);
    ink(doc, MUTED);
    doc.text(`${d.count} · ${share}%`, lx + lw, ly, { align: "right" });
  });

  return Math.max(size, data.length * 13 + 8);
}

function drawPolygon(doc: Doc, pts: Array<[number, number]>) {
  if (pts.length < 3) return;
  const [start, ...rest] = pts;
  const lines = rest.map((p, i) => {
    const prev = i === 0 ? start : rest[i - 1];
    return [p[0] - prev[0], p[1] - prev[1]] as [number, number];
  });
  doc.lines(lines, start[0], start[1], [1, 1], "F", true);
}

/** Filled area sparkline for responses over time. */
export function drawTimeline(
  doc: Doc,
  opts: { x: number; y: number; w: number; h: number; data: Array<{ date: string; count: number }> },
): number {
  const { x, y, w, h, data } = opts;
  if (data.length === 0) return 0;
  const max = Math.max(1, ...data.map((d) => d.count));
  const stepX = data.length > 1 ? w / (data.length - 1) : 0;
  const plotH = h - 14;
  const pointAt = (i: number, c: number): [number, number] => [x + i * stepX, y + plotH - (c / max) * (plotH - 6)];

  stroke(doc, RULE);
  doc.setLineWidth(0.5);
  doc.line(x, y + plotH, x + w, y + plotH);

  if (data.length === 1) {
    fill(doc, REPORT_PALETTE[0]);
    const [px, py] = pointAt(0, data[0].count);
    doc.roundedRect(px, py, Math.min(40, w), y + plotH - py, 2, 2, "F");
  } else {
    const pts = data.map((d, i) => pointAt(i, d.count));
    const poly: Array<[number, number]> = [[x, y + plotH], ...pts, [x + w, y + plotH]];
    fill(doc, "#e4ecdf");
    drawPolygon(doc, poly);
    stroke(doc, REPORT_PALETTE[0]);
    doc.setLineWidth(1.2);
    for (let i = 1; i < pts.length; i++) doc.line(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1]);
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  ink(doc, MUTED);
  doc.text(data[0].date, x, y + h);
  if (data.length > 1) doc.text(data[data.length - 1].date, x + w, y + h, { align: "right" });

  return h;
}
