export interface SidebarEntry {
  label?: string;
  slug?: string;
  link?: string;
  items?: readonly SidebarEntry[];
}

export interface DocsIndexOptions {
  /** The Starlight sidebar, as passed to `starlight({ sidebar })`. */
  sidebar: readonly SidebarEntry[];
  /** Absolute path of `src/content/docs`. */
  contentRoot: string;
  /** Slug of the index page itself, such as `"docs"`. */
  indexSlug: string;
  /** The page's frontmatter block, `---` fences included. */
  frontmatter: string;
  /** Markdown placed above the generated lists. */
  introduction: string;
}

export declare function buildDocsIndex(
  options: DocsIndexOptions,
): Promise<string>;

export declare function docsIndexFile(
  options: Pick<DocsIndexOptions, "contentRoot" | "indexSlug">,
): string;

export declare function runDocsIndexCli(
  options: DocsIndexOptions,
  cli: { argv?: readonly string[]; regenerateCommand: string },
): Promise<void>;
