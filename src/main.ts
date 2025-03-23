import { Application } from "./app";
import { MainState } from "./states/main";

const container = document.querySelector('#app') as HTMLElement;

(async function() {
	const rapier = await import('@dimforge/rapier3d');

	const app = new Application(container, rapier);
	app.state = new MainState(app);
	app.start();
})()
