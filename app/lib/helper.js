// Helper function to convert entries to markdown
export function entriesToMarkdown(entries, type) {
    if (!entries?.length) return "";
  
    return (
      `## ${type}\n\n` +
      entries
        .map((entry) => {
          const dateRange = entry.current
            ? `${entry.startDate} - Present`
            : `${entry.startDate} - ${entry.endDate}`;
          return `### ${entry.title} @ ${entry.organization}\n${dateRange}\n\n${entry.description}`;
        })
        .join("\n\n")
    );
  }

const ICON_SIZE = 16;

const iconWrapperStyle = `display:inline-flex;align-items:center;justify-content:center;width:${ICON_SIZE}px;height:${ICON_SIZE}px;flex-shrink:0;`;

const contactItemStyle =
  "display:inline-flex;align-items:center;gap:6px;line-height:1;white-space:nowrap;";

function wrapIcon(iconHtml) {
  return `<span style="${iconWrapperStyle}">${iconHtml}</span>`;
}

function svgStyle(size = ICON_SIZE) {
  return `display:block;width:${size}px;height:${size}px;`;
}

export function linkedInIconHtml(size = ICON_SIZE) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true" style="${svgStyle(size)}"><path fill="#0A66C2" d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>`;
}

export function xIconHtml(size = ICON_SIZE) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true" style="${svgStyle(size)}"><path fill="#000000" d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>`;
}

export function emailIconHtml(size = ICON_SIZE) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="#333333" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="${svgStyle(size)}"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>`;
}

export function phoneIconHtml(size = ICON_SIZE) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="#333333" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="${svgStyle(size)}"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>`;
}

export function socialLinkHtml(url, iconHtml, label) {
  return `<a href="${url}" target="_blank" rel="noopener noreferrer" style="${contactItemStyle}text-decoration:none;color:inherit;">${wrapIcon(iconHtml)}<span style="line-height:1;">${label}</span></a>`;
}

export function contactItemHtml(iconHtml, text) {
  return `<span style="${contactItemStyle}">${wrapIcon(iconHtml)}<span style="line-height:1;">${text}</span></span>`;
}

export function contactRowHtml(items) {
  const children = items.flatMap((item, index) => {
    if (index === 0) return [item];
    return [
      `<span aria-hidden="true" style="display:inline-flex;align-items:center;color:#999999;line-height:1;">|</span>`,
      item,
    ];
  });

  return `<div style="display:flex;flex-wrap:wrap;align-items:center;justify-content:center;column-gap:12px;row-gap:8px;line-height:1;">${children.join("")}</div>`;
}