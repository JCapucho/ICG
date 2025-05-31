import * as THREE from 'three';
import RAPIER from "@dimforge/rapier3d";
import { PhysicsWorld } from "./physicsWorld";

export class PhysicsPositionInterpolator {
	private rigidbody: RAPIER.RigidBody;
	private physicsWorld: PhysicsWorld;

	private lastPos: THREE.Vector3 = new THREE.Vector3();
	private nextPos: THREE.Vector3 = new THREE.Vector3();

	private scratch: THREE.Vector3 = new THREE.Vector3();

	constructor(rigidbody: RAPIER.RigidBody, physicsWorld: PhysicsWorld) {
		this.rigidbody = rigidbody;
		this.physicsWorld = physicsWorld;

		this.lastPos.copy(this.rigidbody.translation());
		this.nextPos.copy(this.rigidbody.translation());
	}

	public update(): THREE.Vector3 {
		return this.scratch.lerpVectors(
			this.lastPos,
			this.nextPos,
			this.physicsWorld.getInterpolationAlpha()
		);
	}

	public physicsUpdate() {
		this.lastPos.copy(this.nextPos);
		this.nextPos.copy(this.rigidbody.translation());
	}

	public warp(pos: RAPIER.Vector3, relativeRot: THREE.Quaternion) {
		const current = this.update();
		const backwardDiff = this.lastPos.sub(current);
		const forwardDiff = this.nextPos.sub(current);

		this.lastPos.copy(backwardDiff.applyQuaternion(relativeRot).add(pos));
		this.nextPos.copy(forwardDiff.applyQuaternion(relativeRot).add(pos));
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
