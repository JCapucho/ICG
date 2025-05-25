import * as THREE from 'three';
import RAPIER from "@dimforge/rapier3d";

import { PhysicsWorld } from '../physics/physicsWorld';
import { GameObject } from './gameObject';

function buildPlaneUVs(x: number, y: number): THREE.BufferAttribute {
	const uvArray = new Float32Array(8);

	uvArray[0] = 0.0;
	uvArray[1] = 0.0;
	uvArray[2] = 0.0;
	uvArray[3] = x;
	uvArray[4] = y;
	uvArray[5] = 0.0;
	uvArray[6] = y;
	uvArray[7] = x;

	return new THREE.BufferAttribute(uvArray, 2);
}

function buildPlaneColliderVertices(x: number, y: number): [Float32Array, Uint32Array] {
	const vertices = new Float32Array(3 * 4);
	vertices[0] = -x;
	vertices[1] = -y;
	vertices[2] = 0;

	vertices[3] = x;
	vertices[4] = -y;
	vertices[5] = 0;

	vertices[6] = x;
	vertices[7] = y;
	vertices[8] = 0;

	vertices[9] = -x;
	vertices[10] = y;
	vertices[11] = 0;

	const indices = new Uint32Array(6);

	indices[0] = 0;
	indices[1] = 1;
	indices[2] = 2;
	indices[3] = 2;
	indices[4] = 3;
	indices[5] = 0;

	return [vertices, indices];
}

interface PlaneOptions {
	width: number,
	height: number,
	position: number[],
	rotation: number[],
	uvScale: number
}

export class PlaneObject extends GameObject {
	constructor(
		options: PlaneOptions,
		material: THREE.Material,
		scene: THREE.Scene,
		physicsWorld: PhysicsWorld
	) {
		const geometry = new THREE.PlaneGeometry(options.width, options.height);
		const mesh = new THREE.Mesh(geometry, material);

		mesh.position.x = options.position[0];
		mesh.position.y = options.position[1];
		mesh.position.z = options.position[2];

		mesh.rotation.x = options.rotation[0] * Math.PI;
		mesh.rotation.y = options.rotation[1] * Math.PI;
		mesh.rotation.z = options.rotation[2] * Math.PI;

		geometry.setAttribute("uv", buildPlaneUVs(
			options.width * options.uvScale,
			options.height * options.uvScale
		))

		// Create a cuboid collider attached to the dynamic rigidBody.
		const [vertices, indices] = buildPlaneColliderVertices(options.width / 2, options.height / 2);
		let colliderDesc = RAPIER.ColliderDesc.trimesh(vertices, indices);
		// @ts-ignore: TS6133
		const collider = physicsWorld.rapierWorld.createCollider(colliderDesc);
		collider.setTranslation(mesh.position);
		collider.setRotation(new THREE.Quaternion().setFromEuler(mesh.rotation));

		super(mesh, collider, scene);
	}
}
