import * as THREE from 'three';
import RAPIER from "@dimforge/rapier3d";
import { PhysicsWorld } from "./physicsWorld";

export class PhysicsInterpolator {
	private rigidbody: RAPIER.RigidBody;
	private physicsWorld: PhysicsWorld;

	private lastPos: RAPIER.Vector3;
	private nextPos: RAPIER.Vector3;

	private scratch: THREE.Vector3 = new THREE.Vector3();

	constructor(rigidbody: RAPIER.RigidBody, physicsWorld: PhysicsWorld) {
		this.rigidbody = rigidbody;
		this.physicsWorld = physicsWorld;

		this.lastPos = this.rigidbody.translation();
		this.nextPos = this.rigidbody.translation();
	}

	public update() {
		return this.scratch.lerpVectors(
			this.lastPos,
			this.nextPos,
			this.physicsWorld.getInterpolationAlpha()
		);
	}

	public physicsUpdate() {
		this.lastPos = this.nextPos;
		this.nextPos = this.rigidbody.translation();
	}

	public warp(pos: RAPIER.Vector3) {
		this.lastPos = pos;
		this.nextPos = pos;
	}
}
