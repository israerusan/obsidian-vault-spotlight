import assert from "assert";
import { evaluateExpression, parseCurrencyRates } from "../src/core/calculator.mjs";

const approx = (actual, expected, msg, eps = 1e-6) =>
	assert.ok(Math.abs(actual - expected) < eps, `${msg} (got ${actual}, want ${expected})`);

// --- Arithmetic -------------------------------------------------------------
approx(evaluateExpression("1234 * 0.19").value, 234.46, "multiplication");
approx(evaluateExpression("(3 + 4) ^ 2").value, 49, "parens + power");
approx(evaluateExpression("10 / 4").value, 2.5, "division");
approx(evaluateExpression("2 + 3 * 4").value, 14, "operator precedence");
approx(evaluateExpression("-5 + 8").value, 3, "leading unary minus");
approx(evaluateExpression("2 * -3").value, -6, "unary minus after multiply");
approx(evaluateExpression("8 / -2").value, -4, "unary minus after divide");
approx(evaluateExpression("2 ^ -1").value, 0.5, "unary minus after exponent");
approx(evaluateExpression("10 + -3 * 2").value, 4, "unary minus with precedence");
approx(evaluateExpression("-(3 + 4)").value, -7, "unary minus before parens");
approx(evaluateExpression("2 ^ 3 ^ 2").value, 512, "right-assoc exponent");
// A tiny but non-zero result shows exponential notation, not a misleading "0".
assert.ok(/e/i.test(evaluateExpression("1 / 10000000").formatted), "tiny value uses exponential display");
approx(evaluateExpression("5 - 5").value, 0, "a true zero is still zero");
assert.equal(evaluateExpression("5 - 5").formatted, "0", "true zero formats as 0");
approx(evaluateExpression("1,000 + 500").value, 1500, "thousands separators ignored");
assert.equal(evaluateExpression("1234 * 0.19").formatted, "234.46", "formatted trims zeros");
assert.equal(evaluateExpression("2 + 2").kind, "math", "kind is math");

// --- Non-calculations return null (search must not be hijacked) -------------
assert.equal(evaluateExpression("2024 roadmap"), null, "plain text is not a calc");
assert.equal(evaluateExpression("meeting notes"), null, "words are not a calc");
assert.equal(evaluateExpression("2024"), null, "a bare number (year) is not a calc");
assert.equal(evaluateExpression(""), null, "empty is null");
assert.equal(evaluateExpression("1 + "), null, "incomplete expression is null");
assert.equal(evaluateExpression("(1 + 2"), null, "mismatched parens is null");
assert.equal(evaluateExpression("hello + world"), null, "no digits is null");

// --- Percent ----------------------------------------------------------------
approx(evaluateExpression("20% of 250").value, 50, "percent of");
approx(evaluateExpression("250 + 19%").value, 297.5, "additive percent");
approx(evaluateExpression("250 - 10%").value, 225, "subtractive percent");
assert.equal(evaluateExpression("20% of 250").kind, "percent", "percent kind");

// --- Unit conversion --------------------------------------------------------
approx(evaluateExpression("10 km to mi").value, 6.2137119, "km→mi");
approx(evaluateExpression("250 g in oz").value, 8.8184905, "g→oz");
approx(evaluateExpression("1 gb to mib").value, 953.674316, "gb→mib", 1e-3);
approx(evaluateExpression("2 hours in minutes").value, 120, "time conversion");
assert.equal(evaluateExpression("10 km to mi").kind, "unit", "unit kind");
assert.ok(evaluateExpression("10 km to mi").formatted.endsWith("mi"), "unit suffix");

// --- Temperature (non-linear) ----------------------------------------------
approx(evaluateExpression("72 f to c").value, 22.2222222, "F→C");
approx(evaluateExpression("100 c to f").value, 212, "C→F");
approx(evaluateExpression("0 c to k").value, 273.15, "C→K");
assert.equal(evaluateExpression("100 c to f").kind, "temp", "temp kind");

// --- Currency ---------------------------------------------------------------
const rates = parseCurrencyRates("USD=1\nEUR=0.5\nGBP = 0.25");
assert.equal(rates.eur, 0.5, "custom EUR rate parsed");
approx(evaluateExpression("40 usd to eur", { rates }).value, 20, "USD→EUR with custom rate");
approx(evaluateExpression("10 eur to gbp", { rates }).value, 5, "EUR→GBP cross rate");
assert.equal(evaluateExpression("40 usd to eur", { rates }).kind, "currency", "currency kind");
assert.ok(evaluateExpression("40 usd to eur", { rates }).formatted.includes("EUR"), "currency suffix");

// parseCurrencyRates ignores junk but keeps defaults
const r2 = parseCurrencyRates("nonsense\nEUR=0.9");
assert.equal(r2.usd, 1, "defaults preserved");
assert.equal(r2.eur, 0.9, "override applied");

console.log("calculator tests passed");
