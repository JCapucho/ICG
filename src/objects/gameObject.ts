import * as THREE from 'three';
import RAPIER from "@dimforge/rapier3d";

export abstract class GameObject {
	public mesh: THREE.Mesh;
	public collider: RAPIER.Collider;

	constructor(
		mesh: THREE.Mesh,
		collider: RAPIER.Collider,
		scene: THREE.Scene,
	) {
		this.mesh = mesh;
		this.collider = collider;

		scene.add(this.mesh);
	}
}
