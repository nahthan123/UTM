"""
TASK 11: SPATIAL MATHEMATICS & GEODESIC KINEMATICS
Provides accurate geodesic distance calculations (Haversine & Local Tangent Plane),
Closest Point of Approach (CPA), vertical separation with altitude datum validation,
and 3D Restricted Zone (NFZ) intersection.
"""

import math
from typing import Tuple, Optional, List
from backend.app.models.schemas import GeoPosition3D, VelocityVector3D, RestrictedZonePayload

# Earth radius in meters (WGS84 mean radius)
EARTH_RADIUS_M = 6371008.8

def haversine_distance_m(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Computes great-circle distance between two points on the WGS84 sphere.
    Accuracy is within 0.1% over tactical ranges (< 50 km).
    """
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = (math.sin(delta_phi / 2.0) ** 2 +
         math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2)
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))

    return EARTH_RADIUS_M * c

def geo_to_local_enu_m(ref_lat: float, ref_lon: float, lat: float, lon: float) -> Tuple[float, float]:
    """
    Converts latitude/longitude to local East-North-Up (ENU) tangent plane in meters
    relative to reference point. Valid for tactical distances < 30 km with negligible distortion (< 0.05%).
    """
    lat_rad = math.radians(ref_lat)
    d_lat = math.radians(lat - ref_lat)
    d_lon = math.radians(lon - ref_lon)

    north_m = d_lat * EARTH_RADIUS_M
    east_m = d_lon * EARTH_RADIUS_M * math.cos(lat_rad)

    return (east_m, north_m)

def local_enu_to_geo(ref_lat: float, ref_lon: float, east_m: float, north_m: float) -> Tuple[float, float]:
    """
    Converts local East-North meters back to latitude/longitude.
    """
    lat_rad = math.radians(ref_lat)
    d_lat = north_m / EARTH_RADIUS_M
    d_lon = east_m / (EARTH_RADIUS_M * math.cos(lat_rad))

    new_lat = ref_lat + math.degrees(d_lat)
    new_lon = ref_lon + math.degrees(d_lon)

    return (new_lat, new_lon)

def velocity_to_enu_mps(ground_speed_mps: float, heading_deg: float) -> Tuple[float, float]:
    """
    Converts ground speed and heading (0° North, 90° East) to East and North velocity components.
    """
    rad = math.radians(heading_deg)
    # North is cos, East is sin
    v_north = ground_speed_mps * math.cos(rad)
    v_east = ground_speed_mps * math.sin(rad)
    return (v_east, v_north)

def calculate_vertical_distance_m(pos_a: GeoPosition3D, pos_b: GeoPosition3D) -> Tuple[float, bool]:
    """
    Calculates absolute vertical distance between two UAV positions.
    Returns:
        (vertical_distance_m, requires_alignment_flag)
    CRITICAL SAFETY RULE:
        If one altitude datum is AGL and the other is MSL without a common DEM,
        direct subtraction is mathematically unaligned.
    """
    requires_alignment = (pos_a.altitude_reference != pos_b.altitude_reference)
    diff_m = abs(pos_a.altitude_m - pos_b.altitude_m)
    return (diff_m, requires_alignment)

def calculate_cpa(
    pos_a: GeoPosition3D,
    vel_a: VelocityVector3D,
    pos_b: GeoPosition3D,
    vel_b: VelocityVector3D,
    max_lookahead_seconds: float = 60.0
) -> Tuple[float, float, float, float, Tuple[float, float, float], Tuple[float, float, float]]:
    """
    Calculates Closest Point of Approach (CPA) in 3D tactical space using local ENU projection.
    
    Returns:
        (
            t_cpa_seconds,
            cpa_horizontal_dist_m,
            cpa_vertical_dist_m,
            cpa_3d_dist_m,
            (uav_a_cpa_lat, uav_a_cpa_lon, uav_a_cpa_alt),
            (uav_b_cpa_lat, uav_b_cpa_lon, uav_b_cpa_alt)
        )
    """
    # Use midpoint as ENU origin
    mid_lat = (pos_a.latitude + pos_b.latitude) / 2.0
    mid_lon = (pos_a.longitude + pos_b.longitude) / 2.0

    # Project initial positions to ENU
    ax0, ay0 = geo_to_local_enu_m(mid_lat, mid_lon, pos_a.latitude, pos_a.longitude)
    bx0, by0 = geo_to_local_enu_m(mid_lat, mid_lon, pos_b.latitude, pos_b.longitude)
    az0 = pos_a.altitude_m
    bz0 = pos_b.altitude_m

    # Velocity components
    avx, avy = velocity_to_enu_mps(vel_a.ground_speed_mps, vel_a.heading_deg)
    bvx, bvy = velocity_to_enu_mps(vel_b.ground_speed_mps, vel_b.heading_deg)

    # Vertical velocities (treat None as 0 for linear projection, but flag in caller)
    avz = vel_a.vertical_speed_mps if vel_a.vertical_speed_mps is not None else 0.0
    bvz = vel_b.vertical_speed_mps if vel_b.vertical_speed_mps is not None else 0.0

    # Relative coordinates: R = A - B
    rx0 = ax0 - bx0
    ry0 = ay0 - by0
    rz0 = az0 - bz0

    rvx = avx - bvx
    rvy = avy - bvy
    rvz = avz - bvz

    # Horizontal CPA time vs 3D CPA time
    # Tactical UTM separation is primarily horizontal threshold + vertical threshold (cylinder),
    # so we compute horizontal CPA first, which drives spatial separation.
    v_rel_sq_horiz = rvx * rvx + rvy * rvy

    if v_rel_sq_horiz > 1e-4:
        t_cpa = -(rx0 * rvx + ry0 * rvy) / v_rel_sq_horiz
    else:
        # UAVs have identical horizontal velocities (parallel tracks)
        t_cpa = 0.0

    # Clamp t_cpa between 0 and max_lookahead_seconds
    if t_cpa < 0.0:
        t_cpa = 0.0  # Diverging or CPA occurred in the past
    elif t_cpa > max_lookahead_seconds:
        t_cpa = max_lookahead_seconds

    # Calculate positions at t_cpa
    ax_cpa = ax0 + avx * t_cpa
    ay_cpa = ay0 + avy * t_cpa
    az_cpa = az0 + avz * t_cpa

    bx_cpa = bx0 + bvx * t_cpa
    by_cpa = by0 + bvy * t_cpa
    bz_cpa = bz0 + bvz * t_cpa

    # Convert back to lat/lon
    a_lat_cpa, a_lon_cpa = local_enu_to_geo(mid_lat, mid_lon, ax_cpa, ay_cpa)
    b_lat_cpa, b_lon_cpa = local_enu_to_geo(mid_lat, mid_lon, bx_cpa, by_cpa)

    cpa_horiz_m = math.sqrt((ax_cpa - bx_cpa) ** 2 + (ay_cpa - by_cpa) ** 2)
    cpa_vert_m = abs(az_cpa - bz_cpa)
    cpa_3d_m = math.sqrt(cpa_horiz_m ** 2 + cpa_vert_m ** 2)

    return (
        t_cpa,
        cpa_horiz_m,
        cpa_vert_m,
        cpa_3d_m,
        (a_lat_cpa, a_lon_cpa, az_cpa),
        (b_lat_cpa, b_lon_cpa, bz_cpa)
    )

def point_in_polygon(lon: float, lat: float, polygon: List[List[float]]) -> bool:
    """
    Standard Ray-Casting algorithm for point-in-polygon check.
    polygon is a list of [lon, lat] coordinates.
    """
    n = len(polygon)
    if n < 3:
        return False

    inside = False
    p1x, p1y = polygon[0]
    for i in range(1, n + 1):
        p2x, p2y = polygon[i % n]
        if lat > min(p1y, p2y):
            if lat <= max(p1y, p2y):
                if lon <= max(p1x, p2x):
                    if p1y != p2y:
                        xinters = (lat - p1y) * (p2x - p1x) / (p2y - p1y) + p1x
                    if p1x == p2x or lon <= xinters:
                        inside = not inside
        p1x, p1y = p2x, p2y

    return inside

def check_nfz_breach(
    lat: float,
    lon: float,
    alt_m: float,
    zones: List[RestrictedZonePayload]
) -> Optional[RestrictedZonePayload]:
    """
    Checks if a 3D point penetrates any active Restricted Zone / NFZ.
    """
    for zone in zones:
        if zone.min_altitude_m <= alt_m <= zone.max_altitude_m:
            if point_in_polygon(lon, lat, zone.polygon):
                return zone
    return None
