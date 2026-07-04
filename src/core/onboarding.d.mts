export const ONBOARDING_MAX_OPENS: number;
export const OPEN_COUNT_CAP: number;
export function coerceOpenCount(value: unknown): number;
export function nextOpenCount(value: unknown): number;
export function showOnboarding(openCount: number, dismissed?: boolean): boolean;
