import * as THREE from 'three';
import { Portal } from './portal';

export abstract class PortalableObject {
	protected insidePortals: Portal[] = [];
	protected currentClippingPlanes: THREE.Plane[] = [];

	public isInsidePortal(): boolean {
		return this.insidePortals.length != 0;
	}

	public enteredPortal(portal: Portal) {
		this.insidePortals.push(portal);
		this.currentClippingPlanes.push(portal.getClippingPlane());
	}

	public exitedPortal(portal: Portal) {
		const index = this.insidePortals.indexOf(portal)
		if (index > -1) {
			this.insidePortals.splice(index, 1);
			this.currentClippingPlanes.splice(index, 1);
		}
	}

	public abstract get3DObject(): THREE.Object3D;
	public abstract getPosition(): THREE.Vector3;
	public abstract getRotation(): THREE.Quaternion;
	public abstract warp(pos: THREE.Vector3, rot: THREE.Quaternion): void;
}
