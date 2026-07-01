import { App, Modal, Setting } from "obsidian";

interface PromptOptions {
	title: string;
	initial?: string;
	cta?: string;
	onSubmit: (value: string) => void;
}

export class PromptModal extends Modal {
	private inputEl!: HTMLInputElement;

	constructor(
		app: App,
		private opts: PromptOptions
	) {
		super(app);
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();

		new Setting(contentEl).setName(this.opts.title).setHeading();

		new Setting(contentEl)
			.addText((text) => {
				this.inputEl = text.inputEl;
				text.setValue(this.opts.initial ?? "");
			})
			.addButton((btn) =>
				btn
					.setButtonText(this.opts.cta ?? "OK")
					.setCta()
					.onClick(() => this.submit())
			);

		this.inputEl.focus();
		this.inputEl.select();
		this.inputEl.addEventListener("keydown", (evt) => {
			if (evt.key === "Enter") {
				evt.preventDefault();
				this.submit();
			}
		});
	}

	private submit(): void {
		const value = this.inputEl.value.trim();
		if (!value) return;
		this.opts.onSubmit(value);
		this.close();
	}

	onClose(): void {
		this.contentEl.empty();
	}
}
