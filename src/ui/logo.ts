export const WALLA_LOGO_SVG = String.raw`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-label="Walla Page logo">
  <rect x="6" y="6" width="52" height="52" rx="10" fill="#0a0a0a"/>
  <clipPath id="walla-logo-grid">
    <rect x="16" y="16" width="32" height="32" rx="4"/>
  </clipPath>
  <g clip-path="url(#walla-logo-grid)" stroke="#fff" stroke-width="3.2" stroke-linecap="square">
    <path d="M16 24H48M16 32H48M16 40H48"/>
    <path d="M24 16V48M32 16V48M40 16V48"/>
  </g>
</svg>`;

export function wallaLogoMark(label = "Walla Page") {
  return `<span aria-label="${escapeHtml(label)}" style="display:inline-flex; width:100%; height:100%;">${WALLA_LOGO_SVG}</span>`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("\"", "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
