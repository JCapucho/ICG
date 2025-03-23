import * as THREE from 'three';
import RAPIER from "@dimforge/rapier3d";

export class PhysicsWorld {
	public readonly rapierWorld: RAPIER.World;
	public readonly tickrate: number;

	private clock: THREE.Clock;

	constructor(rapierWorld: RAPIER.World, tickrate: number) {
		this.rapierWorld = rapierWorld;
		this.tickrate = tickrate;

		this.clock = new THREE.Clock();
	}

	start(update: (delta: number) => void) {
		setInterval(() => {
			const delta = this.clock.getDelta();

			if (delta < 0.01) {
				console.log("Skipping physics tick");
				return;
			}

			update(delta);

			this.rapierWorld.step();
		}, 1000 / this.tickrate);
	}
}
