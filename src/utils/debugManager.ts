import Stats from "stats.js";
import { Application } from "../app";

export class DebugManager {
	private app: Application;

	private stats: Stats;

	private enabled: boolean = false;
	private initialized: boolean = false;

	constructor(app: Application) {
		this.app = app;

		this.stats = new Stats();

		document.addEventListener("keydown", (ev) => {
			if (ev.key === "F2") {
				this.setDebug(!this.enabled);
			}
		});
	}

	init() {
		if (this.initialized)
			return;

		this.app.container.appendChild(this.stats.dom);

		this.initialized = true;
	}

	setDebug(debug: boolean) {
		if (debug) {
			this.init();

			this.stats.showPanel(0);
		} else if (this.initialized) {
			this.stats.showPanel(-1);
		}

		this.enabled = debug;
		this.app.debugChanged(this.enabled);
	}

	update() {
		if (!this.enabled)
			return;

		this.stats.update();
		this.app.debugChanged(this.enabled);
	}
}
