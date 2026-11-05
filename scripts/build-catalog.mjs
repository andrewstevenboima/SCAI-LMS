#!/usr/bin/env node
/**
 * Builds catalog.json: the list of courses the Career website's LMS shows.
 *
 * Every folder under courses/ is one course. Drop in an Articulate Rise
 * export (Web, xAPI or SCORM, unzipped) and this script finds:
 *   - where the course starts (index.html, or scormcontent/index.html)
 *   - its title, description, lesson titles and cover image, read from the
 *     export's runtime-data.js
 * An optional courses/<slug>/course.json overrides or adds anything:
 *   { "category": "Digital Skills", "level": "Beginner", "price": 0,
 *     "currency": "RWF", "featured": true, "published": true,
 *     "duration": "2 hours", "instructor": "SCA Team", "tags": ["Gmail"] }
 *
 * Run: node scripts/build-catalog.mjs   (no dependencies)
 */
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const COURSES = join(ROOT, "courses");

const LAUNCH_CANDIDATES = ["index.html", "scormcontent/index.html", "story.html", "index_lms.html"];

function stripHtml(html) {
  return String(html || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#39;|&rsquo;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function readRiseData(dir) {
  const file = join(dir, "runtime-data.js");
  if (!existsSync(file)) return null;
  const match = readFileSync(file, "utf8").match(/"([A-Za-z0-9+/=]{100,})"/);
  if (!match) return null;
  try {
    return JSON.parse(Buffer.from(match[1], "base64").toString("utf8")).course || null;
  } catch {
    return null;
  }
}

function titleFromHtml(file) {
  const m = readFileSync(file, "utf8").match(/<title>([^<]*)<\/title>/i);
  return m ? m[1].trim() : "";
}

function coverPath(contentDir, course) {
  const image = course?.coverImage?.media?.image || course?.cardImage?.media?.image;
  const names = [image?.crushedKey, image?.originalUrl, "stock-image.jpg"].filter(Boolean);
  for (const name of names) {
    if (existsSync(join(contentDir, "assets", name))) return `assets/${name}`;
  }
  return null;
}

function buildCourse(slug) {
  const dir = join(COURSES, slug);
  const launch = LAUNCH_CANDIDATES.find((p) => existsSync(join(dir, p)));
  if (!launch) {
    console.warn(`skip ${slug}: no index.html or scormcontent/index.html`);
    return null;
  }
  const contentDir = join(dir, launch.includes("/") ? launch.split("/")[0] : "");
  const rise = readRiseData(contentDir);
  const meta = existsSync(join(dir, "course.json"))
    ? JSON.parse(readFileSync(join(dir, "course.json"), "utf8"))
    : {};

  const lessons = (rise?.lessons || [])
    .filter((l) => !l.deleted && l.type !== "section")
    .map((l) => stripHtml(l.title))
    .filter(Boolean);
  const description = stripHtml(rise?.description);
  const cover = coverPath(contentDir, rise);
  const prefix = launch.includes("/") ? `${launch.split("/")[0]}/` : "";

  return {
    slug,
    title: meta.title || stripHtml(rise?.title) || titleFromHtml(join(dir, launch)) || slug,
    subtitle: meta.subtitle || (description.split(/(?<=\.)\s/)[0] || "").slice(0, 160),
    description: meta.description || description,
    lessons,
    lessonsCount: lessons.length,
    launch: `courses/${slug}/${launch}`,
    cover: meta.cover ? `courses/${slug}/${meta.cover}` : cover ? `courses/${slug}/${prefix}${cover}` : null,
    category: meta.category || "Digital Skills",
    level: meta.level || "Beginner",
    price: Number(meta.price ?? 0),
    currency: meta.currency || "RWF",
    duration: meta.duration || "",
    instructor: meta.instructor || "Student Companion Academy",
    tags: Array.isArray(meta.tags) ? meta.tags : [],
    featured: Boolean(meta.featured),
    published: meta.published !== false,
    updatedAt: statSync(join(dir, launch)).mtime.toISOString(),
  };
}

const slugs = existsSync(COURSES)
  ? readdirSync(COURSES).filter((n) => !n.startsWith(".") && statSync(join(COURSES, n)).isDirectory()).sort()
  : [];
const courses = slugs.map(buildCourse).filter(Boolean);
writeFileSync(
  join(ROOT, "catalog.json"),
  JSON.stringify({ generatedAt: new Date().toISOString(), courses }, null, 2) + "\n",
);
console.log(`catalog.json: ${courses.length} course(s)`);
for (const c of courses) console.log(` - ${c.slug}: ${c.title} (${c.lessonsCount} lessons) -> ${c.launch}`);
