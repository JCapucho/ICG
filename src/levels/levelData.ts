type Vector3 = [number, number, number];
type Vector4 = [number, number, number, number];

export type LevelData = {
	planes: GeometryData[];
	objects: ObjectData[];
	lights: LightData[];
	portals: PortalData[];
};

type GeometryData = PlaneGeometryData;

export type PlaneGeometryData = {
	id?: string;
	type: "plane";

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
	color: string;
	intensity: number;
	pos?: Vector3;
	shadowFrustum?: Vector4;
	shadowIntensity?: number;
	target?: Vector3;
};

export type PortalData = {
	width: number;
	height: number;
	objectId: string;
	position: Vector3;
	rotation: Vector3;
};
