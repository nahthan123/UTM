import * as THREE from 'three';
import {
  DANANG_3D_BRIDGES,
  DANANG_3D_BUILDINGS,
  DANANG_3D_TERRAIN_BLOCKS,
  DANANG_RIVER_CENTERLINE_ENU,
  DANANG_ROADS_ENU,
  DANANG_VERTIPORT_PADS,
  generateUrbanDistrictBlocks,
} from '../../data/danang3DEnvironment';
import { UAVType } from '../../types/telemetry';
import { DANANG_ENU_ORIGIN, wgs84ToEnu } from '../../utils/coordinates';

/**
 * Converts WGS84 coordinates to Three.js world space centered at DANANG_ENU_ORIGIN
 * (+X = East, +Y = Up, -Z = North).
 */
export function wgs84ToThree(lat: number, lon: number, altM: number): THREE.Vector3 {
  const enu = wgs84ToEnu(lat, lon, altM, DANANG_ENU_ORIGIN);
  return new THREE.Vector3(enu.x, enu.z, -enu.y);
}

/**
 * Converts local ENU meters (xEast, yNorth, zUp) to Three.js world coordinates.
 */
export function enuToThree(xEast: number, yNorth: number, zUp: number): THREE.Vector3 {
  return new THREE.Vector3(xEast, zUp, -yNorth);
}

function createGroundGridTexture(): THREE.CanvasTexture {
  const size = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#0c1524';
  ctx.fillRect(0, 0, size, size);

  // Subtle city block sub-grid
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.08)';
  ctx.lineWidth = 1;
  const step = 32;
  for (let i = 0; i <= size; i += step) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, size);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(size, i);
    ctx.stroke();
  }

  // Major sector grid
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.22)';
  ctx.lineWidth = 2;
  for (let i = 0; i <= size; i += 256) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, size);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(size, i);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(16, 16);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createVertiportTexture(accentHex: string): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, 122, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = accentHex;
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, 108, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.lineWidth = 4;
  ctx.setLineDash([14, 10]);
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, 86, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 110px Inter, Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('H', size / 2, size / 2 + 4);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function buildRibbonGeometry(points: { x: number; y: number }[], widthM: number, elevationY: number): THREE.BufferGeometry {
  const vertices: number[] = [];
  const indices: number[] = [];
  const halfW = widthM / 2;

  for (let i = 0; i < points.length; i++) {
    const prev = points[Math.max(0, i - 1)];
    const next = points[Math.min(points.length - 1, i + 1)];
    const p = points[i];

    // Direction in ENU (xEast, yNorth)
    let dx = next.x - prev.x;
    let dy = next.y - prev.y;
    const len = Math.hypot(dx, dy) || 1;
    dx /= len;
    dy /= len;

    // Perpendicular in ENU
    const nx = -dy * halfW;
    const ny = dx * halfW;

    const left = enuToThree(p.x + nx, p.y + ny, elevationY);
    const right = enuToThree(p.x - nx, p.y - ny, elevationY);

    vertices.push(left.x, left.y, left.z);
    vertices.push(right.x, right.y, right.z);

    if (i < points.length - 1) {
      const base = i * 2;
      indices.push(base, base + 1, base + 2);
      indices.push(base + 1, base + 3, base + 2);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

function buildArchitecturalBridge(bridge: (typeof DANANG_3D_BRIDGES)[number]): THREE.Group {
  const group = new THREE.Group();
  const start = wgs84ToThree(bridge.startLat, bridge.startLon, 0);
  const end = wgs84ToThree(bridge.endLat, bridge.endLon, 0);
  const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);

  const dx = end.x - start.x;
  const dz = end.z - start.z;
  const length = Math.hypot(dx, dz);
  const yaw = Math.atan2(-dz, dx);

  group.position.copy(mid);
  group.rotation.y = yaw;

  const deckMat = new THREE.MeshStandardMaterial({
    color: '#334155',
    roughness: 0.65,
    metalness: 0.25,
  });
  const deckGeo = new THREE.BoxGeometry(length, 3.5, bridge.widthM);
  const deck = new THREE.Mesh(deckGeo, deckMat);
  deck.position.y = bridge.deckHeightM;
  deck.castShadow = true;
  deck.receiveShadow = true;
  group.add(deck);

  // Glowing side rails
  const railMat = new THREE.MeshStandardMaterial({
    color: bridge.color,
    emissive: bridge.color,
    emissiveIntensity: 0.55,
    roughness: 0.35,
  });
  for (const side of [-1, 1]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(length, 1.4, 1.2), railMat);
    rail.position.set(0, bridge.deckHeightM + 2.2, side * (bridge.widthM / 2 - 0.8));
    group.add(rail);
  }

  // Piers
  const pierMat = new THREE.MeshStandardMaterial({ color: '#475569', roughness: 0.8 });
  const pierCount = 5;
  for (let i = 1; i < pierCount; i++) {
    const px = -length / 2 + (length * i) / pierCount;
    const pier = new THREE.Mesh(new THREE.BoxGeometry(7, bridge.deckHeightM, bridge.widthM * 0.72), pierMat);
    pier.position.set(px, bridge.deckHeightM / 2, 0);
    pier.castShadow = true;
    group.add(pier);
  }

  // Signature architectural features per bridge
  const accentMat = new THREE.MeshStandardMaterial({
    color: bridge.color,
    emissive: bridge.color,
    emissiveIntensity: 0.65,
    metalness: 0.5,
    roughness: 0.3,
  });

  if (bridge.id === 'BRG-RONG') {
    // Undulating dragon steel arches along center
    const archPts: THREE.Vector3[] = [];
    const segs = 48;
    for (let i = 0; i <= segs; i++) {
      const t = i / segs;
      const x = -length * 0.42 + t * length * 0.84;
      const wave = Math.abs(Math.sin(t * Math.PI * 3)) * 28;
      archPts.push(new THREE.Vector3(x, bridge.deckHeightM + 3 + wave, 0));
    }
    const curve = new THREE.CatmullRomCurve3(archPts);
    const tubeGeo = new THREE.TubeGeometry(curve, 64, 2.4, 8, false);
    const archMesh = new THREE.Mesh(tubeGeo, accentMat);
    archMesh.castShadow = true;
    group.add(archMesh);
  } else if (bridge.id === 'BRG-TRAN-THI-LY') {
    // Inclined signature sail pylon + fan stay cables
    const pylonH = bridge.pylonHeightM || 75;
    const pylon = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 5.2, pylonH, 8), accentMat);
    pylon.position.set(-length * 0.08, pylonH / 2 + 2, 0);
    pylon.rotation.z = 0.2;
    pylon.castShadow = true;
    group.add(pylon);

    const topAnchor = new THREE.Vector3(-length * 0.08 - Math.sin(0.2) * pylonH * 0.9, pylonH * 0.92, 0);
    const cablePts: THREE.Vector3[] = [];
    for (let i = -5; i <= 5; i++) {
      if (i === 0) continue;
      cablePts.push(topAnchor, new THREE.Vector3((i / 6) * (length * 0.46), bridge.deckHeightM + 1.5, bridge.widthM * 0.38));
      cablePts.push(topAnchor, new THREE.Vector3((i / 6) * (length * 0.46), bridge.deckHeightM + 1.5, -bridge.widthM * 0.38));
    }
    const cableGeo = new THREE.BufferGeometry().setFromPoints(cablePts);
    const cables = new THREE.LineSegments(
      cableGeo,
      new THREE.LineBasicMaterial({ color: '#fda4af', transparent: true, opacity: 0.75 })
    );
    group.add(cables);
  } else if (bridge.id === 'BRG-SONG-HAN' || bridge.id === 'BRG-THUAN-PHUOC') {
    const pylonH = bridge.pylonHeightM || 50;
    const towerOffsets = bridge.id === 'BRG-THUAN-PHUOC' ? [-length * 0.25, length * 0.25] : [0];
    towerOffsets.forEach((tx) => {
      for (const zOff of [-bridge.widthM * 0.45, bridge.widthM * 0.45]) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(4.5, pylonH, 3.5), accentMat);
        leg.position.set(tx, pylonH / 2, zOff);
        leg.castShadow = true;
        group.add(leg);
      }
      const crossBeam = new THREE.Mesh(new THREE.BoxGeometry(4.5, 4, bridge.widthM * 0.96), accentMat);
      crossBeam.position.set(tx, pylonH * 0.88, 0);
      group.add(crossBeam);

      // Stay cables
      const cablePts: THREE.Vector3[] = [];
      for (const zOff of [-bridge.widthM * 0.42, bridge.widthM * 0.42]) {
        const top = new THREE.Vector3(tx, pylonH * 0.9, zOff);
        for (const span of [-1, 1]) {
          for (let k = 1; k <= 4; k++) {
            const xEnd = tx + span * k * (length * 0.065);
            if (Math.abs(xEnd) <= length * 0.48) {
              cablePts.push(top, new THREE.Vector3(xEnd, bridge.deckHeightM + 1.8, zOff));
            }
          }
        }
      }
      const cableGeo = new THREE.BufferGeometry().setFromPoints(cablePts);
      group.add(
        new THREE.LineSegments(
          cableGeo,
          new THREE.LineBasicMaterial({ color: '#7dd3fc', transparent: true, opacity: 0.7 })
        )
      );
    });
  }

  return group;
}

/**
 * Creates the full stylized 3D Da Nang urban diorama group in local ENU Three.js space.
 */
export function buildDaNangCityEnvironment(): THREE.Group {
  const cityGroup = new THREE.Group();
  cityGroup.name = 'DANANG_3D_CITY';

  // 1. Base terrain ground plane (14km x 14km)
  const groundTex = createGroundGridTexture();
  const groundMat = new THREE.MeshStandardMaterial({
    map: groundTex,
    roughness: 0.92,
    metalness: 0.08,
  });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(14000, 14000), groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  cityGroup.add(ground);

  // 2. Beach coastline sand strip + East Sea (Biển Đông)
  const beachGeo = new THREE.PlaneGeometry(220, 11000);
  const beachMat = new THREE.MeshStandardMaterial({ color: '#42392b', roughness: 0.95 });
  const beach = new THREE.Mesh(beachGeo, beachMat);
  beach.rotation.x = -Math.PI / 2;
  beach.position.set(2520, 0.25, 0);
  beach.receiveShadow = true;
  cityGroup.add(beach);

  const seaMat = new THREE.MeshStandardMaterial({
    color: '#072a46',
    roughness: 0.22,
    metalness: 0.45,
  });
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(4600, 14000), seaMat);
  sea.rotation.x = -Math.PI / 2;
  sea.position.set(4900, 0.4, 0);
  cityGroup.add(sea);

  // Da Nang Bay (North)
  const bay = new THREE.Mesh(new THREE.PlaneGeometry(7500, 2600), seaMat);
  bay.rotation.x = -Math.PI / 2;
  bay.position.set(-400, 0.4, -5500);
  cityGroup.add(bay);

  // 3. Han River curved water channel
  const riverGeo = buildRibbonGeometry(DANANG_RIVER_CENTERLINE_ENU, 330, 0.65);
  const riverMat = new THREE.MeshStandardMaterial({
    color: '#0a3a5c',
    emissive: '#062038',
    emissiveIntensity: 0.35,
    roughness: 0.18,
    metalness: 0.55,
    side: THREE.DoubleSide,
  });
  const river = new THREE.Mesh(riverGeo, riverMat);
  cityGroup.add(river);

  // 4. Da Nang Airport tarmac & runway deck visual inside SW quadrant
  const airportPad = new THREE.Mesh(
    new THREE.PlaneGeometry(2400, 3600),
    new THREE.MeshStandardMaterial({ color: '#141d2e', roughness: 0.9 })
  );
  airportPad.rotation.x = -Math.PI / 2;
  airportPad.position.set(-2550, 0.35, 1900);
  cityGroup.add(airportPad);

  for (const rxOffset of [-180, 180]) {
    const runway = new THREE.Mesh(
      new THREE.PlaneGeometry(52, 2900),
      new THREE.MeshStandardMaterial({ color: '#1f2937', roughness: 0.75 })
    );
    runway.rotation.x = -Math.PI / 2;
    runway.position.set(-2550 + rxOffset, 0.6, 1850);
    cityGroup.add(runway);
  }

  // 5. Arterial urban roads
  const roadMat = new THREE.MeshStandardMaterial({
    color: '#172235',
    roughness: 0.85,
    side: THREE.DoubleSide,
  });
  DANANG_ROADS_ENU.forEach((road) => {
    const roadMesh = new THREE.Mesh(buildRibbonGeometry(road.points, road.widthM, 0.9), roadMat);
    roadMesh.receiveShadow = true;
    cityGroup.add(roadMesh);

    const linePts = road.points.map((pt) => enuToThree(pt.x, pt.y, 1.35));
    const lineGeo = new THREE.BufferGeometry().setFromPoints(linePts);
    const centerLine = new THREE.Line(
      lineGeo,
      new THREE.LineBasicMaterial({ color: '#38bdf8', transparent: true, opacity: 0.42 })
    );
    cityGroup.add(centerLine);
  });

  // 6. Mountain blocks (Son Tra & Ngu Hanh Son)
  DANANG_3D_TERRAIN_BLOCKS.forEach((tb) => {
    const pos = wgs84ToThree(tb.latitude, tb.longitude, 0);
    const radius = (tb.radiusXM + tb.radiusYM) / 2;
    const geo = new THREE.CylinderGeometry(radius * 0.58, radius, tb.heightM, 7);
    const mat = new THREE.MeshStandardMaterial({
      color: tb.color,
      roughness: 0.9,
      flatShading: true,
    });
    const hill = new THREE.Mesh(geo, mat);
    hill.position.set(pos.x, tb.heightM / 2, pos.z);
    hill.castShadow = true;
    hill.receiveShadow = true;
    cityGroup.add(hill);
  });

  // 7. Landmark high-rise buildings (with illuminated architectural roof trim)
  const edgesMat = new THREE.LineBasicMaterial({
    color: '#38bdf8',
    transparent: true,
    opacity: 0.35,
  });
  DANANG_3D_BUILDINGS.forEach((bld) => {
    const pos = wgs84ToThree(bld.latitude, bld.longitude, 0);
    const geo = new THREE.BoxGeometry(bld.widthM, bld.heightM, bld.depthM);
    const mat = new THREE.MeshStandardMaterial({
      color: bld.color,
      roughness: 0.45,
      metalness: 0.35,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(pos.x, bld.heightM / 2, pos.z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    cityGroup.add(mesh);

    const wire = new THREE.LineSegments(new THREE.EdgesGeometry(geo), edgesMat);
    wire.position.copy(mesh.position);
    cityGroup.add(wire);

    // Rooftop cyan/amber light cap
    const crown = new THREE.Mesh(
      new THREE.BoxGeometry(bld.widthM * 0.86, 2.2, bld.depthM * 0.86),
      new THREE.MeshBasicMaterial({ color: bld.id === 'BLD-ADMIN' ? '#38bdf8' : '#0ea5e9' })
    );
    crown.position.set(pos.x, bld.heightM + 1.1, pos.z);
    cityGroup.add(crown);
  });

  // 8. Secondary dense urban district buildings via InstancedMesh (high 60fps performance)
  const urbanBlocks = generateUrbanDistrictBlocks();
  if (urbanBlocks.length > 0) {
    const unitBox = new THREE.BoxGeometry(1, 1, 1);
    const instMat = new THREE.MeshStandardMaterial({
      color: '#ffffff',
      roughness: 0.65,
      metalness: 0.25,
    });
    const instMesh = new THREE.InstancedMesh(unitBox, instMat, urbanBlocks.length);
    instMesh.castShadow = true;
    instMesh.receiveShadow = true;

    const dummy = new THREE.Object3D();
    const tmpColor = new THREE.Color();
    urbanBlocks.forEach((b, idx) => {
      const worldPos = enuToThree(b.x, b.y, b.heightM / 2);
      dummy.position.copy(worldPos);
      dummy.scale.set(b.widthM, b.heightM, b.depthM);
      dummy.updateMatrix();
      instMesh.setMatrixAt(idx, dummy.matrix);
      tmpColor.set(b.color);
      instMesh.setColorAt(idx, tmpColor);
    });
    instMesh.instanceMatrix.needsUpdate = true;
    if (instMesh.instanceColor) instMesh.instanceColor.needsUpdate = true;
    cityGroup.add(instMesh);

    // Subtle glowing roof trim on taller district blocks
    const beaconBlocks = urbanBlocks.filter((b) => b.hasBeacon);
    if (beaconBlocks.length > 0) {
      const capGeo = new THREE.BoxGeometry(1, 1.5, 1);
      const capMat = new THREE.MeshBasicMaterial({ color: '#22d3ee', transparent: true, opacity: 0.65 });
      const capMesh = new THREE.InstancedMesh(capGeo, capMat, beaconBlocks.length);
      beaconBlocks.forEach((b, idx) => {
        const pos = enuToThree(b.x, b.y, b.heightM + 0.8);
        dummy.position.copy(pos);
        dummy.scale.set(b.widthM * 0.72, 1, b.depthM * 0.72);
        dummy.updateMatrix();
        capMesh.setMatrixAt(idx, dummy.matrix);
      });
      capMesh.instanceMatrix.needsUpdate = true;
      cityGroup.add(capMesh);
    }
  }

  // 9. 4 Iconic Han River Bridges
  DANANG_3D_BRIDGES.forEach((bridge) => {
    cityGroup.add(buildArchitecturalBridge(bridge));
  });

  // 10. Vertiport Landing Pads ("H")
  DANANG_VERTIPORT_PADS.forEach((pad) => {
    const pos = wgs84ToThree(pad.latitude, pad.longitude, 0);
    const padTex = createVertiportTexture(pad.color);
    const padCylinder = new THREE.Mesh(
      new THREE.CylinderGeometry(pad.radiusM, pad.radiusM * 1.08, 2.5, 24),
      [
        new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.6 }),
        new THREE.MeshBasicMaterial({ map: padTex }),
        new THREE.MeshStandardMaterial({ color: '#0f172a' }),
      ]
    );
    padCylinder.position.set(pos.x, 1.4, pos.z);
    cityGroup.add(padCylinder);
  });

  return cityGroup;
}

export interface ArticulatedUavHandle {
  root: THREE.Group;
  rotors: THREE.Object3D[];
  strobeMat: THREE.MeshBasicMaterial;
  accentMat: THREE.MeshStandardMaterial;
}

/**
 * Creates a crisp articulated 3D UAV mesh oriented with nose toward -Z (North at heading 0).
 */
export function buildArticulatedUav(uavId: string, uavType: UAVType | undefined, accentColorHex: string): ArticulatedUavHandle {
  const root = new THREE.Group();
  root.userData.uavId = uavId;

  const rotors: THREE.Object3D[] = [];
  const bodyMat = new THREE.MeshStandardMaterial({ color: '#e2e8f0', roughness: 0.35, metalness: 0.45 });
  const darkMat = new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.5, metalness: 0.4 });
  const accentMat = new THREE.MeshStandardMaterial({
    color: accentColorHex,
    emissive: accentColorHex,
    emissiveIntensity: 0.45,
    roughness: 0.3,
    metalness: 0.5,
  });
  const rotorMat = new THREE.MeshBasicMaterial({
    color: '#bae6fd',
    transparent: true,
    opacity: 0.55,
    side: THREE.DoubleSide,
  });
  const bladeMat = new THREE.MeshStandardMaterial({ color: '#94a3b8', roughness: 0.4 });

  const addRotorAssembly = (x: number, y: number, z: number, radius: number) => {
    const pod = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 0.25, 10), darkMat);
    pod.position.set(x, y, z);
    root.add(pod);

    const spinner = new THREE.Group();
    spinner.position.set(x, y + 0.16, z);

    const blade = new THREE.Mesh(new THREE.BoxGeometry(radius * 1.9, 0.03, 0.12), bladeMat);
    spinner.add(blade);

    const disc = new THREE.Mesh(new THREE.RingGeometry(radius * 0.25, radius, 24), rotorMat);
    disc.rotation.x = -Math.PI / 2;
    spinner.add(disc);

    root.add(spinner);
    rotors.push(spinner);
  };

  if (uavType === 'FIXED_WING') {
    // Sleek fuselage along Z (-Z nose)
    const fuselage = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 2.2, 12), bodyMat);
    fuselage.rotation.x = Math.PI / 2;
    fuselage.castShadow = true;
    root.add(fuselage);

    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.55, 12), accentMat);
    nose.rotation.x = -Math.PI / 2;
    nose.position.set(0, 0, -1.35);
    root.add(nose);

    const wing = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.08, 0.55), accentMat);
    wing.position.set(0, 0.04, -0.1);
    wing.castShadow = true;
    root.add(wing);

    const hTail = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.06, 0.3), darkMat);
    hTail.position.set(0, 0.06, 0.95);
    root.add(hTail);

    const vTail = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.45, 0.35), accentMat);
    vTail.position.set(0, 0.26, 0.95);
    root.add(vTail);

    // Nose propeller
    const propGroup = new THREE.Group();
    propGroup.position.set(0, 0, -1.65);
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.08, 0.03), bladeMat);
    const disc = new THREE.Mesh(new THREE.CircleGeometry(0.45, 20), rotorMat);
    propGroup.add(blade, disc);
    root.add(propGroup);
    rotors.push(propGroup);
  } else if (uavType === 'VTOL') {
    const fuselage = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 2.0, 12), bodyMat);
    fuselage.rotation.x = Math.PI / 2;
    fuselage.castShadow = true;
    root.add(fuselage);

    const canopy = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 10), accentMat);
    canopy.scale.set(0.9, 0.7, 1.4);
    canopy.position.set(0, 0.12, -0.55);
    root.add(canopy);

    const mainWing = new THREE.Mesh(new THREE.BoxGeometry(3.1, 0.09, 0.48), bodyMat);
    mainWing.position.set(0, 0.05, -0.05);
    mainWing.castShadow = true;
    root.add(mainWing);

    // Twin booms for quad lift rotors
    for (const bx of [-0.95, 0.95]) {
      const boom = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 1.9), darkMat);
      boom.position.set(bx, 0, 0.05);
      root.add(boom);
      addRotorAssembly(bx, 0.14, -0.82, 0.52);
      addRotorAssembly(bx, 0.14, 0.85, 0.52);
    }

    const tailBar = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.07, 0.24), accentMat);
    tailBar.position.set(0, 0.22, 0.95);
    root.add(tailBar);
  } else {
    // Multirotor X-quadcopter
    const hub = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.22, 0.72), bodyMat);
    hub.castShadow = true;
    root.add(hub);

    const topPlate = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.08, 0.58), accentMat);
    topPlate.position.set(0, 0.14, 0);
    root.add(topPlate);

    const gimbal = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 10), darkMat);
    gimbal.position.set(0, -0.18, -0.22);
    root.add(gimbal);

    const armPositions: [number, number][] = [
      [0.72, -0.72],
      [-0.72, -0.72],
      [0.72, 0.72],
      [-0.72, 0.72],
    ];
    armPositions.forEach(([ax, az]) => {
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.08, 1.05), darkMat);
      arm.position.set(ax * 0.5, 0.02, az * 0.5);
      arm.rotation.y = Math.atan2(ax, az);
      root.add(arm);
      addRotorAssembly(ax, 0.12, az, 0.48);
    });
  }

  // Navigation wingtip lights (left=red, right=green) + forward cone cue + top strobe
  const leftNav = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), new THREE.MeshBasicMaterial({ color: '#ef4444' }));
  leftNav.position.set(-0.95, 0.06, -0.2);
  const rightNav = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), new THREE.MeshBasicMaterial({ color: '#22c55e' }));
  rightNav.position.set(0.95, 0.06, -0.2);

  const strobeMat = new THREE.MeshBasicMaterial({ color: '#38bdf8' });
  const strobe = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), strobeMat);
  strobe.position.set(0, 0.35, 0.1);

  const headingArrow = new THREE.Mesh(
    new THREE.ConeGeometry(0.24, 0.65, 6),
    new THREE.MeshBasicMaterial({ color: '#22d3ee', transparent: true, opacity: 0.75 })
  );
  headingArrow.rotation.x = -Math.PI / 2;
  headingArrow.position.set(0, 0.05, -2.0);

  root.add(leftNav, rightNav, strobe, headingArrow);

  // Tag all child meshes for raycasting
  root.traverse((obj) => {
    obj.userData.uavId = uavId;
  });

  return { root, rotors, strobeMat, accentMat };
}

/**
 * Draws or updates a crisp floating canvas badge sprite for a 3D UAV entity.
 */
export function createOrUpdateLabelSprite(
  existing: THREE.Sprite | undefined,
  title: string,
  subtitle: string,
  borderColor: string,
  isSelected: boolean
): THREE.Sprite {
  const width = 340;
  const height = 96;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = isSelected ? 'rgba(8, 47, 73, 0.92)' : 'rgba(9, 14, 26, 0.86)';
  ctx.strokeStyle = isSelected ? '#facc15' : borderColor;
  ctx.lineWidth = isSelected ? 4 : 2.5;

  const r = 14;
  ctx.beginPath();
  ctx.moveTo(r, 4);
  ctx.lineTo(width - r, 4);
  ctx.quadraticCurveTo(width - 4, 4, width - 4, r);
  ctx.lineTo(width - 4, height - r);
  ctx.quadraticCurveTo(width - 4, height - 4, width - r, height - 4);
  ctx.lineTo(r, height - 4);
  ctx.quadraticCurveTo(4, height - 4, 4, height - r);
  ctx.lineTo(4, r);
  ctx.quadraticCurveTo(4, 4, r, 4);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = isSelected ? '#fde047' : '#f8fafc';
  ctx.font = 'bold 26px Inter, monospace';
  ctx.textAlign = 'center';
  ctx.fillText(title, width / 2, 40);

  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 21px Inter, monospace';
  ctx.fillText(subtitle, width / 2, 74);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;

  if (existing) {
    const mat = existing.material as THREE.SpriteMaterial;
    mat.map?.dispose();
    mat.map = tex;
    mat.needsUpdate = true;
    return existing;
  }

  const spriteMat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
  const sprite = new THREE.Sprite(spriteMat);
  sprite.scale.set(95, 27, 1);
  return sprite;
}

