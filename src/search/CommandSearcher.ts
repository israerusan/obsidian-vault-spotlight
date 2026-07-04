import { App } from "obsidian";
import { fuzzyMatch } from "./fuzzy";

export interface CommandResult {
	id: string;
	name: string;
	score: number;
	matchIndices: number[];
}

interface ObsidianCommand {
	id: string;
	name: string;
}

interface CommandsApi {
	listCommands?: () => ObsidianCommand[];
	commands?: Record<string, ObsidianCommand>;
	executeCommandById?: (id: string) => boolean;
}

/** Read/run Obsidian's command palette commands — untyped in the public API. */
export class CommandSearcher {
	constructor(private app: App) {}

	private api(): CommandsApi | null {
		const api = (this.app as unknown as { commands?: CommandsApi }).commands;
		return api ?? null;
	}

	private list(): ObsidianCommand[] {
		const api = this.api();
		if (!api) return [];
		if (typeof api.listCommands === "function") {
			try {
				return api.listCommands().filter((c) => c && c.id && c.name);
			} catch {
				return [];
			}
		}
		if (api.commands) {
			return Object.values(api.commands).filter((c) => c && c.id && c.name);
		}
		return [];
	}

	search(query: string, limit = 50, ignoreDiacritics = false): CommandResult[] {
		const commands = this.list();
		const q = query.trim();
		const results: CommandResult[] = [];

		for (const cmd of commands) {
			if (q.length === 0) {
				results.push({ id: cmd.id, name: cmd.name, score: 1, matchIndices: [] });
				continue;
			}
			const match = fuzzyMatch(q, cmd.name, { ignoreDiacritics });
			if (!match) continue;
			results.push({ id: cmd.id, name: cmd.name, score: match.score, matchIndices: match.indices });
		}

		results.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
		return results.slice(0, limit);
	}

	execute(id: string): boolean {
		const api = this.api();
		if (!api || typeof api.executeCommandById !== "function") return false;
		try {
			return api.executeCommandById(id);
		} catch {
			return false;
		}
	}
}
