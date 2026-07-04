export type NaturalDateKind = "relative" | "weekday" | "iso";

export interface NaturalDateResult {
	/** Local start-of-day timestamp (ms) for the resolved calendar day. */
	date: number;
	/** Human label such as "Fri, Jul 24 2026". */
	label: string;
	kind: NaturalDateKind;
}

export function parseNaturalDate(
	rawInput: string,
	options?: { now?: number; weekStartsOn?: number }
): NaturalDateResult | null;

export function labelForDate(date: Date): string;
