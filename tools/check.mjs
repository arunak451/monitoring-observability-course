import { load, COURSE } from "./load.mjs";
const { lessons, X } = load(); let bad = 0;
console.log("lessons", lessons.length, "practice", X.practice.length, "quiz", X.quiz.length);
lessons.forEach((l, i) => {
  if (l.s.length !== 8) { bad++; console.log("scenes", i + 1, l.s.length); }
  l.s.forEach((s, j) => { if (/\w\.\w/.test(s[0])) { bad++; console.log("dot in word", i + 1, j + 1, s[0].match(/\S*\w\.\w\S*/)[0]); } });
  const P = X.practice[i] || [], Q = X.quiz[i] || [];
  if (P.length !== 4) { bad++; console.log("practice count", i + 1, P.length); }
  if (Q.length !== 5 || Q.some(q => q.length !== 4)) { bad++; console.log("quiz", i + 1); }
  P.forEach(t => { const v = t[1].trim().replace(/\s+/g, " "); if (!t[2].test(v)) { bad++; console.log("hint fails regex", i + 1, v); } });
});
console.log(bad ? `${bad} problems` : "all good");
