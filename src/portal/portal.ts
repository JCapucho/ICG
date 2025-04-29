import * as THREE from 'three';
import { SCENE_LAYER, PLAYER_LAYER } from '../app';

import vertexShader from "./portal.vert?raw";
import fragmentShader from "./portal.frag?raw";

const noPortalTexture = new THREE.MeshBasicMaterial({
	color: "#ffffff"
});

const cameraRot = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.PI, 0));

export class Portal {
	private mesh: THREE.Mesh;
	private material: THREE.ShaderMaterial;
	private portalCamera: THREE.PerspectiveCamera;

	private renderTgt: THREE.WebGLRenderTarget;
	private drawTgt: THREE.WebGLRenderTarget;

	private cameraHelper: THREE.CameraHelper | null = null;

	private targetPortal: Portal | null = null;

	// Cached allocations
	private testFrustum: THREE.Frustum = new THREE.Frustum();
	private projectionMatrix: THREE.Matrix4 = new THREE.Matrix4();

	constructor(scene: THREE.Scene, renderer: THREE.WebGLRenderer,
		portal_x: number, portal_y: number) {
		let width_ratio = 1;
		let height_ratio = 1;

		if (portal_x > portal_y) {
			height_ratio = portal_y / portal_x;
		} else {
			width_ratio = portal_x / portal_y;
		}

		const rtSize = new THREE.Vector2();
		renderer.getSize(rtSize);

		const width = rtSize.x;
		const height = rtSize.y;

		this.renderTgt = new THREE.WebGLRenderTarget(width, height);
		this.drawTgt = new THREE.WebGLRenderTarget(width, height);

		// Initialize the renderer textures
		renderer.initRenderTarget(this.renderTgt);
		renderer.initRenderTarget(this.drawTgt);

		this.material = new THREE.ShaderMaterial({
			name: "Portal Shader",

			uniforms: {
				map: { value: this.drawTgt.texture },
				color: { value: new THREE.Vector3(1, 1, 1) },
				u_resolution: { value: rtSize },
			},

			vertexShader,
			fragmentShader
		});

		const geometry = new THREE.PlaneGeometry(portal_x, portal_y);
		this.mesh = new THREE.Mesh(geometry, noPortalTexture);
		this.mesh.name = "Portal Frame";

		const rtFov = 75;
		const rtAspect = width / height;
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

		const tgtPortalObject = this.targetPortal.object();

		// Ensure that the matrices of the objects are up to date so that the
		// transforms don't work with stale data
		mainCamera.updateMatrixWorld();
		this.object().updateMatrixWorld();
		tgtPortalObject.updateMatrixWorld();

		this.testFrustum.setFromProjectionMatrix(
			this.projectionMatrix.multiplyMatrices(
				mainCamera.projectionMatrix,
				mainCamera.matrixWorldInverse
			)
		);

		if (!this.testFrustum.intersectsObject(tgtPortalObject)) {
			return;
		}

		// Calculate the position of the portal camera by taking the relative
		// position of the player camera to the target portal.
		const cameraPos = mainCamera.getWorldPosition(new THREE.Vector3());
		const relativePos = tgtPortalObject.worldToLocal(cameraPos);
		relativePos.applyQuaternion(cameraRot);
		this.portalCamera.position.copy(this.object().localToWorld(relativePos.clone()));

		// Calculate the rotation of the portal camera by taking the relative
		// rotation of the player camera to the target portal.
		let relativeRot = tgtPortalObject.getWorldQuaternion(new THREE.Quaternion())
			.invert()
			.multiply(mainCamera.getWorldQuaternion(new THREE.Quaternion()));
		relativeRot.premultiply(cameraRot);
		const portalRot = this.object().getWorldQuaternion(new THREE.Quaternion());
		relativeRot.premultiply(portalRot);
		this.portalCamera.quaternion.copy(relativeRot);

		// Update the clip plane and projection matrix of the camera
		const normal = this.object().getWorldDirection(new THREE.Vector3());
		const point = this.object().getWorldPosition(new THREE.Vector3());
		renderer.clippingPlanes = [new THREE.Plane(normal, -normal.dot(point))]

		this.material.uniforms.color.value = new THREE.Vector3(0, 0, 0);

		renderer.setRenderTarget(this.renderTgt);
		renderer.render(scene, this.portalCamera);

		renderer.copyFramebufferToTexture(this.drawTgt.texture);

		this.material.uniforms.color.value = new THREE.Vector3(1, 1, 1);

		renderer.clippingPlanes = [];

		renderer.setRenderTarget(null);
	}

	public object(): THREE.Object3D {
		return this.mesh;
	}

	public resize(width: number, height: number) {
		// this.renderTgt.setSize(width, height);
		// this.drawTgt.setSize(width, height);

		this.material.uniforms.u_resolution.value = new THREE.Vector2(width, height);

		this.portalCamera.aspect = width / height;
		this.portalCamera.updateProjectionMatrix();
	}
}
