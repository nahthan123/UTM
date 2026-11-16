/**
 * GEOGRAPHIC & MATHEMATICAL UTILITIES
 * Precise WGS84 Geodesic, Haversine, Cross-Track Distance, and Bearing calculations.
 */

const EARTH_RADIUS_METERS = 6371008.8; // Mean Earth radius in WGS84

export function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export function toDegrees(radians: number): number {
  return (radians * 180) / Math.PI;
}

/**
 * Great-circle distance between two WGS84 points using the Haversine formula (meters)
 */
export function haversineDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const phi1 = toRadians(lat1);
  const phi2 = toRadians(lat2);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(phi1) * Math.cos(phi2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_METERS * c;
}

/**
 * Initial bearing from point 1 to point 2 (degrees in range [0, 360))
 */
export function calculateBearingDeg(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const phi1 = toRadians(lat1);
  const phi2 = toRadians(lat2);
  const deltaLambda = toRadians(lon2 - lon1);

  const y = Math.sin(deltaLambda) * Math.cos(phi2);
  const x =
    Math.cos(phi1) * Math.sin(phi2) -
    Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda);

  const theta = Math.atan2(y, x);
  return (toDegrees(theta) + 360) % 360;
}

/**
 * Cross-track distance: perpendicular distance of point (latP, lonP) from great circle segment (A -> B).
 * Returns distance in meters.
 */
export function crossTrackDistanceMeters(
  latP: number,
  lonP: number,
  latA: number,
  lonA: number,
  latB: number,
  lonB: number
): number {
  const distAP = haversineDistanceMeters(latA, lonA, latP, lonP);
  if (distAP === 0) return 0;

  const bearingAB = toRadians(calculateBearingDeg(latA, lonA, latB, lonB));
  const bearingAP = toRadians(calculateBearingDeg(latA, lonA, latP, lonP));

  const d13 = distAP / EARTH_RADIUS_METERS;
  const xtd = Math.asin(Math.sin(d13) * Math.sin(bearingAP - bearingAB));

  return Math.abs(xtd * EARTH_RADIUS_METERS);
}

/**
 * Calculate distance from point P to line segment A-B (accounting for segment endpoints).
 */
export function distanceToSegmentMeters(
  latP: number,
  lonP: number,
  latA: number,
  lonA: number,
  latB: number,
  lonB: number
): number {
  const lenAB = haversineDistanceMeters(latA, lonA, latB, lonB);
  if (lenAB < 0.1) {
    return haversineDistanceMeters(latP, lonP, latA, lonA);
  }

  const distAP = haversineDistanceMeters(latA, lonA, latP, lonP);
  const distBP = haversineDistanceMeters(latB, lonB, latP, lonP);

  // Check if projection falls outside the segment
  const bearingAB = calculateBearingDeg(latA, lonA, latB, lonB);
  const bearingAP = calculateBearingDeg(latA, lonA, latP, lonP);
  const angleA = Math.abs(bearingAP - bearingAB);
  const clampedAngleA = angleA > 180 ? 360 - angleA : angleA;

  const bearingBA = calculateBearingDeg(latB, lonB, latA, lonA);
  const bearingBP = calculateBearingDeg(latB, lonB, latP, lonP);
  const angleB = Math.abs(bearingBP - bearingBA);
  const clampedAngleB = angleB > 180 ? 360 - angleB : angleB;

  if (clampedAngleA > 90) return distAP;
  if (clampedAngleB > 90) return distBP;

  return crossTrackDistanceMeters(latP, lonP, latA, lonA, latB, lonB);
}

/**
 * Format lat/lon to standard UTM notation: 16.0544° N, 108.2022° E
 */
export function formatCoordinates(lat: number, lon: number): string {
  const latDir = lat >= 0 ? 'N' : 'S';
  const lonDir = lon >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(5)}° ${latDir}, ${Math.abs(lon).toFixed(5)}° ${lonDir}`;
}

/**
 * Default Da Nang Han River / Dragon Bridge local ENU reference origin
 * used when converting Gazebo/SITL local metric (x, y, z) positions to WGS84.
 */
export const DANANG_ENU_ORIGIN = {
  latitude: 16.0612,
  longitude: 108.2245,
  altitude_m: 0,
};

/**
 * Converts local metric ENU coordinates (x=East, y=North, z=Up in meters)
 * around a reference origin into WGS84 coordinates.
 */
export function enuToWgs84(
  xEastM: number,
  yNorthM: number,
  zUpM: number,
  origin: { latitude: number; longitude: number; altitude_m?: number } = DANANG_ENU_ORIGIN
): { latitude: number; longitude: number; altitude_m: number } {
  const latRad = toRadians(origin.latitude);
  const dLat = (yNorthM / EARTH_RADIUS_METERS) * (180 / Math.PI);
  const dLon =
    (xEastM / (EARTH_RADIUS_METERS * Math.cos(latRad))) * (180 / Math.PI);

  return {
    latitude: Number((origin.latitude + dLat).toFixed(7)),
    longitude: Number((origin.longitude + dLon).toFixed(7)),
    altitude_m: Number(((origin.altitude_m ?? 0) + zUpM).toFixed(2)),
  };
}

/**
 * Converts WGS84 coordinates into local metric ENU coordinates (meters)
 * relative to a reference origin.
 */
export function wgs84ToEnu(
  latitude: number,
  longitude: number,
  altitudeM: number,
  origin: { latitude: number; longitude: number; altitude_m?: number } = DANANG_ENU_ORIGIN
): { x: number; y: number; z: number } {
  const latRad = toRadians(origin.latitude);
  const x =
    toRadians(longitude - origin.longitude) *
    EARTH_RADIUS_METERS *
    Math.cos(latRad);
  const y = toRadians(latitude - origin.latitude) * EARTH_RADIUS_METERS;
  const z = altitudeM - (origin.altitude_m ?? 0);

  return {
    x: Number(x.toFixed(2)),
    y: Number(y.toFixed(2)),
    z: Number(z.toFixed(2)),
  };
}
