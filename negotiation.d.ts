export declare const markdownContentType: string;

export declare function explicitlyPrefersMarkdown(
  accept: string | undefined,
): boolean;

export interface MarkdownPathOptions {
  /** Top-level documentation sections, such as `["docs"]`. */
  prefixes: readonly string[];
  /** Section paths that are hand-written HTML with no Markdown form. */
  withoutMarkdown?: readonly string[];
}

export interface MarkdownPaths {
  isDocumentationPath(pathname: string): boolean;
  alternateMarkdownPath(pathname: string): string | undefined;
  markdownVariantPath(pathname: string): string | undefined;
}

export declare function createMarkdownPaths(
  options: MarkdownPathOptions,
): MarkdownPaths;
