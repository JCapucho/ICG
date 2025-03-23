import * as THREE from 'three';
import { SCENE_LAYER, PLAYER_LAYER } from './app';

const geometry = new THREE.PlaneGeometry(50, 50);

export class Portal {
	private mesh: THREE.Mesh;
	private material: THREE.Material;
	private portalCamera: THREE.Camera;
	private renderTarget: THREE.WebGLRenderTarget;

	private cameraHelper: THREE.CameraHelper | null = null;

	constructor(scene: THREE.Scene) {
		const rtWidth = 2048;
		const rtHeight = 2048;
		this.renderTarget = new THREE.WebGLRenderTarget(rtWidth, rtHeight);
		this.material = new THREE.MeshBasicMaterial({
			map: this.renderTarget.texture,
		});

		this.mesh = new THREE.Mesh(geometry, this.material);

		const rtFov = 75;
		const rtAspect = rtWidth / rtHeight;
		const rtNear = 0.1;
		const rtFar = 1000;
		this.portalCamera = new THREE.PerspectiveCamera(rtFov, rtAspect, rtNear, rtFar);
		this.portalCamera.rotation.y = Math.PI;

		this.portalCamera.layers.enable(SCENE_LAYER);
		this.portalCamera.layers.enable(PLAYER_LAYER);

		this.mesh.add(this.portalCamera);

		scene.add(this.mesh);
	}

	public setDebug(debug: boolean, scene: THREE.Scene) {
		if (debug) {
			this.cameraHelper = new THREE.CameraHelper(this.portalCamera);
			scene.add(this.cameraHelper);
		}

		if (this.cameraHelper)
			this.cameraHelper.visible = debug;
	}

	public render(scene: THREE.Scene, renderer: THREE.WebGLRenderer): void {
		if (!this.mesh.visible)
			return;

		this.mesh.visible = false;

		renderer.setRenderTarget(this.renderTarget);
		renderer.render(scene, this.portalCamera);

		this.mesh.visible = true;

		renderer.setRenderTarget(null);
	}

	public object(): THREE.Object3D {
		return this.mesh;
	}
}
