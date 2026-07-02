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

console.log("worker index tests passed");
