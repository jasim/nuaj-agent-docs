import type { APIRoute, GetStaticPaths } from "astro";
import { getAgentDocCatalog, markdownContentType, renderAgentMarkdown, textResponse } from "../catalog";

export const prerender = true;

export const getStaticPaths = (async () => {
  const catalog = await getAgentDocCatalog();
  return catalog.docs.map((doc) => ({
    params: { slug: doc.slug },
    props: { slug: doc.slug },
  }));
}) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ props }) => {
  const catalog = await getAgentDocCatalog();
  const doc = catalog.bySlug.get(String(props.slug));
  if (!doc) return new Response("Not found\n", { status: 404 });

  return textResponse(renderAgentMarkdown(doc, catalog.slugs), markdownContentType);
};
