// Generate Malli Akka narration with Sarvam AI (bulbul:v3, speaker kavitha, ta-IN, mp3).
// TTS=fish node tools/gen-audio.mjs ...     -> Fish Audio (free s2.1-pro-free model, "tamil sneha" voice, speed 0.85)
// Key: SARVAM_API_KEY in .env (never deployed). Output: public/audio/{lesson}-{scene}.mp3 and fx-*.mp3
//   node tools/gen-audio.mjs --sample            -> a few sample scenes into public/audio/
//   node tools/gen-audio.mjs --only 1-1,10-4     -> specific scenes
//   node tools/gen-audio.mjs --lessons 1-5       -> lessons 1..5
//   node tools/gen-audio.mjs --all [--force]     -> everything (existing files skipped unless --force)
//   node tools/gen-audio.mjs --mock              -> mock interview questions (mq-N.mp3)
//   node tools/gen-audio.mjs --print 4           -> just print the Tamil narration of lesson 4
import fs from "node:fs"; import path from "node:path";
import { load, COURSE, courseDir } from "./load.mjs"; import { ta } from "./ta.mjs";

const here = path.dirname(new URL(import.meta.url).pathname), root = path.resolve(here, "..");
const out = path.join(courseDir, "audio"); fs.mkdirSync(out, { recursive: true });
try { for (const l of fs.readFileSync(path.join(root, ".env"), "utf8").split("\n")) { const m = l.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, ""); } } catch {}
const KEY = process.env.SARVAM_API_KEY;

const FX = {
  "good-1": "சூப்பர் குட்டி! Correct ஆ type பண்ண!", "good-2": "வாவ்! நீ ஒரு Observability star!",
  "good-3": "அருமை குட்டி! அடுத்த task பண்ணலாம்.", "good-4": "Perfect! நான் ரொம்ப proud குட்டி!",
  "retry-1": "பரவால்ல குட்டி, இன்னொரு தடவ try பண்ணு.", "retry-2": "கொஞ்சம் miss ஆயிடுச்சு. Hint பாத்து try பண்ணு குட்டி.",
  "prac-done": "சூப்பர் குட்டி! இந்த lesson practice முடிச்சிட்ட! இப்போ quiz try பண்ணு.",
  "quiz-great": "வாவ்! Quiz ல நீ கலக்கிட்ட குட்டி!", "quiz-ok": "நல்ல try குட்டி! Lesson அ இன்னொரு தடவ பாத்துட்டு quiz பண்ணு.",
};

const args = process.argv.slice(2), has = f => args.includes(f), val = f => args[args.indexOf(f) + 1];
const { lessons, mock } = load();
const range = s => s.split(",").flatMap(p => { const [a, b] = p.split("-").map(Number); return b ? Array.from({ length: b - a + 1 }, (_, i) => a + i) : [a]; });

if (has("--print")) {
  for (const L of range(val("--print"))) lessons[L - 1].s.forEach((s, j) => console.log(`${L}-${j + 1}: ${ta(s[0])}`));
  process.exit(0);
}

let jobs = [];
const scene = (L, S) => ({ name: `${L}-${S}`, text: ta(lessons[L - 1].s[S - 1][0]) });
if (has("--sample")) jobs = ["1-1", "8-4", "17-3"].map(x => scene(...x.split("-").map(Number)));
else if (has("--only")) jobs = val("--only").split(",").map(x => scene(...x.split("-").map(Number)));
else if (has("--lessons")) jobs = range(val("--lessons")).flatMap(L => lessons[L - 1].s.map((_, j) => scene(L, j + 1)));
else if (has("--all")) jobs = lessons.flatMap((l, i) => l.s.map((_, j) => scene(i + 1, j + 1)));
if (has("--mock") || has("--all")) jobs.push(...mock.map((m, i) => ({ name: `mq-${i + 1}`, text: ta(m.q) })));
if (has("--fx") || has("--all") || has("--sample")) jobs.push(...Object.entries(FX).map(([k, v]) => ({ name: `fx-${k}`, text: v })));
if (!jobs.length) { console.log("Nothing to do. See the usage at the top of this file."); process.exit(1); }
if (process.env.TTS === "fish" ? !process.env.FISH_API_KEY : !KEY) { console.error((process.env.TTS === "fish" ? "FISH_API_KEY" : "SARVAM_API_KEY") + " missing (.env)"); process.exit(1); }
if (!has("--force")) jobs = jobs.filter(j => !fs.existsSync(path.join(out, j.name + ".mp3")));

// TTS=fish uses Fish Audio's free model with the "tamil sneha" voice at 0.85x speed (key: FISH_API_KEY).
const FISH = process.env.TTS === "fish";
const FISH_VOICE = process.env.FISH_VOICE || "31792949c082466bab25d6f3327ac216", FISH_SPEED = Number(process.env.FISH_SPEED || 0.85);
async function tts(text) {
  for (let attempt = 1; ; attempt++) {
    const res = FISH
      ? await fetch("https://api.fish.audio/v1/tts", {
          method: "POST", headers: { Authorization: `Bearer ${process.env.FISH_API_KEY}`, "Content-Type": "application/json", model: "s2.1-pro-free" },
          body: JSON.stringify({ text, format: "mp3", reference_id: FISH_VOICE, prosody: { speed: FISH_SPEED } }),
        })
      : await fetch("https://api.sarvam.ai/text-to-speech", {
          method: "POST", headers: { "api-subscription-key": KEY, "Content-Type": "application/json" },
          body: JSON.stringify({ text, target_language_code: "ta-IN", speaker: "kavitha", model: "bulbul:v3", output_audio_codec: "mp3" }),
        });
    if (res.ok) { if (FISH) return Buffer.from(await res.arrayBuffer()); const j = await res.json(); return Buffer.from(j.audios.join(""), "base64"); }
    const body = await res.text();
    if (attempt >= 5 || (res.status < 500 && res.status !== 429)) throw new Error(`${res.status} ${body.slice(0, 200)}`);
    await new Promise(r => setTimeout(r, 1500 * 2 ** attempt));
  }
}

let done = 0, failed = 0; const total = jobs.length;
async function worker() {
  for (let j; (j = jobs.shift());) {
    try { fs.writeFileSync(path.join(out, j.name + ".mp3"), await tts(j.text)); done++; console.log(`✔ ${j.name}  (${done}/${total})`); }
    catch (e) { failed++; console.error(`✘ ${j.name}: ${e.message}`); }
  }
}
await Promise.all(Array.from({ length: Number(val("--jobs")) || 4 }, worker));
console.log(`Done: ${done} ok, ${failed} failed`); process.exit(failed ? 1 : 0);
