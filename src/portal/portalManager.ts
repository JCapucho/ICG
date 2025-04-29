import * as THREE from 'three';
import { SCENE_LAYER, PLAYER_LAYER } from '../app';

import fullscreenTriangleVertexShader from "./fullscreenTriangle.vert?raw";

const maxRecursion = 3;

const portalReorientantionQuaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.PI, 0));

function calculateCameraPosition(
	cameraPos: THREE.Vector3,
	inPortal: THREE.Object3D,
	outPortal: THREE.Object3D
): THREE.Vector3 {
	const relativePos = inPortal.worldToLocal(cameraPos);
	relativePos.applyQuaternion(portalReorientantionQuaternion);
	return outPortal.localToWorld(relativePos);
}

const inPortalRotStorage = new THREE.Quaternion();
const outPortalRotStorage = new THREE.Quaternion();

function calculateCameraRotation(
	cameraRot: THREE.Quaternion,
	inPortal: THREE.Object3D,
	outPortal: THREE.Object3D
): THREE.Quaternion {
	let relativeRot = inPortal.getWorldQuaternion(inPortalRotStorage)
		.invert()
		.multiply(cameraRot);
	relativeRot.premultiply(portalReorientantionQuaternion);
	const portalRot = outPortal.getWorldQuaternion(outPortalRotStorage);
	return relativeRot.premultiply(portalRot);
}

export class PortalManager {
	private portals: THREE.Mesh[];

	private fullscreenTriangle: THREE.Mesh;
	private fullscreenTriangleMaterial: THREE.Material;

	private portalCamera: THREE.PerspectiveCamera;

	constructor(scene: THREE.Scene, renderer: THREE.WebGLRenderer) {
		const geometry = new THREE.PlaneGeometry(2, 5);
		const material1 = new THREE.MeshBasicMaterial({
			color: "#ff0000"
		});
		const material2 = new THREE.MeshBasicMaterial({
			color: "#00ff00"
		});

		this.portals = new Array(2);
		this.portals[0] = new THREE.Mesh(geometry, material1);
		this.portals[0].position.z = -5;
		this.portals[0].position.y = 2.5;

		this.portals[1] = new THREE.Mesh(geometry, material2);
		this.portals[1].position.z = 5;
		this.portals[1].position.y = 2.5;
		this.portals[1].rotation.y = Math.PI;

		const rtSize = new THREE.Vector2();
		renderer.getSize(rtSize);

		const width = rtSize.x;
		const height = rtSize.y;

		const rtFov = 75;
		const rtAspect = width / height;
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
		this.fullscreenTriangle = new THREE.Mesh(fullscreenTriangleGeometry, this.fullscreenTriangleMaterial);
	}

	private renderRecursive(
		recursionLevel: number,
		scene: THREE.Scene,
		camera: THREE.Camera,
		renderer: THREE.WebGLRenderer
	) {
		camera.updateMatrixWorld();

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

			const normal = outPortal.getWorldDirection(new THREE.Vector3());
			const point = outPortal.getWorldPosition(new THREE.Vector3());
			const clipPlane = new THREE.Plane(normal, -normal.dot(point));

			// START draw portal
			context.stencilFunc(context.EQUAL, recursionLevel, 0b11111111);
			context.stencilOp(context.KEEP, context.KEEP, context.INCR);
			// Depth bias to separate from any wall
			context.enable(context.POLYGON_OFFSET_FILL);
			context.polygonOffset(-1, -1);

			renderer.render(portal, camera);

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

			this.portalCamera.position.copy(calculateCameraPosition(cameraPos.clone(), portal, outPortal));
			this.portalCamera.quaternion.copy(calculateCameraRotation(cameraRot.clone(), portal, outPortal));

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
			portal.updateMatrixWorld();
		}

		const context = renderer.getContext();

		renderer.autoClear = false;
		renderer.clear();

		context.enable(context.STENCIL_TEST);

		this.renderRecursive(0, scene, camera, renderer);

		// // Draw portal 1
		// for (let recursionLevel = 0; recursionLevel < 1; recursionLevel++) {
		// 	const normal = this.portal2.getWorldDirection(new THREE.Vector3());
		// 	const point = this.portal2.getWorldPosition(new THREE.Vector3());
		// 	const clipPlane = new THREE.Plane(normal, -normal.dot(point));
		//
		// 	context.stencilFunc(context.ALWAYS, recursionLevel * 2 + 1, 0b11111111);
		// 	context.stencilOp(context.KEEP, context.KEEP, context.REPLACE);
		// 	// Depth bias to separate from any wall
		// 	context.enable(context.POLYGON_OFFSET_FILL);
		// 	context.polygonOffset(-1, -1);
		//
		// 	renderer.render(this.portal1, camera);
		//
		// 	renderer.clearDepth();
		//
		// 	// Update camera perspective
		// 	const cameraPos = camera.getWorldPosition(new THREE.Vector3());
		// 	const cameraRot = camera.getWorldQuaternion(new THREE.Quaternion())
		// 	this.portalCamera.position.copy(calculateCameraPosition(cameraPos, this.portal1, this.portal2));
		// 	this.portalCamera.quaternion.copy(calculateCameraRotation(cameraRot, this.portal1, this.portal2));
		//
		// 	// Disable depth bias
		// 	context.disable(context.POLYGON_OFFSET_FILL);
		// 	context.stencilOp(context.KEEP, context.KEEP, context.KEEP);
		// 	context.stencilFunc(context.EQUAL, recursionLevel * 2 + 1, 0b11111111);
		//
		// 	renderer.clippingPlanes = [clipPlane];
		//
		// 	renderer.render(scene, this.portalCamera);
		//
		// 	context.stencilOp(context.KEEP, context.KEEP, context.INCR);
		// 	// Depth bias to separate from any wall
		// 	context.enable(context.POLYGON_OFFSET_FILL);
		// 	context.polygonOffset(-1, -1);
		// 	renderer.render(this.portal1, this.portalCamera);
		// 	renderer.render(this.portal2, this.portalCamera);
		//
		// 	renderer.clippingPlanes = [];
		// }
		//
		// // Draw portal 2
		// for (let recursionLevel = 0; recursionLevel < 1; recursionLevel++) {
		// 	const normal = this.portal1.getWorldDirection(new THREE.Vector3());
		// 	const point = this.portal1.getWorldPosition(new THREE.Vector3());
		// 	const clipPlane = new THREE.Plane(normal, -normal.dot(point));
		//
		// 	context.stencilFunc(context.ALWAYS, recursionLevel * 2 + 2, 0b11111111);
		// 	context.stencilOp(context.KEEP, context.KEEP, context.REPLACE);
		// 	// Depth bias to separate from any wall
		// 	context.enable(context.POLYGON_OFFSET_FILL);
		// 	context.polygonOffset(-1, -1);
		//
		// 	renderer.render(this.portal2, camera);
		//
		// 	renderer.clearDepth();
		//
		// 	// Update camera perspective
		// 	const cameraPos = camera.getWorldPosition(new THREE.Vector3());
		// 	const cameraRot = camera.getWorldQuaternion(new THREE.Quaternion())
		// 	this.portalCamera.position.copy(calculateCameraPosition(cameraPos, this.portal2, this.portal1));
		// 	this.portalCamera.quaternion.copy(calculateCameraRotation(cameraRot, this.portal2, this.portal1));
		//
		// 	// Disable depth bias
		// 	context.disable(context.POLYGON_OFFSET_FILL);
		// 	context.stencilOp(context.KEEP, context.KEEP, context.KEEP);
		// 	context.stencilFunc(context.EQUAL, recursionLevel * 2 + 2, 0b11111111);
		//
		// 	renderer.clippingPlanes = [clipPlane];
		//
		// 	renderer.render(scene, this.portalCamera);
		//
		// 	// context.stencilOp(context.KEEP, context.KEEP, context.INCR);
		// 	// Depth bias to separate from any wall
		// 	context.enable(context.POLYGON_OFFSET_FILL);
		// 	context.polygonOffset(-1, -1);
		// 	renderer.render(this.portal1, this.portalCamera);
		// 	renderer.render(this.portal2, this.portalCamera);
		//
		// 	renderer.clippingPlanes = [];
		// }

		context.disable(context.STENCIL_TEST);

		renderer.autoClear = true;
	}
}
