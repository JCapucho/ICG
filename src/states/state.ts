import * as THREE from 'three';

export abstract class AppState {
	abstract render(delta: number, renderer: THREE.WebGLRenderer): void;

	resize(_width: number, _height: number): void { };

	debugChanged(_debug: boolean): void { };
	debugUpdate(): void { };
}
