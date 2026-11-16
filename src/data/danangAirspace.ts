import { RestrictedZone } from '../types/telemetry';

export const DANANG_CENTER = {
  latitude: 16.0544,
  longitude: 108.2022,
  altitude_m: 1200, // Default camera height
};

/**
 * Predefined 3D Restricted Airspace / Geofence Zones in Da Nang City
 */
export const DANANG_RESTRICTED_ZONES: RestrictedZone[] = [
  {
    zone_id: 'NFZ-DAD-AIRPORT',
    name: 'Sân bay Quốc tế Đà Nẵng (VVDN)',
    type: 'NFZ_AIRPORT',
    min_altitude_m: 0,
    max_altitude_m: 600,
    boundary: [
      { latitude: 16.0635, longitude: 108.1880 },
      { latitude: 16.0635, longitude: 108.2120 },
      { latitude: 16.0240, longitude: 108.2120 },
      { latitude: 16.0240, longitude: 108.1880 },
    ],
    color: '#ef4444', // Red
    active: true,
    notes: 'Khu vực cấm bay tuyệt đối theo Nghị định 36/2008/NĐ-CP & Quyết định 18/2020/QĐ-TTg',
  },
  {
    zone_id: 'NFZ-SON-TRA-MILITARY',
    name: 'Khu vực Quân sự & Bảo tồn Sơn Trà',
    type: 'MILITARY',
    min_altitude_m: 0,
    max_altitude_m: 800,
    boundary: [
      { latitude: 16.1420, longitude: 108.2450 },
      { latitude: 16.1380, longitude: 108.3100 },
      { latitude: 16.0950, longitude: 108.3050 },
      { latitude: 16.0980, longitude: 108.2520 },
    ],
    color: '#f97316', // Orange
    active: true,
    notes: 'Trạm radar đối không & Vườn quốc gia Sơn Trà',
  },
  {
    zone_id: 'NFZ-TIEN-SA-PORT',
    name: 'Khu vực Cảng biển Quân sự - Dân sự Tiên Sa',
    type: 'CRITICAL_INFRASTRUCTURE',
    min_altitude_m: 0,
    max_altitude_m: 350,
    boundary: [
      { latitude: 16.1350, longitude: 108.2150 },
      { latitude: 16.1350, longitude: 108.2380 },
      { latitude: 16.1150, longitude: 108.2380 },
      { latitude: 16.1150, longitude: 108.2150 },
    ],
    color: '#eab308', // Yellow
    active: true,
    notes: 'Cơ sở hạ tầng hàng hải chiến lược Vùng 3 Hải quân',
  },
];
