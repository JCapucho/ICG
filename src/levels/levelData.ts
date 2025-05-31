export type LevelData = {
	planes: PlaneObjectData[];
};

export type PlaneObjectData = {
	width: number;
	height: number;
	position: [number, number, number];
	rotation: [number, number, number];
	uvScale: number;
};
