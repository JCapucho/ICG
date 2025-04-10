import * as THREE from 'three';
import { SCENE_LAYER, PLAYER_LAYER } from './app';

const noPortalTexture = new THREE.MeshBasicMaterial({
	color: "#ffffff"
});

const rtWidth = 1024;
const rtHeight = 1024;
const renderTarget: THREE.WebGLRenderTarget = new THREE.WebGLRenderTarget(rtWidth, rtHeight);

const cameraRot = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.PI, 0));

export class Portal {
	private mesh: THREE.Mesh;
	private material: THREE.Material;
	private portalCamera: THREE.Camera;

	private tgtTexture: THREE.WebGLRenderTarget;

	private cameraHelper: THREE.CameraHelper | null = null;

	private targetPortal: Portal | null = null;

	constructor(scene: THREE.Scene, renderer: THREE.WebGLRenderer,
		portal_x: number, portal_y: number) {
		this.tgtTexture = new THREE.WebGLRenderTarget(rtWidth, rtHeight);

		// Initialize the renderer textures
		renderer.initRenderTarget(renderTarget);
		renderer.initRenderTarget(this.tgtTexture);

		this.material = new THREE.MeshBasicMaterial({
			map: this.tgtTexture.texture,
		});

		const geometry = new THREE.PlaneGeometry(portal_x, portal_y);
		this.mesh = new THREE.Mesh(geometry, noPortalTexture);

		const rtFov = 75;
		const rtAspect = rtWidth / rtHeight;
		const rtNear = 0.1;
		const rtFar = 1000;
		this.portalCamera = new THREE.PerspectiveCamera(rtFov, rtAspect, rtNear, rtFar);

		this.portalCamera.layers.enable(SCENE_LAYER);
		this.portalCamera.layers.enable(PLAYER_LAYER);

		scene.add(this.mesh);
		scene.add(this.portalCamera);
	}

	public setDebug(debug: boolean, scene: THREE.Scene) {
		if (debug) {
			this.cameraHelper = new THREE.CameraHelper(this.portalCamera);
			scene.add(this.cameraHelper);
		}

		if (this.cameraHelper)
			this.cameraHelper.visible = debug;
	}

	public setTargetPortal(targetPortal: Portal | null) {
		if (targetPortal) {
			this.mesh.material = targetPortal.material;
		} else {
			this.mesh.material = noPortalTexture;
		}

		this.targetPortal = targetPortal;
	}

	public render(scene: THREE.Scene, mainCamera: THREE.Camera, renderer: THREE.WebGLRenderer): void {
		if (!this.targetPortal)
			return;

		mainCamera.updateMatrixWorld();
		this.object().updateMatrixWorld();
		this.targetPortal.object().updateMatrixWorld();

		const cameraPos = mainCamera.getWorldPosition(new THREE.Vector3());
		const relativePos = this.targetPortal.object().worldToLocal(cameraPos);
		relativePos.applyQuaternion(cameraRot);
		this.portalCamera.position.copy(this.object().localToWorld(relativePos.clone()));

		let relativeRot = this.targetPortal.object().getWorldQuaternion(new THREE.Quaternion())
			.invert()
			.multiply(mainCamera.getWorldQuaternion(new THREE.Quaternion()));
		relativeRot = new THREE.Quaternion().multiplyQuaternions(cameraRot, relativeRot);
		this.portalCamera.quaternion.copy(this.object().getWorldQuaternion(new THREE.Quaternion()).multiply(relativeRot));

		renderer.setRenderTarget(renderTarget);
		renderer.render(scene, this.portalCamera);

		renderer.copyTextureToTexture(renderTarget.texture, this.tgtTexture.texture);

		renderer.setRenderTarget(null);
	}

	public object(): THREE.Object3D {
		return this.mesh;
	}
}
