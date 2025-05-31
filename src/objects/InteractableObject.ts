import * as THREE from 'three';
import RAPIER from "@dimforge/rapier3d";
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';

import { PortalableObject } from '../portal/portalableObject';
import { calculateCameraPosition, calculateCameraRotation } from '../portal/portalManager';
import { PhysicsWorld, PortalableUserData } from '../physics/physicsWorld';
import { PhysicsPositionInterpolator, PhysicsRotationInterpolator } from '../physics/physicsInterpolator';

export class InteractableObject extends PortalableObject {
	public object: THREE.Object3D;
	private duplicateObject: THREE.Object3D;

	public collider: RAPIER.Collider;
	public rigidbody: RAPIER.RigidBody;

	private posInterpolator: PhysicsPositionInterpolator;
	private rotInterpolator: PhysicsRotationInterpolator;

	constructor(
		object: THREE.Object3D,
		collider: RAPIER.ColliderDesc,
		physicsWorld: PhysicsWorld,
		scene: THREE.Scene,
	) {
		super();

		this.object = object;
		this.duplicateObject = SkeletonUtils.clone(object);
		this.duplicateObject.visible = false;

		this.installRootModelRenderData(this.object);
		this.installCloneModelRenderData(this.duplicateObject);

		const rigidBodyDesc = RAPIER.RigidBodyDesc.dynamic()
			.setUserData({
				isPortalable: true,
				portalable: this
			} satisfies PortalableUserData);
		this.rigidbody = physicsWorld.rapierWorld.createRigidBody(rigidBodyDesc);

		this.collider = physicsWorld.rapierWorld.createCollider(collider, this.rigidbody);

		this.posInterpolator = new PhysicsPositionInterpolator(this.rigidbody, physicsWorld);
		this.rotInterpolator = new PhysicsRotationInterpolator(this.rigidbody, physicsWorld);

		scene.add(this.object);
		scene.add(this.duplicateObject);
	}

	public update() {
		this.object.position.copy(this.posInterpolator.update());
		this.object.quaternion.copy(this.rotInterpolator.update());

		this.duplicateObject.visible = this.isInsidePortal();
		if (this.isInsidePortal()) {
			const cameraPos = this.object.getWorldPosition(new THREE.Vector3());
			const cameraRot = this.object.getWorldQuaternion(new THREE.Quaternion());

			this.duplicateObject.position.copy(calculateCameraPosition(
				cameraPos,
				this.inPortal!.mesh,
				this.outPortal!.mesh
			));

			this.duplicateObject.quaternion.copy(calculateCameraRotation(
				cameraRot,
				this.inPortal!.mesh,
				this.outPortal!.mesh
			));
		}
	}

	public physicsUpdate() {
		this.posInterpolator.physicsUpdate();
		this.rotInterpolator.physicsUpdate();
	}

	public getPosition(): THREE.Vector3 {
		return new THREE.Vector3().copy(this.rigidbody.translation());
	}

	public getRotation(): THREE.Quaternion {
		return new THREE.Quaternion().copy(this.rigidbody.rotation());
	}

	public warp(pos: THREE.Vector3, rot: THREE.Quaternion, relativeRot: THREE.Quaternion): void {
		this.rigidbody.setTranslation(pos, true);
		this.rigidbody.setRotation(rot, true);

		const vel = new THREE.Vector3().copy(this.rigidbody.linvel());
		console.log(new THREE.Euler().setFromQuaternion(relativeRot));
		vel.applyQuaternion(relativeRot);
		this.rigidbody.setLinvel(vel, true);

		this.posInterpolator.warp(pos, relativeRot);
		this.rotInterpolator.warp(rot);
	}

	public dispose() {
		this.object.traverse(obj => {
			if ("dispose" in obj && typeof obj.dispose == 'function')
				obj.dispose();
		});
		this.duplicateObject.traverse(obj => {
			if ("dispose" in obj && typeof obj.dispose == 'function')
				obj.dispose();
		});
	}
}
