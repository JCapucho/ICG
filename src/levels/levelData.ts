type Vector3 = [number, number, number];

export type LevelData = {
	planes: PlaneGeometryData[];
	objects: ObjectData[];
	lights: LightData[];
};

export type PlaneGeometryData = {
	width: number;
	height: number;
	position: Vector3;
	rotation: Vector3;
	uvScale: number;
};

type ObjectData = FootBallData;

export type FootBallData = {
	type: "ball";
	position?: Vector3;
	rotation?: Vector3;
};

type LightData = DirectionalLightData;

export type DirectionalLightData = {
	type: "directional";
};
