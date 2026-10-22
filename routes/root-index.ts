import type { APIRoute } from "astro";
import { plainTextContentType, renderRootIndex, textResponse } from "../catalog";

export const prerender = true;

export const GET: APIRoute = async () => textResponse(await renderRootIndex(), plainTextContentType);
