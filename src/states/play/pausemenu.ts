import { Application } from "../../app";

type PauseMenuHook = () => void;

export class PauseMenu {
	private isEnabled: boolean = false;
	private pauseMenuRoot: HTMLElement;

	public onResume: PauseMenuHook | undefined;
	public onMainMenu: PauseMenuHook | undefined;

	constructor() {
		this.pauseMenuRoot = document.createElement("div");
		this.pauseMenuRoot.className = "pausemenu";

		const container = document.createElement("div");
		container.className = "pausecontainer";

		const title = document.createElement("h1");
		title.textContent = "Paused";
		title.className = "pausetitle";

		const resumeBtn = document.createElement("button");
		resumeBtn.textContent = "Continue";
		resumeBtn.className = "ui-btn";
		resumeBtn.onclick = () => this.onResume?.();

		const mainMenuButton = document.createElement("button");
		mainMenuButton.textContent = "Back to Main Menu";
		mainMenuButton.className = "ui-btn";
		mainMenuButton.onclick = () => this.onMainMenu?.();

		container.appendChild(title);
		container.appendChild(resumeBtn);
		container.appendChild(mainMenuButton);

		this.pauseMenuRoot.appendChild(container);
	}

	public enable(app: Application) {
		if (!this.isEnabled)
			app.container.appendChild(this.pauseMenuRoot);

		this.isEnabled = true;
	}

	public disable(app: Application) {
		if (this.isEnabled)
			app.container.removeChild(this.pauseMenuRoot);

		this.isEnabled = false;
	}
}
