export type CalcKind = "math" | "percent" | "unit" | "temp" | "currency";

export interface CalcResult {
	ok: true;
	kind: CalcKind;
	value: number;
	/** Display string for the value, including unit/currency suffix. */
	formatted: string;
	/** Normalized echo of the input expression. */
	expression: string;
}

export const DEFAULT_CURRENCY_RATES: Record<string, number>;

export function evaluateExpression(
	rawInput: string,
	options?: { rates?: Record<string, number> }
): CalcResult | null;

export function parseCurrencyRates(raw: string): Record<string, number>;
