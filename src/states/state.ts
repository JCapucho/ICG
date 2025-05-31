import * as THREE from 'three';
import { Application } from '../app';

export abstract class AppState {
	onStateEnter(_app: Application): void { };
	onStateExit(_app: Application): void { };

	render(_delta: number, _renderer: THREE.WebGLRenderer): void { };

	resize(_width: number, _height: number): void { };

	debugChanged(_debug: boolean): void { };
	debugUpdate(): void { };
}
