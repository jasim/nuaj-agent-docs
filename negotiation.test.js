import assert from "node:assert/strict";
import test from "node:test";

import {
  createMarkdownPaths,
  explicitlyPrefersMarkdown,
} from "./negotiation.js";

test("keeps HTML unless Markdown is ranked above it", () => {
  for (const accept of [
    undefined,
    "*/*",
    "text/html",
    "text/markdown, text/html",
    "text/markdown;q=0.8, text/*;q=0.9",
    "text/markdown;q=0, */*;q=1",
  ]) {
    assert.equal(explicitlyPrefersMarkdown(accept), false, String(accept));
  }
});

test("selects Markdown when it is ranked first", () => {
  for (const accept of [
    "text/markdown",
    "text/markdown;q=0.9, text/html;q=0.8",
    "text/markdown;q=0.8, */*;q=0.1",
  ]) {
    assert.equal(explicitlyPrefersMarkdown(accept), true, accept);
  }
});

const paths = createMarkdownPaths({
  prefixes: ["docs", "grid"],
  withoutMarkdown: ["grid"],
});

test("maps documentation pages to their Markdown form", () => {
  assert.equal(paths.markdownVariantPath("/docs/a/b/"), "/docs/a/b.md");
  assert.equal(paths.markdownVariantPath("/docs/guides"), "/docs/guides.md");
  assert.equal(paths.markdownVariantPath("/docs"), "/docs.md");
  assert.equal(paths.markdownVariantPath("/grid/reference/"), "/grid/reference.md");
});

test("does not negotiate other paths", () => {
  for (const pathname of ["/", "/grid", "/grid/", "/docs/llms.txt", "/docs/page.md", "/docsy"]) {
    assert.equal(paths.markdownVariantPath(pathname), undefined, pathname);
  }
});

test("keeps an explicit Markdown URL as its own alternate", () => {
  assert.equal(paths.alternateMarkdownPath("/docs/guides.md"), "/docs/guides.md");
  assert.equal(paths.alternateMarkdownPath("/docs.md"), "/docs.md");
});
