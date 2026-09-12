(function attachIconModule(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.GrimoireIcons = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createIconModule() {
  "use strict";

  const paths = Object.freeze({
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    close: '<path d="m6 6 12 12M18 6 6 18"/>',
    back: '<path d="m15 18-6-6 6-6"/>',
    forward: '<path d="m9 18 6-6-6-6"/>',
    chevronUp: '<path d="m6 15 6-6 6 6"/>',
    chevronDown: '<path d="m6 9 6 6 6-6"/>',
    undo: '<path d="M9 7 4 12l5 5"/><path d="M5 12h8a6 6 0 1 1 0 12" transform="translate(0 -6)"/>',
    refresh: '<path d="M20 11a8 8 0 1 0 1 5"/><path d="M20 4v7h-7"/>',
    eye: '<path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"/><circle cx="12" cy="12" r="2.5"/>',
    moon: '<path d="M20 15.5A8.5 8.5 0 0 1 8.5 4 8.5 8.5 0 1 0 20 15.5Z"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.65 17.65l1.42 1.42M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.65 6.35l1.42-1.42"/>',
    sunrise: '<path d="M4 18h16M6 14a6 6 0 0 1 12 0M12 3v3M4.22 6.22l2.12 2.12M19.78 6.22l-2.12 2.12"/>',
    book: '<path d="M4 5.5A3.5 3.5 0 0 1 7.5 2H11v17H7.5A3.5 3.5 0 0 0 4 22V5.5ZM20 5.5A3.5 3.5 0 0 0 16.5 2H13v17h3.5A3.5 3.5 0 0 1 20 22V5.5Z"/>',
    bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>',
    timer: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l3 2M9 2h6"/>',
    play: '<path d="m9 7 8 5-8 5V7Z"/>',
    pause: '<path d="M9 7v10M15 7v10"/>',
    stop: '<rect x="7" y="7" width="10" height="10" rx="1"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    warning: '<path d="M10.3 3.5 2.7 17a2 2 0 0 0 1.75 3h15.1a2 2 0 0 0 1.75-3L13.7 3.5a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4M12 17h.01"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/>',
    lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
    share: '<circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="m8.2 10.8 7.6-4.5M8.2 13.2l7.6 4.5"/>',
    receive: '<path d="M12 3v12M7 10l5 5 5-5"/><path d="M5 20h14"/>',
    download: '<path d="M12 3v12M7 10l5 5 5-5"/><path d="M4 21h16"/>',
    upload: '<path d="M12 17V5M7 10l5-5 5 5"/><path d="M4 21h16"/>',
    copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
    camera: '<path d="M4 7h3l2-3h6l2 3h3v13H4V7Z"/><circle cx="12" cy="13" r="4"/>',
    volume: '<path d="M5 10v4h4l5 4V6L9 10H5Z"/><path d="M17 9a4 4 0 0 1 0 6M19 6a8 8 0 0 1 0 12"/>',
    edit: '<path d="m4 16-1 5 5-1L19 9l-4-4L4 16Z"/><path d="m13.5 6.5 4 4"/>',
    shuffle: '<path d="M4 7h3c4 0 6 10 10 10h3M17 4l3 3-3 3M4 17h3c1.4 0 2.5-1.2 3.5-2.7M15 7.7C16 7.25 16.7 7 17 7h3M17 14l3 3-3 3"/>',
    swap: '<path d="M7 7h12l-3-3M17 17H5l3 3"/>',
    gavel: '<path d="m14 4 6 6M12 6l6 6M4 20l8-8M3 21h8"/>',
    dice: '<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8" cy="8" r="1" fill="currentColor" stroke="none"/><circle cx="16" cy="8" r="1" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="8" cy="16" r="1" fill="currentColor" stroke="none"/><circle cx="16" cy="16" r="1" fill="currentColor" stroke="none"/>',
    skull: '<path d="M5 11a7 7 0 1 1 14 0c0 3-1.5 4.5-3 5.5V21H8v-4.5C6.5 15.5 5 14 5 11Z"/><circle cx="9" cy="11" r="1" fill="currentColor" stroke="none"/><circle cx="15" cy="11" r="1" fill="currentColor" stroke="none"/><path d="M10 16h4M10 19v2M14 19v2"/>',
    heart: '<path d="M20.8 8.5c0 5.5-8.8 10.8-8.8 10.8S3.2 14 3.2 8.5A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 8.8 1.5Z"/>',
    crown: '<path d="m3 7 4 4 5-7 5 7 4-4-2 12H5L3 7Z"/><path d="M6 22h12"/>',
    trophy: '<path d="M8 4h8v5a4 4 0 0 1-8 0V4ZM8 6H4v2a4 4 0 0 0 4 4M16 6h4v2a4 4 0 0 1-4 4M12 13v5M8 21h8M9 18h6"/>',
    shield: '<path d="M12 3 4 6v5c0 5 3.5 8.5 8 10 4.5-1.5 8-5 8-10V6l-8-3Z"/>',
    users: '<circle cx="9" cy="8" r="3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2M16 5a3 3 0 0 1 0 6M18 14a5 5 0 0 1 3 4v2"/>',
    cocktail: '<path d="M4 4h16l-8 9-8-9ZM12 13v7M8 20h8"/>',
    flower: '<circle cx="12" cy="12" r="2"/><path d="M12 10c-3-6 4-7 3-2-1 2-3 2-3 2ZM14 12c6-3 7 4 2 3-2-1-2-3-2-3ZM12 14c3 6-4 7-3 2 1-2 3-2 3-2ZM10 12c-6 3-7-4-2-3 2 1 2 3 2 3Z"/>',
    wolf: '<path d="m4 5 4 3 4-5 4 5 4-3-1 11-7 5-7-5L4 5Z"/><path d="M9 13h.01M15 13h.01M10 17h4"/>',
    good: '<path d="M7 4h10M9 4a3 3 0 0 0 6 0M12 8v13M7 13h10"/>',
    evil: '<path d="M5 4c1 3 3 4 7 4s6-1 7-4M7 9l-2 11M17 9l2 11M9 15h6"/>',
    sparkle: '<path d="m12 3 1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5L12 3Z"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>'
  });

  function escapeAttribute(value) {
    return String(value ?? "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
  }

  function iconSvg(name, size = 20, options = {}) {
    const path = paths[name] || paths.info;
    const numericSize = Math.max(12, Math.min(96, Number(size) || 20));
    const className = escapeAttribute(options.className || "app-icon");
    const label = String(options.label || "").trim();
    const accessibility = label
      ? `role="img" aria-label="${escapeAttribute(label)}"`
      : 'aria-hidden="true" focusable="false"';
    return `<svg class="${className}" ${accessibility} width="${numericSize}" height="${numericSize}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`;
  }

  return Object.freeze({ iconSvg, names: Object.freeze(Object.keys(paths)) });
});
