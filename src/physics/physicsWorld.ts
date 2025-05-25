import * as THREE from 'three';
import RAPIER from "@dimforge/rapier3d";

import { RapierDebugRenderer } from '../utils/rapierDebugRender';
import { PortalableObject } from '../portal/portalableObject';

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

// The game loop and interpolation code were derived from: https://www.gafferongames.com/post/fix_your_timestep/
export class PhysicsWorld {
	public readonly rapierWorld: RAPIER.World;
	public readonly tickrate: number;

	private dt: number;
	private accumulator: number = 0.0

	private clock: THREE.Clock;
	private eventQueue: RAPIER.EventQueue = new RAPIER.EventQueue(true);

	private rapierDebugRender: RapierDebugRenderer | null = null;

	constructor(rapierWorld: RAPIER.World, tickrate: number) {
		this.rapierWorld = rapierWorld;
		this.tickrate = tickrate;
		this.dt = 1 / tickrate;

		this.clock = new THREE.Clock();
	}

	public getInterpolationAlpha(): number {
		return this.accumulator / this.dt;
	}

	update(userUpdate: (delta: number) => void) {
		let frameTime = this.clock.getDelta();
		// Clamp the frame time so that the accumulator doesn't explode
		if (frameTime > 0.25)
			frameTime = 0.25;

		this.accumulator += frameTime;

		while (this.accumulator > this.dt) {
			this.physicsUpdate(userUpdate);
			this.accumulator -= this.dt;
		}
	}

	private physicsUpdate(userUpdate: (delta: number) => void) {
		userUpdate(this.dt);

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
