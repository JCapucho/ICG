import * as THREE from 'three';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export type Rapier = typeof import('@dimforge/rapier3d');

import Stats from "stats.js";

import { AppState } from "./states/state";

export const SCENE_LAYER = 0;
export const PLAYER_LAYER = 1;

export class Application {
	public container: HTMLElement;
	public renderer: THREE.WebGLRenderer;

	public rgbeLoader: RGBELoader;
	public textureLoader: THREE.TextureLoader;
	public gltfLoader: GLTFLoader;
	public rapier: Rapier;

	private clock: THREE.Clock;

	public state: AppState | null = null;

	private stats: Stats;

	constructor(canvas: HTMLElement, rapier: Rapier) {
		this.container = canvas;
		this.renderer = new THREE.WebGLRenderer({
			antialias: true,
			powerPreference: "high-performance"
		});
		this.renderer.toneMapping = THREE.NeutralToneMapping;
		this.container.appendChild(this.renderer.domElement);

		this.stats = new Stats();
		this.container.appendChild(this.stats.dom);

		this.rgbeLoader = new RGBELoader().setPath("public/");
		this.textureLoader = new THREE.TextureLoader().setPath("public/");
		this.gltfLoader = new GLTFLoader().setPath("public/");
		this.rapier = rapier;

		this.clock = new THREE.Clock();

		this.resize();
	}

	private resize() {
		this.renderer.setSize(window.innerWidth, window.innerHeight, false);

		if (this.state)
			this.state.resize(window.innerWidth, window.innerHeight);
	}

	private render() {
		const delta = this.clock.getDelta(); // Delta in seconds

		this.stats.update();

		if (this.state)
			this.state.render(delta, this.renderer)
	}

	start() {
		window.addEventListener("resize", () => {
			this.resize();
			this.render();
		});

		this.renderer.setAnimationLoop(this.render.bind(this));
	}
}
