export function eliminationSVG({ seasonId, gwNumber, names }: { seasonId: string; gwNumber: number; names: string[] }) {
  const lines = names.length ? names : ['No eliminations this GW'];
  const lineHeight = 28;
  const width = 1000;
  const padding = 40;
  const contentH = lines.length * lineHeight;
  const height = padding * 2 + 120 + contentH;

  const items = lines.map((t, i) => {
    const y = 140 + i * lineHeight;
    return `<text x="${padding}" y="${y}" font-size="22" font-family="Inter,Arial" fill="#111">${escapeXml(t)}</text>`;
  }).join('\n');

  return `<?xml version="1.0"?>
  <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <rect width="100%" height="100%" fill="white" />
    <text x="${padding}" y="70" font-size="36" font-weight="700" font-family="Inter,Arial" fill="#0f172a">
      Eliminated — Season ${seasonId} • GW ${gwNumber}
    </text>
    <text x="${padding}" y="100" font-size="16" font-family="Inter,Arial" fill="#475569">
      Generated at ${new Date().toISOString()}
    </text>
    ${items}
  </svg>`;
}

function escapeXml(s: string) {
  return s.replace(/[&<>"']/g, (ch) =>
    ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;' }[ch]!)
  );
}
