/**
 * Inline calculator & converter for the Spotlight query bar.
 *
 * `evaluateExpression` is deliberately conservative: it only returns a result
 * when the input is *unambiguously* a calculation (has an operator, a percent,
 * or a unit conversion), so plain text like "2024 roadmap" or a note called
 * "meeting" never gets hijacked by the calculator row. Everything is parsed by
 * hand (a tiny shunting-yard evaluator) — no eval(), no Function(), no network.
 */

/** Currency rates expressed as "units per 1 USD". Users override these. */
export const DEFAULT_CURRENCY_RATES = {
	usd: 1,
	eur: 0.92,
	gbp: 0.79,
	jpy: 156,
	cad: 1.37,
	aud: 1.51,
	chf: 0.9,
	cny: 7.25,
	inr: 83.3,
};

/** Linear unit tables keyed by category; value = how many base units each is. */
const UNIT_CATEGORIES = {
	length: {
		base: "m",
		units: {
			mm: 0.001, cm: 0.01, dm: 0.1, m: 1, km: 1000,
			in: 0.0254, inch: 0.0254, inches: 0.0254,
			ft: 0.3048, foot: 0.3048, feet: 0.3048,
			yd: 0.9144, yard: 0.9144, yards: 0.9144,
			mi: 1609.344, mile: 1609.344, miles: 1609.344,
			nmi: 1852,
		},
	},
	mass: {
		base: "g",
		units: {
			mg: 0.001, g: 1, gram: 1, grams: 1, kg: 1000, kgs: 1000,
			t: 1e6, tonne: 1e6, tonnes: 1e6,
			oz: 28.349523125, ounce: 28.349523125, ounces: 28.349523125,
			lb: 453.59237, lbs: 453.59237, pound: 453.59237, pounds: 453.59237,
			st: 6350.29318, stone: 6350.29318,
		},
	},
	data: {
		base: "b",
		units: {
			b: 1, byte: 1, bytes: 1, bit: 0.125, bits: 0.125,
			kb: 1e3, mb: 1e6, gb: 1e9, tb: 1e12, pb: 1e15,
			kib: 1024, mib: 1024 ** 2, gib: 1024 ** 3, tib: 1024 ** 4,
		},
	},
	time: {
		base: "s",
		units: {
			ms: 0.001, s: 1, sec: 1, secs: 1, second: 1, seconds: 1,
			min: 60, mins: 60, minute: 60, minutes: 60,
			h: 3600, hr: 3600, hrs: 3600, hour: 3600, hours: 3600,
			d: 86400, day: 86400, days: 86400,
			wk: 604800, week: 604800, weeks: 604800,
		},
	},
};

const TEMPERATURE_UNITS = new Set(["c", "celsius", "f", "fahrenheit", "k", "kelvin"]);

/** Find which linear category a unit belongs to (or null). */
function categoryOf(unit) {
	for (const [name, table] of Object.entries(UNIT_CATEGORIES)) {
		if (unit in table.units) return name;
	}
	return null;
}

function toCelsius(value, unit) {
	if (unit === "c" || unit === "celsius") return value;
	if (unit === "f" || unit === "fahrenheit") return (value - 32) * (5 / 9);
	return value - 273.15; // kelvin
}

function fromCelsius(value, unit) {
	if (unit === "c" || unit === "celsius") return value;
	if (unit === "f" || unit === "fahrenheit") return value * (9 / 5) + 32;
	return value + 273.15;
}

/** Trim trailing zeros and cap at 6 significant decimals for display. */
function formatNumber(value) {
	if (!Number.isFinite(value)) return String(value);
	if (Number.isInteger(value)) return value.toLocaleString("en-US");
	const rounded = Number(value.toFixed(6));
	// A tiny but non-zero result would round to "0" and read as an exact zero —
	// show exponential notation instead so it isn't mistaken for nothing.
	if (rounded === 0 && value !== 0) return value.toExponential(2);
	const [intPart, decPart] = String(rounded).split(".");
	const withThousands = Number(intPart).toLocaleString("en-US");
	return decPart ? `${withThousands}.${decPart}` : withThousands;
}

// --- Arithmetic evaluator (shunting-yard → RPN) -----------------------------

const OPERATORS = {
	"+": { prec: 2, assoc: "left", apply: (a, b) => a + b },
	"-": { prec: 2, assoc: "left", apply: (a, b) => a - b },
	"*": { prec: 3, assoc: "left", apply: (a, b) => a * b },
	"×": { prec: 3, assoc: "left", apply: (a, b) => a * b },
	"/": { prec: 3, assoc: "left", apply: (a, b) => a / b },
	"÷": { prec: 3, assoc: "left", apply: (a, b) => a / b },
	"%": { prec: 3, assoc: "left", apply: (a, b) => a % b },
	"^": { prec: 4, assoc: "right", apply: (a, b) => a ** b },
};

/** Tokenize an arithmetic string into numbers, operators, and parens. */
function tokenizeMath(input) {
	const tokens = [];
	let i = 0;
	const s = input.replace(/,/g, ""); // drop thousands separators
	while (i < s.length) {
		const ch = s[i];
		if (ch === " ") { i++; continue; }
		if (/[0-9.]/.test(ch)) {
			let num = "";
			while (i < s.length && /[0-9.]/.test(s[i])) num += s[i++];
			if ((num.match(/\./g) || []).length > 1) return null; // 1.2.3
			tokens.push({ type: "num", value: Number(num) });
			continue;
		}
		if (ch === "(" || ch === ")") {
			tokens.push({ type: ch === "(" ? "lparen" : "rparen" });
			i++;
			continue;
		}
		if (ch === "e" && /[0-9.]/.test(s[i - 1] ?? "") && /[-+0-9]/.test(s[i + 1] ?? "")) {
			// scientific notation exponent — fold into the previous number
			const prev = tokens.pop();
			let exp = s[++i] === "+" || s[i] === "-" ? s[i++] : "";
			while (i < s.length && /[0-9]/.test(s[i])) exp += s[i++];
			tokens.push({ type: "num", value: Number(`${prev.value}e${exp}`) });
			continue;
		}
		if (ch in OPERATORS) {
			tokens.push({ type: "op", value: ch });
			i++;
			continue;
		}
		return null; // unknown character → not arithmetic
	}
	return tokens;
}

function evalMathTokens(tokens) {
	// Shunting-yard with a real unary-minus operator (binds tighter than ^,
	// right-associative) so expressions like 2*-3 and 2^-3 evaluate correctly.
	const output = [];
	const ops = [];
	let prevWasValue = false;
	// Emit any unary operators sitting on top of the stack (they bind tightest).
	const drainUnary = () => {
		while (ops.length && ops[ops.length - 1].type === "unary") output.push(ops.pop());
	};
	for (let k = 0; k < tokens.length; k++) {
		const t = tokens[k];
		if (t.type === "num") {
			output.push(t.value);
			prevWasValue = true;
		} else if (t.type === "op") {
			const op = t.value;
			if (!prevWasValue && (op === "-" || op === "+")) {
				// Unary plus is a no-op; unary minus negates the next operand.
				if (op === "-") ops.push({ type: "unary" });
				prevWasValue = false;
				continue;
			}
			const o1 = OPERATORS[op];
			while (ops.length) {
				const top = ops[ops.length - 1];
				if (top.type === "unary") { output.push(ops.pop()); continue; }
				if (top.type !== "op") break;
				const o2 = OPERATORS[top.value];
				if ((o1.assoc === "left" && o1.prec <= o2.prec) || (o1.assoc === "right" && o1.prec < o2.prec)) {
					output.push({ op: ops.pop().value });
				} else break;
			}
			ops.push({ type: "op", value: op });
			prevWasValue = false;
		} else if (t.type === "lparen") {
			ops.push(t);
			prevWasValue = false;
		} else if (t.type === "rparen") {
			let found = false;
			while (ops.length) {
				const top = ops.pop();
				if (top.type === "lparen") { found = true; break; }
				output.push(top.type === "unary" ? { type: "unary" } : { op: top.value });
			}
			if (!found) return null; // mismatched parens
			drainUnary(); // a unary immediately before the ( applies to its result
			prevWasValue = true;
		}
	}
	while (ops.length) {
		const top = ops.pop();
		if (top.type === "lparen") return null;
		output.push(top.type === "unary" ? { type: "unary" } : { op: top.value });
	}

	const stack = [];
	for (const item of output) {
		if (typeof item === "number") {
			stack.push(item);
		} else if (item.type === "unary") {
			const a = stack.pop();
			if (a === undefined) return null;
			stack.push(-a);
		} else {
			const b = stack.pop();
			const a = stack.pop();
			if (a === undefined || b === undefined) return null;
			stack.push(OPERATORS[item.op].apply(a, b));
		}
	}
	if (stack.length !== 1 || !Number.isFinite(stack[0])) return null;
	return stack[0];
}

/** Evaluate a pure arithmetic expression, or null if it isn't one. */
function evaluateArithmetic(input) {
	if (!/[-+*/^%×÷]/.test(input)) return null; // needs an operator to qualify
	if (!/\d/.test(input)) return null;
	const tokens = tokenizeMath(input);
	if (!tokens || tokens.length === 0) return null;
	return evalMathTokens(tokens);
}

// --- Percent helpers --------------------------------------------------------

/** "20% of 250" → 50; "250 + 19%" → 297.5; "250 - 10%" → 225. */
function evaluatePercent(input) {
	const lower = input.toLowerCase();
	const ofMatch = lower.match(/^([\d.,]+)\s*%\s*of\s*([\d.,]+)$/);
	if (ofMatch) {
		const pct = Number(ofMatch[1].replace(/,/g, ""));
		const base = Number(ofMatch[2].replace(/,/g, ""));
		if (Number.isFinite(pct) && Number.isFinite(base)) {
			return { value: (pct / 100) * base, note: `${formatNumber(pct)}% of ${formatNumber(base)}` };
		}
	}
	const addMatch = lower.match(/^([\d.,]+)\s*([+-])\s*([\d.,]+)\s*%$/);
	if (addMatch) {
		const base = Number(addMatch[1].replace(/,/g, ""));
		const pct = Number(addMatch[3].replace(/,/g, ""));
		if (Number.isFinite(base) && Number.isFinite(pct)) {
			const delta = (pct / 100) * base;
			const value = addMatch[2] === "+" ? base + delta : base - delta;
			return { value, note: `${formatNumber(base)} ${addMatch[2]} ${formatNumber(pct)}%` };
		}
	}
	return null;
}

// --- Unit / currency conversion ---------------------------------------------

/** "10 km to mi", "40 usd in eur", "72f to c". */
function evaluateConversion(input, rates) {
	const match = input
		.toLowerCase()
		.match(/^([\d.,]+)\s*([a-z°]+)\s*(?:to|in|as|=|>)\s*([a-z°]+)$/);
	if (!match) return null;
	const value = Number(match[1].replace(/,/g, ""));
	if (!Number.isFinite(value)) return null;
	const from = match[2].replace(/°/g, "");
	const to = match[3].replace(/°/g, "");
	if (from === to) return null;

	// Temperature (non-linear)
	if (TEMPERATURE_UNITS.has(from) && TEMPERATURE_UNITS.has(to)) {
		const celsius = toCelsius(value, from);
		const out = fromCelsius(celsius, to);
		return { value: out, kind: "temp", formatted: `${formatNumber(out)}°${to[0].toUpperCase()}` };
	}

	// Linear units within one category
	const fromCat = categoryOf(from);
	const toCat = categoryOf(to);
	if (fromCat && fromCat === toCat) {
		const table = UNIT_CATEGORIES[fromCat].units;
		const out = (value * table[from]) / table[to];
		return { value: out, kind: "unit", formatted: `${formatNumber(out)} ${to}` };
	}

	// Currency
	if (from in rates && to in rates) {
		const out = (value * rates[to]) / rates[from];
		return { value: out, kind: "currency", formatted: `${formatNumber(out)} ${to.toUpperCase()}` };
	}
	return null;
}

/**
 * Evaluate a query as a calculation. Returns null when the input is not clearly
 * a calculation, so ordinary searches are never intercepted.
 *
 * @param {string} rawInput
 * @param {{ rates?: Record<string, number> }} [options]
 */
export function evaluateExpression(rawInput, options = {}) {
	const input = String(rawInput ?? "").trim();
	if (input.length === 0 || input.length > 120) return null;

	const rates = { ...DEFAULT_CURRENCY_RATES, ...(options.rates ?? {}) };

	// 1. Conversions ("10 km to mi", "40 usd in eur", "72f to c")
	const conversion = evaluateConversion(input, rates);
	if (conversion) {
		return {
			ok: true,
			kind: conversion.kind,
			value: conversion.value,
			formatted: conversion.formatted,
			expression: input,
		};
	}

	// 2. Percent phrases ("20% of 250", "250 + 19%")
	const percent = evaluatePercent(input);
	if (percent) {
		return {
			ok: true,
			kind: "percent",
			value: percent.value,
			formatted: formatNumber(percent.value),
			expression: percent.note,
		};
	}

	// 3. Plain arithmetic ("1234 * 0.19", "(3+4)^2")
	const arithmetic = evaluateArithmetic(input);
	if (arithmetic !== null) {
		return {
			ok: true,
			kind: "math",
			value: arithmetic,
			formatted: formatNumber(arithmetic),
			expression: input,
		};
	}

	return null;
}

/**
 * Parse a "USD=1\nEUR=0.92" settings block into a rates map, folded over the
 * defaults. Malformed lines are skipped.
 *
 * @param {string} raw
 */
export function parseCurrencyRates(raw) {
	const rates = { ...DEFAULT_CURRENCY_RATES };
	if (typeof raw !== "string") return rates;
	for (const line of raw.split("\n")) {
		const match = line.match(/^\s*([a-zA-Z]{2,5})\s*[=:]\s*([\d.]+)\s*$/);
		if (!match) continue;
		const value = Number(match[2]);
		if (Number.isFinite(value) && value > 0) rates[match[1].toLowerCase()] = value;
	}
	return rates;
}
