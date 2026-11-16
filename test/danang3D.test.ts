import { describe, it, expect } from 'vitest';
import {
  DANANG_3D_BRIDGES,
  DANANG_3D_BUILDINGS,
  DANANG_VERTIPORT_PADS,
  generateUrbanDistrictBlocks,
} from '../src/data/danang3DEnvironment';
import { DANANG_ENU_ORIGIN, enuToWgs84, wgs84ToEnu } from '../src/utils/coordinates';

describe('Da Nang 3D Urban Environment & ENU Projection', () => {
  it('1. Quy đổi WGS84 <-> ENU bảo toàn tọa độ quanh tâm Cầu Rồng Đà Nẵng', () => {
    const sample = { lat: 16.0721, lon: 108.227, alt: 95 };
    const enu = wgs84ToEnu(sample.lat, sample.lon, sample.alt, DANANG_ENU_ORIGIN);
    const back = enuToWgs84(enu.x, enu.y, enu.z, DANANG_ENU_ORIGIN);

    expect(back.latitude).toBeCloseTo(sample.lat, 4);
    expect(back.longitude).toBeCloseTo(sample.lon, 4);
    expect(back.altitude_m).toBeCloseTo(sample.alt, 1);
  });

  it('2. Sinh dữ liệu khối đô thị 3D hợp lệ, không lấn vào khu đường băng sân bay', () => {
    const blocks = generateUrbanDistrictBlocks();
    expect(blocks.length).toBeGreaterThan(80);
    for (const b of blocks) {
      expect(b.heightM).toBeGreaterThanOrEqual(16);
      expect(b.widthM).toBeGreaterThan(20);
      // Must exclude airport SW runway zone
      const inAirportRunway = b.x < -1250 && b.y < 320 && b.y > -3800;
      expect(inAirportRunway).toBe(false);
    }
  });

  it('3. Dữ liệu cầu, tòa nhà và bãi đỗ Đà Nẵng đầy đủ các mốc chính', () => {
    expect(DANANG_3D_BRIDGES.length).toBe(4);
    expect(DANANG_3D_BUILDINGS.length).toBeGreaterThanOrEqual(15);
    expect(DANANG_VERTIPORT_PADS.length).toBeGreaterThanOrEqual(4);
  });
});

