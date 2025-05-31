import * as THREE from 'three';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';

import RAPIER from '@dimforge/rapier3d';

import { Application } from "../../app";
import { AppState } from "../state";
import { Player } from '../../player';
import { PhysicsWorld } from '../../physics/physicsWorld';
import { PlaneObject } from '../../objects/plane';
import { PortalManager } from '../../portal/portalManager';
import { InteractableObject } from '../../objects/InteractableObject';
import { disposeLoadedData, LoadedData } from '../loading';
import { PauseMenu } from './pausemenu';
import { MainMenuState } from '../mainmenu';

export class PlayState extends AppState {
	public scene: THREE.Scene;
	public camera: THREE.PerspectiveCamera;

	private loadedData: LoadedData;

	private player: Player;
	private portalManager: PortalManager;

	private physicsWorld: PhysicsWorld;

	private interactableObjects: InteractableObject[] = [];

	private isPaused: boolean = false;
	private pauseMenu: PauseMenu;

	private pauseKeyListener: ((ev: KeyboardEvent) => void) | undefined;
	private mouseLockListener: (() => void) | undefined;
	private lockChangeListener: ((ev: Event) => void) | undefined;

	constructor(loadedData: LoadedData) {
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

		this.portalManager = new PortalManager(this.physicsWorld, objs);

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

		// Pause Menu
		this.pauseMenu = new PauseMenu();
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

	onStateEnter(app: Application): void {
		// Pause Menu
		const setPause = (pause: boolean) => {
			this.isPaused = pause;

			this.player.isPaused = this.isPaused;
			this.physicsWorld.isPaused = this.isPaused;

			if (this.isPaused)
				this.pauseMenu.enable(app);
			else
				this.pauseMenu.disable(app);
		};

		this.pauseMenu.onResume = async () => {
			setPause(false);

			await app.renderer.domElement.requestPointerLock({
				unadjustedMovement: true,
			});
		};
		this.pauseMenu.onMainMenu = () => app.setState(new MainMenuState());

		this.pauseKeyListener = async (ev) => {
			if (ev.key !== "Escape")
				return

			setPause(!this.isPaused);
		};
		document.addEventListener("keydown", this.pauseKeyListener);

		// Mouse lock
		this.mouseLockListener = async () => {
			if (this.isPaused)
				return;

			if (!document.pointerLockElement) {
				await app.renderer.domElement.requestPointerLock({
					unadjustedMovement: true,
				});
			}
		};
		app.renderer.domElement.addEventListener("click", this.mouseLockListener);

		let wasLocked = false;
		this.lockChangeListener = async () => {
			if (!document.pointerLockElement && wasLocked) {
				setPause(true);
				wasLocked = false;
			} else {
				wasLocked = true;
			}
		};
		document.addEventListener("pointerlockchange", this.lockChangeListener);
	}

	onStateExit(app: Application): void {
		this.pauseMenu.disable(app);

		if (this.pauseKeyListener)
			document.removeEventListener("keydown", this.pauseKeyListener);

		if (this.mouseLockListener)
			app.renderer.domElement.removeEventListener("click", this.mouseLockListener);

		for (const interactableObject of this.interactableObjects)
			interactableObject.dispose();

		this.player.dispose();

		this.scene.traverse(obj => {
			if ("dispose" in obj && typeof obj.dispose == 'function')
				obj.dispose();
		});

		this.portalManager.dispose();
		this.physicsWorld.dispose();

		disposeLoadedData(this.loadedData);
	}
}
