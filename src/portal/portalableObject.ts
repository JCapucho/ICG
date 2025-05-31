import * as THREE from 'three';
import { Portal } from './portal';

export abstract class PortalableObject {
	protected inPortalCount: number = 0;

	protected inPortal: Portal | undefined;
	protected outPortal: Portal | undefined;

	protected inPortalClippingPlane: THREE.Plane | null = null;
	protected outPortalClippingPlane: THREE.Plane | null = null;

	public isInsidePortal(): boolean {
		return this.inPortalCount != 0;
	}

	public enteredPortal(portal: Portal) {
		this.inPortalCount++;
		this.inPortal = portal;
		this.outPortal = portal.otherPortal;

		this.inPortalClippingPlane = this.inPortal.getClippingPlane();
		this.outPortalClippingPlane = this.outPortal!.getClippingPlane();
	}

	public exitedPortal() {
		this.inPortalCount--;
		this.inPortal = undefined;
		this.outPortal = undefined;

		this.inPortalClippingPlane = null;
		this.outPortalClippingPlane = null;
	}

	protected installRootModelRenderData(scene: THREE.Object3D) {
		scene.traverse((object) => {
			if (object instanceof THREE.Mesh) {
				object.onBeforeRender = (_renderer, _scene, _camera, _geometry, material) => {
					if (this.inPortalClippingPlane == null)
						return;

					material.clippingPlanes = [this.inPortalClippingPlane];
				};

				object.onAfterRender = (_renderer, _scene, _camera, _geometry, material) => {
					material.clippingPlanes = [];
				};
			}
		})
	}

	protected installCloneModelRenderData(scene: THREE.Object3D) {
		scene.traverse((object) => {
			if (object instanceof THREE.Mesh) {
				object.onBeforeRender = (_renderer, _scene, _camera, _geometry, material) => {
					if (this.outPortalClippingPlane == null)
						return;

					material.clippingPlanes = [this.outPortalClippingPlane];
				};

				object.onAfterRender = (_renderer, _scene, _camera, _geometry, material) => {
					material.clippingPlanes = [];
				};
			}
		})
	}

	public abstract getPosition(): THREE.Vector3;
	public abstract getRotation(): THREE.Quaternion;
	public abstract warp(pos: THREE.Vector3, rot: THREE.Quaternion, relativeRot: THREE.Quaternion): void;
}
