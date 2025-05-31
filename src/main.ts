import { Application } from "./app";
import { LoadingState } from "./states/loading";

const container = document.querySelector('#app') as HTMLElement;

const app = new Application(container);
app.start();
app.setState(new LoadingState("cube"));
