import * as THREE from 'three';
import RAPIER from "@dimforge/rapier3d";

export class RapierDebugRenderer {
	public mesh: THREE.LineSegments<THREE.BufferGeometry, THREE.Material>;
	private physicsWorld: RAPIER.World;

	constructor(physicsWorld: RAPIER.World) {
		this.physicsWorld = physicsWorld;

		this.mesh = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0xffffff, vertexColors: true }))
		this.mesh.frustumCulled = false;
	}

	setDebug(debug: boolean) {
		this.mesh.visible = debug;
	}

	update() {
		const { vertices, colors } = this.physicsWorld.debugRender()
		this.mesh.geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3))
		this.mesh.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 4))
	}

	public dispose() {
		this.mesh.geometry.dispose();
		this.mesh.material.dispose();
	}
}
