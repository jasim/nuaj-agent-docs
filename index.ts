/**
 * Starlight plugin: every documentation page gets a Markdown twin for coding
 * agents, the site gets llms.txt indexes, and each page title gets View and
 * Copy as Markdown actions.
 *
 * Routes, for each section prefix such as "docs":
 *   /<slug>.md                    one page, links rewritten to their .md form
 *   /llms.txt, /.well-known/llms.txt   the root retrieval index
 *   /<prefix>/llms.txt            the section's page index
 *   /<prefix>/llms-full.txt       every page of the section, concatenated
 *
 * The sidebar is the catalog: a page missing from it, or one without a title
 * and description, fails the build.
 */
import type { StarlightPlugin } from "@astrojs/starlight/types";
import type { AgentDocsConfig, AgentDocsOptions } from "./config";

export type {
  AgentDocsLink,
  AgentDocsLinkGroup,
  AgentDocsOptions,
  AgentDocsSection,
} from "./config";

const VIRTUAL_CONFIG = "virtual:nuaj-agent-docs/config";

export default function agentDocs(options: AgentDocsOptions): StarlightPlugin {
  return {
    name: "nuaj-agent-docs",
    hooks: {
      "config:setup"({ config, updateConfig, addIntegration, logger }) {
        const components = { ...config.components };
        for (const [name, entrypoint] of [
          ["Head", "nuaj-agent-docs/components/Head.astro"],
          ["PageTitle", "nuaj-agent-docs/components/PageTitle.astro"],
        ] as const) {
          if (components[name]) {
            logger.warn(
              `components.${name} is already overridden; render ` +
                `${entrypoint} from it to keep the Markdown ${name === "Head" ? "alternate link" : "page actions"}.`,
            );
          } else {
            components[name] = entrypoint;
          }
        }
        updateConfig({ components });

        const sidebar = config.sidebar ?? [];

        addIntegration({
          name: "nuaj-agent-docs",
          hooks: {
            "astro:config:setup"({ config: astroConfig, injectRoute, updateConfig: updateAstroConfig }) {
              const canonicalOrigin = originOf(
                options.canonicalOrigin ?? astroConfig.site,
                "canonicalOrigin (or Astro `site`)",
              );
              const resolved: AgentDocsConfig = {
                ...options,
                canonicalOrigin,
                retrievalOrigin: originOf(options.retrievalOrigin ?? canonicalOrigin, "retrievalOrigin"),
                links: options.links ?? [],
                sections: options.sections.map((section) => ({ ...section, links: section.links ?? [] })),
                replacements: options.replacements ?? {},
                sidebar: JSON.parse(JSON.stringify(sidebar)),
              };

              updateAstroConfig({
                vite: {
                  plugins: [
                    {
                      name: "nuaj-agent-docs:config",
                      resolveId(id: string) {
                        return id === VIRTUAL_CONFIG ? `\0${VIRTUAL_CONFIG}` : undefined;
                      },
                      load(id: string) {
                        return id === `\0${VIRTUAL_CONFIG}`
                          ? `export default ${JSON.stringify(resolved)};`
                          : undefined;
                      },
                    },
                  ],
                },
              });

              const route = (pattern: string, file: string) =>
                injectRoute({ pattern, entrypoint: new URL(`./routes/${file}`, import.meta.url), prerender: true });
              route("/[...slug].md", "page-markdown.ts");
              route("/llms.txt", "root-index.ts");
              route("/.well-known/llms.txt", "well-known-index.ts");
              route("/[section]/llms.txt", "section-index.ts");
              route("/[section]/llms-full.txt", "section-bundle.ts");
            },
          },
        });
      },
    },
  };
}

function originOf(value: string | undefined, name: string) {
  if (!value) throw new Error(`nuaj-agent-docs: ${name} is required.`);
  return new URL(value).origin;
}
