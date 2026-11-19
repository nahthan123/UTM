/**
 * Stylized 3D Urban Environment Dataset for Da Nang Airspace
 * Provides 3D building towers, Han River bridges, Vertiport landing pads,
 * and stepped landmark terrain blocks rendered inside CesiumJS.
 */

export interface CityBuilding3D {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  widthM: number;
  depthM: number;
  heightM: number;
  rotationDeg?: number;
  color: string;
}

export interface CityBridge3D {
  id: string;
  name: string;
  startLat: number;
  startLon: number;
  endLat: number;
  endLon: number;
  widthM: number;
  deckHeightM: number;
  pylonHeightM?: number;
  color: string;
}

export interface VertiportPad3D {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radiusM: number;
  color: string;
}

export interface TerrainBlock3D {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radiusXM: number;
  radiusYM: number;
  heightM: number;
  color: string;
}

export const DANANG_3D_BUILDINGS: CityBuilding3D[] = [
  // Trung tâm hành chính & cụm tòa nhà dọc đường Bạch Đằng / Trần Phú (Bờ Tây Sông Hàn)
  { id: 'BLD-ADMIN', name: 'Trung tâm Hành chính Đà Nẵng', latitude: 16.0772, longitude: 108.2225, widthM: 58, depthM: 58, heightM: 135, color: '#38bdf8' },
  { id: 'BLD-NOVOTEL', name: 'Tổ hợp Khách sạn Ven Sông', latitude: 16.0748, longitude: 108.2230, widthM: 46, depthM: 38, heightM: 120, color: '#64748b' },
  { id: 'BLD-HIL-1', name: 'Tháp Bạch Đằng North', latitude: 16.0702, longitude: 108.2236, widthM: 42, depthM: 42, heightM: 92, color: '#475569' },
  { id: 'BLD-HIL-2', name: 'Tháp Trần Phú Plaza', latitude: 16.0672, longitude: 108.2228, widthM: 50, depthM: 40, heightM: 84, color: '#334155' },
  { id: 'BLD-DRAGON-W1', name: 'Tổ hợp Cầu Rồng Tây 1', latitude: 16.0628, longitude: 108.2212, widthM: 48, depthM: 44, heightM: 95, color: '#475569' },
  { id: 'BLD-DRAGON-W2', name: 'Tổ hợp Nguyễn Văn Linh', latitude: 16.0604, longitude: 108.2185, widthM: 55, depthM: 42, heightM: 76, color: '#64748b' },
  { id: 'BLD-HOSPITAL', name: 'Cụm BV Đa khoa Đà Nẵng', latitude: 16.0724, longitude: 108.2155, widthM: 68, depthM: 52, heightM: 48, color: '#475569' },
  { id: 'BLD-CHI-LANG', name: 'Cụm Thương mại Hùng Vương', latitude: 16.0688, longitude: 108.2192, widthM: 52, depthM: 46, heightM: 64, color: '#334155' },

  // Bờ Đông Sông Hàn (Trần Hưng Đạo / Ngô Quyền)
  { id: 'BLD-VINCOM', name: 'Trung tâm Thương mại Bờ Đông', latitude: 16.0715, longitude: 108.2312, widthM: 70, depthM: 54, heightM: 72, color: '#475569' },
  { id: 'BLD-AZURA', name: 'Tháp Căn hộ Sông Hàn', latitude: 16.0736, longitude: 108.2305, widthM: 44, depthM: 44, heightM: 118, color: '#64748b' },
  { id: 'BLD-MARINA-E1', name: 'Tháp Marina Đông', latitude: 16.0645, longitude: 108.2310, widthM: 48, depthM: 42, heightM: 98, color: '#334155' },
  { id: 'BLD-DRAGON-E1', name: 'Tháp Võ Văn Kiệt', latitude: 16.0618, longitude: 108.2338, widthM: 56, depthM: 44, heightM: 88, color: '#475569' },
  { id: 'BLD-DRAGON-E2', name: 'Khu Văn phòng An Hải', latitude: 16.0582, longitude: 108.2315, widthM: 50, depthM: 40, heightM: 68, color: '#64748b' },
  { id: 'BLD-MONARCHY', name: 'Tổ hợp Trần Hưng Đạo Nam', latitude: 16.0532, longitude: 108.2312, widthM: 54, depthM: 46, heightM: 105, color: '#475569' },

  // Dải ven biển Mỹ Khê - Phạm Văn Đồng - Võ Nguyên Giáp
  { id: 'BLD-SOLEIL', name: 'Cụm Tháp Biển Đông', latitude: 16.0695, longitude: 108.2442, widthM: 52, depthM: 46, heightM: 140, color: '#64748b' },
  { id: 'BLD-MYKHE-1', name: 'Khách sạn Biển Mỹ Khê', latitude: 16.0640, longitude: 108.2450, widthM: 46, depthM: 40, heightM: 102, color: '#475569' },
  { id: 'BLD-MYKHE-2', name: 'Tháp Võ Nguyên Giáp', latitude: 16.0558, longitude: 108.2462, widthM: 48, depthM: 42, heightM: 112, color: '#334155' },
  { id: 'BLD-MYAN-1', name: 'Cụm Khách sạn Mỹ An', latitude: 16.0435, longitude: 108.2485, widthM: 52, depthM: 44, heightM: 90, color: '#475569' },
];

export const DANANG_3D_BRIDGES: CityBridge3D[] = [
  {
    id: 'BRG-THUAN-PHUOC',
    name: 'Cầu Thuận Phước',
    startLat: 16.0956,
    startLon: 108.2202,
    endLat: 16.0968,
    endLon: 108.2266,
    widthM: 22,
    deckHeightM: 24,
    pylonHeightM: 65,
    color: '#94a3b8',
  },
  {
    id: 'BRG-SONG-HAN',
    name: 'Cầu Sông Hàn',
    startLat: 16.0721,
    startLon: 108.2236,
    endLat: 16.0724,
    endLon: 108.2300,
    widthM: 24,
    deckHeightM: 15,
    pylonHeightM: 42,
    color: '#38bdf8',
  },
  {
    id: 'BRG-RONG',
    name: 'Cầu Rồng',
    startLat: 16.0610,
    startLon: 108.2216,
    endLat: 16.0612,
    endLon: 108.2292,
    widthM: 32,
    deckHeightM: 16,
    pylonHeightM: 38,
    color: '#f59e0b',
  },
  {
    id: 'BRG-TRAN-THI-LY',
    name: 'Cầu Trần Thị Lý',
    startLat: 16.0502,
    startLon: 108.2234,
    endLat: 16.0505,
    endLon: 108.2308,
    widthM: 28,
    deckHeightM: 16,
    pylonHeightM: 75,
    color: '#fb7185',
  },
];

export const DANANG_VERTIPORT_PADS: VertiportPad3D[] = [
  { id: 'VP-BVDA', name: 'Vertiport BV Đa khoa', latitude: 16.0716, longitude: 108.2140, radiusM: 22, color: '#eab308' },
  { id: 'VP-SONTRA', name: 'Vertiport Y tế Sơn Trà', latitude: 16.0820, longitude: 108.2485, radiusM: 22, color: '#eab308' },
  { id: 'VP-BIENDONG', name: 'Vertiport Biển Đông', latitude: 16.0685, longitude: 108.2465, radiusM: 24, color: '#ef4444' },
  { id: 'VP-NONNUOC', name: 'Vertiport Non Nước', latitude: 16.0080, longitude: 108.2610, radiusM: 24, color: '#ef4444' },
  { id: 'VP-MARINA', name: 'Vertiport Cầu Rồng / Marina', latitude: 16.0612, longitude: 108.2245, radiusM: 20, color: '#10b981' },
];

export const DANANG_3D_TERRAIN_BLOCKS: TerrainBlock3D[] = [
  // Sơn Trà stepped mountain blocks (stylized low-poly hills)
  { id: 'MT-SONTRA-BASE', name: 'Khối chân núi Sơn Trà', latitude: 16.1180, longitude: 108.2780, radiusXM: 1600, radiusYM: 1100, heightM: 140, color: '#3f6212' },
  { id: 'MT-SONTRA-MID', name: 'Khối trung Sơn Trà', latitude: 16.1190, longitude: 108.2790, radiusXM: 950, radiusYM: 650, heightM: 290, color: '#4d7c0f' },
  { id: 'MT-SONTRA-PEAK', name: 'Đỉnh Bàn Cờ (Sơn Trà)', latitude: 16.1200, longitude: 108.2800, radiusXM: 420, radiusYM: 320, heightM: 440, color: '#65a30d' },
  // Ngũ Hành Sơn stepped landmark
  { id: 'MT-NHS-BASE', name: 'Ngũ Hành Sơn', latitude: 16.0030, longitude: 108.2630, radiusXM: 320, radiusYM: 260, heightM: 95, color: '#57534e' },
  { id: 'MT-NHS-PEAK', name: 'Đỉnh Thủy Sơn', latitude: 16.0032, longitude: 108.2632, radiusXM: 140, radiusYM: 120, heightM: 165, color: '#78716c' },
];

export interface EnuPoint2D {
  x: number; // East (m)
  y: number; // North (m)
}

export interface RoadSegment3D {
  id: string;
  name: string;
  widthM: number;
  points: EnuPoint2D[];
  color?: string;
}

export type UrbanZoneType =
  | 'CBD_HIGHRISE'
  | 'COASTAL_HOTEL'
  | 'MIDRISE_COMMERCIAL'
  | 'LOWRISE_RESIDENTIAL';

export interface GeneratedCityBlock3D {
  x: number;      // ENU East (m)
  y: number;      // ENU North (m)
  widthM: number;
  depthM: number;
  heightM: number;
  color: string;
  zone: UrbanZoneType;
  hasBeacon?: boolean;
}

export interface UrbanPark3D {
  id: string;
  name: string;
  x: number;
  y: number;
  widthM: number;
  depthM: number;
  treeCount: number;
}

/**
 * Open green spaces & waterfront parks in Da Nang (kept free of buildings)
 */
export const DANANG_PARKS_ENU: UrbanPark3D[] = [
  { id: 'PK-APEC', name: 'Công viên APEC (Cầu Rồng Tây)', x: -245, y: -145, widthM: 140, depthM: 170, treeCount: 18 },
  { id: 'PK-BACH-DANG', name: 'Công viên Bạch Đằng Ven Sông', x: -195, y: 580, widthM: 110, depthM: 360, treeCount: 24 },
  { id: 'PK-MARINA-EAST', name: 'Công viên Bờ Đông Trần Hưng Đạo', x: 350, y: 380, widthM: 130, depthM: 340, treeCount: 22 },
  { id: 'PK-BIEN-DONG', name: 'Công viên Biển Đông (Mỹ Khê)', x: 2240, y: 820, widthM: 190, depthM: 320, treeCount: 28 },
];

/**
 * Han River centerline in local ENU meters relative to DANANG_ENU_ORIGIN (Dragon Bridge)
 */
export const DANANG_RIVER_CENTERLINE_ENU: EnuPoint2D[] = [
  { x: -160, y: -3200 },
  { x: -45, y: -2100 },
  { x: 35, y: -1200 },  // Cau Tran Thi Ly
  { x: 55, y: -350 },
  { x: 65, y: 0 },      // Cau Rong
  { x: 95, y: 650 },
  { x: 115, y: 1225 },  // Cau Song Han
  { x: 60, y: 2150 },
  { x: -45, y: 3100 },
  { x: -120, y: 3895 }, // Cau Thuan Phuoc
  { x: -240, y: 5100 },
];

/**
 * Major Da Nang urban arterial corridors in local ENU meters
 */
export const DANANG_ROADS_ENU: RoadSegment3D[] = [
  // Bo Tay Song Han: Bach Dang & Tran Phu
  {
    id: 'RD-BACH-DANG',
    name: 'Đường Bạch Đằng',
    widthM: 28,
    points: [
      { x: -210, y: -2400 },
      { x: -120, y: -1200 },
      { x: -125, y: 0 },
      { x: -75, y: 1225 },
      { x: -140, y: 2600 },
      { x: -290, y: 3895 },
    ],
  },
  // Bo Dong Song Han: Tran Hung Dao
  {
    id: 'RD-TRAN-HUNG-DAO',
    name: 'Đường Trần Hưng Đạo',
    widthM: 26,
    points: [
      { x: 190, y: -2400 },
      { x: 240, y: -1200 },
      { x: 260, y: 0 },
      { x: 320, y: 1225 },
      { x: 260, y: 2600 },
      { x: 110, y: 3895 },
    ],
  },
  // Truc Nguyen Van Linh - Cau Rong - Vo Van Kiet (Tay -> Bien Dong)
  {
    id: 'RD-NVL-VVK',
    name: 'Trục Nguyễn Văn Linh - Võ Văn Kiệt',
    widthM: 34,
    points: [
      { x: -1700, y: -120 },
      { x: -320, y: -25 },
      { x: 480, y: -10 },
      { x: 2380, y: 240 },
    ],
  },
  // Truc Le Duan - Cau Song Han - Pham Van Dong
  {
    id: 'RD-LD-PVD',
    name: 'Trục Lê Duẩn - Phạm Văn Đồng',
    widthM: 30,
    points: [
      { x: -1800, y: 1180 },
      { x: -100, y: 1215 },
      { x: 580, y: 1245 },
      { x: 2350, y: 1120 },
    ],
  },
  // Truc Ngo Quyen (Bac - Nam Bo Dong)
  {
    id: 'RD-NGO-QUYEN',
    name: 'Đường Ngô Quyền',
    widthM: 30,
    points: [
      { x: 960, y: -2600 },
      { x: 980, y: 0 },
      { x: 990, y: 2000 },
      { x: 1020, y: 4000 },
    ],
  },
  // Truc ven bien Vo Nguyen Giap
  {
    id: 'RD-VO-NGUYEN-GIAP',
    name: 'Đường Võ Nguyên Giáp',
    widthM: 34,
    points: [
      { x: 2650, y: -3200 },
      { x: 2460, y: -1200 },
      { x: 2360, y: 800 },
      { x: 2420, y: 2400 },
    ],
  },
  // Truc Duy Tan - Cau Tran Thi Ly
  {
    id: 'RD-DUY-TAN',
    name: 'Trục Duy Tân - Cầu Trần Thị Lý',
    widthM: 28,
    points: [
      { x: -1550, y: -1280 },
      { x: -120, y: -1220 },
      { x: 640, y: -1190 },
      { x: 2460, y: -1200 },
    ],
  },
];

function seededRandom(seed: number): () => number {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function getRiverCenterX(y: number): number {
  const pts = DANANG_RIVER_CENTERLINE_ENU;
  if (y <= pts[0].y) return pts[0].x;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    if (y >= a.y && y <= b.y) {
      const t = (y - a.y) / Math.max(1, b.y - a.y);
      return a.x + (b.x - a.x) * t;
    }
  }
  return pts[pts.length - 1].x;
}

function isInsidePark(x: number, y: number, margin = 30): boolean {
  return DANANG_PARKS_ENU.some(
    (p) =>
      Math.abs(x - p.x) <= p.widthM / 2 + margin &&
      Math.abs(y - p.y) <= p.depthM / 2 + margin
  );
}

/**
 * Generates deterministic height-zoned & density-zoned Da Nang 3D urban blocks:
 * - CBD_HIGHRISE: Tall waterfront towers along Bach Dang / Tran Phu / Tran Hung Dao (58-122m)
 * - COASTAL_HOTEL: Mid-high beachfront hotels along My Khe / Vo Nguyen Giap (45-110m)
 * - MIDRISE_COMMERCIAL: Medium blocks along Nguyen Van Linh, Le Duan, Ngo Quyen (24-48m)
 * - LOWRISE_RESIDENTIAL: Dense 3-5 story inland Vietnamese residential fabric (10-22m)
 */
export function generateUrbanDistrictBlocks(): GeneratedCityBlock3D[] {
  const rand = seededRandom(20261112);
  const blocks: GeneratedCityBlock3D[] = [];

  const cbdPalette = ['#334155', '#475569', '#3b4c66', '#2c3d55'];
  const coastalPalette = ['#3d4f6b', '#475569', '#334155', '#526582'];
  const midrisePalette = ['#273549', '#334155', '#2c3d55'];
  const lowrisePalette = ['#1e293b', '#243247', '#2a394e', '#1f2d40', '#2e3e52'];

  // Pass 1: CBD High-Rise, Coastal Hotels & Mid-Rise Commercial Corridors (spacing 145m)
  for (let gx = -1700; gx <= 2320; gx += 145) {
    for (let gy = -2450; gy <= 3450; gy += 145) {
      const x = gx + (rand() - 0.5) * 34;
      const y = gy + (rand() - 0.5) * 34;

      const riverX = getRiverCenterX(y);
      const distRiver = Math.abs(x - riverX);
      if (distRiver < 235) continue;
      if (x < -1250 && y < 320 && y > -3800) continue; // Airport runway NFZ
      if (x > 2280) continue; // Coastline
      if (isInsidePark(x, y, 28)) continue;

      // Clear arterial road centerlines
      if (Math.abs(y) < 72 || Math.abs(y - 1220) < 72 || Math.abs(y + 1220) < 72) continue;
      if (Math.abs(x - 980) < 62) continue;

      const isCbdWaterfront = distRiver < 580 && y > -1150 && y < 2150;
      const isCoastalStrip = x > 1880 && y > -2500 && y < 2350;
      const isCommercialAxis =
        Math.abs(y) < 270 || Math.abs(y - 1220) < 250 || Math.abs(x - 980) < 220;

      if (isCbdWaterfront) {
        if (rand() > 0.78) continue;
        const heightM = Math.round(58 + rand() * 64);
        blocks.push({
          x: Math.round(x),
          y: Math.round(y),
          widthM: Math.round(30 + rand() * 22),
          depthM: Math.round(28 + rand() * 20),
          heightM,
          color: cbdPalette[Math.floor(rand() * cbdPalette.length)],
          zone: 'CBD_HIGHRISE',
          hasBeacon: heightM >= 85,
        });
      } else if (isCoastalStrip) {
        if (rand() > 0.76) continue;
        const heightM = Math.round(45 + rand() * 65);
        blocks.push({
          x: Math.round(x),
          y: Math.round(y),
          widthM: Math.round(32 + rand() * 22),
          depthM: Math.round(28 + rand() * 20),
          heightM,
          color: coastalPalette[Math.floor(rand() * coastalPalette.length)],
          zone: 'COASTAL_HOTEL',
          hasBeacon: heightM >= 85,
        });
      } else if (isCommercialAxis) {
        if (rand() > 0.68) continue;
        const heightM = Math.round(24 + rand() * 24);
        blocks.push({
          x: Math.round(x),
          y: Math.round(y),
          widthM: Math.round(26 + rand() * 20),
          depthM: Math.round(24 + rand() * 18),
          heightM,
          color: midrisePalette[Math.floor(rand() * midrisePalette.length)],
          zone: 'MIDRISE_COMMERCIAL',
          hasBeacon: false,
        });
      }
    }
  }

  // Pass 2: Dense Low-Rise Residential Neighborhoods (3-5 stories, 10-22m tall, tighter 88m grid)
  for (let gx = -1650; gx <= 1840; gx += 88) {
    for (let gy = -2350; gy <= 3300; gy += 88) {
      const x = gx + (rand() - 0.5) * 20;
      const y = gy + (rand() - 0.5) * 20;

      const riverX = getRiverCenterX(y);
      const distRiver = Math.abs(x - riverX);
      if (distRiver < 560 && y > -1150 && y < 2150) continue; // Keep CBD waterfront distinct
      if (distRiver < 245) continue;
      if (x < -1250 && y < 320 && y > -3800) continue; // Airport runway NFZ
      if (isInsidePark(x, y, 22)) continue;

      // Clear arterial road bands & mid-rise commercial belts
      if (Math.abs(y) < 250 || Math.abs(y - 1220) < 230 || Math.abs(y + 1220) < 80) continue;
      if (Math.abs(x - 980) < 200) continue;

      if (rand() > 0.66) continue;

      blocks.push({
        x: Math.round(x),
        y: Math.round(y),
        widthM: Math.round(16 + rand() * 14),
        depthM: Math.round(15 + rand() * 13),
        heightM: Math.round(10 + rand() * 12),
        color: lowrisePalette[Math.floor(rand() * lowrisePalette.length)],
        zone: 'LOWRISE_RESIDENTIAL',
        hasBeacon: false,
      });
    }
  }

  return blocks;
}

