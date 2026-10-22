import type { APIRoute, GetStaticPaths } from "astro";
import { plainTextContentType, renderSectionIndex, sections, textResponse } from "../catalog";

export const prerender = true;

export const getStaticPaths = (() =>
  sections().map((section) => ({ params: { section: section.prefix } }))) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ params }) =>
  textResponse(await renderSectionIndex(String(params.section)), plainTextContentType);
