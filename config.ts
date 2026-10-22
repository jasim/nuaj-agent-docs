export interface AgentDocsLink {
  title: string;
  href: string;
  description: string;
}

/** A `## heading` and its links, placed after an index's preamble. */
export interface AgentDocsLinkGroup {
  heading: string;
  links: readonly AgentDocsLink[];
}

export interface AgentDocsSection {
  /** First slug segment of every page in the section, such as "docs". */
  prefix: string;
  /** Heading of the section's llms.txt and llms-full.txt. */
  title: string;
  /** Blockquote under that heading. */
  summary: string;
  /** Link text for this section in the root index. */
  setLabel: string;
  /** Description beside that link. */
  setDescription: string;
  /** What the bundle holds, as in "Complete <bundleName> documentation". */
  bundleName: string;
  /** Extra link groups at the top of the section index. */
  links?: readonly AgentDocsLinkGroup[];
}

export interface AgentDocsOptions {
  /** Origin of the human-readable pages. Defaults to Astro's `site`. */
  canonicalOrigin?: string;
  /** Origin agents fetch Markdown from. Defaults to `canonicalOrigin`. */
  retrievalOrigin?: string;
  /** Heading of the root llms.txt. */
  title: string;
  /** Blockquote under that heading. */
  summary: string;
  /** Extra link groups after the root index's documentation sets. */
  links?: readonly AgentDocsLinkGroup[];
  sections: readonly AgentDocsSection[];
  /**
   * Literal text replaced in every Markdown body, for tokens a remark plugin
   * also replaces in the HTML pages.
   */
  replacements?: Readonly<Record<string, string>>;
}

export interface SidebarItem {
  label?: string;
  slug?: string;
  link?: string;
  items?: readonly SidebarItem[];
}

/** What the routes read from `virtual:nuaj-agent-docs/config`. */
export interface AgentDocsConfig extends AgentDocsOptions {
  canonicalOrigin: string;
  retrievalOrigin: string;
  links: readonly AgentDocsLinkGroup[];
  sections: ReadonlyArray<AgentDocsSection & { links: readonly AgentDocsLinkGroup[] }>;
  replacements: Readonly<Record<string, string>>;
  sidebar: readonly SidebarItem[];
}
