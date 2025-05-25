import * as THREE from 'three';
import RAPIER from "@dimforge/rapier3d";
import { PhysicsWorld } from "./physicsWorld";

export class PhysicsPositionInterpolator {
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

	public update(): THREE.Vector3 {
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

export class PhysicsRotationInterpolator {
	private rigidbody: RAPIER.RigidBody;
	private physicsWorld: PhysicsWorld;

	private lastRot: THREE.Quaternion = new THREE.Quaternion();
	private nextRot: THREE.Quaternion = new THREE.Quaternion();

	private scratch: THREE.Quaternion = new THREE.Quaternion();

	constructor(rigidbody: RAPIER.RigidBody, physicsWorld: PhysicsWorld) {
		this.rigidbody = rigidbody;
		this.physicsWorld = physicsWorld;

		this.lastRot.copy(this.rigidbody.rotation());
		this.nextRot.copy(this.rigidbody.rotation());
	}

	public update(): THREE.Quaternion {
		return this.scratch.slerpQuaternions(
			this.lastRot,
			this.nextRot,
			this.physicsWorld.getInterpolationAlpha()
		);
	}

	public physicsUpdate() {
		this.lastRot.copy(this.nextRot);
		this.nextRot.copy(this.rigidbody.rotation());
	}

	public warp(rot: RAPIER.Rotation) {
		this.lastRot.copy(rot);
		this.nextRot.copy(rot);
	}
}
