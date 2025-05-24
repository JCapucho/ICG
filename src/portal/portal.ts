import * as THREE from 'three';
import RAPIER from "@dimforge/rapier3d";
import { isPlayer, isPortalable, PhysicsWorld } from '../physicsWorld';
import { GameObject } from '../objects/gameObject';
import { calculateCameraPosition, calculateCameraRotation } from './portalManager';
import { PortalableObject } from './portalableObject';


function createCollisionGroups(membership: number, mask: number): number {
	return membership << 16 | mask;
}

// Collision groups:
// 1 (bit 0) - Normal geometry
// 2 (bit 1) - Portal geometry
// 4 (bit 2) - Geometry passing through portals
const portalAttachedObjectCollisionGroups = createCollisionGroups(1 << 1, 1);
const portalTravellingObjectCollisionGroups = createCollisionGroups(1 << 2, 1);

const defaultCollisionGroup = createCollisionGroups(0xffff, 0xffff);

function createPortalBoxGeometry(width: number, height: number): THREE.BufferGeometry {
	const half_width = width / 2;
	const half_heigth = height / 2;

	const Z = 2;

	const vertices = new Float32Array(3 * 8);
	vertices[0] = -half_width;
	vertices[1] = half_heigth;
	vertices[2] = 0;

	vertices[3] = half_width;
	vertices[4] = half_heigth;
	vertices[5] = 0;

	vertices[6] = half_width;
	vertices[7] = -half_heigth;
	vertices[8] = 0;

	vertices[9] = -half_width;
	vertices[10] = -half_heigth;
	vertices[11] = 0;

	vertices[12] = -half_width;
	vertices[13] = half_heigth;
	vertices[14] = -Z;

	vertices[15] = half_width;
	vertices[16] = half_heigth;
	vertices[17] = -Z;

	vertices[18] = half_width;
	vertices[19] = -half_heigth;
	vertices[20] = -Z;

	vertices[21] = -half_width;
	vertices[22] = -half_heigth;
	vertices[23] = -Z;

	const indices = new Uint32Array(36);

	// Portal entrance face
	indices[0] = 0;
	indices[1] = 3;
	indices[2] = 1;
	indices[3] = 1;
	indices[4] = 3;
	indices[5] = 2;

	// Inner portal box faces (all rendered inwards)

	// Bottom
	indices[6] = 3;
	indices[7] = 2;
	indices[8] = 7;
	indices[9] = 7;
	indices[10] = 2;
	indices[11] = 6;

	// Top
	indices[12] = 0;
	indices[13] = 4;
	indices[14] = 1;
	indices[15] = 1;
	indices[16] = 4;
	indices[17] = 5;

	// Left
	indices[18] = 0;
	indices[19] = 3;
	indices[20] = 4;
	indices[21] = 4;
	indices[22] = 3;
	indices[23] = 7;

	// Right
	indices[24] = 1;
	indices[25] = 5;
	indices[26] = 2;
	indices[27] = 2;
	indices[28] = 5;
	indices[29] = 6;

	// Back
	indices[30] = 4;
	indices[31] = 7;
	indices[32] = 5;
	indices[33] = 5;
	indices[34] = 7;
	indices[35] = 6;
	const portalBoxGeometry = new THREE.BufferGeometry();
	portalBoxGeometry.setAttribute(
		"position",
		new THREE.BufferAttribute(vertices, 3)
	);
	portalBoxGeometry.setIndex(new THREE.BufferAttribute(indices, 1));
	return portalBoxGeometry;
}

export const halfTurn = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.PI, 0));

export class Portal {
	private half_width: number;
	private half_height: number;

	public mesh: THREE.Mesh;
	private planeGeometry: THREE.BufferGeometry;
	private boxGeometry: THREE.BufferGeometry;

	// @ts-ignore: TS6133
	private sensor: RAPIER.Collider;
	private frame: RAPIER.Collider[];
	private rigidbody: RAPIER.RigidBody;

	private attachedObject?: GameObject;
	public otherPortal?: Portal;

	private playerInPortal: boolean = false;
	private travellingObjects: PortalableObject[] = [];
	private teleportRef: THREE.Vector3 = new THREE.Vector3();

	constructor(material: THREE.Material, width: number, height: number, physics: PhysicsWorld) {
		this.planeGeometry = new THREE.PlaneGeometry(width, height);
		this.boxGeometry = createPortalBoxGeometry(width, height),
			this.mesh = new THREE.Mesh(this.planeGeometry, material)

		const rigidBodyDesc = RAPIER.RigidBodyDesc.fixed()
			.setUserData({
				onEnter: this.onPortalEnter.bind(this),
				onExit: this.onPortalExit.bind(this),
			});
		this.rigidbody = physics.rapierWorld.createRigidBody(rigidBodyDesc);

		this.half_width = width / 2;
		this.half_height = height / 2;

		const colliderDesc = RAPIER.ColliderDesc.cuboid(this.half_width, this.half_height, 0.15)
			.setSensor(true)
			.setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS);
		this.sensor = physics.rapierWorld.createCollider(colliderDesc, this.rigidbody);

		this.frame = new Array(4);
		const sideDesc = RAPIER.ColliderDesc.cuboid(0.1, this.half_height + 0.1, 0.2);
		this.frame[0] = physics.rapierWorld.createCollider(sideDesc);
		this.frame[1] = physics.rapierWorld.createCollider(sideDesc);
		const capDesc = RAPIER.ColliderDesc.cuboid(this.half_width + 0.1, 0.1, 0.2);
		this.frame[2] = physics.rapierWorld.createCollider(capDesc);
		this.frame[3] = physics.rapierWorld.createCollider(capDesc);

		this.updateCollider();
	}

	updateCollider() {
		const pos = this.mesh.getWorldPosition(this.teleportRef);
		const rot = this.mesh.getWorldQuaternion(new THREE.Quaternion());

		this.rigidbody.setTranslation(pos, false);
		this.rigidbody.setRotation(rot, false);

		const up = new THREE.Vector3(0, 1, 0).applyQuaternion(rot)
		const right = new THREE.Vector3(1, 0, 0).applyQuaternion(rot)

		this.frame[0].setTranslation(right.clone().multiplyScalar(this.half_width + 0.1).add(pos));
		this.frame[0].setRotation(rot);

		this.frame[1].setTranslation(right.clone().multiplyScalar(-this.half_width - 0.1).add(pos));
		this.frame[1].setRotation(rot);

		this.frame[2].setTranslation(up.clone().multiplyScalar(this.half_height + 0.1).add(pos));
		this.frame[2].setRotation(rot);

		this.frame[3].setTranslation(up.clone().multiplyScalar(-this.half_height - 0.1).add(pos));
		this.frame[3].setRotation(rot);
	}

	physicsUpdate() {
		if (!this.otherPortal)
			return;

		for (const traveller of this.travellingObjects) {
			const pos = traveller.getPosition();

			const direction = pos.clone().sub(this.teleportRef).normalize();
			const portalForwards = this.mesh.getWorldDirection(new THREE.Vector3());

			if (direction.dot(portalForwards) < -0.1) {
				const newPos = calculateCameraPosition(pos, this.mesh, this.otherPortal.mesh);

				const rot = traveller.getRotation();
				console.log(new THREE.Euler().setFromQuaternion(rot))
				const newRot = calculateCameraRotation(rot, this.mesh, this.otherPortal.mesh);
				console.log(new THREE.Euler().setFromQuaternion(newRot))

				// The object is behind the portal
				traveller.warp(
					newPos,
					newRot
				);
			}
		}
	}

	private onPortalEnter(other: RAPIER.Collider, world: PhysicsWorld) {
		console.log("Portal enter");

		if (!this.attachedObject || !this.otherPortal)
			return;

		const otherUserData = world.getColliderUserData(other);

		if (!otherUserData || !isPortalable(otherUserData))
			return;

		this.attachedObject.collider.setCollisionGroups(portalAttachedObjectCollisionGroups);
		other.setCollisionGroups(portalTravellingObjectCollisionGroups);

		this.travellingObjects.push(otherUserData.portalable);

		if (!isPlayer(otherUserData))
			return;

		this.playerInPortal = true;
	}

	private onPortalExit(other: RAPIER.Collider, world: PhysicsWorld) {
		console.log("Portal exit");

		if (!this.attachedObject)
			return;

		const otherUserData = world.getColliderUserData(other);

		if (!otherUserData || !isPortalable(otherUserData))
			return;

		this.attachedObject.collider.setCollisionGroups(defaultCollisionGroup);
		other.setCollisionGroups(defaultCollisionGroup);

		const index = this.travellingObjects.indexOf(otherUserData.portalable)
		if (index > -1)
			this.travellingObjects.splice(index, 1);

		if (!isPlayer(otherUserData))
			return;

		this.playerInPortal = false;
	}

	setAttachedObject(obj: GameObject) {
		if (this.attachedObject)
			this.attachedObject.collider.setCollisionGroups(defaultCollisionGroup);

		this.attachedObject = obj;
	}

	render(
		renderer: THREE.WebGLRenderer,
		camera: THREE.Camera,
		root: boolean
	) {
		if (this.playerInPortal && root)
			this.mesh.geometry = this.boxGeometry;

		renderer.render(this.mesh, camera);
		this.mesh.geometry = this.planeGeometry;
	}
}
