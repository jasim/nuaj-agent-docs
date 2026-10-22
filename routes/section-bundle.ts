import type { APIRoute, GetStaticPaths } from "astro";
import { plainTextContentType, renderFullBundle, sections, textResponse } from "../catalog";

export const prerender = true;

export const getStaticPaths = (() =>
  sections().map((section) => ({ params: { section: section.prefix } }))) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ params }) =>
  textResponse(await renderFullBundle(String(params.section)), plainTextContentType);
