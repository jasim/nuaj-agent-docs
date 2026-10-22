# nuaj-agent-docs

A Starlight plugin that makes a documentation site readable by coding agents.

- Every page in the sidebar is also served as Markdown at `/<slug>.md`, with
  links to other pages rewritten to their `.md` form.
- `/llms.txt` (and `/.well-known/llms.txt`) indexes the whole site;
  `/<section>/llms.txt` indexes one section and `/<section>/llms-full.txt`
  concatenates it.
- Each page's `<head>` advertises its Markdown with
  `<link rel="alternate" type="text/markdown">`, and its title gets
  **Copy as Markdown** and **View as Markdown** buttons.
- The build fails when a page is missing from the sidebar or has no `title` or
  `description`: the sidebar is the catalog.

## Use

```js
// astro.config.mjs
import starlight from "@astrojs/starlight";
import agentDocs from "nuaj-agent-docs";

starlight({
  sidebar,
  plugins: [
    agentDocs({
      title: "Nuabase documentation",
      summary: "Typed LLM output for TypeScript.",
      sections: [
        {
          prefix: "docs",
          title: "Nuabase documentation",
          summary: "Guides and reference for Nuabase.",
          setLabel: "Nuabase",
          setDescription: "Guides and reference for Nuabase.",
          bundleName: "Nuabase",
        },
      ],
    }),
  ],
});
```

Every page slug must start with a section `prefix` to appear in that
section's indexes. `canonicalOrigin` defaults to Astro's `site`;
`retrievalOrigin` (where agents fetch Markdown) defaults to it. `links` adds
`## heading` groups of extra links to the root or a section index.
`replacements` substitutes literal tokens in Markdown bodies, for tokens a
remark plugin also replaces in the HTML. Sidebar `autogenerate` groups are not
read; list pages by `slug`.

The plugin overrides Starlight's `Head` and `PageTitle`. A site that overrides
them itself renders `nuaj-agent-docs/components/MarkdownAlternateLink.astro` and
`nuaj-agent-docs/components/PageActions.astro` from its own versions. The
buttons use Starlight's colour variables; restyle them through
`.nuaj-page-action`.

`nuaj-agent-docs/catalog` exports the catalog and `textResponse` for a site's
own Markdown routes.

## Documentation index page

`nuaj-agent-docs/docs-index` generates a landing page listing every sidebar
page, to commit as `src/content/docs/<indexSlug>.md`. Call `runDocsIndexCli`
from a script; `--check` fails when the committed page is stale.

## Serving Markdown on `Accept: text/markdown`

The build only emits files. To answer `GET /docs/page/` with Markdown when the
client ranks `text/markdown` above HTML, the host must negotiate.
`nuaj-agent-docs/negotiation` has the decision as pure functions
(`explicitlyPrefersMarkdown`, `createMarkdownPaths`) for a Node server. Answer
negotiated responses with `Vary: Accept`, and serve `.md` files as
`text/markdown; charset=utf-8`.

## Development

Consumers link this directory (`"nuaj-agent-docs": "link:../nuaj-agent-docs"`),
so run `pnpm install` here once for its own dependencies. `pnpm test` runs the
negotiation tests.
