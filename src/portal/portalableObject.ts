import * as THREE from 'three';

export interface PortalableObject {
	getPosition(): THREE.Vector3;
	getRotation(): THREE.Quaternion;
	warp(pos: THREE.Vector3, rot: THREE.Quaternion): void;
}
