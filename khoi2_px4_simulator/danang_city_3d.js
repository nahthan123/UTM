/**
 * Exact 1-to-1 3D Da Nang Urban Environment & Articulated UAV Builders
 * Synchronized directly with Khối 4 (`src/data/danang3DEnvironment.ts` & `src/features/map3d/threeBuilders.ts`)
 * so Khối 2 (:8001) and Khối 4 (:3000) share the exact same 3D city map.
 */
import * as THREE from 'three';

const EARTH_RADIUS_METERS = 6371008.8;
export const DANANG_ENU_ORIGIN = {
  latitude: 16.0612,
  longitude: 108.2245,
  altitude_m: 0,
};

function toRadians(deg) {
  return (deg * Math.PI) / 180;
}

export function wgs84ToThree(lat, lon, altM = 0) {
  const latRad = toRadians(DANANG_ENU_ORIGIN.latitude);
  const xEast = toRadians(lon - DANANG_ENU_ORIGIN.longitude) * EARTH_RADIUS_METERS * Math.cos(latRad);
  const yNorth = toRadians(lat - DANANG_ENU_ORIGIN.latitude) * EARTH_RADIUS_METERS;
  return new THREE.Vector3(xEast, altM, -yNorth);
}

export function enuToThree(xEast, yNorth, zUp = 0) {
  return new THREE.Vector3(xEast, zUp, -yNorth);
}

export const DANANG_3D_BUILDINGS = [
  { id: 'BLD-ADMIN', name: 'Trung tâm Hành chính Đà Nẵng', latitude: 16.0772, longitude: 108.2225, widthM: 58, depthM: 58, heightM: 135, color: '#38bdf8' },
  { id: 'BLD-NOVOTEL', name: 'Tổ hợp Khách sạn Ven Sông', latitude: 16.0748, longitude: 108.2230, widthM: 46, depthM: 38, heightM: 120, color: '#64748b' },
  { id: 'BLD-HIL-1', name: 'Tháp Bạch Đằng North', latitude: 16.0702, longitude: 108.2236, widthM: 42, depthM: 42, heightM: 92, color: '#475569' },
  { id: 'BLD-HIL-2', name: 'Tháp Trần Phú Plaza', latitude: 16.0672, longitude: 108.2228, widthM: 50, depthM: 40, heightM: 84, color: '#334155' },
  { id: 'BLD-DRAGON-W1', name: 'Tổ hợp Cầu Rồng Tây 1', latitude: 16.0628, longitude: 108.2212, widthM: 48, depthM: 44, heightM: 95, color: '#475569' },
  { id: 'BLD-DRAGON-W2', name: 'Tổ hợp Nguyễn Văn Linh', latitude: 16.0604, longitude: 108.2185, widthM: 55, depthM: 42, heightM: 76, color: '#64748b' },
  { id: 'BLD-HOSPITAL', name: 'Cụm BV Đa khoa Đà Nẵng', latitude: 16.0724, longitude: 108.2155, widthM: 68, depthM: 52, heightM: 48, color: '#475569' },
  { id: 'BLD-CHI-LANG', name: 'Cụm Thương mại Hùng Vương', latitude: 16.0688, longitude: 108.2192, widthM: 52, depthM: 46, heightM: 64, color: '#334155' },
  { id: 'BLD-VINCOM', name: 'Trung tâm Thương mại Bờ Đông', latitude: 16.0715, longitude: 108.2312, widthM: 70, depthM: 54, heightM: 72, color: '#475569' },
  { id: 'BLD-AZURA', name: 'Tháp Căn hộ Sông Hàn', latitude: 16.0736, longitude: 108.2305, widthM: 44, depthM: 44, heightM: 118, color: '#64748b' },
  { id: 'BLD-MARINA-E1', name: 'Tháp Marina Đông', latitude: 16.0645, longitude: 108.2310, widthM: 48, depthM: 42, heightM: 98, color: '#334155' },
  { id: 'BLD-DRAGON-E1', name: 'Tháp Võ Văn Kiệt', latitude: 16.0618, longitude: 108.2338, widthM: 56, depthM: 44, heightM: 88, color: '#475569' },
  { id: 'BLD-DRAGON-E2', name: 'Khu Văn phòng An Hải', latitude: 16.0582, longitude: 108.2315, widthM: 50, depthM: 40, heightM: 68, color: '#64748b' },
  { id: 'BLD-MONARCHY', name: 'Tổ hợp Trần Hưng Đạo Nam', latitude: 16.0532, longitude: 108.2312, widthM: 54, depthM: 46, heightM: 105, color: '#475569' },
  { id: 'BLD-SOLEIL', name: 'Cụm Tháp Biển Đông', latitude: 16.0695, longitude: 108.2442, widthM: 52, depthM: 46, heightM: 140, color: '#64748b' },
  { id: 'BLD-MYKHE-1', name: 'Khách sạn Biển Mỹ Khê', latitude: 16.0640, longitude: 108.2450, widthM: 46, depthM: 40, heightM: 102, color: '#475569' },
  { id: 'BLD-MYKHE-2', name: 'Tháp Võ Nguyên Giáp', latitude: 16.0558, longitude: 108.2462, widthM: 48, depthM: 42, heightM: 112, color: '#334155' },
  { id: 'BLD-MYAN-1', name: 'Cụm Khách sạn Mỹ An', latitude: 16.0435, longitude: 108.2485, widthM: 52, depthM: 44, heightM: 90, color: '#475569' },
];

export const DANANG_3D_BRIDGES = [
  { id: 'BRG-THUAN-PHUOC', name: 'Cầu Thuận Phước', startLat: 16.0956, startLon: 108.2202, endLat: 16.0968, endLon: 108.2266, widthM: 22, deckHeightM: 24, pylonHeightM: 65, color: '#94a3b8' },
  { id: 'BRG-SONG-HAN', name: 'Cầu Sông Hàn', startLat: 16.0721, startLon: 108.2236, endLat: 16.0724, endLon: 108.2300, widthM: 24, deckHeightM: 15, pylonHeightM: 42, color: '#38bdf8' },
  { id: 'BRG-RONG', name: 'Cầu Rồng', startLat: 16.0610, startLon: 108.2216, endLat: 16.0612, endLon: 108.2292, widthM: 32, deckHeightM: 16, pylonHeightM: 38, color: '#f59e0b' },
  { id: 'BRG-TRAN-THI-LY', name: 'Cầu Trần Thị Lý', startLat: 16.0502, startLon: 108.2234, endLat: 16.0505, endLon: 108.2308, widthM: 28, deckHeightM: 16, pylonHeightM: 75, color: '#fb7185' },
];

export const DANANG_VERTIPORT_PADS = [
  { id: 'VP-BVDA', name: 'Vertiport BV Đa khoa', latitude: 16.0716, longitude: 108.2140, radiusM: 22, color: '#eab308' },
  { id: 'VP-SONTRA', name: 'Vertiport Y tế Sơn Trà', latitude: 16.0820, longitude: 108.2485, radiusM: 22, color: '#eab308' },
  { id: 'VP-BIENDONG', name: 'Vertiport Biển Đông', latitude: 16.0685, longitude: 108.2465, radiusM: 24, color: '#ef4444' },
  { id: 'VP-NONNUOC', name: 'Vertiport Non Nước', latitude: 16.0080, longitude: 108.2610, radiusM: 24, color: '#ef4444' },
  { id: 'VP-MARINA', name: 'Vertiport Cầu Rồng / Marina', latitude: 16.0612, longitude: 108.2245, radiusM: 20, color: '#10b981' },
];

export const DANANG_3D_TERRAIN_BLOCKS = [
  { id: 'MT-SONTRA-BASE', name: 'Khối chân núi Sơn Trà', latitude: 16.1180, longitude: 108.2780, radiusXM: 1600, radiusYM: 1100, heightM: 140, color: '#3f6212' },
  { id: 'MT-SONTRA-MID', name: 'Khối trung Sơn Trà', latitude: 16.1190, longitude: 108.2790, radiusXM: 950, radiusYM: 650, heightM: 290, color: '#4d7c0f' },
  { id: 'MT-SONTRA-PEAK', name: 'Đỉnh Bàn Cờ (Sơn Trà)', latitude: 16.1200, longitude: 108.2800, radiusXM: 420, radiusYM: 320, heightM: 440, color: '#65a30d' },
  { id: 'MT-NHS-BASE', name: 'Ngũ Hành Sơn', latitude: 16.0030, longitude: 108.2630, radiusXM: 320, radiusYM: 260, heightM: 95, color: '#57534e' },
  { id: 'MT-NHS-PEAK', name: 'Đỉnh Thủy Sơn', latitude: 16.0032, longitude: 108.2632, radiusXM: 140, radiusYM: 120, heightM: 165, color: '#78716c' },
];

export const DANANG_PARKS_ENU = [
  { id: 'PK-APEC', name: 'Công viên APEC (Cầu Rồng Tây)', x: -245, y: -145, widthM: 140, depthM: 170, treeCount: 18 },
  { id: 'PK-BACH-DANG', name: 'Công viên Bạch Đằng Ven Sông', x: -195, y: 580, widthM: 110, depthM: 360, treeCount: 24 },
  { id: 'PK-MARINA-EAST', name: 'Công viên Bờ Đông Trần Hưng Đạo', x: 350, y: 380, widthM: 130, depthM: 340, treeCount: 22 },
  { id: 'PK-BIEN-DONG', name: 'Công viên Biển Đông (Mỹ Khê)', x: 2240, y: 820, widthM: 190, depthM: 320, treeCount: 28 },
];

export const DANANG_RIVER_CENTERLINE_ENU = [
  { x: -160, y: -3200 },
  { x: -45, y: -2100 },
  { x: 35, y: -1200 },
  { x: 55, y: -350 },
  { x: 65, y: 0 },
  { x: 95, y: 650 },
  { x: 115, y: 1225 },
  { x: 60, y: 2150 },
  { x: -45, y: 3100 },
  { x: -120, y: 3895 },
  { x: -240, y: 5100 },
];

export const DANANG_ROADS_ENU = [
  { id: 'RD-BACH-DANG', name: 'Đường Bạch Đằng', widthM: 28, points: [{ x: -210, y: -2400 }, { x: -120, y: -1200 }, { x: -125, y: 0 }, { x: -75, y: 1225 }, { x: -140, y: 2600 }, { x: -290, y: 3895 }] },
  { id: 'RD-TRAN-HUNG-DAO', name: 'Đường Trần Hưng Đạo', widthM: 26, points: [{ x: 190, y: -2400 }, { x: 240, y: -1200 }, { x: 260, y: 0 }, { x: 320, y: 1225 }, { x: 260, y: 2600 }, { x: 110, y: 3895 }] },
  { id: 'RD-NVL-VVK', name: 'Trục Nguyễn Văn Linh - Võ Văn Kiệt', widthM: 34, points: [{ x: -1700, y: -120 }, { x: -320, y: -25 }, { x: 480, y: -10 }, { x: 2380, y: 240 }] },
  { id: 'RD-LD-PVD', name: 'Trục Lê Duẩn - Phạm Văn Đồng', widthM: 30, points: [{ x: -1800, y: 1180 }, { x: -100, y: 1215 }, { x: 580, y: 1245 }, { x: 2350, y: 1120 }] },
  { id: 'RD-NGO-QUYEN', name: 'Đường Ngô Quyền', widthM: 30, points: [{ x: 960, y: -2600 }, { x: 980, y: 0 }, { x: 990, y: 2000 }, { x: 1020, y: 4000 }] },
  { id: 'RD-VO-NGUYEN-GIAP', name: 'Đường Võ Nguyên Giáp', widthM: 34, points: [{ x: 2650, y: -3200 }, { x: 2460, y: -1200 }, { x: 2360, y: 800 }, { x: 2420, y: 2400 }] },
  { id: 'RD-DUY-TAN', name: 'Trục Duy Tân - Cầu Trần Thị Lý', widthM: 28, points: [{ x: -1550, y: -1280 }, { x: -120, y: -1220 }, { x: 640, y: -1190 }, { x: 2460, y: -1200 }] },
];

function seededRandom(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function getRiverCenterX(y) {
  const pts = DANANG_RIVER_CENTERLINE_ENU;
  if (y <= pts[0].y) return pts[0].x;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    if (y >= a.y && y <= b.y) {
      const t = (y - a.y) / Math.max(1, b.y - a.y);
      return a.x + (b.x - a.x) * t;
    }
  }
  return pts[pts.length - 1].x;
}

function isInsidePark(x, y, margin = 30) {
  return DANANG_PARKS_ENU.some(
    (p) => Math.abs(x - p.x) <= p.widthM / 2 + margin && Math.abs(y - p.y) <= p.depthM / 2 + margin
  );
}

function generateUrbanDistrictBlocks() {
  const rand = seededRandom(20261112);
  const blocks = [];
  const cbdPalette = ['#334155', '#475569', '#3b4c66', '#2c3d55'];
  const coastalPalette = ['#3d4f6b', '#475569', '#334155', '#526582'];
  const midrisePalette = ['#273549', '#334155', '#2c3d55'];
  const lowrisePalette = ['#1e293b', '#243247', '#2a394e', '#1f2d40', '#2e3e52'];

  for (let gx = -1700; gx <= 2320; gx += 145) {
    for (let gy = -2450; gy <= 3450; gy += 145) {
      const x = gx + (rand() - 0.5) * 34;
      const y = gy + (rand() - 0.5) * 34;
      const riverX = getRiverCenterX(y);
      const distRiver = Math.abs(x - riverX);
      if (distRiver < 235) continue;
      if (x < -1250 && y < 320 && y > -3800) continue;
      if (x > 2280) continue;
      if (isInsidePark(x, y, 28)) continue;
      if (Math.abs(y) < 72 || Math.abs(y - 1220) < 72 || Math.abs(y + 1220) < 72) continue;
      if (Math.abs(x - 980) < 62) continue;

      const isCbdWaterfront = distRiver < 580 && y > -1150 && y < 2150;
      const isCoastalStrip = x > 1880 && y > -2500 && y < 2350;
      const isCommercialAxis = Math.abs(y) < 270 || Math.abs(y - 1220) < 250 || Math.abs(x - 980) < 220;

      if (isCbdWaterfront) {
        if (rand() > 0.78) continue;
        const heightM = Math.round(58 + rand() * 64);
        blocks.push({ x: Math.round(x), y: Math.round(y), widthM: Math.round(30 + rand() * 22), depthM: Math.round(28 + rand() * 20), heightM, color: cbdPalette[Math.floor(rand() * cbdPalette.length)], hasBeacon: heightM >= 85 });
      } else if (isCoastalStrip) {
        if (rand() > 0.76) continue;
        const heightM = Math.round(45 + rand() * 65);
        blocks.push({ x: Math.round(x), y: Math.round(y), widthM: Math.round(32 + rand() * 22), depthM: Math.round(28 + rand() * 20), heightM, color: coastalPalette[Math.floor(rand() * coastalPalette.length)], hasBeacon: heightM >= 85 });
      } else if (isCommercialAxis) {
        if (rand() > 0.68) continue;
        const heightM = Math.round(24 + rand() * 24);
        blocks.push({ x: Math.round(x), y: Math.round(y), widthM: Math.round(26 + rand() * 20), depthM: Math.round(24 + rand() * 18), heightM, color: midrisePalette[Math.floor(rand() * midrisePalette.length)], hasBeacon: false });
      }
    }
  }

  for (let gx = -1650; gx <= 1840; gx += 88) {
    for (let gy = -2350; gy <= 3300; gy += 88) {
      const x = gx + (rand() - 0.5) * 20;
      const y = gy + (rand() - 0.5) * 20;
      const riverX = getRiverCenterX(y);
      const distRiver = Math.abs(x - riverX);
      if (distRiver < 560 && y > -1150 && y < 2150) continue;
      if (distRiver < 245) continue;
      if (x < -1250 && y < 320 && y > -3800) continue;
      if (isInsidePark(x, y, 22)) continue;
      if (Math.abs(y) < 250 || Math.abs(y - 1220) < 230 || Math.abs(y + 1220) < 80) continue;
      if (Math.abs(x - 980) < 200) continue;
      if (rand() > 0.66) continue;
      blocks.push({ x: Math.round(x), y: Math.round(y), widthM: Math.round(16 + rand() * 14), depthM: Math.round(15 + rand() * 13), heightM: Math.round(10 + rand() * 12), color: lowrisePalette[Math.floor(rand() * lowrisePalette.length)], hasBeacon: false });
    }
  }
  return blocks;
}

function createGroundGridTexture() {
  const size = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#0c1524';
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.08)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= size; i += 32) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, size); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(size, i); ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.22)';
  ctx.lineWidth = 2;
  for (let i = 0; i <= size; i += 256) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, size); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(size, i); ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(16, 16);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createVertiportTexture(accentHex) {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#0f172a';
  ctx.beginPath(); ctx.arc(size / 2, size / 2, 122, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = accentHex; ctx.lineWidth = 10;
  ctx.beginPath(); ctx.arc(size / 2, size / 2, 108, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)'; ctx.lineWidth = 4; ctx.setLineDash([14, 10]);
  ctx.beginPath(); ctx.arc(size / 2, size / 2, 86, 0, Math.PI * 2); ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 110px Inter, Arial, sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('H', size / 2, size / 2 + 4);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function buildRibbonGeometry(points, widthM, elevationY) {
  const vertices = [], indices = [], halfW = widthM / 2;
  for (let i = 0; i < points.length; i++) {
    const prev = points[Math.max(0, i - 1)];
    const next = points[Math.min(points.length - 1, i + 1)];
    const p = points[i];
    let dx = next.x - prev.x, dy = next.y - prev.y;
    const len = Math.hypot(dx, dy) || 1;
    dx /= len; dy /= len;
    const nx = -dy * halfW, ny = dx * halfW;
    const left = enuToThree(p.x + nx, p.y + ny, elevationY);
    const right = enuToThree(p.x - nx, p.y - ny, elevationY);
    vertices.push(left.x, left.y, left.z, right.x, right.y, right.z);
    if (i < points.length - 1) {
      const base = i * 2;
      indices.push(base, base + 1, base + 2, base + 1, base + 3, base + 2);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

function buildArchitecturalBridge(bridge) {
  const group = new THREE.Group();
  const start = wgs84ToThree(bridge.startLat, bridge.startLon, 0);
  const end = wgs84ToThree(bridge.endLat, bridge.endLon, 0);
  const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
  const dx = end.x - start.x, dz = end.z - start.z;
  const length = Math.hypot(dx, dz);
  const yaw = Math.atan2(-dz, dx);
  group.position.copy(mid);
  group.rotation.y = yaw;

  const deck = new THREE.Mesh(
    new THREE.BoxGeometry(length, 3.5, bridge.widthM),
    new THREE.MeshStandardMaterial({ color: '#334155', roughness: 0.65, metalness: 0.25 })
  );
  deck.position.y = bridge.deckHeightM;
  group.add(deck);

  const railMat = new THREE.MeshStandardMaterial({ color: bridge.color, emissive: bridge.color, emissiveIntensity: 0.55, roughness: 0.35 });
  for (const side of [-1, 1]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(length, 1.4, 1.2), railMat);
    rail.position.set(0, bridge.deckHeightM + 2.2, side * (bridge.widthM / 2 - 0.8));
    group.add(rail);
  }

  const pierMat = new THREE.MeshStandardMaterial({ color: '#475569', roughness: 0.8 });
  for (let i = 1; i < 5; i++) {
    const px = -length / 2 + (length * i) / 5;
    const pier = new THREE.Mesh(new THREE.BoxGeometry(7, bridge.deckHeightM, bridge.widthM * 0.72), pierMat);
    pier.position.set(px, bridge.deckHeightM / 2, 0);
    group.add(pier);
  }

  const accentMat = new THREE.MeshStandardMaterial({ color: bridge.color, emissive: bridge.color, emissiveIntensity: 0.65, metalness: 0.5, roughness: 0.3 });
  if (bridge.id === 'BRG-RONG') {
    const archPts = [];
    for (let i = 0; i <= 48; i++) {
      const t = i / 48;
      archPts.push(new THREE.Vector3(-length * 0.42 + t * length * 0.84, bridge.deckHeightM + 3 + Math.abs(Math.sin(t * Math.PI * 3)) * 28, 0));
    }
    group.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(archPts), 64, 2.4, 8, false), accentMat));
  } else if (bridge.id === 'BRG-TRAN-THI-LY') {
    const pylonH = bridge.pylonHeightM || 75;
    const pylon = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 5.2, pylonH, 8), accentMat);
    pylon.position.set(-length * 0.08, pylonH / 2 + 2, 0);
    pylon.rotation.z = 0.2;
    group.add(pylon);
    const topAnchor = new THREE.Vector3(-length * 0.08 - Math.sin(0.2) * pylonH * 0.9, pylonH * 0.92, 0);
    const cablePts = [];
    for (let i = -5; i <= 5; i++) {
      if (i === 0) continue;
      cablePts.push(topAnchor, new THREE.Vector3((i / 6) * (length * 0.46), bridge.deckHeightM + 1.5, bridge.widthM * 0.38));
      cablePts.push(topAnchor, new THREE.Vector3((i / 6) * (length * 0.46), bridge.deckHeightM + 1.5, -bridge.widthM * 0.38));
    }
    group.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(cablePts), new THREE.LineBasicMaterial({ color: '#fda4af', transparent: true, opacity: 0.75 })));
  } else if (bridge.id === 'BRG-SONG-HAN' || bridge.id === 'BRG-THUAN-PHUOC') {
    const pylonH = bridge.pylonHeightM || 50;
    const towerOffsets = bridge.id === 'BRG-THUAN-PHUOC' ? [-length * 0.25, length * 0.25] : [0];
    towerOffsets.forEach((tx) => {
      for (const zOff of [-bridge.widthM * 0.45, bridge.widthM * 0.45]) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(4.5, pylonH, 3.5), accentMat);
        leg.position.set(tx, pylonH / 2, zOff);
        group.add(leg);
      }
      const crossBeam = new THREE.Mesh(new THREE.BoxGeometry(4.5, 4, bridge.widthM * 0.96), accentMat);
      crossBeam.position.set(tx, pylonH * 0.88, 0);
      group.add(crossBeam);
      const cablePts = [];
      for (const zOff of [-bridge.widthM * 0.42, bridge.widthM * 0.42]) {
        const top = new THREE.Vector3(tx, pylonH * 0.9, zOff);
        for (const span of [-1, 1]) {
          for (let k = 1; k <= 4; k++) {
            const xEnd = tx + span * k * (length * 0.065);
            if (Math.abs(xEnd) <= length * 0.48) cablePts.push(top, new THREE.Vector3(xEnd, bridge.deckHeightM + 1.8, zOff));
          }
        }
      }
      group.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(cablePts), new THREE.LineBasicMaterial({ color: '#7dd3fc', transparent: true, opacity: 0.7 })));
    });
  }
  return group;
}

export function buildDaNangCityEnvironment() {
  const cityGroup = new THREE.Group();
  cityGroup.name = 'DANANG_3D_CITY';

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(14000, 14000),
    new THREE.MeshStandardMaterial({ map: createGroundGridTexture(), roughness: 0.92, metalness: 0.08 })
  );
  ground.rotation.x = -Math.PI / 2;
  cityGroup.add(ground);

  const beach = new THREE.Mesh(new THREE.PlaneGeometry(220, 11000), new THREE.MeshStandardMaterial({ color: '#42392b', roughness: 0.95 }));
  beach.rotation.x = -Math.PI / 2;
  beach.position.set(2520, 0.25, 0);
  cityGroup.add(beach);

  const seaMat = new THREE.MeshStandardMaterial({ color: '#072a46', roughness: 0.22, metalness: 0.45 });
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(4600, 14000), seaMat);
  sea.rotation.x = -Math.PI / 2;
  sea.position.set(4900, 0.4, 0);
  cityGroup.add(sea);

  const bay = new THREE.Mesh(new THREE.PlaneGeometry(7500, 2600), seaMat);
  bay.rotation.x = -Math.PI / 2;
  bay.position.set(-400, 0.4, -5500);
  cityGroup.add(bay);

  cityGroup.add(new THREE.Mesh(
    buildRibbonGeometry(DANANG_RIVER_CENTERLINE_ENU, 330, 0.65),
    new THREE.MeshStandardMaterial({ color: '#0a3a5c', emissive: '#062038', emissiveIntensity: 0.35, roughness: 0.18, metalness: 0.55, side: THREE.DoubleSide })
  ));

  const airportPad = new THREE.Mesh(new THREE.PlaneGeometry(2400, 3600), new THREE.MeshStandardMaterial({ color: '#141d2e', roughness: 0.9 }));
  airportPad.rotation.x = -Math.PI / 2;
  airportPad.position.set(-2550, 0.35, 1900);
  cityGroup.add(airportPad);
  for (const rxOffset of [-180, 180]) {
    const runway = new THREE.Mesh(new THREE.PlaneGeometry(52, 2900), new THREE.MeshStandardMaterial({ color: '#1f2937', roughness: 0.75 }));
    runway.rotation.x = -Math.PI / 2;
    runway.position.set(-2550 + rxOffset, 0.6, 1850);
    cityGroup.add(runway);
  }

  const roadMat = new THREE.MeshStandardMaterial({ color: '#172235', roughness: 0.85, side: THREE.DoubleSide });
  DANANG_ROADS_ENU.forEach((road) => {
    cityGroup.add(new THREE.Mesh(buildRibbonGeometry(road.points, road.widthM, 0.9), roadMat));
    cityGroup.add(new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(road.points.map((pt) => enuToThree(pt.x, pt.y, 1.35))),
      new THREE.LineBasicMaterial({ color: '#38bdf8', transparent: true, opacity: 0.42 })
    ));
  });

  DANANG_3D_TERRAIN_BLOCKS.forEach((tb) => {
    const pos = wgs84ToThree(tb.latitude, tb.longitude, 0);
    const radius = (tb.radiusXM + tb.radiusYM) / 2;
    const hill = new THREE.Mesh(
      new THREE.CylinderGeometry(radius * 0.58, radius, tb.heightM, 7),
      new THREE.MeshStandardMaterial({ color: tb.color, roughness: 0.9, flatShading: true })
    );
    hill.position.set(pos.x, tb.heightM / 2, pos.z);
    cityGroup.add(hill);
  });

  const edgesMat = new THREE.LineBasicMaterial({ color: '#38bdf8', transparent: true, opacity: 0.35 });
  DANANG_3D_BUILDINGS.forEach((bld) => {
    const pos = wgs84ToThree(bld.latitude, bld.longitude, 0);
    const geo = new THREE.BoxGeometry(bld.widthM, bld.heightM, bld.depthM);
    const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: bld.color, roughness: 0.45, metalness: 0.35 }));
    mesh.position.set(pos.x, bld.heightM / 2, pos.z);
    cityGroup.add(mesh);

    const wire = new THREE.LineSegments(new THREE.EdgesGeometry(geo), edgesMat);
    wire.position.copy(mesh.position);
    cityGroup.add(wire);

    const crown = new THREE.Mesh(
      new THREE.BoxGeometry(bld.widthM * 0.86, 2.2, bld.depthM * 0.86),
      new THREE.MeshBasicMaterial({ color: bld.id === 'BLD-ADMIN' ? '#38bdf8' : '#0ea5e9' })
    );
    crown.position.set(pos.x, bld.heightM + 1.1, pos.z);
    cityGroup.add(crown);
  });

  const urbanBlocks = generateUrbanDistrictBlocks();
  if (urbanBlocks.length > 0) {
    const instMesh = new THREE.InstancedMesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.65, metalness: 0.25 }),
      urbanBlocks.length
    );
    const dummy = new THREE.Object3D();
    const tmpColor = new THREE.Color();
    urbanBlocks.forEach((b, idx) => {
      dummy.position.copy(enuToThree(b.x, b.y, b.heightM / 2));
      dummy.scale.set(b.widthM, b.heightM, b.depthM);
      dummy.updateMatrix();
      instMesh.setMatrixAt(idx, dummy.matrix);
      tmpColor.set(b.color);
      instMesh.setColorAt(idx, tmpColor);
    });
    instMesh.instanceMatrix.needsUpdate = true;
    if (instMesh.instanceColor) instMesh.instanceColor.needsUpdate = true;
    cityGroup.add(instMesh);

    const beaconBlocks = urbanBlocks.filter((b) => b.hasBeacon);
    if (beaconBlocks.length > 0) {
      const capMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1.6, 1), new THREE.MeshBasicMaterial({ color: '#38bdf8', transparent: true, opacity: 0.72 }), beaconBlocks.length);
      const obsMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(2.4, 8, 8), new THREE.MeshBasicMaterial({ color: '#f43f5e' }), beaconBlocks.length);
      beaconBlocks.forEach((b, idx) => {
        const pos = enuToThree(b.x, b.y, b.heightM + 0.9);
        dummy.position.copy(pos);
        dummy.scale.set(b.widthM * 0.74, 1, b.depthM * 0.74);
        dummy.updateMatrix();
        capMesh.setMatrixAt(idx, dummy.matrix);
        dummy.position.set(pos.x, b.heightM + 4.0, pos.z);
        dummy.scale.setScalar(1);
        dummy.updateMatrix();
        obsMesh.setMatrixAt(idx, dummy.matrix);
      });
      capMesh.instanceMatrix.needsUpdate = true;
      obsMesh.instanceMatrix.needsUpdate = true;
      cityGroup.add(capMesh, obsMesh);
    }
  }

  const totalTrees = DANANG_PARKS_ENU.reduce((acc, p) => acc + p.treeCount, 0);
  if (totalTrees > 0) {
    const trunks = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.9, 1.3, 5.5, 6), new THREE.MeshStandardMaterial({ color: '#5c4033', roughness: 0.9 }), totalTrees);
    const crowns = new THREE.InstancedMesh(new THREE.ConeGeometry(4.6, 10.5, 7), new THREE.MeshStandardMaterial({ color: '#15803d', roughness: 0.85, flatShading: true }), totalTrees);
    const treeDummy = new THREE.Object3D();
    let treeIdx = 0;
    DANANG_PARKS_ENU.forEach((park, pIdx) => {
      const parkPad = new THREE.Mesh(new THREE.BoxGeometry(park.widthM, 0.7, park.depthM), new THREE.MeshStandardMaterial({ color: '#14532d', roughness: 0.95 }));
      parkPad.position.copy(enuToThree(park.x, park.y, 0.75));
      cityGroup.add(parkPad);
      for (let t = 0; t < park.treeCount; t++) {
        const h1 = Math.sin((pIdx + 1) * 97 + (t + 1) * 31.7) * 43758.5453;
        const h2 = Math.cos((pIdx + 1) * 53 + (t + 1) * 19.3) * 24634.6345;
        const fx = h1 - Math.floor(h1) - 0.5;
        const fy = h2 - Math.floor(h2) - 0.5;
        const scale = 0.85 + ((t * 17) % 10) * 0.04;
        const base = enuToThree(park.x + fx * (park.widthM * 0.82), park.y + fy * (park.depthM * 0.82), 3.2 * scale);
        treeDummy.position.copy(base);
        treeDummy.scale.setScalar(scale);
        treeDummy.updateMatrix();
        trunks.setMatrixAt(treeIdx, treeDummy.matrix);
        treeDummy.position.set(base.x, 9.2 * scale, base.z);
        treeDummy.updateMatrix();
        crowns.setMatrixAt(treeIdx, treeDummy.matrix);
        treeIdx++;
      }
    });
    trunks.instanceMatrix.needsUpdate = true;
    crowns.instanceMatrix.needsUpdate = true;
    cityGroup.add(trunks, crowns);
  }

  DANANG_3D_BRIDGES.forEach((bridge) => cityGroup.add(buildArchitecturalBridge(bridge)));

  DANANG_VERTIPORT_PADS.forEach((pad) => {
    const pos = wgs84ToThree(pad.latitude, pad.longitude, 0);
    const padCylinder = new THREE.Mesh(
      new THREE.CylinderGeometry(pad.radiusM, pad.radiusM * 1.08, 2.5, 24),
      [
        new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.6 }),
        new THREE.MeshBasicMaterial({ map: createVertiportTexture(pad.color) }),
        new THREE.MeshStandardMaterial({ color: '#0f172a' }),
      ]
    );
    padCylinder.position.set(pos.x, 1.4, pos.z);
    cityGroup.add(padCylinder);
  });

  return cityGroup;
}
