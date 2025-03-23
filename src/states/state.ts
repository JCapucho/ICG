import * as THREE from 'three';

export abstract class AppState {
	abstract render(delta: number, renderer: THREE.WebGLRenderer): void;

	resize(width: number, height: number): void { };

	debugChanged(debug: boolean): void { };
	debugUpdate(): void { };
}
