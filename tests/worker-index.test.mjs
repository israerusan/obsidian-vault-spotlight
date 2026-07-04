import assert from "assert";
import { WORKER_SOURCE } from "../src/core/workerSource.mjs";

// Drive the exact source the web worker runs, with a mock `self`.
const messages = [];
const self = {
	onmessage: null,
	postMessage: (msg) => messages.push(msg),
};
new Function("self", WORKER_SOURCE)(self);
const send = (data) => self.onmessage({ data });
const lastResults = () => messages[messages.length - 1];

send({ type: "set", path: "Projects/Roadmap.md", content: "# Roadmap\nlaunch plan for Q3\nnotes" });
send({ type: "set", path: "Archive/Old.md", content: "old launch plan" });
send({ type: "set", path: "Meetings/Kickoff.md", content: "agenda\n\nkickoff LAUNCH checklist plan" });

send({ type: "search", id: 1, tokens: ["launch", "plan"], excluded: [], limit: 40 });
let res = lastResults();
assert.equal(res.type, "results");
assert.equal(res.id, 1);
assert.deepEqual(
	res.results.map((r) => r.path).sort(),
	["Archive/Old.md", "Meetings/Kickoff.md", "Projects/Roadmap.md"],
	"AND-token match should be case-insensitive and order-independent"
);
assert.ok(res.results.every((r) => r.score >= 1), "scores never go negative");
const kickoff = res.results.find((r) => r.path === "Meetings/Kickoff.md");
assert.equal(kickoff.line, 3, "line numbers are 1-based");
assert.equal(kickoff.snippet, "kickoff LAUNCH checklist plan", "snippets are trimmed original lines");

send({ type: "search", id: 2, tokens: ["launch", "plan"], excluded: ["archive"], limit: 40 });
res = lastResults();
assert.ok(!res.results.some((r) => r.path === "Archive/Old.md"), "excluded folders are skipped");

send({ type: "remove", path: "Projects/Roadmap.md" });
send({ type: "search", id: 3, tokens: ["launch"], excluded: [], limit: 40 });
res = lastResults();
assert.ok(!res.results.some((r) => r.path === "Projects/Roadmap.md"), "removed files drop out of results");

send({ type: "set", path: "Projects/Roadmap.md", content: "replaced content entirely" });
send({ type: "search", id: 4, tokens: ["replaced"], excluded: [], limit: 40 });
res = lastResults();
assert.equal(res.results.length, 1, "updated files are re-indexed");

send({ type: "clear" });
send({ type: "search", id: 5, tokens: ["launch"], excluded: [], limit: 40 });
res = lastResults();
assert.equal(res.results.length, 0, "clear empties the index");

send({ type: "search", id: 6, tokens: [], excluded: [], limit: 2 });
res = lastResults();
assert.equal(res.results.length, 0, "limit is respected on an empty index");

// A malformed "set" (no content) must not throw — that would fire onerror and
// retire the worker for the rest of the session.
assert.doesNotThrow(
	() => send({ type: "set", path: "Broken.md" }),
	"missing content is coerced, not thrown on"
);

// Memory guard: a broad query that matches a huge number of lines must stay
// bounded (cap the intermediate array) and still return the requested limit,
// rather than building millions of objects and freezing.
send({ type: "clear" });
const hugeLines = Array.from({ length: 4000 }, (_, i) => `match line ${i}`).join("\n");
for (let f = 0; f < 80; f++) send({ type: "set", path: `Big/${f}.md`, content: hugeLines });
send({ type: "search", id: 7, tokens: ["match"], excluded: [], limit: 40 });
res = lastResults();
assert.equal(res.results.length, 40, "broad query is sliced to the requested limit");
assert.ok(res.results.every((r) => r.score >= 1), "capped results still score");

// The memory bound must prune by SCORE, not by file-iteration order: a genuinely
// top-scored match in a file indexed AFTER the cap fills must still rank first.
send({ type: "clear" });
// 40 early files, each with 60 matches on deep lines (first match at line 51 →
// score 95), enough to blow past the internal soft cap several times over.
const earlyLines = Array.from({ length: 50 }, () => "x").concat(Array.from({ length: 60 }, () => "match"));
for (let f = 0; f < 40; f++) send({ type: "set", path: `Early/${f}.md`, content: earlyLines.join("\n") });
// A late file with the token on line 1 → score 100, the true top result.
send({ type: "set", path: "Late/top.md", content: "match here" });
send({ type: "search", id: 8, tokens: ["match"], excluded: [], limit: 40 });
res = lastResults();
assert.ok(
	res.results.some((r) => r.path === "Late/top.md" && r.line === 1),
	"a top-scored match in a late file is not truncated away by the memory cap"
);
assert.equal(res.results[0].path, "Late/top.md", "the highest-scored match still ranks first");

console.log("worker index tests passed");
