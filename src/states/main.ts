import * as THREE from 'three';
import RAPIER from "@dimforge/rapier3d";

import { Portal } from "../portal/portal";
import { Application } from "../app";
import { AppState } from "./state";
import { Player } from '../player';
import { PhysicsWorld } from '../physicsWorld';
import { PlaneObject } from '../objects/plane';

import levelData from "./level.json";
import { PortalManager } from '../portal/portalManager';

function textureRepeat(texture: THREE.Texture) {
	texture.wrapS = THREE.RepeatWrapping;
	texture.wrapT = THREE.RepeatWrapping;
	texture.needsUpdate = true;
}

function loadTiles107Material(app: Application): THREE.Material {
	const aoMap = app.textureLoader.load("Materials/Tiles107/Tiles107_AO.jpg", textureRepeat);
	const normalMap = app.textureLoader.load("Materials/Tiles107/Tiles107_Normal.jpg", textureRepeat);
	const roughnessMap = app.textureLoader.load("Materials/Tiles107/Tiles107_Roughness.jpg", textureRepeat);
	const colorMap = app.textureLoader.load("Materials/Tiles107/Tiles107_Color.jpg", textureRepeat);

	return new THREE.MeshStandardMaterial({
		map: colorMap,
		aoMap,
		normalMap,
		roughnessMap,
	});
}

export class MainState extends AppState {
	public scene: THREE.Scene;
	public camera: THREE.PerspectiveCamera;

	private tileMaterial: THREE.Material;

	private player: Player;
	// private portal1: Portal;
	// private portal2: Portal;
	private portalManager: PortalManager;

	private physicsWorld: PhysicsWorld;

	constructor(app: Application) {
		super();

		this.scene = new THREE.Scene();

		const gravity = { x: 0.0, y: -9.81, z: 0.0 };
		this.physicsWorld = new PhysicsWorld(new app.rapier.World(gravity), 30);

		this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

		app
			.rgbeLoader
			.load('autumn_field_puresky_1k.hdr', (texture) => {
				texture.mapping = THREE.EquirectangularReflectionMapping;

				this.scene.background = texture;
				this.scene.environment = texture;
			});
		this.tileMaterial = loadTiles107Material(app);

		for (const plane of levelData["planes"]) {
			const obj = new PlaneObject(plane, this.tileMaterial, this.scene, this.physicsWorld);
		}

		this.player = new Player(app, this.scene, this.physicsWorld, this.camera);
		// this.portal1 = new Portal(this.scene, app.renderer, 2, 5);
		// this.portal2 = new Portal(this.scene, app.renderer, 2, 5);
		//
		// this.portal1.setTargetPortal(this.portal2);
		// this.portal2.setTargetPortal(this.portal1);
		//
		// this.portal1.object().position.z = -5;
		// this.portal1.object().position.y = 2.5;
		//
		// this.portal2.object().position.z = 5;
		// this.portal2.object().position.y = 2.5;
		// this.portal2.object().rotation.y = Math.PI;

		this.portalManager = new PortalManager(this.scene, app.renderer);

		// Physics update
		this.physicsWorld.start((delta) => {
			this.player.physicsUpdate(delta);
		});
	}

	resize(width: number, height: number) {
		this.camera.aspect = width / height;
		this.camera.updateProjectionMatrix();

		// this.portal1.resize(width, height);
		// this.portal2.resize(width, height);
	}

	render(delta: number, renderer: THREE.WebGLRenderer): void {
		renderer.clearStencil();

		this.player.update(delta);

		this.portalManager.render(this.scene, this.camera, renderer);
	}

	debugChanged(debug: boolean): void {
		// this.portal1.setDebug(debug, this.scene);
		// this.portal2.setDebug(debug, this.scene);
		this.physicsWorld.setDebug(debug, this.scene);
	}

	debugUpdate(): void {
		this.physicsWorld.debugUpdate();
	}
}
