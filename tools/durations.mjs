// Writes public/durations.js with each lesson's real audio length (seconds), shown as ~Nm in the lesson list.
import fs from "node:fs"; import path from "node:path"; import { execFileSync } from "node:child_process"; import { load, courseDir } from "./load.mjs";
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const { lessons } = load();
// 0 = audio not generated yet (the page then shows a word-count estimate)
const dur = lessons.map((l, i) => {
  const files = l.s.map((_, j) => path.join(courseDir, "audio", `${i + 1}-${j + 1}.mp3`));
  if (!files.every(f => fs.existsSync(f))) return 0;
  return Math.round(files.reduce((t, f) => t + +execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f]).toString() + 0.7, 0));
});
fs.writeFileSync(path.join(courseDir, "durations.js"), `window.DUR=${JSON.stringify(dur)};\n`);
console.log(dur.join(" "));
