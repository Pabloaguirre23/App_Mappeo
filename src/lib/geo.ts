export const DUPLICATE_RADIUS_METERS = 50

export type Bounds = {
  south: number
  north: number
  west: number
  east: number
}

export function distanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const earth = 6_371_000
  const toRad = (degrees: number) => (degrees * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return 2 * earth * Math.asin(Math.min(1, Math.sqrt(a)))
}

export function formatDistance(meters: number): string {
  return `${Math.max(1, Math.round(meters))} m`
}

export function inBounds(
  lat: number,
  lng: number,
  bounds: Bounds,
): boolean {
  return lat >= bounds.south && lat <= bounds.north && lng >= bounds.west && lng <= bounds.east
}
