import assert from "assert";
import { expandSearchAlias } from "../src/core/searchAliases.mjs";

const aliases = "crm = in:Clients @type:client\nwaiting = #waiting";

// Free tier is a passthrough — aliases are Pro.
assert.equal(expandSearchAlias("crm acme", { isPro: false, aliases }), "crm acme", "free tier does not expand");
assert.equal(expandSearchAlias("crm acme", { isPro: true, aliases: "" }), "crm acme", "empty aliases is a passthrough");

// First-token match expands and keeps the rest of the query.
assert.equal(expandSearchAlias("crm acme", { isPro: true, aliases }), "in:Clients @type:client acme", "expands the first token, keeps the rest");
assert.equal(expandSearchAlias("waiting", { isPro: true, aliases }), "#waiting", "expands a lone alias token");

// Only the FIRST token is an alias key; a match elsewhere is left alone.
assert.equal(expandSearchAlias("acme crm", { isPro: true, aliases }), "acme crm", "alias only matches the first token");

// Case-insensitive alias name; unknown alias passes through.
assert.equal(expandSearchAlias("CRM acme", { isPro: true, aliases }), "in:Clients @type:client acme", "alias match is case-insensitive");
assert.equal(expandSearchAlias("nope here", { isPro: true, aliases }), "nope here", "unknown alias passes through");

// Malformed alias lines are skipped, empty query is safe.
assert.equal(expandSearchAlias("", { isPro: true, aliases: "= broken\nok = fine" }), "", "empty query is safe with a malformed line");

console.log("search-aliases tests passed");
