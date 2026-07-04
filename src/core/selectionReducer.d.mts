export type SelectionCommand =
	| { type: "move"; delta: number }
	| { type: "page"; delta: number; pageSize: number }
	| { type: "first" }
	| { type: "last" };

export function clampIndex(index: number, count: number): number;
export function nextSelectedIndex(current: number, count: number, command: SelectionCommand): number;
