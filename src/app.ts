import * as THREE from 'three';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';

export interface AppState {
	update(delta: number): void;
}

export class Application {
	public scene: THREE.Scene;
	public camera: THREE.PerspectiveCamera;

	public renderer: THREE.WebGLRenderer;

	public rgbeLoader: RGBELoader;
	public textureLoader: THREE.TextureLoader;

	private clock: THREE.Clock;

	public state: AppState | null = null;

	constructor(canvas: HTMLCanvasElement) {
		this.renderer = new THREE.WebGLRenderer({
			canvas,
			antialias: true,
			powerPreference: "high-performance"
		});
		this.renderer.toneMapping = THREE.NeutralToneMapping;

		this.scene = new THREE.Scene();
		this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

		this.rgbeLoader = new RGBELoader().setPath("public/");
		this.textureLoader = new THREE.TextureLoader().setPath("public/");

		this.clock = new THREE.Clock();

		this.resize();
	}

	private resize() {
		this.camera.aspect = window.innerWidth / window.innerHeight;
		this.camera.updateProjectionMatrix();

		this.renderer.setSize(window.innerWidth, window.innerHeight, false);
	}

	private animate() {
		const delta = this.clock.getDelta(); // Delta in seconds

		if (this.state)
			this.state.update(delta)

		this.renderer.render(this.scene, this.camera);
	}

	start() {
		window.addEventListener("resize", () => {
			this.resize();
			this.animate();
		});

		this.renderer.setAnimationLoop(this.animate.bind(this));
	}
}
