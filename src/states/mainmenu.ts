import { Application } from "../app";
import { PlayState } from "./play";
import { AppState } from "./state";

export class MainMenuState extends AppState {
	private mainMenuRoot: HTMLElement | undefined;

	onStateEnter(app: Application): void {
		this.mainMenuRoot = document.createElement("div");
		this.mainMenuRoot.className = "mainmenu";

		const playBtn = document.createElement("button");
		playBtn.textContent = "Play";
		playBtn.className = "ui-btn";
		playBtn.onclick = () => this.onPlayClick(app);

		this.mainMenuRoot.appendChild(playBtn);

		app.container.appendChild(this.mainMenuRoot);
	}

	private onPlayClick(app: Application) {
		app.setState(new PlayState(app));
	}

	onStateExit(_app: Application): void {
		this.mainMenuRoot?.remove();
	}
}
