/// <reference path="./virtual.d.ts" />
import { getCollection, type CollectionEntry } from "astro:content";
import { fromMarkdown } from "mdast-util-from-markdown";
import { visit } from "unist-util-visit";
import config from "virtual:nuaj-agent-docs/config";
import type { AgentDocsLinkGroup, SidebarItem } from "./config";

const ROOT_INDEX_URL = `${config.retrievalOrigin}/llms.txt`;

type DocsEntry = CollectionEntry<"docs">;

export type AgentDoc = {
  slug: string;
  title: string;
  description: string;
  body: string;
};

type AgentDocCatalog = {
  docs: readonly AgentDoc[];
  bySlug: ReadonlyMap<string, AgentDoc>;
  slugs: ReadonlySet<string>;
};

type PositionedLink = {
  type: "link" | "definition";
  url: string;
  position?: {
    start: { offset?: number };
    end: { offset?: number };
  };
};

type Replacement = {
  start: number;
  end: number;
  value: string;
};

export const markdownContentType = "text/markdown; charset=utf-8";
export const plainTextContentType = "text/plain; charset=utf-8";

let catalogPromise: Promise<AgentDocCatalog> | undefined;

export function getAgentDocCatalog() {
  catalogPromise ??= buildAgentDocCatalog();
  return catalogPromise;
}

export function sections() {
  return config.sections;
}

export function markdownPathForSlug(slug: string) {
  return `/${slug}.md`;
}

export function markdownUrlForSlug(slug: string) {
  return `${config.retrievalOrigin}${markdownPathForSlug(slug)}`;
}

export function canonicalUrlForSlug(slug: string) {
  return `${config.canonicalOrigin}/${slug}/`;
}

export function renderAgentMarkdown(doc: AgentDoc, slugs: ReadonlySet<string>) {
  const frontmatter = [
    "---",
    `title: ${JSON.stringify(doc.title)}`,
    `description: ${JSON.stringify(doc.description)}`,
    `canonical: ${JSON.stringify(canonicalUrlForSlug(doc.slug))}`,
    "---",
  ].join("\n");
  const body = rewriteDocumentationLinks(doc.body, slugs).trim();

  return `${frontmatter}\n\n> Documentation index: ${ROOT_INDEX_URL}\n\n${body}\n`;
}

export async function renderSectionIndex(prefix: string) {
  const section = sectionFor(prefix);
  const catalog = await getAgentDocCatalog();
  const fullUrl = `${config.retrievalOrigin}/${prefix}/llms-full.txt`;

  const lines = [
    `# ${section.title}`,
    "",
    `> ${section.summary}`,
    "",
    "Use the linked Markdown pages for retrieval. HTML versions are the canonical human-readable pages.",
    ...renderLinkGroups(section.links),
  ];

  for (const group of sidebarSections(prefix, catalog.bySlug)) {
    lines.push("", `## ${group.label}`, "");
    for (const doc of group.docs) {
      lines.push(`- [${doc.title}](${markdownUrlForSlug(doc.slug)}): ${singleLine(doc.description)}`);
    }
  }

  lines.push(
    "",
    "## Optional",
    "",
    `- [Complete ${section.bundleName} documentation bundle](${fullUrl}): Concatenated Markdown for offline indexing and large-context retrieval.`,
    "",
  );

  return lines.join("\n");
}

export async function renderRootIndex() {
  const catalog = await getAgentDocCatalog();

  const lines = [
    `# ${config.title}`,
    "",
    `> ${config.summary}`,
    "",
    "Use the scoped indexes to retrieve focused Markdown pages. HTML remains the canonical human-readable representation.",
    "",
    "## Documentation sets",
    "",
    ...config.sections.map(
      (section) =>
        `- [${section.setLabel}](${config.retrievalOrigin}/${section.prefix}/llms.txt): ${section.setDescription}`,
    ),
    ...renderLinkGroups(config.links),
    "",
    "## Start here",
    "",
  ];

  for (const doc of rootStartingDocs(catalog.bySlug)) {
    lines.push(`- [${doc.title}](${markdownUrlForSlug(doc.slug)}): ${singleLine(doc.description)}`);
  }

  lines.push("", "## Optional", "");
  for (const section of config.sections) {
    lines.push(
      `- [Complete ${section.bundleName} documentation](${config.retrievalOrigin}/${section.prefix}/llms-full.txt): Concatenated ${section.bundleName} Markdown for offline indexing and large-context retrieval.`,
    );
  }
  lines.push("");

  return lines.join("\n");
}

export async function renderFullBundle(prefix: string) {
  const section = sectionFor(prefix);
  const catalog = await getAgentDocCatalog();
  const docs = catalog.docs.filter((doc) => doc.slug.startsWith(`${prefix}/`));
  const chunks = [
    `# ${section.title} — complete Markdown bundle`,
    "",
    `> Page index: ${config.retrievalOrigin}/${prefix}/llms.txt`,
  ];

  for (const doc of docs) {
    chunks.push(
      "",
      "---",
      "",
      `# ${doc.title}`,
      "",
      `Canonical: ${canonicalUrlForSlug(doc.slug)}`,
      "",
      rewriteDocumentationLinks(doc.body, catalog.slugs).trim(),
    );
  }

  chunks.push("");
  return chunks.join("\n");
}

export function textResponse(body: string, contentType: string) {
  return new Response(body, {
    headers: {
      "Content-Type": contentType,
    },
  });
}

function sectionFor(prefix: string) {
  const section = config.sections.find((candidate) => candidate.prefix === prefix);
  if (!section) throw new Error(`nuaj-agent-docs: no section with prefix "${prefix}"`);
  return section;
}

function renderLinkGroups(groups: readonly AgentDocsLinkGroup[]) {
  return groups.flatMap((group) => [
    "",
    `## ${group.heading}`,
    "",
    ...group.links.map((link) => `- [${link.title}](${link.href}): ${link.description}`),
  ]);
}

async function buildAgentDocCatalog(): Promise<AgentDocCatalog> {
  const entries = await getCollection("docs");
  const sidebarSlugs = collectSidebarSlugs(config.sidebar);
  const sidebarSlugSet = new Set(sidebarSlugs);
  const entryIds = new Set(entries.map((entry) => entry.id));
  const errors: string[] = [];

  for (const slug of sidebarSlugs) {
    if (!entryIds.has(slug)) errors.push(`Sidebar page has no source entry: ${slug}`);
  }
  for (const entry of entries) {
    if (!sidebarSlugSet.has(entry.id)) {
      errors.push(`Documentation source is missing from the sidebar: ${entry.id}`);
    }
  }
  if (sidebarSlugSet.size !== sidebarSlugs.length) {
    errors.push("The documentation sidebar contains duplicate slugs.");
  }

  const byEntryId = new Map(entries.map((entry) => [entry.id, entry]));
  const docs = sidebarSlugs.flatMap((slug) => {
    const entry = byEntryId.get(slug);
    if (!entry) return [];
    const doc = agentDocFromEntry(entry, errors);
    return doc ? [doc] : [];
  });

  if (errors.length > 0) {
    throw new Error(`Agent documentation validation failed:\n- ${errors.join("\n- ")}`);
  }

  return {
    docs,
    bySlug: new Map(docs.map((doc) => [doc.slug, doc])),
    slugs: new Set(docs.map((doc) => doc.slug)),
  };
}

function agentDocFromEntry(entry: DocsEntry, errors: string[]) {
  const title = entry.data.title?.trim();
  const description = entry.data.description?.trim();
  const body = typeof entry.body === "string" ? applyReplacements(entry.body) : entry.body;

  if (!title) errors.push(`Documentation page has no title: ${entry.id}`);
  if (!description) errors.push(`Documentation page has no description: ${entry.id}`);
  if (typeof body !== "string") {
    errors.push(`Documentation page has no retained Markdown body: ${entry.id}`);
  }
  if (!title || !description || typeof body !== "string") return undefined;

  return { slug: entry.id, title, description, body } satisfies AgentDoc;
}

function applyReplacements(text: string) {
  let rendered = text;
  for (const [token, value] of Object.entries(config.replacements)) {
    rendered = rendered.replaceAll(token, value);
  }
  return rendered;
}

function collectSidebarSlugs(items: readonly SidebarItem[]) {
  const slugs: string[] = [];
  for (const item of items) {
    if (item.slug) slugs.push(item.slug);
    if (item.items) slugs.push(...collectSidebarSlugs(item.items));
  }
  return slugs;
}

/** The direct pages of each top-level group, or its first page when it has none. */
function rootStartingDocs(bySlug: ReadonlyMap<string, AgentDoc>) {
  const startingSlugs = config.sidebar.flatMap((group) => {
    const directSlugs = (group.items ?? []).flatMap((item) => (item.slug ? [item.slug] : []));
    if (directSlugs.length > 0) return directSlugs;

    const firstDescendant = firstSidebarSlug(group);
    return firstDescendant ? [firstDescendant] : [];
  });

  return startingSlugs.map((slug) => {
    const doc = bySlug.get(slug);
    if (!doc) throw new Error(`Missing root llms.txt starting page: ${slug}`);
    return doc;
  });
}

function firstSidebarSlug(item: SidebarItem): string | undefined {
  if (item.slug) return item.slug;
  for (const child of item.items ?? []) {
    const slug = firstSidebarSlug(child);
    if (slug) return slug;
  }
  return undefined;
}

function sidebarSections(prefix: string, bySlug: ReadonlyMap<string, AgentDoc>) {
  const groups: Array<{ label: string; docs: AgentDoc[] }> = [];

  const walk = (items: readonly SidebarItem[], labels: readonly string[]) => {
    const docs = items.flatMap((item) => {
      if (!item.slug || !item.slug.startsWith(`${prefix}/`)) return [];
      const doc = bySlug.get(item.slug);
      if (!doc) throw new Error(`Missing sidebar documentation entry: ${item.slug}`);
      return [doc];
    });
    if (docs.length > 0 && labels.length > 0) {
      groups.push({ label: labels.join(" — "), docs });
    }
    for (const item of items) {
      if (item.items && item.label) walk(item.items, [...labels, item.label]);
    }
  };

  walk(config.sidebar, []);
  return groups;
}

function rewriteDocumentationLinks(markdown: string, validSlugs: ReadonlySet<string>) {
  const tree = fromMarkdown(markdown);
  const replacements: Replacement[] = [];

  visit(tree, (node) => {
    if (node.type !== "link" && node.type !== "definition") return;
    const link = node as PositionedLink;
    const rewritten = rewriteDocumentationUrl(link.url, validSlugs);
    const start = link.position?.start.offset;
    const end = link.position?.end.offset;
    if (rewritten === link.url || start === undefined || end === undefined) return;

    const source = markdown.slice(start, end);
    const relativeStart = source.lastIndexOf(link.url);
    if (relativeStart < 0) {
      throw new Error(`Could not locate Markdown link destination: ${link.url}`);
    }
    replacements.push({
      start: start + relativeStart,
      end: start + relativeStart + link.url.length,
      value: rewritten,
    });
  });

  let result = markdown;
  for (const replacement of replacements.sort((a, b) => b.start - a.start)) {
    result = result.slice(0, replacement.start) + replacement.value + result.slice(replacement.end);
  }
  return result;
}

function rewriteDocumentationUrl(url: string, validSlugs: ReadonlySet<string>) {
  let parsed: URL;
  try {
    parsed = new URL(url, config.canonicalOrigin);
  } catch {
    return url;
  }
  if (parsed.origin !== config.canonicalOrigin && parsed.origin !== config.retrievalOrigin) {
    return url;
  }

  const slug = parsed.pathname.replace(/^\/+|\/+$/g, "");
  if (!validSlugs.has(slug)) return url;

  const markdownPath = markdownPathForSlug(slug);
  if (url.startsWith(config.canonicalOrigin) || url.startsWith(config.retrievalOrigin)) {
    return `${config.retrievalOrigin}${markdownPath}${parsed.search}${parsed.hash}`;
  }
  if (url.startsWith("/")) {
    return `${markdownPath}${parsed.search}${parsed.hash}`;
  }
  return url;
}

function singleLine(value: string) {
  return value.replace(/\s+/g, " ").trim();
}
