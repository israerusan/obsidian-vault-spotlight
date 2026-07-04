export type DailyTemplateTokenKind = "date" | "time" | "title";

export function fillDailyTemplate(
	template: unknown,
	resolve: (kind: DailyTemplateTokenKind, format: string) => string | null | undefined
): string;
