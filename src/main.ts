import { Application } from "./app";
import { MainMenuState } from "./states/mainmenu";

const container = document.querySelector('#app') as HTMLElement;

const app = new Application(container);
app.start();
app.setState(new MainMenuState());
