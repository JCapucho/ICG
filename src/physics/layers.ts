export function createCollisionGroups(membership: number, mask: number): number {
	return (membership << 16) | (mask & 0xffff);
}

// 1 (bit 0) - Normal geometry
export const NORMAL_GEOMETRY_LAYER = 1;
// 2 (bit 1) - Portal geometry
export const PORTAL_ATTACHED_GEOMETRY = 1 << 1;
// 4 (bit 2) - Geometry passing through portals
export const PORTAL_TRAVELLING_GEOMETRY = 1 << 2;
