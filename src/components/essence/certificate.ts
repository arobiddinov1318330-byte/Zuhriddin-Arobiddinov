import type { ResultRecord } from "@/lib/api";
import type { Dict } from "@/lib/i18n";
import { levelIndex } from "@/lib/i18n";

const esc = (s: string) => s.replace(/[<>&"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" })[c]!);

// Self-contained SVG so it renders identically on screen and when exported to PNG.
// Colors are literal here on purpose: the exported file lives outside the app theme.
export function certificateSvg(r: ResultRecord, d: Dict) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 560" font-family="Helvetica, Arial, sans-serif">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7c3aed"/><stop offset="1" stop-color="#e0359b"/></linearGradient></defs>
<rect width="800" height="560" rx="28" fill="#0f1433"/>
<rect x="18" y="18" width="764" height="524" rx="20" fill="none" stroke="url(#g)" stroke-width="3"/>
<polygon points="680,60 730,146 630,146" fill="none" stroke="#ffffff" stroke-opacity=".12" stroke-width="4"/>
<circle cx="110" cy="460" r="46" fill="none" stroke="#ffffff" stroke-opacity=".1" stroke-width="4"/>
<text x="400" y="92" text-anchor="middle" fill="#ffffff" font-size="34" font-weight="800" letter-spacing="2">ESSENCE IQ</text>
<text x="400" y="128" text-anchor="middle" fill="#b7b9e0" font-size="18" letter-spacing="4">${esc(d.certificate.toUpperCase())}</text>
<text x="400" y="190" text-anchor="middle" fill="#b7b9e0" font-size="16">${esc(d.certOf)}</text>
<text x="400" y="232" text-anchor="middle" fill="#ffffff" font-size="34" font-weight="700">${esc(r.name)}</text>
<text x="400" y="330" text-anchor="middle" fill="url(#g)" font-size="96" font-weight="900">${r.score}</text>
<text x="400" y="368" text-anchor="middle" fill="#ffffff" font-size="18">${esc(d.estimate)} · ${esc(d.level[levelIndex(r.score)])}</text>
<text x="400" y="400" text-anchor="middle" fill="#b7b9e0" font-size="15">${esc(d.correctCount)}: ${r.correct}/${r.total}</text>
<text x="400" y="470" text-anchor="middle" fill="#8689b8" font-size="13">${esc(d.disclaimer)}</text>
<text x="60" y="515" fill="#b7b9e0" font-size="14">ID: ${esc(r.certId)}</text>
<text x="740" y="515" text-anchor="end" fill="#b7b9e0" font-size="14">${esc(d.issued)}: ${esc(r.date)}</text>
</svg>`;
}

export async function downloadCertificate(svg: string, filename: string) {
  const img = new Image();
  img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  await img.decode();
  const c = document.createElement("canvas");
  c.width = 1600;
  c.height = 1120;
  c.getContext("2d")!.drawImage(img, 0, 0, 1600, 1120);
  const a = document.createElement("a");
  a.href = c.toDataURL("image/png");
  a.download = filename;
  a.click();
}
