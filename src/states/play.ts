import * as THREE from 'three';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';

import { Application } from "../app";
import { AppState } from "./state";
import { Player } from '../player';
import { PhysicsWorld } from '../physics/physicsWorld';
import { PlaneObject } from '../objects/plane';

import { PortalManager } from '../portal/portalManager';
import { InteractableObject } from '../objects/InteractableObject';
import RAPIER from '@dimforge/rapier3d';
import { LoadedData } from './loading';

export class PlayState extends AppState {
	public scene: THREE.Scene;
	public camera: THREE.PerspectiveCamera;

	private loadedData: LoadedData;

	private player: Player;
	private portalManager: PortalManager;

	private physicsWorld: PhysicsWorld;

	private interactableObjects: InteractableObject[] = [];

	constructor(app: Application, loadedData: LoadedData) {
		super();

		this.loadedData = loadedData;

		this.scene = new THREE.Scene();

		this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

		// Physics
		const gravity = { x: 0.0, y: -9.81, z: 0.0 };
		this.physicsWorld = new PhysicsWorld(new this.loadedData.rapier.World(gravity), 30);

		// Skybox
		this.loadedData.skyboxTexture.mapping = THREE.EquirectangularReflectionMapping;
		this.scene.background = this.loadedData.skyboxTexture;
		this.scene.environment = this.loadedData.skyboxTexture;

		// Level geometry
		const objs = [];
		for (const plane of this.loadedData.levelData.planes) {
			const obj = new PlaneObject(plane, this.loadedData.tiles107Material, this.scene, this.physicsWorld);
			objs.push(obj);
		}

		this.portalManager = new PortalManager(app.renderer, this.physicsWorld, objs);

		this.player = new Player(this.loadedData.playerModel, this.scene, this.physicsWorld, this.camera);

		// Interactable ball
		const ballInstance = SkeletonUtils.clone(this.loadedData.ballModel.scene)

		ballInstance.scale.multiplyScalar(7);
		ballInstance.position.y -= 0.5;

		const scene = new THREE.Scene();
		scene.add(ballInstance);

		const interactable = new InteractableObject(
			scene,
			RAPIER.ColliderDesc.ball(0.5),
			this.physicsWorld,
			this.scene
		);
		interactable.warp(new THREE.Vector3(0, 3, 4.8), new THREE.Quaternion(), new THREE.Quaternion());
		this.interactableObjects.push(interactable);

		// Mouse lock
		app.renderer.domElement.addEventListener("click", async () => {
			if (!document.pointerLockElement) {
				await app.renderer.domElement.requestPointerLock({
					unadjustedMovement: true,
				});
			}
		});
	}

	resize(width: number, height: number) {
		this.camera.aspect = width / height;
		this.camera.updateProjectionMatrix();
		this.portalManager.resize(width, height);
	}

	render(delta: number, renderer: THREE.WebGLRenderer): void {
		renderer.clearStencil();

		this.physicsWorld.update(this.physicsUpdate.bind(this));

		this.player.update(delta);

		for (const interactable of this.interactableObjects)
			interactable.update();

		this.portalManager.render(this.scene, this.camera, renderer);
	}

	physicsUpdate(delta: number) {
		this.player.physicsUpdate(delta);
		this.portalManager.physicsUpdate();

		for (const interactable of this.interactableObjects)
			interactable.physicsUpdate();
	}

	debugChanged(debug: boolean): void {
		this.physicsWorld.setDebug(debug, this.scene);
		// this.portalManager.setDebug(debug);
	}

	debugUpdate(): void {
		this.physicsWorld.debugUpdate();
		// this.portalManager.debugUpdate(debug);
	}
}
