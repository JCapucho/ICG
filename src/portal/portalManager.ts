import * as THREE from 'three';
import { SCENE_LAYER, PLAYER_LAYER, DUPLICATE_PLAYER_LAYER } from '../app';

import { Portal, halfTurn } from './portal';
import { PhysicsWorld } from '../physics/physicsWorld';
import { GameObject } from '../objects/gameObject';

import fullscreenTriangleVertexShader from "./fullscreenTriangle.vert?raw";

const maxRecursion = 3;

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

const portalWidth = 2;
const portalHeight = 5;
const material1 = new THREE.MeshBasicMaterial({
	color: "#ff0000"
});
const material2 = new THREE.MeshBasicMaterial({
	color: "#00ff00"
});


export class PortalManager {
	private portals: Portal[];

	private fullscreenTriangle: THREE.Mesh;
	private fullscreenTriangleMaterial: THREE.Material;

	private portalCamera: THREE.PerspectiveCamera;

	constructor(physics: PhysicsWorld, objs: GameObject[]) {
		this.portals = new Array(2);
		this.portals[0] = new Portal(material1, portalWidth, portalHeight, physics);
		this.portals[0].mesh.position.z = -3; // -5;
		this.portals[0].mesh.position.y = 2.5;
		this.portals[0].mesh.rotation.y = Math.PI / 2;
		this.portals[0].setAttachedObject(objs[2]);
		this.portals[0].updatePositions();

		this.portals[1] = new Portal(material2, portalWidth, portalHeight, physics);
		this.portals[1].mesh.position.z = 5;
		this.portals[1].mesh.position.y = 2.5;
		this.portals[1].mesh.rotation.y = Math.PI;
		this.portals[1].setAttachedObject(objs[1]);
		this.portals[1].updatePositions();

		this.portals[0].otherPortal = this.portals[1];
		this.portals[1].otherPortal = this.portals[0];

		const rtFov = 75;
		const rtAspect = window.innerWidth / window.innerHeight;
		const rtNear = 0.1;
		const rtFar = 1000;
		this.portalCamera = new THREE.PerspectiveCamera(rtFov, rtAspect, rtNear, rtFar);
		this.portalCamera.layers.enable(SCENE_LAYER);
		this.portalCamera.layers.enable(PLAYER_LAYER);

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

		if (recursionLevel == maxRecursion)
			return;

		const cameraPos = camera.getWorldPosition(new THREE.Vector3());
		const cameraRot = camera.getWorldQuaternion(new THREE.Quaternion());

		const savePos = camera.position.clone();
		const saveRot = camera.rotation.clone();

		for (let i = 0; i < this.portals.length; i++) {
			const portal = this.portals[i];
			const outPortal = this.portals[(i + 1) % this.portals.length];

			const clipPlane = outPortal.getClippingPlane();

			// START draw portal
			context.stencilFunc(context.EQUAL, recursionLevel, 0b11111111);
			context.stencilOp(context.KEEP, context.KEEP, context.INCR);
			// Depth bias to separate from any wall
			context.enable(context.POLYGON_OFFSET_FILL);
			context.polygonOffset(-1, -1);

			portal.render(renderer, camera, recursionLevel == 0);

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

			renderer.clippingPlanes = [clipPlane];

			this.renderRecursive(recursionLevel + 1, scene, this.portalCamera, renderer);

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
		for (const portal of this.portals) {
			portal.mesh.updateMatrixWorld();
		}

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
