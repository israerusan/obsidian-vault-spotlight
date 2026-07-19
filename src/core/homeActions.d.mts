export type HomeActionKind = "capture" | "daily-today";

export interface HomeActionDescriptor {
	action: HomeActionKind;
	icon: string;
	label: string;
	description: string;
}

export function homeActionDescriptors(options?: { enableDateJump?: boolean }): HomeActionDescriptor[];
