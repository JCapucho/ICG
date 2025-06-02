import * as THREE from 'three';
import { GLTF } from 'three/addons/loaders/GLTFLoader.js';

export type Rapier = typeof import('@dimforge/rapier3d');

import { Application } from "../app";
import { LevelData } from "../levels/levelData";
import { AppState } from "./state";
import { PlayState } from './play/state';

export type LoadedData = {
	levelData: LevelData;

	tiles107Material: THREE.Material;
	skyboxTexture: THREE.DataTexture;

	ballModel: GLTF;
	playerModel: GLTF;

	rapier: Rapier;
};

export function disposeLoadedData(loadedData: LoadedData) {
	loadedData.tiles107Material.dispose();
	loadedData.skyboxTexture.dispose();
	loadedData.ballModel.scene.traverse(obj => {
		if ("dispose" in obj && typeof obj.dispose == 'function')
			obj.dispose();
	});
	loadedData.playerModel.scene.traverse(obj => {
		if ("dispose" in obj && typeof obj.dispose == 'function')
			obj.dispose();
	});
}

export class LoadingState extends AppState {
	private loadingMenuRoot: HTMLElement | undefined;
	private loadingMenuProgressBar: HTMLProgressElement | undefined;

	private levelName: string;
	private itemsToLoad: number = 0;
	private itemsLoaded: number = 0;
	private finishedAccounting: boolean = false;

	private tiles107Material: THREE.Material | undefined;
	private skyboxTexture: Promise<THREE.DataTexture> | undefined;
	private levelDataPromise: Promise<LevelData> | undefined;
	private playerModelPromise: Promise<GLTF> | undefined;
	private ballModelPromise: Promise<GLTF> | undefined;
	private rapierPromise: Promise<Rapier> | undefined;

	constructor(levelName: string) {
		super();

		this.levelName = levelName;
	}

	onStateEnter(app: Application): void {
		// UI
		this.loadingMenuRoot = document.createElement("div");
		this.loadingMenuRoot.className = "loadingmenu";

		const container = document.createElement("div");
		container.className = "container";

		const title = document.createElement("h1");
		title.textContent = "Now Loading";
		title.className = "loadingtitle";

		this.loadingMenuProgressBar = document.createElement("progress");
		this.loadingMenuProgressBar.max = 1;
		this.loadingMenuProgressBar.value = 0;

		container.appendChild(title);
		container.appendChild(this.loadingMenuProgressBar);

		app.container.appendChild(this.loadingMenuRoot);

		this.loadingMenuRoot.appendChild(container);

		this.loadData(app);
	}

	onStateExit(_app: Application): void {
		this.loadingMenuRoot?.remove();
	}

	private loadData(app: Application) {
		// Loading
		this.loadTiles107Material(app);

		this.levelDataPromise = this.accountPromise(
			app,
			import(`../levels/${this.levelName}.json`).then(res => res.default)
		);

		this.skyboxTexture = this.accountPromise(app, new Promise(resolve => {
			app
				.rgbeLoader
				.load('autumn_field_puresky_1k.hdr', resolve)
		}));

		this.playerModelPromise = this.accountPromise(app, new Promise(resolve => {
			app.gltfLoader.load("Models/Character_Animated.glb", resolve);
		}));

		this.ballModelPromise = this.accountPromise(app, new Promise(resolve => {
			app.gltfLoader.load("Models/soccer_ball_low-poly_pbr.glb", (gltf) => {
				gltf.scene.scale.multiplyScalar(7);
				gltf.scene.position.y -= 0.5;

				resolve(gltf);
			});
		}));

		this.rapierPromise = this.accountPromise(app, import('@dimforge/rapier3d'));

		// Finish
		this.finishedAccounting = true;
		this.checkFinishedLoading(app);
	}

	private loadTiles107Material(app: Application) {
		const onTextureLoad = (texture: THREE.Texture) => {
			texture.wrapS = THREE.RepeatWrapping;
			texture.wrapT = THREE.RepeatWrapping;
			texture.needsUpdate = true;

			this.itemLoaded(app);
		}

		const aoMap = app.textureLoader.load("Materials/Tiles107/Tiles107_AO.jpg", onTextureLoad);
		const normalMap = app.textureLoader.load("Materials/Tiles107/Tiles107_Normal.jpg", onTextureLoad);
		const roughnessMap = app.textureLoader.load("Materials/Tiles107/Tiles107_Roughness.jpg", onTextureLoad);
		const colorMap = app.textureLoader.load("Materials/Tiles107/Tiles107_Color.jpg", onTextureLoad);
		this.itemsToLoad += 4;

		this.tiles107Material = new THREE.MeshPhysicalMaterial({
			map: colorMap,
			aoMap,
			normalMap,
			roughnessMap,
		});
	}

	private accountPromise<T>(app: Application, promise: Promise<T>): Promise<T> {
		this.itemsToLoad += 1;
		return promise.then(r => {
			this.itemLoaded(app);
			return r;
		});
	}

	private async itemLoaded(app: Application) {
		this.itemsLoaded += 1;
		await this.checkFinishedLoading(app);
	}

	private async checkFinishedLoading(app: Application) {
		if (!this.finishedAccounting)
			return;

		if (this.loadingMenuProgressBar)
			this.loadingMenuProgressBar.value = this.itemsLoaded / this.itemsToLoad;

		if (this.itemsToLoad > this.itemsLoaded)
			return;

		const loadedData: LoadedData = {
			levelData: await this.levelDataPromise!,
			tiles107Material: this.tiles107Material!,
			skyboxTexture: await this.skyboxTexture!,
			ballModel: await this.ballModelPromise!,
			playerModel: await this.playerModelPromise!,
			rapier: await this.rapierPromise!,
		};

		app.setState(new PlayState(loadedData));
	}
}
