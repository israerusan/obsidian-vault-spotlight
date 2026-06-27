import { App, Modal, Setting } from "obsidian";

export class SaveSearchPromptModal extends Modal {
	private inputEl!: HTMLInputElement;

	constructor(
		app: App,
		private onSubmit: (name: string) => void
	) {
		super(app);
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();

		new Setting(contentEl).setName("Name this search").setHeading();

		new Setting(contentEl)
			.setName("Search name")
			.addText((text) => {
				this.inputEl = text.inputEl;
				text.setPlaceholder("Weekly review notes").onChange(() => {});
			})
			.addButton((btn) =>
				btn.setButtonText("Save").setCta().onClick(() => {
					const name = this.inputEl.value.trim();
					if (!name) return;
					this.onSubmit(name);
					this.close();
				})
			);

		this.inputEl.focus();
		this.inputEl.addEventListener("keydown", (evt) => {
			if (evt.key === "Enter") {
				evt.preventDefault();
				const name = this.inputEl.value.trim();
				if (!name) return;
				this.onSubmit(name);
				this.close();
			}
		});
	}

	onClose(): void {
		this.contentEl.empty();
	}
}