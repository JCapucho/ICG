import * as THREE from 'three';
import { Portal } from './portal';

export abstract class PortalableObject {
	protected inPortalCount: number = 0;
	protected inPortal: Portal | undefined;
	protected outPortal: Portal | undefined;
	protected currentClippingPlanes: THREE.Plane[] = [];

	public isInsidePortal(): boolean {
		return this.inPortalCount != 0;
	}

	public enteredPortal(portal: Portal) {
		this.inPortalCount++;
		this.inPortal = portal;
		this.outPortal = portal.otherPortal;
		this.currentClippingPlanes = [
			this.inPortal.getClippingPlane(),
			this.outPortal!.getClippingPlane()
		];
	}

	public exitedPortal() {
		this.inPortalCount--;
		this.inPortal = undefined;
		this.outPortal = undefined;
		this.currentClippingPlanes = [];
	}

	public abstract getPosition(): THREE.Vector3;
	public abstract getRotation(): THREE.Quaternion;
	public abstract warp(pos: THREE.Vector3, rot: THREE.Quaternion): void;
}
