import * as THREE from 'three';

import { Application } from "../app";
import { AppState } from "./state";
import { Player } from '../player';
import { PhysicsWorld } from '../physics/physicsWorld';
import { PlaneObject } from '../objects/plane';

import levelData from "./level.json";
import { PortalManager } from '../portal/portalManager';
import { InteractableObject } from '../objects/InteractableObject';
import RAPIER from '@dimforge/rapier3d';

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

export class PlayState extends AppState {
	public scene: THREE.Scene;
	public camera: THREE.PerspectiveCamera;

	private tileMaterial: THREE.Material;

	private player: Player;
	private portalManager: PortalManager;

	private physicsWorld: PhysicsWorld;

	private interactableObjects: InteractableObject[] = [];

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

		const objs = [];
		for (const plane of levelData["planes"]) {
			const obj = new PlaneObject(plane, this.tileMaterial, this.scene, this.physicsWorld);
			objs.push(obj);
		}

		this.portalManager = new PortalManager(app.renderer, this.physicsWorld, objs);

		this.player = new Player(app, this.scene, this.physicsWorld, this.camera);


		app.gltfLoader.load("Models/soccer_ball_low-poly_pbr.glb", (gltf) => {
			gltf.scene.scale.multiplyScalar(7);
			gltf.scene.position.y -= 0.5;

			const scene = new THREE.Scene();
			scene.add(gltf.scene);

			const interactable = new InteractableObject(
				scene,
				RAPIER.ColliderDesc.ball(0.5),
				this.physicsWorld,
				this.scene
			);
			interactable.warp(new THREE.Vector3(0, 3, 4.8), new THREE.Quaternion(), new THREE.Quaternion());
			this.interactableObjects.push(interactable);
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
