import * as THREE from 'three';
import { SCENE_LAYER, PLAYER_LAYER, DUPLICATE_PLAYER_LAYER } from '../app';

import { Portal, halfTurn } from './portal';
import { PhysicsWorld } from '../physics/physicsWorld';

import fullscreenTriangleVertexShader from "./fullscreenTriangle.vert?raw";

export function calculateCameraPosition(
	cameraPos: THREE.Vector3,
	inPortal: THREE.Object3D,
	outPortal: THREE.Object3D
): THREE.Vector3 {
	const relativePos = inPortal.worldToLocal(cameraPos);
	relativePos.applyQuaternion(halfTurn);
	return outPortal.localToWorld(relativePos);
}

const inPortalRotStorage = new THREE.Quaternion();
const outPortalRotStorage = new THREE.Quaternion();

export function calculateCameraRotation(
	cameraRot: THREE.Quaternion,
	inPortal: THREE.Object3D,
	outPortal: THREE.Object3D
): THREE.Quaternion {
	let relativeRot = inPortal.getWorldQuaternion(inPortalRotStorage)
		.invert()
		.multiply(cameraRot);
	relativeRot.premultiply(halfTurn);
	const portalRot = outPortal.getWorldQuaternion(outPortalRotStorage);
	return relativeRot.premultiply(portalRot);
}

function createFullscreenTriangleGeometry(): THREE.BufferGeometry {
	const vertices = new Float32Array(6);
	vertices[0] = -1.0;
	vertices[1] = -1.0;

	vertices[2] = 3.0;
	vertices[3] = -1.0;

	vertices[4] = -1.0;
	vertices[5] = 3.0;
	const fullscreenTriangleGeometry = new THREE.BufferGeometry();
	fullscreenTriangleGeometry.setAttribute(
		"position",
		new THREE.BufferAttribute(vertices, 2)
	);
	return fullscreenTriangleGeometry;
}

const material1 = new THREE.MeshBasicMaterial({
	color: "#ff0000"
});
const material2 = new THREE.MeshBasicMaterial({
	color: "#00ff00"
});


export class PortalManager {
	private portals: Portal[] = [];

	private fullscreenTriangle: THREE.Mesh;
	private fullscreenTriangleMaterial: THREE.Material;

	private portalCamera: THREE.PerspectiveCamera;
	private frustum: THREE.Frustum = new THREE.Frustum();

	private physicsWorld: PhysicsWorld;

	public maxRecursion: number = 3;
	public disableFrustumCulling: boolean = false;
	public disablePolygonOffset: boolean = false;
	public disablePortalBox: boolean = false;
	public disableCulling: boolean = false;
	public disableRecursiveRendering: boolean = false;

	constructor(physics: PhysicsWorld) {
		const rtFov = 75;
		const rtAspect = window.innerWidth / window.innerHeight;
		const rtNear = 0.1;
		const rtFar = 1000;
		this.portalCamera = new THREE.PerspectiveCamera(rtFov, rtAspect, rtNear, rtFar);
		this.portalCamera.layers.enable(SCENE_LAYER);
		this.portalCamera.layers.enable(PLAYER_LAYER);

		this.physicsWorld = physics;

		this.fullscreenTriangleMaterial = new THREE.RawShaderMaterial({
			depthWrite: false,
			depthTest: true,
			depthFunc: THREE.AlwaysDepth,

			colorWrite: false,

			vertexShader: fullscreenTriangleVertexShader
		});

		const fullscreenTriangleGeometry = createFullscreenTriangleGeometry();
		this.fullscreenTriangle = new THREE.Mesh(
			fullscreenTriangleGeometry,
			this.fullscreenTriangleMaterial
		);
	}

	public addPortal(width: number, height: number): Portal {
		const material = this.portals.length % 2 == 0 ? material1 : material2;
		const portal = new Portal(material, width, height, this.physicsWorld)
		this.portals.push(portal);

		if (this.portals.length % 2 == 0) {
			this.portals[this.portals.length - 2].otherPortal = this.portals[this.portals.length - 1];
			this.portals[this.portals.length - 1].otherPortal = this.portals[this.portals.length - 2];
		}

		return portal;
	}

	private cameraProjScratch: THREE.Matrix4 = new THREE.Matrix4();

	private renderRecursive(
		recursionLevel: number,
		scene: THREE.Scene,
		camera: THREE.Camera,
		renderer: THREE.WebGLRenderer
	) {
		camera.updateMatrixWorld();

		if (recursionLevel > 1)
			this.portalCamera.layers.enable(DUPLICATE_PLAYER_LAYER);
		else
			this.portalCamera.layers.disable(DUPLICATE_PLAYER_LAYER);

		const context = renderer.getContext();

		context.stencilFunc(context.EQUAL, recursionLevel, 0b11111111);
		context.stencilOp(context.KEEP, context.KEEP, context.KEEP);
		renderer.render(scene, camera);

		if (recursionLevel == this.maxRecursion)
			return;

		const cameraPos = camera.getWorldPosition(new THREE.Vector3);
		const cameraRot = camera.getWorldQuaternion(new THREE.Quaternion());

		const savePos = camera.position.clone();
		const saveRot = camera.rotation.clone();

		for (let i = 0; i < this.portals.length; i++) {
			const portal = this.portals[i];
			const outPortal = this.portals[(i + 1) % this.portals.length];

			if (!this.disableFrustumCulling) {
				this.frustum.setFromProjectionMatrix(
					this.cameraProjScratch.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
				if (!this.frustum.intersectsObject(portal.mesh))
					continue;
			}

			const clipPlane = outPortal.getClippingPlane();

			// START draw portal
			context.stencilFunc(context.EQUAL, recursionLevel, 0b11111111);
			context.stencilOp(context.KEEP, context.KEEP, context.INCR);
			if (!this.disablePolygonOffset) {
				// Depth bias to separate from any wall
				context.enable(context.POLYGON_OFFSET_FILL);
				context.polygonOffset(-1, -1);
			}

			portal.render(
				renderer,
				camera,
				!this.disablePortalBox && recursionLevel == 0
			);

			context.disable(context.POLYGON_OFFSET_FILL);
			// END draw portal

			// START clear depth inside portal
			context.stencilFunc(context.EQUAL, recursionLevel + 1, 0b11111111);
			context.stencilOp(context.KEEP, context.KEEP, context.KEEP);

			this.fullscreenTriangleMaterial.depthWrite = true;
			context.depthRange(1, 1);
			renderer.render(this.fullscreenTriangle, camera)
			context.depthRange(0, 1);
			// END clear depth inside portal

			this.portalCamera.position.copy(
				calculateCameraPosition(cameraPos.clone(), portal.mesh, outPortal.mesh));
			this.portalCamera.quaternion.copy(
				calculateCameraRotation(cameraRot.clone(), portal.mesh, outPortal.mesh));

			if (!this.disableCulling) {
				renderer.clippingPlanes = [clipPlane];
			}

			if (!this.disableRecursiveRendering) {
				this.renderRecursive(recursionLevel + 1, scene, this.portalCamera, renderer);
			}

			renderer.clippingPlanes = [];

			this.portalCamera.position.copy(savePos);
			this.portalCamera.rotation.copy(saveRot);

			// START decrement stencil inside portal
			this.fullscreenTriangleMaterial.depthWrite = false;
			context.stencilFunc(context.NOTEQUAL, recursionLevel + 1, 0b11111111);
			context.stencilOp(context.DECR, context.KEEP, context.KEEP);
			renderer.render(this.fullscreenTriangle, camera)
			// END decrement stencil inside portal
		}
	}

	render(scene: THREE.Scene, camera: THREE.Camera, renderer: THREE.WebGLRenderer) {
		camera.updateMatrixWorld();
		for (const portal of this.portals)
			portal.mesh.updateMatrixWorld();

		const context = renderer.getContext();

		renderer.autoClear = false;
		renderer.clear();

		context.enable(context.STENCIL_TEST);

		this.renderRecursive(0, scene, camera, renderer);

		context.disable(context.STENCIL_TEST);

		renderer.autoClear = true;
	}

	resize(width: number, height: number) {
		this.portalCamera.aspect = width / height;
		this.portalCamera.updateProjectionMatrix();
	}

	physicsUpdate() {
		for (const portal of this.portals)
			portal.physicsUpdate();
	}

	public dispose() {
		for (const portal of this.portals)
			portal.dispose();

		this.fullscreenTriangle.geometry.dispose();
		this.fullscreenTriangleMaterial.dispose();
	}
}
