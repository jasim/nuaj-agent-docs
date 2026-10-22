/**
 * Which documentation URL has a Markdown form, and whether a request asked
 * for it. Pure functions with no I/O, so any host can use them: a Node server
 * deciding what to serve, or a test describing what nginx should do.
 */

export const markdownContentType = "text/markdown; charset=utf-8";

/**
 * True when the Accept header ranks `text/markdown` above HTML. Wildcards
 * alone never select Markdown: a browser sending `*\/*` keeps the HTML page.
 */
export function explicitlyPrefersMarkdown(accept) {
  if (!accept) return false;
  const ranges = parseAccept(accept);
  const markdownQuality = exactQuality(ranges, "text", "markdown");
  if (markdownQuality === undefined || markdownQuality <= 0) return false;

  return markdownQuality > qualityFor(ranges, "text", "html");
}

/**
 * The path helpers for one site. `prefixes` names the top-level documentation
 * sections, such as `["docs"]`; `withoutMarkdown` names section paths that are
 * hand-written HTML pages with no Markdown form.
 */
export function createMarkdownPaths({ prefixes, withoutMarkdown = [] }) {
  const excluded = new Set(withoutMarkdown.map(trimSlashes));

  function isDocumentationPath(pathname) {
    return prefixes.some(
      (prefix) =>
        pathname === `/${prefix}` ||
        pathname === `/${prefix}.md` ||
        pathname.startsWith(`/${prefix}/`),
    );
  }

  /** The Markdown URL a page advertises, an explicit `.md` URL included. */
  function alternateMarkdownPath(pathname) {
    if (!isDocumentationPath(pathname) || pathname.endsWith(".txt")) {
      return undefined;
    }
    if (pathname.endsWith(".md")) return pathname;

    const slug = trimSlashes(pathname);
    if (excluded.has(slug)) return undefined;
    return `/${slug}.md`;
  }

  /** The Markdown URL to serve in place of an HTML page, when negotiated. */
  function markdownVariantPath(pathname) {
    if (pathname.endsWith(".md")) return undefined;
    return alternateMarkdownPath(pathname);
  }

  return { isDocumentationPath, alternateMarkdownPath, markdownVariantPath };
}

function trimSlashes(value) {
  return value.replace(/^\/+|\/+$/g, "");
}

function parseAccept(value) {
  const ranges = [];
  for (const part of value.split(",")) {
    const [mediaType, ...parameters] = part
      .split(";")
      .map((item) => item.trim());
    const [type, subtype, extra] = mediaType.toLowerCase().split("/");
    if (!type || !subtype || extra) continue;

    let quality = 1;
    for (const parameter of parameters) {
      const [name, rawValue] = parameter.split("=").map((item) => item.trim());
      if (name.toLowerCase() !== "q") continue;
      const parsed = Number(rawValue);
      quality =
        Number.isFinite(parsed) && parsed >= 0 && parsed <= 1 ? parsed : 0;
    }
    ranges.push({ type, subtype, quality });
  }
  return ranges;
}

function exactQuality(ranges, type, subtype) {
  const matches = ranges
    .filter((range) => range.type === type && range.subtype === subtype)
    .map((range) => range.quality);
  return matches.length > 0 ? Math.max(...matches) : undefined;
}

function qualityFor(ranges, type, subtype) {
  const exact = exactQuality(ranges, type, subtype);
  if (exact !== undefined) return exact;

  const typeWildcard = exactQuality(ranges, type, "*");
  if (typeWildcard !== undefined) return typeWildcard;

  return exactQuality(ranges, "*", "*") ?? 0;
}
