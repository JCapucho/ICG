import { Application } from "../app";
import { LoadingState } from "./loading";
import { AppState } from "./state";

export class MainMenuState extends AppState {
	private mainMenuRoot: HTMLElement | undefined;

	onStateEnter(app: Application): void {
		this.mainMenuRoot = document.createElement("div");
		this.mainMenuRoot.className = "mainmenu";

		const container = document.createElement("div");
		container.className = "container";

		const title = document.createElement("h1");
		title.textContent = "Something about portals";
		title.className = "maintitle";

		const playBtn = document.createElement("button");
		playBtn.textContent = "Play";
		playBtn.className = "ui-btn";
		playBtn.onclick = () => this.onPlayClick(app);

		container.appendChild(title);
		container.appendChild(playBtn);

		this.mainMenuRoot.appendChild(container);

		const credits = document.createElement("h2");
		credits.textContent = "Projeto ICG 2025\nRealizado por João Capucho 113713 (LEI)";
		credits.className = "credits";

		this.mainMenuRoot.appendChild(credits);

		app.container.appendChild(this.mainMenuRoot);
	}

	private onPlayClick(app: Application) {
		app.setState(new LoadingState("cube"));
	}

	onStateExit(_app: Application): void {
		this.mainMenuRoot?.remove();
	}
}
