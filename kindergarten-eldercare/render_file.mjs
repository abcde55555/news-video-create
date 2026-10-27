import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

const arg = (key) => {
  const index = process.argv.indexOf(key);
  return index >= 0 ? process.argv[index + 1] : null;
};
const has = (key) => process.argv.includes(key);
const here = path.resolve(arg("--dir") ?? ".");
const out = path.join(here, "out");
const H = Number(arg("--h") ?? 720);
const W = Math.round((H * 16) / 9);
const FPS = 30;
const timeline = JSON.parse(await fs.readFile(path.join(here, "timeline.json"), "utf8"));
const duration = timeline.duration;
const modulePath = "/Users/kimm/.codex/skills/wallstreet-explainer/package.json";
const { chromium } = createRequire(modulePath)("playwright");

await fs.mkdir(out, { recursive: true });

async function openPage() {
  const browser = await chromium.launch({
    args: [
      "--allow-file-access-from-files",
      "--disable-web-security",
      "--force-color-profile=srgb",
      "--disable-lcd-text",
    ],
  });
  const page = await browser.newPage({ viewport: { width: W, height: H } });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("requestfailed", (request) => errors.push(`请求失败 ${request.url()}`));
  await page.addInitScript((value) => {
    window.__TIMELINE__ = value;
  }, timeline);
  const indexPath = path.join(here, "index.html");
  await page.goto(pathToFileURL(indexPath).href);
  await page.evaluate(() => window.ready);
  return { browser, page, errors };
}

if (arg("--stills")) {
  const { browser, page, errors } = await openPage();
  const times = arg("--stills").split(",").map(Number);
  for (const time of times) {
    await page.evaluate((value) => window.seek(value), time);
    await page.screenshot({
      path: path.join(out, `still_${time.toFixed(2)}.png`),
    });
  }
  await browser.close();
  if (errors.length) console.log("页面报错：", [...new Set(errors)].slice(0, 8));
  console.log("stills", times.length);
  process.exit(0);
}

const totalFrames = Math.ceil(duration * FPS);
const worker = arg("--worker");

if (worker) {
  const [start, end] = worker.split(":").map(Number);
  const { browser, page, errors } = await openPage();
  const encoder = spawn("ffmpeg", [
    "-v", "error", "-y",
    "-f", "image2pipe",
    "-vcodec", "mjpeg",
    "-framerate", String(FPS),
    "-i", "pipe:0",
    "-c:v", "libx264",
    "-preset", "medium",
    "-crf", H >= 1080 ? "14" : "18",
    "-pix_fmt", "yuv420p",
    "-r", String(FPS),
    path.join(out, `seg_${H}_${start}.mp4`),
  ], { stdio: ["pipe", "ignore", "inherit"] });
  for (let frame = start; frame < end; frame += 1) {
    await page.evaluate((time) => window.seek(time), frame / FPS);
    const image = await page.screenshot({
      type: "jpeg",
      quality: H >= 1080 ? 96 : 92,
    });
    if (!encoder.stdin.write(image)) await once(encoder.stdin, "drain");
  }
  encoder.stdin.end();
  await once(encoder, "exit");
  await browser.close();
  if (errors.length) {
    console.error([...new Set(errors)].slice(0, 5));
    process.exit(2);
  }
  process.exit(0);
}

if (!has("--video")) {
  console.log("用 --stills 或 --video");
  process.exit(1);
}

const range = arg("--range");
const frameStart = range ? Math.round(Number(range.split(":")[0]) * FPS) : 0;
const frameEnd = range
  ? Math.min(totalFrames, Math.round(Number(range.split(":")[1]) * FPS))
  : totalFrames;
const workerCount = Number(arg("--workers") ?? 6);
const chunk = Math.ceil((frameEnd - frameStart) / workerCount);
const starts = [];
const startedAt = Date.now();

await Promise.all(
  Array.from({ length: workerCount }, (_, index) => {
    const start = frameStart + index * chunk;
    const end = Math.min(frameEnd, start + chunk);
    if (start >= end) return null;
    starts.push(start);
    return new Promise((resolve, reject) => {
      const child = spawn(process.execPath, [
        fileURLToPath(import.meta.url),
        "--dir", here,
        "--worker", `${start}:${end}`,
        "--h", String(H),
      ], { stdio: "inherit" });
      child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`worker ${start}`))));
    });
  }),
);

starts.sort((a, b) => a - b);
await fs.writeFile(
  path.join(out, `list_${H}.txt`),
  starts.map((start) => `file 'seg_${H}_${start}.mp4'`).join("\n"),
);
const videoPath = path.join(out, range ? `visual_${H}_range.mp4` : `visual_${H}.mp4`);
await new Promise((resolve, reject) => {
  const encoder = spawn("ffmpeg", [
    "-v", "error", "-y",
    "-f", "concat", "-safe", "0",
    "-i", path.join(out, `list_${H}.txt`),
    "-c", "copy",
    videoPath,
  ], { stdio: "inherit" });
  encoder.on("exit", (code) => (code === 0 ? resolve() : reject(new Error("concat failed"))));
});
console.log(
  "rendered",
  frameEnd - frameStart,
  "frames in",
  ((Date.now() - startedAt) / 1000).toFixed(1),
  "s ->",
  videoPath,
);
