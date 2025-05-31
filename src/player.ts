import * as THREE from 'three';
import RAPIER from "@dimforge/rapier3d";
import { clamp } from 'three/src/math/MathUtils.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { GLTF } from 'three/addons/loaders/GLTFLoader.js';

import { SCENE_LAYER, PLAYER_LAYER, DUPLICATE_PLAYER_LAYER } from "./app";
import { PhysicsWorld, PlayerUserData } from './physics/physicsWorld';
import { PortalableObject } from './portal/portalableObject';
import { calculateCameraPosition, calculateCameraRotation } from './portal/portalManager';
import { PhysicsPositionInterpolator } from './physics/physicsInterpolator';

export class PlayerPhysics {
	private physicsWorld: PhysicsWorld;

	private collider: RAPIER.Collider;
	public rigidbody: RAPIER.RigidBody;
	private characterController: RAPIER.KinematicCharacterController;

	private grounded: boolean = false;
	private velocity: RAPIER.Vector3 = RAPIER.VectorOps.zeros();

	public interpolator: PhysicsPositionInterpolator;

	constructor(player: Player, physicsWorld: PhysicsWorld) {
		this.physicsWorld = physicsWorld;

		const rigidBodyDesc = RAPIER.RigidBodyDesc.kinematicPositionBased()
			.setTranslation(0.0, 2.0, 0.0)
			.setCcdEnabled(true)
			.setUserData({
				isPortalable: true,
				isPlayer: true,
				portalable: player
			} satisfies PlayerUserData);
		this.rigidbody = physicsWorld.rapierWorld.createRigidBody(rigidBodyDesc);

		const colliderDesc = RAPIER.ColliderDesc.cylinder(1.5, 0.5)
			.setTranslation(0.0, 1.5, 0.0)
			.setActiveCollisionTypes(RAPIER.ActiveCollisionTypes.ALL);
		this.collider = physicsWorld.rapierWorld.createCollider(colliderDesc, this.rigidbody);

		// The gap the controller will leave between the character and its environment.
		const offset = 0.01;
		this.characterController = physicsWorld.rapierWorld.createCharacterController(offset);
		this.characterController.setApplyImpulsesToDynamicBodies(true);
		this.characterController.setCharacterMass(1.0);

		this.interpolator = new PhysicsPositionInterpolator(this.rigidbody, physicsWorld);
	}

	physicsUpdate(delta: number, movement: RAPIER.Vector3) {
		if (!this.grounded) {
			this.velocity.x += this.physicsWorld.rapierWorld.gravity.x * delta;
			this.velocity.y += this.physicsWorld.rapierWorld.gravity.y * delta;
			this.velocity.z += this.physicsWorld.rapierWorld.gravity.z * delta;

			movement.x += this.velocity.x * delta;
			movement.y += this.velocity.y * delta;
			movement.z += this.velocity.z * delta;
		}

		this.characterController.computeColliderMovement(
			this.collider,
			movement,
			RAPIER.QueryFilterFlags.EXCLUDE_SENSORS,
			this.collider.collisionGroups()
		);

		this.grounded = this.characterController.computedGrounded();

		const currentPosition = this.rigidbody.translation();
		const tgtDestination = this.characterController.computedMovement();

		tgtDestination.x += currentPosition.x;
		tgtDestination.y += currentPosition.y;
		tgtDestination.z += currentPosition.z;

		this.rigidbody.setNextKinematicTranslation(tgtDestination);
		this.interpolator.physicsUpdate();
	}

	warp(pos: RAPIER.Vector3) {
		this.interpolator.warp(pos);
		this.rigidbody.setNextKinematicTranslation(pos);
	}
}

export class Player extends PortalableObject {
	public rootScene: THREE.Scene;
	private duplicateObject: THREE.Object3D;
	private camera: THREE.PerspectiveCamera;

	public playerPhysics: PlayerPhysics;

	public isPaused: boolean = false;

	private mixer: THREE.AnimationMixer | undefined;
	private animationGroup: THREE.AnimationObjectGroup | undefined;

	private activeAction: THREE.AnimationAction | undefined;

	private idleAction: THREE.AnimationAction | undefined;
	private walkAction: THREE.AnimationAction | undefined;

	private moveSpeed: number = 10;
	private lookSpeed: number = - Math.PI / 180;

	private forwardsPressed: boolean = false;
	private backwardsPressed: boolean = false;
	private leftPressed: boolean = false;
	private rightPressed: boolean = false;

	private forwardsMovement: number = 0.0;
	private lateralMovement: number = 0.0;

	private forwardsVector: THREE.Vector3 = new THREE.Vector3(0, 0, 1);
	private rightVector: THREE.Vector3 = new THREE.Vector3(1, 0, 0);

	private keyDownListener: (ev: KeyboardEvent) => void;
	private keyUpListener: (ev: KeyboardEvent) => void;
	private pointerMoveListener: (ev: PointerEvent) => void;

	constructor(playerGltf: GLTF, scene: THREE.Scene, physicsWorld: PhysicsWorld, camera: THREE.PerspectiveCamera) {
		super();

		// Create a scene for the player
		this.rootScene = new THREE.Scene();

		// Add the main camera to the player 
		this.camera = camera;
		this.camera.layers.enable(SCENE_LAYER);
		this.camera.layers.enable(DUPLICATE_PLAYER_LAYER);

		this.rootScene.add(this.camera);

		this.camera.position.y = 3;
		this.camera.rotation.y = Math.PI;

		this.playerPhysics = new PlayerPhysics(this, physicsWorld);

		// Create duplicate object
		const mainObject = playerGltf.scene;
		const duplicateObject = SkeletonUtils.clone(mainObject);
		duplicateObject.visible = false;

		// Install renderer layers in objects
		mainObject.traverse(object => {
			// Set the model to only render on the player layer
			object.layers.set(PLAYER_LAYER);
		});
		duplicateObject.traverse(object => {
			// Set the model to only render for the player
			object.layers.set(DUPLICATE_PLAYER_LAYER);
		});

		this.installRootModelRenderData(mainObject);
		this.installCloneModelRenderData(duplicateObject);

		// Store the animation data
		this.animationGroup = new THREE.AnimationObjectGroup(
			mainObject,
			duplicateObject
		);
		this.mixer = new THREE.AnimationMixer(this.animationGroup);

		// Load the relevant animations
		const idleClip = THREE.AnimationClip.findByName(playerGltf.animations, 'Idle');
		this.idleAction = this.mixer.clipAction(idleClip);
		const walkClip = THREE.AnimationClip.findByName(playerGltf.animations, 'Run');
		this.walkAction = this.mixer.clipAction(walkClip);

		// Play the idle animation
		this.activeAction = this.idleAction.play();

		// Add the model to the player scene
		this.rootScene.add(mainObject);

		scene.add(this.rootScene);
		scene.add(duplicateObject);

		this.duplicateObject = duplicateObject;

		// Handle input
		this.keyDownListener = (ev) => this.onKeyChange(ev, true);
		document.addEventListener("keydown", this.keyDownListener);
		this.keyUpListener = (ev) => this.onKeyChange(ev, false);
		document.addEventListener("keyup", this.keyUpListener);
		this.pointerMoveListener = this.onPointerMove.bind(this);
		document.addEventListener("pointermove", this.pointerMoveListener);
	}

	private onPointerMove(event: PointerEvent) {
		if (this.isPaused)
			return

		const euler = new THREE.Euler();
		euler.y = event.movementX * this.lookSpeed;
		this.rootScene.applyQuaternion(new THREE.Quaternion().setFromEuler(euler));

		const cameraRot = this.camera.rotation.x - event.movementY * this.lookSpeed;
		this.camera.rotation.x = clamp(cameraRot, -Math.PI / 2, Math.PI / 2);
	}

	private onKeyChange(event: KeyboardEvent, pressed: boolean) {
		switch (event.code) {
			case "KeyW":
			case "ArrowUp":
				this.forwardsPressed = pressed;
				break;
			case "KeyA":
			case "ArrowLeft":
				this.leftPressed = pressed;
				break;
			case "KeyS":
			case "ArrowDown":
				this.backwardsPressed = pressed;
				break;
			case "KeyD":
			case "ArrowRight":
				this.rightPressed = pressed;
				break;
		}

		this.forwardsMovement =
			(this.forwardsPressed ? 1.0 : 0.0)
			- (this.backwardsPressed ? 1.0 : 0.0);
		this.lateralMovement =
			(this.rightPressed ? 1.0 : 0.0)
			- (this.leftPressed ? 1.0 : 0.0);

	}

	private changeAnimation(action: THREE.AnimationAction) {
		if (action == this.activeAction)
			return

		this.activeAction?.fadeOut(0.2);
		action.reset().fadeIn(0.2).play();
		this.activeAction = action;
	}

	private updateAnimations(delta: number) {
		if (!this.mixer)
			return

		if (Math.abs(this.forwardsMovement) > 0 || Math.abs(this.lateralMovement) > 0) {
			if (this.forwardsMovement < 0) {
				this.walkAction!.timeScale = -1;
			} else {
				this.walkAction!.timeScale = 1;
			}

			this.changeAnimation(this.walkAction!);
		} else {
			this.changeAnimation(this.idleAction!);
		}

		this.mixer.update(delta);
	}

	physicsUpdate(delta: number) {
		if (this.isPaused)
			return;

		const forwards = this.rootScene.getWorldDirection(this.forwardsVector);
		const right = this.rightVector.crossVectors(forwards, THREE.Object3D.DEFAULT_UP).normalize();

		const actualMoveSpeed = this.moveSpeed * delta;
		const forwardsScaled = forwards.multiplyScalar(actualMoveSpeed * this.forwardsMovement);
		const rightScaled = right.multiplyScalar(actualMoveSpeed * this.lateralMovement);

		const movement = forwardsScaled.add(rightScaled)

		this.playerPhysics.physicsUpdate(delta, movement);
	}

	update(delta: number) {
		if (this.isPaused)
			return;

		this.rootScene.position.copy(this.playerPhysics.interpolator.update());

		if (this.duplicateObject) {
			this.duplicateObject.visible = this.isInsidePortal();

			if (this.isInsidePortal()) {
				const cameraPos = this.rootScene.getWorldPosition(new THREE.Vector3());
				const cameraRot = this.rootScene.getWorldQuaternion(new THREE.Quaternion());

				this.duplicateObject.position.copy(calculateCameraPosition(
					cameraPos,
					this.inPortal!.mesh,
					this.outPortal!.mesh
				));

				this.duplicateObject.quaternion.copy(calculateCameraRotation(
					cameraRot,
					this.inPortal!.mesh,
					this.outPortal!.mesh
				));
			}
		}

		this.updateAnimations(delta);
	}

	getPosition(): THREE.Vector3 {
		const rpos = this.playerPhysics.rigidbody.translation();
		return new THREE.Vector3().copy(rpos);
	}

	getRotation(): THREE.Quaternion {
		return this.rootScene.getWorldQuaternion(new THREE.Quaternion());
	}

	warp(pos: THREE.Vector3, rot: THREE.Quaternion, _relativeRot: THREE.Quaternion) {
		this.playerPhysics.warp(pos);
		this.rootScene.setRotationFromQuaternion(rot);
	}

	dispose() {
		this.rootScene.traverse(obj => {
			if ("dispose" in obj && typeof obj.dispose == 'function')
				obj.dispose();
		});
		this.duplicateObject.traverse(obj => {
			if ("dispose" in obj && typeof obj.dispose == 'function')
				obj.dispose();
		});

		document.removeEventListener("keydown", this.keyDownListener);
		document.removeEventListener("keyup", this.keyUpListener);
		document.removeEventListener("pointermove", this.pointerMoveListener);
	}
}
