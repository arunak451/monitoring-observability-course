// Loads lesson data from public/*.js the same way the browser does.
import fs from "node:fs"; import vm from "node:vm"; import path from "node:path";
export const COURSE = "obs";
export const courseDir = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..", "public");
export function load() {
  const ctx = { window: {} }; vm.createContext(ctx);
  for (const f of ["lessons.js", "extras.js", "mock.js"]) vm.runInContext(fs.readFileSync(path.join(courseDir, f), "utf8"), ctx, { filename: f });
  const B=(a,b)=>({k:"big",a,b}),T=(...l)=>({k:"term",l}),Li=(a,...r)=>({k:"list",a,r}),Y=(f,...r)=>({k:"yaml",f,r});
  const X = ctx.window.EXTRAS({ B, T, Li, Y });
  return { lessons: [...ctx.window.CORE({ B, T, Li, Y }), ...X.interview], X, mock: ctx.window.MOCK };
}
