import * as THREE from 'three';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import GUI from 'three/examples/jsm/libs/lil-gui.module.min.js';

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
import { GameObject } from '../../objects/gameObject';

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

	private debugGUI: GUI | undefined;

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
		const objs: { [id: string]: GameObject } = {};
		for (const plane of this.loadedData.levelData.planes) {
			const obj = new PlaneObject(plane, this.loadedData.tiles107Material, this.scene, this.physicsWorld);

			if (plane.id)
				objs[plane.id] = obj;
		}

		// Portals
		this.portalManager = new PortalManager(this.physicsWorld);

		for (const portalData of this.loadedData.levelData.portals) {
			const portal = this.portalManager.addPortal(portalData.width, portalData.height);

			portal.mesh.position.set(...portalData.position);

			portal.mesh.rotation.x = portalData.rotation[0] * Math.PI;
			portal.mesh.rotation.y = portalData.rotation[1] * Math.PI;
			portal.mesh.rotation.z = portalData.rotation[2] * Math.PI;

			portal.setAttachedObject(objs[portalData.objectId]);
			portal.updatePositions();
		}

		this.player = new Player(this.loadedData.playerModel, this.scene, this.physicsWorld, this.camera);

		// Interactable Objects
		for (const obj of this.loadedData.levelData.objects) {
			const ballInstance = SkeletonUtils.clone(this.loadedData.ballModel.scene)

			const scene = new THREE.Scene();
			scene.add(ballInstance);

			const interactable = new InteractableObject(
				scene,
				RAPIER.ColliderDesc.ball(0.5),
				this.physicsWorld,
				this.scene
			);

			const position = new THREE.Vector3();
			const rot = new THREE.Euler();

			if (obj.position)
				position.set(...obj.position);

			if (obj.rotation)
				rot.set(...obj.rotation);

			interactable.warp(position, new THREE.Quaternion().setFromEuler(rot), new THREE.Quaternion());
			this.interactableObjects.push(interactable);
		}

		// Pause Menu
		this.pauseMenu = new PauseMenu();

		// lights
		for (const lightData of this.loadedData.levelData.lights) {
			console.log(lightData);

			const light = new THREE.DirectionalLight(lightData.color, lightData.intensity);
			light.castShadow = true;

			if (lightData.shadowFrustum) {
				light.shadow.camera.top *= lightData.shadowFrustum[0];
				light.shadow.camera.right *= lightData.shadowFrustum[1];
				light.shadow.camera.bottom *= lightData.shadowFrustum[2];
				light.shadow.camera.left *= lightData.shadowFrustum[3];
			}

			if (lightData.shadowIntensity)
				light.shadow.intensity = lightData.shadowIntensity;

			if (lightData.pos)
				light.position.set(...lightData.pos);

			this.scene.add(light);

			if (lightData.target) {
				light.target.position.set(...lightData.target);
				this.scene.add(light.target);
			}

			const helper = new THREE.DirectionalLightHelper(light);
			this.scene.add(helper);
		}
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
		if (!this.debugGUI) {
			this.debugGUI = new GUI();
			this.debugGUI.add(this.portalManager, "maxRecursion", 1, 5, 1);
			this.debugGUI.add(this.portalManager, "disableFrustumCulling");
			this.debugGUI.add(this.portalManager, "disablePortalBox");
			this.debugGUI.add(this.portalManager, "disableCulling");
			this.debugGUI.add(this.portalManager, "disableRecursiveRendering");
			this.debugGUI.add(this.portalManager, "disablePolygonOffset");
		}

		if (debug)
			this.debugGUI.show();
		else
			this.debugGUI.hide();

		this.physicsWorld.setDebug(debug, this.scene);
	}

	debugUpdate(): void {
		this.physicsWorld.debugUpdate();
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

		if (this.debugGUI)
			this.debugGUI.destroy();

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
