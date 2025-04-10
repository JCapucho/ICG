import * as THREE from 'three';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export type Rapier = typeof import('@dimforge/rapier3d');

import { AppState } from "./states/state";
import { DebugManager } from './utils/debugManager';

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
	private debugManager: DebugManager;

	public state: AppState | null = null;

	constructor(container: HTMLElement, rapier: Rapier) {
		this.container = container;
		this.renderer = new THREE.WebGLRenderer({
			antialias: true,
			powerPreference: "high-performance"
		});
		this.renderer.toneMapping = THREE.NeutralToneMapping;
		this.container.appendChild(this.renderer.domElement);

		this.rgbeLoader = new RGBELoader().setPath(import.meta.env.BASE_URL);
		this.textureLoader = new THREE.TextureLoader().setPath(import.meta.env.BASE_URL);
		this.gltfLoader = new GLTFLoader().setPath(import.meta.env.BASE_URL);
		this.rapier = rapier;

		this.clock = new THREE.Clock();

		this.debugManager = new DebugManager(this);

		this.resize();
	}

	private resize() {
		this.renderer.setSize(window.innerWidth, window.innerHeight, false);

		if (this.state)
			this.state.resize(window.innerWidth, window.innerHeight);
	}

	private render() {
		const delta = this.clock.getDelta(); // Delta in seconds

		this.debugManager.update();

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
