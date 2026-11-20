#!/usr/bin/env node
/**
 * Adds sca-tracker.js to each course's start page (the "launch" file in
 * catalog.json), so the Career website can save students' progress.
 * Run after build-catalog.mjs. Safe to run more than once.
 *
 * The publish workflow runs it on the copy it deploys; the exports in the
 * repository are not changed unless you run it yourself.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const { courses } = JSON.parse(readFileSync(join(ROOT, "catalog.json"), "utf8"));
const MARK = "data-sca-tracker";

let added = 0;
for (const c of courses) {
  const file = join(ROOT, c.launch);
  const html = readFileSync(file, "utf8");
  if (html.includes(MARK)) continue;
  const src = relative(dirname(file), join(ROOT, "sca-tracker.js")).split("\\").join("/");
  const tag = `<script src="${src}" data-slug="${c.slug}" ${MARK} defer></script>`;
  const out = html.includes("</body>") ? html.replace("</body>", `${tag}\n</body>`) : `${html}\n${tag}\n`;
  writeFileSync(file, out);
  added += 1;
  console.log(` - ${c.slug}: ${src}`);
}
console.log(`tracker added to ${added} course(s)`);
