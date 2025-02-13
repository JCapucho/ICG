import * as THREE from 'three';

import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Application, AppState } from "./app";

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

class MainState implements AppState {
	private plane: THREE.Mesh;
	private controls: OrbitControls;

	private tileMaterial: THREE.Material;

	constructor(app: Application) {
		app
			.rgbeLoader
			.load('autumn_field_puresky_1k.hdr', function(texture) {
				texture.mapping = THREE.EquirectangularReflectionMapping;

				app.scene.background = texture;
				app.scene.environment = texture;
			});
		this.tileMaterial = loadTiles107Material(app);

		this.controls = new OrbitControls(app.camera, app.renderer.domElement);

		const geometry = new THREE.PlaneGeometry(50, 50);
		this.plane = new THREE.Mesh(geometry, this.tileMaterial);
		this.plane.rotation.x = -Math.PI / 2;

		app.scene.add(this.plane);

		app.camera.position.z = 5;
		app.camera.position.y = 2;
		this.controls.update();

	}

	update(delta: number): void {
		//this.cube.rotation.x += 1 * delta;
		//this.cube.rotation.y += 1 * delta;

		this.controls.update();
	}
}

const canvas = document.querySelector('#app') as HTMLCanvasElement;
const app = new Application(canvas);

app.state = new MainState(app);

app.start();
