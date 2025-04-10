import * as THREE from 'three';
import RAPIER from "@dimforge/rapier3d";

import { Portal } from "../portal";
import { Application } from "../app";
import { AppState } from "./state";
import { Player } from '../player';
import { RapierDebugRenderer } from '../utils/rapierDebugRender';
import { PhysicsWorld } from '../physicsWorld';

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

function buildPlaneVertices(x: number, z: number): [Float32Array, Uint32Array] {
	const vertices = new Float32Array(3 * 4);
	vertices[0] = -x;
	vertices[1] = 0;
	vertices[2] = -z;

	vertices[3] = x;
	vertices[4] = 0;
	vertices[5] = -z;

	vertices[6] = x;
	vertices[7] = 0;
	vertices[8] = z;

	vertices[9] = -x;
	vertices[10] = 0;
	vertices[11] = z;

	const indices = new Uint32Array(6);

	indices[0] = 0;
	indices[1] = 1;
	indices[2] = 2;
	indices[3] = 2;
	indices[4] = 3;
	indices[5] = 0;

	return [vertices, indices];
}

export class MainState extends AppState {
	private plane: THREE.Mesh;

	public scene: THREE.Scene;
	public camera: THREE.PerspectiveCamera;

	private tileMaterial: THREE.Material;

	private player: Player;
	private portal1: Portal;
	private portal2: Portal;

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


		const geometry = new THREE.PlaneGeometry(50, 50);
		this.plane = new THREE.Mesh(geometry, this.tileMaterial);
		this.plane.rotation.x = -Math.PI / 2;

		// Create a cuboid collider attached to the dynamic rigidBody.
		const [vertices, indices] = buildPlaneVertices(25, 25);
		let colliderDesc = RAPIER.ColliderDesc.trimesh(vertices, indices);
		let collider = this.physicsWorld.rapierWorld.createCollider(colliderDesc);

		this.scene.add(this.plane);

		this.player = new Player(app, this.scene, this.physicsWorld, this.camera);
		this.portal1 = new Portal(this.scene, app.renderer, 2, 5);
		this.portal2 = new Portal(this.scene, app.renderer, 2, 5);

		this.portal1.setTargetPortal(this.portal2);
		this.portal2.setTargetPortal(this.portal1);

		this.portal1.object().position.y = 2.5;

		this.portal2.object().position.z = 10;
		this.portal2.object().position.y = 2.5;
		this.portal2.object().rotation.y = Math.PI;

		// Physics update
		this.physicsWorld.start((delta) => {
			this.player.physicsUpdate(delta);
		});
	}

	resize(width: number, height: number) {
		this.camera.aspect = width / height;
		this.camera.updateProjectionMatrix();
	}

	render(delta: number, renderer: THREE.WebGLRenderer): void {
		this.player.update(delta);

		this.portal1.render(this.scene, this.camera, renderer);
		this.portal2.render(this.scene, this.camera, renderer);

		renderer.render(this.scene, this.camera);
	}

	debugChanged(debug: boolean): void {
		// this.portal1.setDebug(debug, this.scene);
		this.portal2.setDebug(debug, this.scene);
		this.physicsWorld.setDebug(debug, this.scene);
	}

	debugUpdate(): void {
		this.physicsWorld.debugUpdate();
	}
}
