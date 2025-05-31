import { Application } from "./app";
import { MainMenuState } from "./states/mainmenu";

const container = document.querySelector('#app') as HTMLElement;

(async function() {
	const rapier = await import('@dimforge/rapier3d');

	const app = new Application(container, rapier);
	app.start();
	app.setState(new MainMenuState());
})()
