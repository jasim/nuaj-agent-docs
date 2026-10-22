/**
 * The documentation landing page, generated from the Starlight sidebar so it
 * cannot drift from it. It is an ordinary Markdown page in the content
 * collection, so it is served as HTML at `/<indexSlug>/` and, through the
 * plugin, as Markdown at `/<indexSlug>.md`.
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

/** Build the page without touching disk. */
export async function buildDocsIndex({
  sidebar,
  contentRoot,
  indexSlug,
  frontmatter,
  introduction,
}) {
  const titles = await readSidebarTitles(sidebar, contentRoot, indexSlug);
  const sections = sidebar.flatMap((group) =>
    renderGroup(group, titles, indexSlug, 2),
  );
  return [frontmatter.trim(), "", introduction.trim(), ...sections, ""].join(
    "\n",
  );
}

/** The file `buildDocsIndex` belongs in. */
export function docsIndexFile({ contentRoot, indexSlug }) {
  return path.join(contentRoot, `${indexSlug}.md`);
}

/**
 * Write the page, or with `--check` fail when the committed page differs.
 * `regenerateCommand` is what the failure message tells the reader to run.
 */
export async function runDocsIndexCli(
  options,
  { argv = process.argv.slice(2), regenerateCommand } = {},
) {
  const content = await buildDocsIndex(options);
  const outputFile = docsIndexFile(options);
  const relativeOutput = path.relative(process.cwd(), outputFile);

  if (argv.includes("--check")) {
    const existing = await readFileOrUndefined(outputFile);
    if (existing === content) {
      console.log(`Documentation index is current: ${relativeOutput}`);
      return;
    }
    console.error(
      `${relativeOutput} is ${existing === undefined ? "missing" : "out of date"}.\n` +
        `Run \`${regenerateCommand}\` and commit the result.`,
    );
    process.exitCode = 1;
    return;
  }

  await writeFile(outputFile, content, "utf8");
  console.log(`Generated ${relativeOutput} from the documentation sidebar.`);
}

/**
 * A sidebar node becomes a heading down to `###`, and a bold list item below
 * that, so the deepest groups stay attached to the list they belong to.
 */
function renderGroup(group, titles, indexSlug, level) {
  const entries = (group.items ?? []).flatMap((item) =>
    renderItem(item, titles, indexSlug, level + 1),
  );
  if (entries.length === 0) return [];
  if (!group.label) return entries;

  if (level > 3) {
    return [`- **${group.label}**`, ...entries.map(indent)];
  }
  return ["", `${"#".repeat(level)} ${group.label}`, "", ...entries];
}

function renderItem(item, titles, indexSlug, level) {
  if (item.items) return renderGroup(item, titles, indexSlug, level);
  if (item.slug === indexSlug) return [];

  const href = item.slug ? `/${item.slug}/` : item.link;
  const label = item.label ?? titles.get(item.slug);
  if (!href || !label) {
    throw new Error(
      `Sidebar entry has no link or no title: ${JSON.stringify(item)}`,
    );
  }
  return [`- [${label}](${href})`];
}

function indent(line) {
  return line === "" ? line : `  ${line}`;
}

async function readSidebarTitles(sidebar, contentRoot, indexSlug) {
  const titles = new Map();
  for (const slug of collectSidebarSlugs(sidebar)) {
    if (slug === indexSlug) continue;
    titles.set(slug, await readTitle(contentRoot, slug));
  }
  return titles;
}

function collectSidebarSlugs(items) {
  return items.flatMap((item) => [
    ...(item.slug ? [item.slug] : []),
    ...(item.items ? collectSidebarSlugs(item.items) : []),
  ]);
}

async function readTitle(contentRoot, slug) {
  const candidates = [
    `${slug}.md`,
    `${slug}/index.md`,
    `${slug}.mdx`,
    `${slug}/index.mdx`,
  ];
  for (const candidate of candidates) {
    const source = await readFileOrUndefined(path.join(contentRoot, candidate));
    if (source === undefined) continue;

    const frontmatter = source.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    const title = frontmatter?.[1].match(/^title:[ \t]*(.+)$/m)?.[1].trim();
    if (!title) {
      throw new Error(
        `Documentation page has no frontmatter title: ${candidate}`,
      );
    }
    return title.replace(/^"(.*)"$/s, "$1").replace(/\\"/g, '"');
  }
  throw new Error(`Sidebar page has no Markdown source: ${slug}`);
}

async function readFileOrUndefined(file) {
  try {
    return await readFile(file, "utf8");
  } catch (error) {
    if (error?.code === "ENOENT") return undefined;
    throw error;
  }
}
