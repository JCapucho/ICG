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

		const levelContainer = document.createElement("div");
		levelContainer.className = "levelcontainer";

		const impossibleBtn = document.createElement("button");
		impossibleBtn.textContent = "Impossible Geometry";
		impossibleBtn.className = "ui-btn";
		impossibleBtn.onclick = () => this.onPlayClick(app, "impossible");

		const hallwayBtn = document.createElement("button");
		hallwayBtn.textContent = "Infinite Hallway";
		hallwayBtn.className = "ui-btn";
		hallwayBtn.onclick = () => this.onPlayClick(app, "cube");

		levelContainer.appendChild(impossibleBtn);
		levelContainer.appendChild(hallwayBtn);

		container.appendChild(title);
		container.appendChild(levelContainer);

		this.mainMenuRoot.appendChild(container);

		const credits = document.createElement("h2");
		credits.textContent = "Projeto ICG 2025\nRealizado por João Capucho 113713 (LEI)";
		credits.className = "credits";

		this.mainMenuRoot.appendChild(credits);

		app.container.appendChild(this.mainMenuRoot);
	}

	private onPlayClick(app: Application, level: string) {
		app.setState(new LoadingState(level));
	}

	onStateExit(_app: Application): void {
		this.mainMenuRoot?.remove();
	}
}
