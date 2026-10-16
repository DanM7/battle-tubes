// Menu footer, About pages, and other player-facing wording from game.json (battle-tubes-data).
// Placeholders like {yyyy} are filled at use time (see fillPlaceholders).

export const SITE = {
  footer: {
    text: '© Dan Maguire, {yyyy} - More about {link}',
    linkLabel: 'Battle Tubes',
    linkUrl: 'https://battle-tubes.dan-maguire.com',
  },
  about: {
    title: 'ABOUT',
    pages: [],
  },
};

/** Replaces {yyyy} / {YYYY} with the current calendar year, plus any extra {key} → value map. */
export function fillPlaceholders(str, extras = {}) {
  const year = String(new Date().getFullYear());
  let out = String(str ?? '');
  out = out.replaceAll('{yyyy}', year).replaceAll('{YYYY}', year);
  for (const [key, value] of Object.entries(extras)) {
    out = out.replaceAll(`{${key}}`, String(value));
  }
  return out;
}

/** Applies the `site` section from game.json. */
export function applySite(site) {
  if (site.footer) {
    SITE.footer = {
      text: site.footer.text ?? SITE.footer.text,
      linkLabel: site.footer.linkLabel ?? SITE.footer.linkLabel,
      linkUrl: site.footer.linkUrl ?? SITE.footer.linkUrl,
    };
  }
  if (site.about) {
    SITE.about = {
      title: site.about.title ?? 'ABOUT',
      pages: structuredClone(site.about.pages ?? []),
    };
  }
}

/** About pages with placeholders filled (same { title, lines, link? } shape PagesScene expects). */
export function aboutPages() {
  return SITE.about.pages.map((page) =>
    page.map((section) => ({
      title: fillPlaceholders(section.title),
      lines: (section.lines ?? []).map((line) => fillPlaceholders(line)),
      ...(section.link
        ? {
            link: {
              label: fillPlaceholders(section.link.label),
              url: section.link.url,
            },
          }
        : {}),
    })),
  );
}
