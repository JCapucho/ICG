import * as THREE from 'three';
import RAPIER from "@dimforge/rapier3d";

import { RapierDebugRenderer } from './utils/rapierDebugRender';
import { PortalableObject } from './portal/portalableObject';

export interface PhysicsUserData {
	isPortalable?: boolean;
	isPlayer?: boolean;
	onEnter?: (other: RAPIER.Collider, world: PhysicsWorld) => void;
	onExit?: (other: RAPIER.Collider, world: PhysicsWorld) => void;
}

export interface PortalableUserData extends PhysicsUserData {
	isPortalable: true;
	portalable: PortalableObject
}

export interface PlayerUserData extends PortalableUserData {
	isPlayer: true;
}

export function isPortalable(userData: PhysicsUserData): userData is PortalableUserData {
	return userData.isPortalable === true;
}

export function isPlayer(userData: PhysicsUserData): userData is PlayerUserData {
	return userData.isPlayer === true;
}

export class PhysicsWorld {
	public readonly rapierWorld: RAPIER.World;
	public readonly tickrate: number;

	private skipTicks: number;
	private timeSinceLastUpdate: number = 0.0;

	private clock: THREE.Clock;
	private eventQueue: RAPIER.EventQueue = new RAPIER.EventQueue(true);

	private rapierDebugRender: RapierDebugRenderer | null = null;

	constructor(rapierWorld: RAPIER.World, tickrate: number) {
		this.rapierWorld = rapierWorld;
		this.tickrate = tickrate;
		this.skipTicks = 1 / tickrate;

		this.clock = new THREE.Clock();
	}

	update(userUpdate: (delta: number) => void) {
		while (this.timeSinceLastUpdate > this.skipTicks) {
			this.physicsUpdate(userUpdate);
			this.timeSinceLastUpdate = this.clock.getDelta();
		}

		this.timeSinceLastUpdate += this.clock.getDelta();
	}

	private physicsUpdate(userUpdate: (delta: number) => void) {
		const delta = this.timeSinceLastUpdate;

		if (delta < 0.01) {
			console.log("Skipping physics tick");
			return;
		}

		userUpdate(delta);

		this.rapierWorld.step(this.eventQueue);

		this.eventQueue.drainCollisionEvents((handle1, handle2, started) => {
			this.dispatchCollisionEvents(handle1, handle2, started);
			this.dispatchCollisionEvents(handle2, handle1, started);
		});
	}

	setDebug(debug: boolean, scene: THREE.Scene) {
		if (debug && !this.rapierDebugRender) {
			this.rapierDebugRender = new RapierDebugRenderer(this.rapierWorld);
			scene.add(this.rapierDebugRender.mesh);
		}

		this.rapierDebugRender?.setDebug(debug);
	}

	debugUpdate() {
		if (this.rapierDebugRender)
			this.rapierDebugRender.update();
	}

	getColliderUserData(collider: RAPIER.Collider): PhysicsUserData | null {
		const rigidbody = collider.parent();

		if (rigidbody != null && rigidbody.userData != null && typeof rigidbody.userData === "object") {
			return rigidbody.userData as PhysicsUserData;
		}

		return null;
	}

	getColliderHandleUserData(handle: RAPIER.ColliderHandle): PhysicsUserData | null {
		const collider = this.rapierWorld.getCollider(handle);
		return this.getColliderUserData(collider);
	}

	private dispatchCollisionEvents(collider: RAPIER.ColliderHandle, otherHandle: RAPIER.ColliderHandle, started: boolean) {
		const userData = this.getColliderHandleUserData(collider);

		if (userData == null)
			return;

		const other = this.rapierWorld.getCollider(otherHandle);

		if (started)
			userData.onEnter?.(other, this);
		else
			userData.onExit?.(other, this);
	}
}
