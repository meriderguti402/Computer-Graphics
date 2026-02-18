import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';


// --- SCENA I RENDERER ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x02050a);
scene.fog = new THREE.FogExp2(0x0c1f2e, 0.0009);


const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 5000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);

renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.6;
renderer.physicallyCorrectLights = true;

document.body.appendChild(renderer.domElement);


const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
const clock = new THREE.Clock();

// --- HELPERS ---
function rand(a, b) { return a + Math.random() * (b - a); }
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

// --- PARAMETRI ---
const tunnelRadius = 150;
const lobbyWidth = 38;
const gapAngle = lobbyWidth / tunnelRadius;
const arcVal = Math.PI * 2 - gapAngle;
const rotationOffset = gapAngle / 2;

// ✅ jedan loader za sve texture
const textureLoader = new THREE.TextureLoader();

// ----------------------------------------------------
// ✅ POD U VELIKOM AKVARIJUMU (IZVAN TUNELA) — ocean-sand
// ----------------------------------------------------
const bigFloorY = -5.12;

const tunnelTubeR = 5.2;
const tunnelHoleMargin = 0.9;
const holeInner = tunnelRadius - (tunnelTubeR + tunnelHoleMargin);
const holeOuter = tunnelRadius + (tunnelTubeR + tunnelHoleMargin);

const bigOuterR = 4500;

const bigFloorCandidates = [
  '/textures/ocean-sand.png',
  '/textures/ocean-sand.jpg',
  '/textures/sando.jpg',
  '/textures/ocean_sand.png',
  '/textures/ocean_sand.jpg',
];

function loadTextureWithFallback(paths, onDone) {
  let i = 0;
  const tryLoad = () => {
    const p = paths[i];
    textureLoader.load(
      p,
      (tex) => onDone(tex, p),
      undefined,
      () => {
        i++;
        if (i < paths.length) tryLoad();
        else console.error('❌ Ne mogu da učitam ocean-sand teksturu. Provjeri ime fajla u /textures.');
      }
    );
  };
  tryLoad();
}

const bigSandMat = new THREE.MeshStandardMaterial({
  color: 0xffffff,
  roughness: 1.0,
  metalness: 0.0,
  side: THREE.DoubleSide
});

const bigSandInnerGeo = new THREE.CircleGeometry(holeInner, 256);
const bigSandInner = new THREE.Mesh(bigSandInnerGeo, bigSandMat);
bigSandInner.rotation.x = -Math.PI / 2;
bigSandInner.position.y = bigFloorY;
scene.add(bigSandInner);

const bigSandOuterGeo = new THREE.RingGeometry(holeOuter, bigOuterR, 256, 8);
const bigSandOuter = new THREE.Mesh(bigSandOuterGeo, bigSandMat);
bigSandOuter.rotation.x = -Math.PI / 2;
bigSandOuter.position.y = bigFloorY;
scene.add(bigSandOuter);

loadTextureWithFallback(bigFloorCandidates, (tex, usedPath) => {
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();

  const repeatScale = bigOuterR / 220;
  tex.repeat.set(repeatScale, repeatScale);

  bigSandInner.material.map = tex;
  bigSandOuter.material.map = tex;

  bigSandInner.material.needsUpdate = true;
  bigSandOuter.material.needsUpdate = true;

  console.log('✅ ocean-sand učitan:', usedPath);
});

// ----------------------------------------------------
// 🪸 GREBENI U VELIKOM AKVARIJUMU (IZVAN TUNELA)
// ✅ SAD SU MALO VEĆI + dozvoljeni bliže tunelu (da se vide kroz staklo)
// ----------------------------------------------------
const reefWorld = new THREE.Group();
scene.add(reefWorld);

const REEF_TEXTURES = [
  '/textures/coral-reefs-png-coral-reef-png-transparent-11562866492fbvioivzto.png',
  '/textures/intricate-white-coral-formation-cut-out-stock-png.png',
  '/textures/pngtree-beautiful-coral-branch-on-transparent-background-png-image_12595568.png',
  '/textures/pngtree-blue-coral-reef-png-image_11501782.png',
  '/textures/pngtree-marine-reef-structure--isolated-on-transparent-background-png-image_13370524.png',
  '/textures/pngtree-orange-coral-sea-plant-with-intricate-organic-structure-png-image_16370779.png',
  '/textures/vibrant-coral-reef-teeming-with-marine-life-png.png',
];

function loadManyTextures(paths, done) {
  const loaded = [];
  let idx = 0;

  const next = () => {
    if (idx >= paths.length) return done(loaded);

    const p = paths[idx++];
    textureLoader.load(
      p,
      (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
        loaded.push({ tex, path: p });
        next();
      },
      undefined,
      () => {
        console.warn('⚠️ Reef texture nije nađena:', p);
        next();
      }
    );
  };

  next();
}

function makeReefMaterial(tex) {
  const m = new THREE.MeshStandardMaterial({
    map: tex,
    transparent: true,
    alphaTest: 0.25,
    side: THREE.DoubleSide,
    roughness: 1.0,
    metalness: 0.0
  });
  m.depthWrite = false;
  return m;
}

function createReefBouquet({
  tex,
  baseWidth = 10,
  baseHeight = 8,
  planes = 10,
  scale = 1.0,
  sink = 3.0,
  yBase = bigFloorY,
} = {}) {
  const g = new THREE.Group();

  const mat = makeReefMaterial(tex);
  const geo = new THREE.PlaneGeometry(baseWidth * scale, baseHeight * scale);

  const y = yBase + (baseHeight * scale) / 2 - sink;

  for (let i = 0; i < planes; i++) {
    const p = new THREE.Mesh(geo, mat);
    p.position.set(0, y, 0);
    p.rotation.y = (i / planes) * Math.PI * 2;
    p.renderOrder = 80;
    g.add(p);
  }

  return g;
}

function dist2(a, b) {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return dx * dx + dz * dz;
}

function isInLobbyOrHallZone(x, z) {
  const lobbyRadius = 60;
  const connectorLen = 40;
  const lobbyXPos = tunnelRadius - lobbyRadius - connectorLen;
  const lobbyWorldX = lobbyXPos + 20;

  const lobbyCenterX = lobbyWorldX + 4;
  const lobbyCenterZ = 0;

  const dx = x - lobbyCenterX;
  const dz = z - lobbyCenterZ;
  const d = Math.sqrt(dx * dx + dz * dz);
  if (d < (lobbyRadius + 35)) return true;

  const hallWidth = lobbyWidth;
  const hallStartX = lobbyWorldX + lobbyRadius;
  const hallEndX = hallStartX + connectorLen + 55;

  if (x > (hallStartX - 25) && x < hallEndX && Math.abs(z) < (hallWidth / 2 + 45)) {
    return true;
  }

  return false;
}

// ✅ Smanjena zona zabrane oko tunela (da grebeni mogu biti bliže i da se vide kroz staklo)
const reefNoSpawnInner = tunnelRadius - 18;
const reefNoSpawnOuter = tunnelRadius + 18;

function generateReefPoints({
  count = 56,
  minDist = 105,
  maxR = 1200,
} = {}) {
  const pts = [];
  const minDist2 = minDist * minDist;

  const centerMax = 85;
  const outerMin = reefNoSpawnOuter;

  let tries = 0;
  const maxTries = 12000;

  while (pts.length < count && tries < maxTries) {
    tries++;

    const chooseCenter = Math.random() < 0.20;

    let r;
    if (chooseCenter) {
      r = Math.sqrt(Math.random()) * centerMax;
    } else {
      r = Math.sqrt(rand(outerMin * outerMin, maxR * maxR));
    }

    if (r > reefNoSpawnInner && r < reefNoSpawnOuter) continue;

    const a = Math.random() * Math.PI * 2;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;

    if (isInLobbyOrHallZone(x, z)) continue;

    const p = new THREE.Vector3(x, 0, z);

    let ok = true;
    for (const q of pts) {
      if (dist2(p, q) < minDist2) { ok = false; break; }
    }
    if (!ok) continue;

    pts.push(p);
  }

  return pts;
}




controls.rotateSpeed = 1.5;
controls.zoomSpeed = 1.5;
controls.panSpeed = 1.2;

function addReefCluster(reefTexList, position) {
  const bouquetCount = (Math.random() < 0.18) ? 3 : ((Math.random() < 0.62) ? 2 : 1);

  const cluster = new THREE.Group();
  cluster.position.set(position.x, 0, position.z);

  for (let i = 0; i < bouquetCount; i++) {
    const pick = reefTexList[Math.floor(Math.random() * reefTexList.length)];
    const tex = pick.tex;

    // ✅ OVDJE SU GREBENI POVEĆANI (s, w, h)
    const s = rand(0.85, 1.85);
    const w = rand(10, 22);
    const h = rand(8, 18);

    const sink = rand(2.6, 5.2);
    const planes = Math.round(rand(10, 14));

    const bouquet = createReefBouquet({
      tex,
      baseWidth: w,
      baseHeight: h,
      planes,
      scale: s,
      sink,
      yBase: bigFloorY
    });

    bouquet.rotation.y = rand(0, Math.PI * 2);
    bouquet.position.x += rand(-4.0, 4.0);
    bouquet.position.z += rand(-4.0, 4.0);

    cluster.add(bouquet);
  }

  cluster.rotation.y = rand(0, Math.PI * 2);
  reefWorld.add(cluster);
}

// -------------------------------
// ✅ POD UNUTAR CILINDRIČNOG AKVARIJUMA (TEKSTURA PIJESKA)
// (treba nam sandY za reef u cilindru)
// -------------------------------
const lobbyRadius = 60;
const lobbyHeight = 15;
const connectorLen = 40;
const lobbyXPos = tunnelRadius - lobbyRadius - connectorLen;

const lobbyFloorY = -5;
const lobbyCeilY = lobbyHeight - 5;

const tankRadius = 12.5;

const baseHeight = 0.75;
const sandY = lobbyFloorY + baseHeight + 0.05;

// ✅ Reef u cilindru (vracen)
let tankReefGroup = null;

loadManyTextures(REEF_TEXTURES, (reefTexList) => {
  if (!reefTexList.length) {
    console.warn('⚠️ Nijedna reef textura nije učitana. Provjeri imena u REEF_TEXTURES i /textures folder.');
    return;
  }

  console.log('✅ Reef texture učitane:', reefTexList.map(x => x.path));

  // vanjski reef
  const points = generateReefPoints({
    count: 56,
    minDist: 105,
    maxR: 1200
  });
  for (const p of points) addReefCluster(reefTexList, p);

  // ✅ VRAĆEN KORALJNI GREBEN U CILINDRU
  const lobbyCenterLocalX = 4; // isto kao dole (lobbyRound.position.x += 4)

  tankReefGroup = new THREE.Group();
  tankReefGroup.position.set(lobbyCenterLocalX, 0, 0);
  tankReefGroup.renderOrder = 55;
  scene.add(tankReefGroup);

  const count = 9;
  const maxR = tankRadius - 2.2;

  for (let i = 0; i < count; i++) {
    const pick = reefTexList[Math.floor(Math.random() * reefTexList.length)];
    const tex = pick.tex;

    const a = Math.random() * Math.PI * 2;
    const r = Math.sqrt(Math.random()) * maxR;

    const w = rand(2.6, 4.6);
    const h = rand(2.4, 4.2);
    const s = rand(0.9, 1.35);
    const sink = rand(0.8, 1.6);
    const planes = Math.round(rand(8, 12));

    const bouquet = createReefBouquet({
      tex,
      baseWidth: w,
      baseHeight: h,
      planes,
      scale: s,
      sink,
      yBase: sandY
    });

    bouquet.position.set(Math.cos(a) * r, 0, Math.sin(a) * r);
    bouquet.rotation.y = rand(0, Math.PI * 2);
    bouquet.children.forEach(ch => ch.renderOrder = 95);

    tankReefGroup.add(bouquet);
  }
});

// ----------------------------------------------------
// 🪨 REALISTIČNO KAMENJE (3X VIŠE) — sjena + varijacija + bolji 3D + u pijesku
// ----------------------------------------------------
const rockWorld = new THREE.Group();
scene.add(rockWorld);

const ROCK_TEXTURES = [
  '/textures/240_F_1561707814_ZtOVPOxATCnJd0LiRGBW1DPaN6d5NiQO.png',
  '/textures/masked-live-rock.png',
  '/textures/pngtree-striking-red-coral-specimen-attached-to-a-dark-rock-png-image_16199528.png',
];

function loadManyTexturesSimple(paths, done) {
  const loaded = [];
  let idx = 0;

  const next = () => {
    if (idx >= paths.length) return done(loaded);

    const p = paths[idx++];
    textureLoader.load(
      p,
      (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
        loaded.push({ tex, path: p });
        next();
      },
      undefined,
      () => {
        console.warn('⚠️ Rock textura nije nađena:', p);
        next();
      }
    );
  };
  next();
}

// ✅ malo varijacije boje po kamenu + prozirnost
function makeRockMaterial(tex) {
  const tint = new THREE.Color().setHSL(
    0.06 + Math.random() * 0.04,
    0.08 + Math.random() * 0.10,
    0.85 + Math.random() * 0.12
  );

  const m = new THREE.MeshStandardMaterial({
    map: tex,
    color: tint,
    transparent: true,
    alphaTest: 0.15,
    side: THREE.DoubleSide,
    roughness: 1.0,
    metalness: 0.0
  });

  m.depthWrite = false;
  return m;
}

// ✅ sjena ispod (tamna mrlja)
function createShadow(size) {
  const geo = new THREE.CircleGeometry(size, 28);
  const mat = new THREE.MeshBasicMaterial({
    color: 0x000000,
    transparent: true,
    opacity: 0.24,
    depthWrite: false
  });

  const shadow = new THREE.Mesh(geo, mat);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = bigFloorY + 0.01;
  shadow.renderOrder = 65;
  return shadow;
}

// ✅ više planeova ukršteno + random rotacije = bolji 3D osjećaj
function createRockBouquet({
  tex,
  baseW = 38,
  baseH = 22,
  planes = 8,
  scale = 1.0,
  sink = 2.2,
  yBase = bigFloorY,
} = {}) {
  const g = new THREE.Group();
  const mat = makeRockMaterial(tex);
  const geo = new THREE.PlaneGeometry(baseW * scale, baseH * scale);

  const y = yBase + (baseH * scale) / 2 - sink;

  for (let i = 0; i < planes; i++) {
    const p = new THREE.Mesh(geo, mat);
    p.position.set(0, y, 0);

    p.rotation.y = (i / planes) * Math.PI * 2 + rand(-0.22, 0.22);
    p.rotation.x = rand(-0.10, 0.10);
    p.rotation.z = rand(-0.10, 0.10);

    p.renderOrder = 70;
    g.add(p);
  }

  g.rotation.x = rand(-0.06, 0.06);
  g.rotation.z = rand(-0.06, 0.06);

  return g;
}

// ✅ tačke rasporeda (3X više kamenja)
function generateRockPoints({
  count = 102,
  minDist = 70,
  maxR = 1350,
} = {}) {
  const pts = [];
  const minDist2 = minDist * minDist;

  const noSpawnInner = tunnelRadius - 26;
  const noSpawnOuter = tunnelRadius + 26;

  let tries = 0;
  const maxTries = 60000;

  while (pts.length < count && tries < maxTries) {
    tries++;

    const r = Math.sqrt(rand(noSpawnOuter * noSpawnOuter, maxR * maxR));
    if (r > noSpawnInner && r < noSpawnOuter) continue;

    const a = Math.random() * Math.PI * 2;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;

    if (isInLobbyOrHallZone(x, z)) continue;

    const p = new THREE.Vector3(x, 0, z);

    let ok = true;
    for (const q of pts) {
      const dx = p.x - q.x;
      const dz = p.z - q.z;
      if (dx * dx + dz * dz < minDist2) { ok = false; break; }
    }
    if (!ok) continue;

    pts.push(p);
  }

  return pts;
}

// ✅ cluster (1–2 kamena najčešće, rijetko 3)
function addRockCluster(rockTexList, position) {
  const n = (Math.random() < 0.12) ? 3 : ((Math.random() < 0.55) ? 2 : 1);

  const cluster = new THREE.Group();
  cluster.position.set(position.x, 0, position.z);

  for (let i = 0; i < n; i++) {
    const pick = rockTexList[Math.floor(Math.random() * rockTexList.length)];
    const tex = pick.tex;

    const s = rand(0.8, 1.2);
    const w = rand(15, 35);
    const h = rand(13, 24);

    const bouquet = createRockBouquet({
      tex,
      baseW: w,
      baseH: h,
      planes: Math.round(rand(7, 11)),
      scale: s,
      sink: rand(2.0, 3.2),
      yBase: bigFloorY
    });

    bouquet.rotation.y = rand(0, Math.PI * 2);
    bouquet.position.x += rand(-8, 8);
    bouquet.position.z += rand(-8, 8);

    cluster.add(bouquet);

    const shadowSize = (w * s) * 0.45;
    const shadow = createShadow(shadowSize);
    shadow.position.x = bouquet.position.x;
    shadow.position.z = bouquet.position.z;
    cluster.add(shadow);
  }

  rockWorld.add(cluster);
}

loadManyTexturesSimple(ROCK_TEXTURES, (rockTexList) => {
  if (!rockTexList.length) {
    console.warn('⚠️ Nijedna rock textura nije učitana. Provjeri ROCK_TEXTURES i /textures folder.');
    return;
  }

  console.log('✅ Rock texture učitane:', rockTexList.map(x => x.path));

  const points = generateRockPoints({
    count: 102,
    minDist: 70,
    maxR: 1350
  });
  for (const p of points) addRockCluster(rockTexList, p);

  const near = generateRockPoints({ count: 30, minDist: 90, maxR: 650 });
  for (const p of near) {
    if (Math.random() < 0.6) addRockCluster(rockTexList, p);
  }
});

// ----------------------------------------------------
// ✅ ŠKOLJKE + ZVIJEZDE + ŠLJUNAK (gravel) NA PIJESKU
// (dodaj OVDJE: poslije rockWorld loadera, prije TUNELA)
// ----------------------------------------------------
const SHELL_TEXTURES = [
  '/textures/bhg.png',
  '/textures/hst.png',
  '/textures/plo.png',
  '/textures/sh.png',
  '/textures/ssh.png',
];

const STAR_TEXTURES = [
  '/textures/edr.png',
  '/textures/nbv.png',
  '/textures/oku.png',
  '/textures/po.png',
];

function loadTextureList(paths, done) {
  const out = [];
  let i = 0;
  const next = () => {
    if (i >= paths.length) return done(out);
    const p = paths[i++];
    textureLoader.load(
      p,
      (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
        out.push({ tex, path: p });
        next();
      },
      undefined,
      () => {
        console.warn('⚠️ Missing texture:', p);
        next();
      }
    );
  };
  next();
}

function makeSoftShadow(size, y, opacity = 0.22) {
  const geo = new THREE.CircleGeometry(size, 26);
  const mat = new THREE.MeshBasicMaterial({
    color: 0x000000,
    transparent: true,
    opacity,
    depthWrite: false
  });
  const m = new THREE.Mesh(geo, mat);
  m.rotation.x = -Math.PI / 2;
  m.position.y = y + 0.01;
  m.renderOrder = 180;
  return m;
}

function makeDecoPlane(tex, w, h) {
  const mat = new THREE.MeshStandardMaterial({
    map: tex,
    transparent: true,
    alphaTest: 0.25,
    side: THREE.DoubleSide,
    roughness: 1.0,
    metalness: 0.0
  });
  mat.depthWrite = false;
  mat.polygonOffset = true;
  mat.polygonOffsetFactor = -1;
  mat.polygonOffsetUnits = -1;

  const geo = new THREE.PlaneGeometry(w, h);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.renderOrder = 190;
  return mesh;
}

function okForBigFloor(x, z) {
  if (isInLobbyOrHallZone(x, z)) return false;

  const r = Math.sqrt(x * x + z * z);
  if (r > (tunnelRadius - 26) && r < (tunnelRadius + 26)) return false;

  return true;
}

function scatterDecoOnBigFloor({
  group,
  textures,
  count,
  y = bigFloorY,
  rMin = holeOuter + 20,
  rMax = 900,
  sizeMin = 1.2,
  sizeMax = 3.2,
  sinkMin = 0.25,
  sinkMax = 0.75
}) {
  let tries = 0;
  const maxTries = count * 40;

  while (group.children.length < count * 2 && tries < maxTries) {
    tries++;

    const a = Math.random() * Math.PI * 2;
    const r = Math.sqrt(rand(rMin * rMin, rMax * rMax));
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;

    if (!okForBigFloor(x, z)) continue;

    const pick = textures[Math.floor(Math.random() * textures.length)];
    if (!pick) continue;

    const s = rand(sizeMin, sizeMax);
    const w = s * rand(1.9, 2.25);
    const h = s * rand(2.75, 3.15);

    const plane = makeDecoPlane(pick.tex, w, h);

    const sink = rand(sinkMin, sinkMax);
    plane.position.set(x, y + 0.03 - sink, z);
    plane.rotation.x = -Math.PI / 2 + rand(-0.18, 0.18);
    plane.rotation.z = rand(-0.35, 0.35);
    plane.rotation.y = rand(0, Math.PI * 2);

    const shadow = makeSoftShadow(s * 0.55, y, 0.20 + Math.random() * 0.08);
    shadow.position.x = x;
    shadow.position.z = z;

    group.add(shadow);
    group.add(plane);
  }
}

function scatterDecoInTank({
  group,
  textures,
  count,
  y = sandY,
  rMax = (tankRadius - 1.4),
  sizeMin = 0.35,
  sizeMax = 0.85,
  sinkMin = 0.08,
  sinkMax = 0.22
}) {
  let placed = 0;
  let tries = 0;

  while (placed < count && tries < count * 50) {
    tries++;

    const a = Math.random() * Math.PI * 2;
    const r = Math.sqrt(Math.random()) * rMax;

    if (r < 2.8) continue;

    const x = lobbyCenterLocalX + Math.cos(a) * r;
    const z = Math.sin(a) * r;

    const pick = textures[Math.floor(Math.random() * textures.length)];
    if (!pick) continue;

    const s = rand(sizeMin, sizeMax);
    const w = s * rand(5.9, 9.2);
    const h = s * rand(5.8, 6.15);

    const plane = makeDecoPlane(pick.tex, w, h);

    const sink = rand(sinkMin, sinkMax);
    plane.position.set(x, y + 0.03 - sink, z);
    plane.rotation.x = -Math.PI / 2 + rand(-0.16, 0.16);
    plane.rotation.z = rand(-0.25, 0.25);
    plane.rotation.y = rand(0, Math.PI * 2);

    const shadow = makeSoftShadow(s * 0.55, y, 0.20);
    shadow.position.x = x;
    shadow.position.z = z;

    group.add(shadow);
    group.add(plane);
    placed++;
  }
}

function addGravelInstanced({
  parent,
  count,
  y,
  areaRMin,
  areaRMax,
  tankMode = false
}) {
  const geo = new THREE.IcosahedronGeometry(0.22, 0);
  const mat = new THREE.MeshStandardMaterial({
    color: 0x2a2a2a,
    roughness: 1.0,
    metalness: 0.0
  });

  const inst = new THREE.InstancedMesh(geo, mat, count);
  inst.castShadow = false;
  inst.receiveShadow = false;
  inst.renderOrder = 120;

  const dummy = new THREE.Object3D();
  let placed = 0;
  let tries = 0;

  while (placed < count && tries < count * 30) {
    tries++;

    let x, z;

    if (!tankMode) {
      const a = Math.random() * Math.PI * 2;
      const r = Math.sqrt(rand(areaRMin * areaRMin, areaRMax * areaRMax));
      x = Math.cos(a) * r;
      z = Math.sin(a) * r;

      if (!okForBigFloor(x, z)) continue;
    } else {
      const a = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random()) * areaRMax;
      if (r < 2.4) continue;
      x = lobbyCenterLocalX + Math.cos(a) * r;
      z = Math.sin(a) * r;
    }

    const sink = tankMode ? rand(0.03, 0.10) : rand(0.06, 0.16);

    dummy.position.set(x, y - sink, z);
    dummy.rotation.set(rand(0, Math.PI), rand(0, Math.PI), rand(0, Math.PI));
    const s = tankMode ? rand(0.7, 1.2) : rand(0.8, 1.5);
    dummy.scale.setScalar(s);

    dummy.updateMatrix();
    inst.setMatrixAt(placed, dummy.matrix);
    placed++;
  }

  inst.instanceMatrix.needsUpdate = true;
  parent.add(inst);
}

const decoWorld = new THREE.Group();
scene.add(decoWorld);

loadTextureList(SHELL_TEXTURES, (shells) => {
  loadTextureList(STAR_TEXTURES, (stars) => {
    const allDeco = [...shells, ...stars];
    if (!allDeco.length) {
      console.warn('⚠️ Nema učitanih školjki/zvijezda. Provjeri SHELL_TEXTURES/STAR_TEXTURES putanje.');
      return;
    }

    scatterDecoOnBigFloor({
      group: decoWorld,
      textures: allDeco,
      count: 55,
      y: bigFloorY,
      rMin: holeOuter + 25,
      rMax: 900,
      sizeMin: 1.2,
      sizeMax: 3.4
    });

    scatterDecoInTank({
      group: decoWorld,
      textures: allDeco,
      count: 26,
      y: sandY,
      rMax: tankRadius - 1.6,
      sizeMin: 0.35,
      sizeMax: 0.85
    });

    addGravelInstanced({
      parent: decoWorld,
      count: 520,
      y: bigFloorY + 0.02,
      areaRMin: holeOuter + 20,
      areaRMax: 950,
      tankMode: false
    });

    addGravelInstanced({
      parent: decoWorld,
      count: 220,
      y: sandY + 0.02,
      areaRMin: 0,
      areaRMax: tankRadius - 1.6,
      tankMode: true
    });

    console.log('✅ Školjke/zvijezde + gravel dodani.');
  });
});


// 1) Procedural "micro relief" texture (canvas)
function makeMicroReliefTexture(size = 512) {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d');

  const img = ctx.createImageData(size, size);
  const data = img.data;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;

      const n1 = (Math.random() * 255) | 0;
      const n2 = (Math.random() * 255) | 0;

      let v = (n1 * 0.65 + n2 * 0.35) | 0;
      v = Math.min(255, Math.max(0, (v - 128) * 1.12 + 128));

      data[i + 0] = v;
      data[i + 1] = v;
      data[i + 2] = v;
      data[i + 3] = 255;
    }
  }

  ctx.putImageData(img, 0, 0);

  ctx.globalCompositeOperation = 'soft-light';
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = 'rgba(255,255,255,1)';
  for (let k = 0; k < 180; k++) {
    const yy = Math.random() * size;
    const w = size * (0.35 + Math.random() * 0.45);
    const xx = Math.random() * (size - w);
    const h = 1 + Math.random() * 2.2;
    ctx.fillRect(xx, yy, w, h);
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(6, 6);
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return tex;
}

const microReliefTex = makeMicroReliefTexture(512);

// 2) Overlay materijal (tanki sloj iznad pijeska)
const reliefOverlayMat = new THREE.MeshStandardMaterial({
  map: microReliefTex,
  transparent: true,
  opacity: 0.18,
  color: 0xffffff,
  roughness: 1.0,
  metalness: 0.0,
  side: THREE.DoubleSide,
  depthWrite: false
});
reliefOverlayMat.polygonOffset = true;
reliefOverlayMat.polygonOffsetFactor = -2;
reliefOverlayMat.polygonOffsetUnits = -2;

const reliefInner = new THREE.Mesh(
  new THREE.CircleGeometry(holeInner, 256),
  reliefOverlayMat
);
reliefInner.rotation.x = -Math.PI / 2;
reliefInner.position.y = bigFloorY + 0.028;
reliefInner.renderOrder = 140;
scene.add(reliefInner);

const reliefOuter = new THREE.Mesh(
  new THREE.RingGeometry(holeOuter, bigOuterR, 256, 8),
  reliefOverlayMat
);
reliefOuter.rotation.x = -Math.PI / 2;
reliefOuter.position.y = bigFloorY + 0.028;
reliefOuter.renderOrder = 140;
scene.add(reliefOuter);

// 3) Gravel patches: tamne mrlje (zone sa šljunkom)
function makeGravelPatchTexture(size = 512) {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d');

  ctx.fillStyle = 'rgba(0,0,0,0)';
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 90; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = 25 + Math.random() * 110;

    const g = ctx.createRadialGradient(x, y, r * 0.1, x, y, r);
    g.addColorStop(0.0, 'rgba(30,30,30,0.55)');
    g.addColorStop(0.55, 'rgba(20,20,20,0.18)');
    g.addColorStop(1.0, 'rgba(0,0,0,0.0)');

    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.globalCompositeOperation = 'overlay';
  ctx.globalAlpha = 0.25;
  for (let k = 0; k < 2500; k++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const a = 0.10 + Math.random() * 0.25;
    ctx.fillStyle = `rgba(10,10,10,${a})`;
    ctx.fillRect(x, y, 1, 1);
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 4);
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return tex;
}

const gravelPatchTex = makeGravelPatchTexture(512);

const gravelPatchMat = new THREE.MeshStandardMaterial({
  map: gravelPatchTex,
  transparent: true,
  opacity: 0.22,
  roughness: 1.0,
  metalness: 0.0,
  side: THREE.DoubleSide,
  depthWrite: false
});
gravelPatchMat.polygonOffset = true;
gravelPatchMat.polygonOffsetFactor = -3;
gravelPatchMat.polygonOffsetUnits = -3;

const patchInner = new THREE.Mesh(
  new THREE.CircleGeometry(holeInner, 256),
  gravelPatchMat
);
patchInner.rotation.x = -Math.PI / 2;
patchInner.position.y = bigFloorY + 0.032;
patchInner.renderOrder = 141;
scene.add(patchInner);

const patchOuter = new THREE.Mesh(
  new THREE.RingGeometry(holeOuter, bigOuterR, 256, 8),
  gravelPatchMat
);
patchOuter.rotation.x = -Math.PI / 2;
patchOuter.position.y = bigFloorY + 0.032;
patchOuter.renderOrder = 141;
scene.add(patchOuter);

// 4) Tank floor upgrade (manje, diskretno)
const tankMicroTex = makeMicroReliefTexture(256);
tankMicroTex.repeat.set(3.5, 3.5);

const tankReliefMat = new THREE.MeshStandardMaterial({
  map: tankMicroTex,
  transparent: true,
  opacity: 0.16,
  roughness: 1.0,
  metalness: 0.0,
  side: THREE.DoubleSide,
  depthWrite: false
});
tankReliefMat.polygonOffset = true;
tankReliefMat.polygonOffsetFactor = -2;
tankReliefMat.polygonOffsetUnits = -2;



const tankPatchTex = makeGravelPatchTexture(256);
tankPatchTex.repeat.set(2.2, 2.2);

const tankPatchMat = new THREE.MeshStandardMaterial({
  map: tankPatchTex,
  transparent: true,
  opacity: 0.16,
  roughness: 1.0,
  metalness: 0.0,
  side: THREE.DoubleSide,
  depthWrite: false
});
tankPatchMat.polygonOffset = true;
tankPatchMat.polygonOffsetFactor = -3;
tankPatchMat.polygonOffsetUnits = -3;

// 5) anim timer za pod
let _floorAnimT = 0;

const SEAWEED_TEXTURES = [
  '/textures/grass.png',
  '/textures/gtd.png',
  '/textures/lk.png',
  '/textures/lop.png',
  '/textures/ra.png',
  '/textures/va.png',
  '/textures/ba.png',
  '/textures/kh.png',
  
];

// max visina: do visine komoda (bench wallHeight=1.2) iznad bigFloorY
const SEAWEED_MAX_H = 60.60;              // <= ovo je "maksimalno visoko"
const SEAWEED_MIN_H = 0.35;

// helper: random u krugu
function randInCircle(r) {
  const a = Math.random() * Math.PI * 2;
  const rr = Math.sqrt(Math.random()) * r;
  return { x: Math.cos(a) * rr, z: Math.sin(a) * rr };
}

// ✅ pravi jedan instanced “field” za jednu teksturu
function createSeaweedField(tex, count, renderOrder = 175) {
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();

  const geo = new THREE.PlaneGeometry(1, 1, 1, 6);
  // sidro na dno (da se "savija" od poda)
  geo.translate(0, 0.5, 0);

  const mat = new THREE.MeshStandardMaterial({
    map: tex,
    transparent: true,
    alphaTest: 0.25,
    side: THREE.DoubleSide,
    roughness: 1.0,
    metalness: 0.0,
    depthWrite: false
  });

  const inst = new THREE.InstancedMesh(geo, mat, count);
  inst.renderOrder = renderOrder;

  // random faktor po instanci za sway
  const aRand = new Float32Array(count);
  for (let i = 0; i < count; i++) aRand[i] = Math.random();
  inst.geometry.setAttribute('aRand', new THREE.InstancedBufferAttribute(aRand, 1));

  // shader sway (malo, realistično)
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = { value: 0 };
    shader.vertexShader =
      `
      uniform float uTime;
      attribute float aRand;
      ` + shader.vertexShader;

    // ubaci sway prije projekcije
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `
      #include <begin_vertex>

      // y=0 je dno, y=1 je vrh (jer smo geo.translate(0,0.5,0))
      float bend = position.y;
      float t = uTime * (0.9 + aRand * 1.1);
      float sway = sin(t + aRand * 6.2831) * (0.06 + aRand * 0.10);

      // savijanje u X + malo u Z (da nije "flat")
      transformed.x += sway * bend;
      transformed.z += cos(t * 4.8 + aRand * 3.2831) * (1.02 + aRand * 3.05) * bend;
      `
    );

    inst.userData._seaweedShader = shader; // da ga update-amo u animate()
  };

  return inst;
}

// ✅ scatter u patch-evima (gušće/rjeđe)
const seaweedWorld = new THREE.Group();
scene.add(seaweedWorld);

// ne diramo cilindar: koristimo okForBigFloor(x,z) koji već imaš
function scatterSeaweedInto(inst, startIndex, howMany, centerX, centerZ, patchR) {
  const dummy = new THREE.Object3D();
  let placed = 0;
  let tries = 0;

  while (placed < howMany && tries < howMany * 60) {
    tries++;

    const p = randInCircle(patchR);
    const x = centerX + p.x;
    const z = centerZ + p.z;

    if (!okForBigFloor(x, z)) continue; // ✅ izbaci lobby/hall i zonu oko tunela

    const h = rand(SEAWEED_MIN_H, SEAWEED_MAX_H);
    const w = h * rand(0.16, 0.30);

// koliko puta skaliraš bazu (BASE_H/BASE_W)
const sY = h / 6.0;          // 6.0 = BASE_H
const sX = w / 2.2;          // 2.2 = BASE_W

dummy.position.set(x, bigFloorY + 0.08, z); // ✅ malo iznad poda (da ne “propadne”)
dummy.rotation.set(0, rand(0, Math.PI * 2), 0);
dummy.scale.set(sX, sY, 1);


    // malo “nagni” ponegdje
    dummy.rotation.z = rand(-0.12, 0.12);

    dummy.updateMatrix();
    inst.setMatrixAt(startIndex + placed, dummy.matrix);
    placed++;
  }

  return placed;
}

// učitaj sve seaweed texture i napravi više “patch”-eva
loadTextureList(SEAWEED_TEXTURES, (seaweedTexList) => {
  if (!seaweedTexList.length) {
    console.warn('⚠️ Nema učitanih seaweed tekstura. Provjeri SEAWEED_TEXTURES putanje.');
    return;
  }

  // raspodjela po teksturama
  const TOTAL = 10000; // slobodno povećaj/smanji (perf)
  const perTex = Math.floor(TOTAL / seaweedTexList.length);

  seaweedTexList.forEach((tobj, idx) => {
    const inst = createSeaweedField(tobj.tex, perTex, 176 + idx);
    seaweedWorld.add(inst);

    // patch-evi: neki gušći, neki rjeđi (centar oko scene)
    // NOTE: rMin/holeOuter se već brine okForBigFloor
    let offset = 0;

    // 3 gušća patch-a
    offset += scatterSeaweedInto(inst, offset, Math.floor(perTex * 0.35),  220,  120, 160);
    offset += scatterSeaweedInto(inst, offset, Math.floor(perTex * 0.35), -260, -180, 170);
    offset += scatterSeaweedInto(inst, offset, Math.floor(perTex * 0.20),  380, -260, 190);

    // ostatak razbacano rjeđe po većem području
    const remaining = perTex - offset;
    if (remaining > 0) {
      offset += scatterSeaweedInto(inst, offset, remaining, 0, 0, 950);
    }

    inst.instanceMatrix.needsUpdate = true;
  });

  console.log('✅ Seaweed/trava dodani (samo veliki akvarijum, bez cilindra).');
});



// --- AKVARIJUM (TUNEL) ---
const walkway = new THREE.Mesh(
  new THREE.TorusGeometry(tunnelRadius, 4.5, 2, 120, arcVal),
  new THREE.MeshStandardMaterial({ color: 0x111111 })
);
walkway.rotation.x = Math.PI / 2;
walkway.rotation.z = rotationOffset;
walkway.position.y = -5.0;
scene.add(walkway);

// ✅ STAKLO TUNELA — DEBLJE + “osjeti se” dok hodaš uz njega
const tunnelGlassMat = new THREE.MeshPhysicalMaterial({
  color: 0x88ddff,
  transparent: true,
  opacity: 0.085,
  transmission: 0.92,
  thickness: 1.20,
  ior: 1.50,
  roughness: 0.06,
  metalness: 0.0,
  side: THREE.DoubleSide
});
tunnelGlassMat.depthWrite = false;

// osnovni sloj
const glass = new THREE.Mesh(
  new THREE.TorusGeometry(tunnelRadius, 5.00, 48, 140, arcVal),
  tunnelGlassMat
);
glass.rotation.x = Math.PI / 2;
glass.rotation.z = rotationOffset;
glass.position.y = -5;
glass.renderOrder = 200;
scene.add(glass);

// ✅ dodatni “outer shell” sloj — daje dubinu
const tunnelGlassOuterMat = new THREE.MeshPhysicalMaterial({
  color: 0x88ddff,
  transparent: true,
  opacity: 0.040,
  transmission: 0.90,
  thickness: 0.90,
  ior: 1.48,
  roughness: 0.08,
  metalness: 0.0,
  side: THREE.DoubleSide
});
tunnelGlassOuterMat.depthWrite = false;

const glassOuter = new THREE.Mesh(
  new THREE.TorusGeometry(tunnelRadius, 5.18, 48, 140, arcVal),
  tunnelGlassOuterMat
);
glassOuter.rotation.x = Math.PI / 2;
glassOuter.rotation.z = rotationOffset;
glassOuter.position.y = -5;
glassOuter.renderOrder = 201;
scene.add(glassOuter);

// ----------------------------------------------------
// 🌊 VELIKI AKVARIJUM – LIGHT SHAFTS IZNAD TUNELA
// ----------------------------------------------------

const bigRayMat = new THREE.MeshStandardMaterial({
  color: 0x88ddff,
  transparent: true,
  opacity: 0.035,
  emissive: 0x88ddff,
  emissiveIntensity: 0.6,
  roughness: 1.0,
  metalness: 0.0,
  side: THREE.DoubleSide,
  depthWrite: false
});

const bigRaysGroup = new THREE.Group();
scene.add(bigRaysGroup);

for (let i = 0; i < 25; i++) {

  const width = rand(8, 16);
  const height = rand(80, 140);

  const geo = new THREE.PlaneGeometry(width, height);
  const ray = new THREE.Mesh(geo, bigRayMat);

  const angle = Math.random() * Math.PI * 2;
  const radius = tunnelRadius + rand(-10, 10);

  ray.position.set(
    Math.cos(angle) * radius,
    35,
    Math.sin(angle) * radius
  );

  ray.rotation.y = angle + Math.PI / 2;
  ray.rotation.x = -Math.PI / 2 + rand(-0.1, 0.1);

  bigRaysGroup.add(ray);
}


// --- PRSTENOVI ---
for (let i = rotationOffset; i <= arcVal + rotationOffset; i += Math.PI / 25) {
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(5.1, 0.1, 16, 100, Math.PI),
    new THREE.MeshStandardMaterial({ color: 0x000000 })
  );
  ring.position.set(Math.cos(i) * tunnelRadius, -5, Math.sin(i) * tunnelRadius);
  ring.rotation.y = -i;
  scene.add(ring);
}

// --- NISKI BOČNI ZIDOVI (KOMODE) ---
const wallHeight = 1.2;
const benchWallThickness = 1.5;
const distFromCenter = 4.5;
const benchMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8 });

function createSideBench(radius) {
  const geo = new THREE.TorusGeometry(radius, benchWallThickness / 2, 4, 120, arcVal);
  const mesh = new THREE.Mesh(geo, benchMat);
  mesh.rotation.x = Math.PI / 2;
  mesh.rotation.z = rotationOffset;
  mesh.position.y = -5.0 + (wallHeight / 2);
  scene.add(mesh);

  for (let j = rotationOffset; j <= arcVal + rotationOffset; j += Math.PI / 8) {
    const lightGeo = new THREE.PlaneGeometry(0.4, 0.2);
    const lightMat = new THREE.MeshStandardMaterial({
      color: 0xffcc88,
      emissive: 0xffcc88,
      emissiveIntensity: 10
    });
    const lightPlate = new THREE.Mesh(lightGeo, lightMat);

    const lightR = (radius < tunnelRadius) ? radius + 0.76 : radius - 0.76;
    lightPlate.position.set(Math.cos(j) * lightR, -4.5, Math.sin(j) * lightR);
    lightPlate.rotation.y = -j + (radius < tunnelRadius ? Math.PI : 0);
    scene.add(lightPlate);

    const pLight = new THREE.PointLight(0xffcc88, 2, 5);
    pLight.position.copy(lightPlate.position);
    scene.add(pLight);
  }
}

createSideBench(tunnelRadius - distFromCenter);
createSideBench(tunnelRadius + distFromCenter);

// --- PREDSOBLJE (LOBBY) ---
const lobby = new THREE.Group();
scene.add(lobby);

const lobbyRound = new THREE.Group();
lobby.add(lobbyRound);

const wallMat = new THREE.MeshStandardMaterial({ color: 0x000000, roughness: 1, side: THREE.DoubleSide });
const floorMat = new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.2, metalness: 0.5 });

lobby.position.x = lobbyXPos + 20;

const lobbyFloor = new THREE.Mesh(new THREE.CircleGeometry(lobbyRadius, 64), floorMat);
lobbyFloor.rotation.x = -Math.PI / 2;
lobbyFloor.position.y = -5;
lobbyRound.add(lobbyFloor);

const lobbyCeiling = lobbyFloor.clone();
lobbyCeiling.position.y = lobbyHeight - 5;
lobbyRound.add(lobbyCeiling);

// ----------------------------------------------------
// ✅ ZATVORENI CRNI PLAFON (blokira pogled na akvarijum)
// ----------------------------------------------------

const solidCeilingMat = new THREE.MeshStandardMaterial({
  color: 0x000000,
  roughness: 1.0,
  metalness: 0.0,
  side: THREE.DoubleSide
});

// Disk koji pokriva CIJELI lobby
const solidCeilingGeo = new THREE.CircleGeometry(lobbyRadius, 96);

const solidCeiling = new THREE.Mesh(solidCeilingGeo, solidCeilingMat);

// rotacija da bude horizontalno
solidCeiling.rotation.x = -Math.PI / 2;

// postavi ga MALO ISPOD postojećeg ceiling-a
// da ne dođe do z-fighting efekta
solidCeiling.position.y = lobbyCeilY - 0.01;

lobbyRound.add(solidCeiling);


// --- LOGIKA ZA PROZORE ---
const windowAngles = [0, Math.PI / 2 + 0.8, Math.PI, Math.PI * 1.5];
const windowHalfAngle = 0.35;

function isInGap(angleRad, isMiddleBand) {
  const doorCenterAngle = 1.6;
  const radiusMidForGap = lobbyRadius - 2.5 / 2;
  const doorHalfAngle = Math.atan((38 / 2 - 3.5) / radiusMidForGap);
  if (Math.abs(Math.atan2(Math.sin(angleRad - doorCenterAngle), Math.cos(angleRad - doorCenterAngle))) <= doorHalfAngle) return true;

  if (isMiddleBand) {
    for (let wAngle of windowAngles) {
      if (Math.abs(Math.atan2(Math.sin(angleRad - wAngle), Math.cos(angleRad - wAngle))) <= windowHalfAngle) return true;
    }
  }
  return false;
}

// --- ZIDOVI KRUGA ---
const wallThickness = 2.5;
const radiusMid = lobbyRadius - wallThickness / 2;

function buildWallBand(yStart, bandH, isMiddleBand) {
  const segs = 300;
  const dTheta = (Math.PI * 2) / segs;

  for (let i = 0; i < segs; i++) {
    const theta0 = i * dTheta;
    const thetaMid = theta0 + dTheta / 2;

    if (isInGap(thetaMid, isMiddleBand)) continue;

    const geo = new THREE.CylinderGeometry(radiusMid, radiusMid, bandH, 12, 1, true, theta0, dTheta);
    const mesh = new THREE.Mesh(geo, wallMat);
    mesh.position.y = (-5 + yStart) + bandH / 2;
    lobbyRound.add(mesh);
  }
}

buildWallBand(0, 1.5, false);
buildWallBand(1.5, 8.0, true);
buildWallBand(9.5, 5.5, false);

// ✅ ISTO STAKLO KAO TUNEL/PROZORI
const realGlassMat = new THREE.MeshStandardMaterial({
  color: 0x88ddff,
  transparent: true,
  opacity: 0.15,
  side: THREE.DoubleSide
});
realGlassMat.depthWrite = false;

// Prozori
windowAngles.forEach(angle => {
  const paneGeo = new THREE.CylinderGeometry(
    lobbyRadius - 1.0, lobbyRadius - 1.0, 8.0,
    32, 1, true,
    angle - windowHalfAngle, windowHalfAngle * 2
  );
  const pane = new THREE.Mesh(paneGeo, realGlassMat);
  pane.position.y = -5 + 1.5 + 4.0;
  pane.renderOrder = 5;
  lobbyRound.add(pane);
});

lobbyRound.position.x += 4;



// ✅ CENTRALNI CILINDAR — ISTO STAKLO + CIJELOM VISINOM LOBIJA
const lobbyCenterLocalX = lobbyRound.position.x; // 4

const tankHeight = (lobbyCeilY - lobbyFloorY) - 0.02;
const tankY = (lobbyFloorY + lobbyCeilY) / 2;

const tankGlassGeo = new THREE.CylinderGeometry(tankRadius, tankRadius, tankHeight, 96, 1, true);
const tankGlass = new THREE.Mesh(tankGlassGeo, realGlassMat);
tankGlass.position.set(lobbyCenterLocalX, tankY, 0);
tankGlass.renderOrder = 10;
lobbyRound.add(tankGlass);

// ✅ BAZA
const baseMat = new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.35, metalness: 0.2 });

const baseGeo = new THREE.CylinderGeometry(tankRadius + 1.0, tankRadius + 1.0, baseHeight, 96);
const tankBase = new THREE.Mesh(baseGeo, baseMat);
tankBase.position.set(lobbyCenterLocalX, lobbyFloorY + baseHeight / 2, 0);
lobbyRound.add(tankBase);

// ----------------------------------------------------
// 🪸 CENTRAL PNG GREBEN - 360° VOLUMEN
// ----------------------------------------------------

const reefTexture = new THREE.TextureLoader().load('/textures/ocean-waves-transparent-background-png.png');

reefTexture.colorSpace = THREE.SRGBColorSpace;
reefTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();

const reefMaterial = new THREE.MeshStandardMaterial({
  map: reefTexture,
  transparent: true,
  alphaTest: 0.25,
  side: THREE.DoubleSide,
  roughness: 1.0,
  metalness: 0.0,
  depthWrite: false
});

const reefGroup = new THREE.Group();

// veličina grebena
const REEF_WIDTH = 18;
const REEF_HEIGHT = 18.5;

// napravimo više plane-ova u krug
const segments = 8; // više = deblje izgleda

for (let i = 0; i < segments; i++) {

  const geo = new THREE.PlaneGeometry(REEF_WIDTH, REEF_HEIGHT);
  const mesh = new THREE.Mesh(geo, reefMaterial);

  const angle = (i / segments) * Math.PI * 2;
  mesh.rotation.y = angle;

  reefGroup.add(mesh);
}

// postavi tačno u centar cilindra
reefGroup.position.set(
  lobbyCenterLocalX,
  sandY + REEF_HEIGHT / 2 - 4,
  0
);

lobbyRound.add(reefGroup);


// Rim
const rimMat = new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.25, metalness: 0.25 });
const rimHeight = 0.35;
const rimGeo = new THREE.CylinderGeometry(tankRadius + 0.9, tankRadius + 0.9, rimHeight, 96);
const tankRim = new THREE.Mesh(rimGeo, rimMat);
tankRim.position.set(lobbyCenterLocalX, lobbyCeilY - rimHeight / 2, 0);
lobbyRound.add(tankRim);

// -------------------------------
// ✅ VODA U CILINDRIČNOM AKVARIJUMU
// -------------------------------
const waterRadius = tankRadius - 0.28;
const waterHeight = tankHeight - 0.45;
const waterY = tankY + 0.02;

const waterMat = new THREE.MeshPhysicalMaterial({
  color: 0x2e6fae,
  transparent: true,
  opacity: 0.22,
  transmission: 0.88,
  thickness: 1.25,
  ior: 1.333,
  roughness: 0.06,
  metalness: 0.0,
  side: THREE.DoubleSide
});
waterMat.depthWrite = false;

const waterGeo = new THREE.CylinderGeometry(waterRadius, waterRadius, waterHeight, 120, 1, true);
const water = new THREE.Mesh(waterGeo, waterMat);
water.position.set(lobbyCenterLocalX, waterY, 0);
water.renderOrder = 7;
lobbyRound.add(water);

// haze
const hazeMat = new THREE.MeshStandardMaterial({
  color: 0x88ddff,
  transparent: true,
  opacity: 0.065,
  roughness: 1.0,
  metalness: 0.0,
  side: THREE.DoubleSide
});
hazeMat.depthWrite = false;

const hazeGeo = new THREE.CylinderGeometry(waterRadius - 0.10, waterRadius - 0.10, waterHeight - 0.2, 120, 1, true);
const haze = new THREE.Mesh(hazeGeo, hazeMat);
haze.position.set(lobbyCenterLocalX, waterY, 0);
haze.renderOrder = 8;
lobbyRound.add(haze);

// surface
const surfaceMat = new THREE.MeshPhysicalMaterial({
  color: 0x5aa6d6,
  transparent: true,
  opacity: 0.12,
  transmission: 0.92,
  thickness: 0.6,
  ior: 1.333,
  roughness: 0.03,
  metalness: 0.0,
  side: THREE.DoubleSide
});
surfaceMat.depthWrite = false;

const waterTopY = waterY + waterHeight / 2 - 0.08;
const surfaceGeo = new THREE.CircleGeometry(waterRadius - 0.15, 96);
const surface = new THREE.Mesh(surfaceGeo, surfaceMat);
surface.rotation.x = -Math.PI / 2;
surface.position.set(lobbyCenterLocalX, waterTopY, 0);
surface.renderOrder = 9;
lobbyRound.add(surface);

// -------------------------------
// ✅ LIGHT RAYS
// -------------------------------
const rayMat = new THREE.MeshStandardMaterial({
  color: 0x88ddff,
  transparent: true,
  opacity: 0.045,
  emissive: 0x88ddff,
  emissiveIntensity: 0.55,
  roughness: 1.0,
  metalness: 0.0,
  side: THREE.DoubleSide,
  depthWrite: false
});

const raysGroup = new THREE.Group();
raysGroup.position.set(lobbyCenterLocalX, 0, 0);
lobbyRound.add(raysGroup);

for (let i = 0; i < 10; i++) {
  const w = rand(1.6, 2.6);
  const h = waterHeight * rand(0.75, 0.95);
  const geo = new THREE.PlaneGeometry(w, h);
  const m = new THREE.Mesh(geo, rayMat);
  const ang = (i / 10) * Math.PI * 2 + rand(-0.2, 0.2);
  const r = rand(0.0, waterRadius * 0.55);
  m.position.set(Math.cos(ang) * r, waterY, Math.sin(ang) * r);
  m.rotation.y = ang + Math.PI / 2;
  m.renderOrder = 6;
  raysGroup.add(m);
}

// -------------------------------
// 🌊 POD UNUTAR CILINDRIČNOG AKVARIJUMA (TEKSTURA PIJESKA)
// -------------------------------
const sandTexture = textureLoader.load('/textures/a21e80b3c42d713275cea892d54c96a5.jpg');

sandTexture.colorSpace = THREE.SRGBColorSpace;
sandTexture.wrapS = THREE.RepeatWrapping;
sandTexture.wrapT = THREE.RepeatWrapping;
sandTexture.repeat.set(4, 4);
sandTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();

const tankSandMat = new THREE.MeshStandardMaterial({
  map: sandTexture,
  roughness: 1.0,
  metalness: 0.0,
  side: THREE.DoubleSide
});

const tankSandGeo = new THREE.CircleGeometry(tankRadius - 0.6, 96);
const tankSand = new THREE.Mesh(tankSandGeo, tankSandMat);
tankSand.rotation.x = -Math.PI / 2;
tankSand.position.set(lobbyCenterLocalX, sandY, 0);
tankSand.renderOrder = 50;
lobbyRound.add(tankSand);

// ✅ DODATO: tank relief + tank patches (sad kad lobbyRound postoji)
const tankRelief = new THREE.Mesh(
  new THREE.CircleGeometry(tankRadius - 0.62, 96),
  tankReliefMat
);
tankRelief.rotation.x = -Math.PI / 2;
tankRelief.position.set(lobbyCenterLocalX, sandY + 0.028, 0);
tankRelief.renderOrder = 52;
lobbyRound.add(tankRelief);

const tankPatch = new THREE.Mesh(
  new THREE.CircleGeometry(tankRadius - 0.64, 96),
  tankPatchMat
);
tankPatch.rotation.x = -Math.PI / 2;
tankPatch.position.set(lobbyCenterLocalX, sandY + 0.032, 0);
tankPatch.renderOrder = 53;
lobbyRound.add(tankPatch);

// ✅ malo dodatnog svjetla samo za tank
const tankFill = new THREE.PointLight(0x88ddff, 12, 90);
tankFill.position.set(lobbyCenterLocalX, lobbyFloorY + 6.0, 0);
lobby.add(tankFill);

// -------------------------------
// ✅ CAUSTICS (procedural)
// -------------------------------
function makeCausticsTexture() {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 512;
  const ctx = c.getContext('2d');

  ctx.fillStyle = 'rgba(0,0,0,1)';
  ctx.fillRect(0, 0, c.width, c.height);

  for (let i = 0; i < 220; i++) {
    const x = Math.random() * c.width;
    const y = Math.random() * c.height;
    const r = 18 + Math.random() * 95;

    const g = ctx.createRadialGradient(x, y, r * 0.1, x, y, r);
    g.addColorStop(0.0, 'rgba(180,240,255,0.25)');
    g.addColorStop(0.35, 'rgba(120,220,255,0.08)');
    g.addColorStop(1.0, 'rgba(0,0,0,0.0)');

    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.globalCompositeOperation = 'screen';
  for (let k = 0; k < 8; k++) {
    ctx.globalAlpha = 0.12;
    ctx.drawImage(c, (Math.random() - 0.5) * 14, (Math.random() - 0.5) * 14);
  }
  ctx.globalAlpha = 1.0;
  ctx.globalCompositeOperation = 'source-over';

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2.4, 2.4);
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return tex;
}

const causticsTex = makeCausticsTexture();
const causticsMat = new THREE.MeshStandardMaterial({
  map: causticsTex,
  transparent: true,
  opacity: 0.38,
  emissive: new THREE.Color(0x88ddff),
  emissiveIntensity: 0.65,
  roughness: 1.0,
  metalness: 0.0,
  side: THREE.DoubleSide,
  depthWrite: false
});

const causticsGeo = new THREE.CircleGeometry(tankRadius - 1.15, 96);
const caustics = new THREE.Mesh(causticsGeo, causticsMat);
caustics.rotation.x = -Math.PI / 2;
caustics.position.set(lobbyCenterLocalX, sandY + 0.08, 0);
caustics.renderOrder = 60;
lobbyRound.add(caustics);

// -------------------------------
// ✅ PLANKTON
// -------------------------------
function makePlanktonTexture() {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 64;
  const ctx = c.getContext('2d');

  ctx.clearRect(0, 0, 64, 64);
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 18);
  g.addColorStop(0.0, 'rgba(255,255,255,0.75)');
  g.addColorStop(0.35, 'rgba(170,230,255,0.30)');
  g.addColorStop(1.0, 'rgba(255,255,255,0.0)');

  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(32, 32, 18, 0, Math.PI * 2);
  ctx.fill();

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const plankTex = makePlanktonTexture();
const plankMat = new THREE.PointsMaterial({
  map: plankTex,
  transparent: true,
  opacity: 0.22,
  size: 0.10,
  sizeAttenuation: true,
  depthWrite: false
});

const PLANK_COUNT = 700;
const plankGeo = new THREE.BufferGeometry();
const plankPos = new Float32Array(PLANK_COUNT * 3);
const plankVel = new Float32Array(PLANK_COUNT * 3);
const plankPhase = new Float32Array(PLANK_COUNT);

const plankYMin = sandY + 0.35;
const plankYMax = waterTopY - 0.25;
const plankRMax = tankRadius - 2.05;

for (let i = 0; i < PLANK_COUNT; i++) {
  const a = Math.random() * Math.PI * 2;
  const r = Math.sqrt(Math.random()) * plankRMax;

  plankPos[i * 3 + 0] = Math.cos(a) * r;
  plankPos[i * 3 + 1] = rand(plankYMin, plankYMax);
  plankPos[i * 3 + 2] = Math.sin(a) * r;

  plankVel[i * 3 + 0] = rand(-0.0022, 0.0022);
  plankVel[i * 3 + 1] = rand(0.0003, 0.0020);
  plankVel[i * 3 + 2] = rand(-0.0022, 0.0022);

  plankPhase[i] = Math.random() * Math.PI * 2;
}

plankGeo.setAttribute('position', new THREE.BufferAttribute(plankPos, 3));
const plankton = new THREE.Points(plankGeo, plankMat);
plankton.position.set(lobbyCenterLocalX, 0, 0);
plankton.renderOrder = 12;
lobbyRound.add(plankton);

// -------------------------------
// ✅ BUBBLES
// -------------------------------
function makeBubbleTexture() {
  const c = document.createElement('canvas');
  c.width = 128; c.height = 128;
  const ctx = c.getContext('2d');

  const g = ctx.createRadialGradient(64, 64, 6, 64, 64, 60);
  g.addColorStop(0.0, 'rgba(255,255,255,0.35)');
  g.addColorStop(0.45, 'rgba(180,230,255,0.14)');
  g.addColorStop(1.0, 'rgba(255,255,255,0.0)');

  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(64, 64, 60, 0, Math.PI * 2);
  ctx.fill();

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const bubbleTex = makeBubbleTexture();
const bubbleMat = new THREE.PointsMaterial({
  map: bubbleTex,
  transparent: true,
  opacity: 0.55,
  size: 0.55,
  sizeAttenuation: true,
  depthWrite: false
});

const BUBBLE_COUNT = 140;
const bubbleGeo = new THREE.BufferGeometry();
const bubblePos = new Float32Array(BUBBLE_COUNT * 3);
const bubbleSpeed = new Float32Array(BUBBLE_COUNT);
const bubblePhase = new Float32Array(BUBBLE_COUNT);

const bubbleYMin = sandY + 0.6;
const bubbleYMax = waterTopY - 0.35;
const bubbleRMax = tankRadius - 2.0;

for (let i = 0; i < BUBBLE_COUNT; i++) {
  const a = Math.random() * Math.PI * 2;
  const r = Math.sqrt(Math.random()) * bubbleRMax;

  bubblePos[i * 3 + 0] = Math.cos(a) * r;
  bubblePos[i * 3 + 1] = rand(bubbleYMin, bubbleYMax);
  bubblePos[i * 3 + 2] = Math.sin(a) * r;

  bubbleSpeed[i] = rand(0.015, 0.05);
  bubblePhase[i] = Math.random() * Math.PI * 2;
}

bubbleGeo.setAttribute('position', new THREE.BufferAttribute(bubblePos, 3));
const bubbles = new THREE.Points(bubbleGeo, bubbleMat);
bubbles.position.set(lobbyCenterLocalX, 0, 0);
bubbles.renderOrder = 11;
lobbyRound.add(bubbles);

// -------------------------------
// 🐠 NEMO RIBE (30)
// -------------------------------
const nemoTex = textureLoader.load('/textures/pngtree-isolated-nemo-fishon-on-white-background-png-image_6747290.png');
nemoTex.colorSpace = THREE.SRGBColorSpace;
nemoTex.anisotropy = renderer.capabilities.getMaxAnisotropy();

const nemoMat = new THREE.MeshStandardMaterial({
  map: nemoTex,
  transparent: true,
  alphaTest: 0.15,
  side: THREE.DoubleSide,
  roughness: 1.0,
  metalness: 0.0
});
nemoMat.depthWrite = false;

const fishGroup = new THREE.Group();
fishGroup.position.set(lobbyCenterLocalX, 0, 0);
lobbyRound.add(fishGroup);

const FISH_COUNT = 30;

const fishRadiusMin = 5.9;
const fishRadiusMax = tankRadius - 2.2;
const fishYMin = sandY + 1.6;
const fishYMax = lobbyCeilY - 2.2;

const fishW = 1.25;
const fishH = 0.75;

function makeThickFish() {
  const g = new THREE.Group();

  const p1 = new THREE.Mesh(new THREE.PlaneGeometry(fishW, fishH), nemoMat);
  const p2 = new THREE.Mesh(new THREE.PlaneGeometry(fishW, fishH), nemoMat);

  p1.position.z = 0.02;
  p2.position.z = -0.02;
  p2.rotation.y = Math.PI / 2;

  p1.renderOrder = 96;
  p2.renderOrder = 96;

  g.add(p1, p2);
  g.up.set(0, 1, 0);
  g.rotation.order = 'YXZ';
  return g;
}

const fishes = [];
let fishT = 0;
const reefSafeRadius = 5.8;

for (let i = 0; i < FISH_COUNT; i++) {
  const obj = makeThickFish();

  const angle = Math.random() * Math.PI * 2;
  const baseR = rand(fishRadiusMin, fishRadiusMax);
  const yBase = rand(fishYMin, fishYMax);

  obj.position.set(Math.cos(angle) * baseR, yBase, Math.sin(angle) * baseR);

  const s = rand(1.55, 1.85);
  obj.scale.set(s, s, s);

  const dir = Math.random() < 0.5 ? -1 : 1;
  const speed = rand(0.0045, 0.0105);

  fishes.push({
    obj,
    angle,
    dir,
    speed,

    baseR,
    rAmp: rand(0.20, 0.75),
    rFreq: rand(0.45, 1.10),

    yBase,
    yAmp: rand(0.08, 0.28),
    yFreq: rand(0.55, 1.35),

    phase: Math.random() * Math.PI * 2
  });

  fishGroup.add(obj);
}

// -------------------------------
// ✅ KOLIZIJA: CENTRALNI CILINDAR
// -------------------------------
const tankCollisionBuffer = 0.35;
const _tankCenterWorld = new THREE.Vector3();

function collidesWithCenterTank(pos) {
  tankGlass.getWorldPosition(_tankCenterWorld);

  const dx = pos.x - _tankCenterWorld.x;
  const dz = pos.z - _tankCenterWorld.z;
  const d = Math.sqrt(dx * dx + dz * dz);

  return d < (tankRadius + tankCollisionBuffer);
}

// ---------------------------------------------------
// ✅ VRATA NA KRAJU TUNELA
// ---------------------------------------------------
const tunnelCenterY = -5;
const exitTheta = Math.PI;

const exitCenterline = new THREE.Vector3(
  Math.cos(exitTheta) * tunnelRadius,
  tunnelCenterY + 2.6,
  Math.sin(exitTheta) * tunnelRadius
);

const inwardDir = new THREE.Vector3(-Math.cos(exitTheta), 0, -Math.sin(exitTheta)).normalize();
const doorInsetIntoTube = 320;
const exitDoorPos = exitCenterline.clone().addScaledVector(inwardDir, doorInsetIntoTube);

const doorMetalMat = new THREE.MeshStandardMaterial({
  color: 0xdcdcdc,
  roughness: 0.35,
  metalness: 0.3
});

const doorGlowMat = new THREE.MeshStandardMaterial({
  color: 0x1b2635,
  emissive: 0x88ddff,
  emissiveIntensity: 2.2,
  roughness: 0.2,
  metalness: 0.0
});

const exitDoorGroup = new THREE.Group();
exitDoorGroup.position.copy(exitDoorPos);
exitDoorGroup.lookAt(exitCenterline.x, exitDoorPos.y, exitCenterline.z);

const doorW = 6.4;
const doorH = 4.6;
const doorT = 0.25;

const frameGeo = new THREE.BoxGeometry(doorW + 0.55, doorH + 0.45, 0.35);
const frame = new THREE.Mesh(frameGeo, doorMetalMat);
exitDoorGroup.add(frame);

const leafGeo = new THREE.BoxGeometry((doorW / 2) - 0.25, doorH, doorT);

const leftLeaf = new THREE.Mesh(leafGeo, doorMetalMat);
leftLeaf.position.x = -doorW * 0.25;
exitDoorGroup.add(leftLeaf);

const rightLeaf = new THREE.Mesh(leafGeo, doorMetalMat);
rightLeaf.position.x = doorW * 0.25;
exitDoorGroup.add(rightLeaf);

const handleGeo = new THREE.CylinderGeometry(0.07, 0.07, 1.2, 16);

const leftHandle = new THREE.Mesh(handleGeo, doorMetalMat);
leftHandle.rotation.z = Math.PI / 2;
leftHandle.position.set(-0.38, 0, 0.22);
exitDoorGroup.add(leftHandle);

const rightHandle = new THREE.Mesh(handleGeo, doorMetalMat);
rightHandle.rotation.z = Math.PI / 2;
rightHandle.position.set(0.38, 0, 0.22);
exitDoorGroup.add(rightHandle);

const topGlowGeo = new THREE.BoxGeometry(3.8, 0.22, 0.12);
const topGlow = new THREE.Mesh(topGlowGeo, doorGlowMat);
topGlow.position.set(0, doorH / 2 + 0.35, 0.25);
exitDoorGroup.add(topGlow);

function makeExitPanelTexture() {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 256;
  const ctx = c.getContext('2d');

  ctx.fillStyle = '#c0c0c0c7';
  ctx.fillRect(0, 0, c.width, c.height);

  ctx.lineWidth = 18;
  ctx.strokeStyle = 'rgba(2, 89, 23, 0.95)';
  ctx.strokeRect(18, 18, c.width - 36, c.height - 36);

  ctx.font = 'bold 150px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#0e4103';
  ctx.fillText('EXIT', c.width / 2, c.height / 2 + 6);

  ctx.beginPath();
  ctx.moveTo(c.width - 120, c.height / 2);
  ctx.lineTo(c.width - 70, c.height / 2 - 35);
  ctx.lineTo(c.width - 70, c.height / 2 + 35);
  ctx.closePath();
  ctx.fill();

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const exitPanelTex = makeExitPanelTexture();
const exitPanelMat = new THREE.MeshStandardMaterial({
  map: exitPanelTex,
  transparent: false,
  emissive: new THREE.Color(0x0e4103),
  emissiveIntensity: 0.8,
  side: THREE.DoubleSide
});

const exitPanelGeo = new THREE.PlaneGeometry(4.6, 1.55);
const exitPanel = new THREE.Mesh(exitPanelGeo, exitPanelMat);
exitPanel.position.set(0, doorH / 2 + 1.35, 0.28);
exitDoorGroup.add(exitPanel);

const doorSpot = new THREE.SpotLight(0x88ddff, 18, 28, 0.85, 0.6, 2);
doorSpot.position.set(0, doorH / 2 + 1.6, 5.5);
doorSpot.target.position.set(0, 0, 0);
exitDoorGroup.add(doorSpot);
exitDoorGroup.add(doorSpot.target);

scene.add(exitDoorGroup);

const doorBlockRadius = 6.2;
const doorBlockBuffer = 1.0;

function collidesWithExitDoor(pos) {
  const doorWorld = new THREE.Vector3();
  exitDoorGroup.getWorldPosition(doorWorld);

  const dx = pos.x - doorWorld.x;
  const dz = pos.z - doorWorld.z;
  const d = Math.sqrt(dx * dx + dz * dz);

  return d < (doorBlockRadius - doorBlockBuffer);
}

// --- HODNIK ---
const hallLength = connectorLen;
const hallWidth = lobbyWidth;
const hallHeight = lobbyHeight;
const hallXStart = lobbyRadius;

const hallFloor = new THREE.Mesh(new THREE.PlaneGeometry(hallLength, hallWidth), floorMat);
hallFloor.rotation.x = -Math.PI / 2;
hallFloor.position.set(hallXStart + hallLength / 2, -5, 0);
lobby.add(hallFloor);

const hallCeiling = hallFloor.clone();
hallCeiling.position.y = hallHeight - 5;
lobby.add(hallCeiling);

// ----------------------------------
// ✅ CRNI ZATVORENI PLAFON HODNIKA
// ----------------------------------

const hallBlackCeilingMat = new THREE.MeshStandardMaterial({
  color: 0x000000,
  roughness: 1.0,
  metalness: 0.0,
  side: THREE.DoubleSide
});

const hallBlackCeiling = new THREE.Mesh(
  new THREE.PlaneGeometry(hallLength, hallWidth),
  hallBlackCeilingMat
);

hallBlackCeiling.rotation.x = -Math.PI / 2;
hallBlackCeiling.position.set(
  hallXStart + hallLength / 2,
  hallHeight - 5 + 0.01, 
  0
);

lobby.add(hallBlackCeiling);


function createSideWall(zPos) {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.lineTo(hallLength, 0);
  shape.lineTo(hallLength, hallHeight);
  shape.lineTo(0, hallHeight);
  shape.closePath();

  const hole = new THREE.Path();
  hole.absarc(hallLength / 2, tunnelCenterY + 5.5, 4.5, 0, Math.PI * 2);
  shape.holes.push(hole);

  const geom = new THREE.ShapeGeometry(shape);
  const wall = new THREE.Mesh(geom, wallMat);
  wall.position.set(hallXStart, -5.5, zPos);
  return wall;
}

lobby.add(createSideWall(hallWidth / 2));
lobby.add(createSideWall(-hallWidth / 2));

const exitWall = new THREE.Mesh(new THREE.PlaneGeometry(hallWidth, hallHeight), wallMat);
exitWall.position.set(hallXStart + hallLength, hallHeight / 2 - 5, 0);
exitWall.rotation.y = Math.PI / 2;
lobby.add(exitWall);

// --- OSVJETLJENJE ---
scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 2));
scene.add(new THREE.AmbientLight(0xffffff, 0.3));

// ----------------------------------------------------
// 💡 CINEMATIC WATER LIGHT BOOST
// ----------------------------------------------------

const waterFillLight = new THREE.PointLight(0x66ccff, 18, 800);
waterFillLight.position.set(0, 40, 0);
scene.add(waterFillLight);

const deepLight = new THREE.PointLight(0x224488, 12, 1200);
deepLight.position.set(-300, 60, -300);
scene.add(deepLight);


const lobbyAmbient = new THREE.AmbientLight(0x88ddff, 0.12);
lobby.add(lobbyAmbient);

const ceilingLampMat = new THREE.MeshStandardMaterial({
  color: 0x0a0f14,
  emissive: 0x88ddff,
  emissiveIntensity: 2.6,
  roughness: 0.2,
  metalness: 0.0,
  side: THREE.DoubleSide,
  transparent: true,
  opacity: 1.0
});

function addCeilingPanelLight(px, pz, intensity) {
  const panelGeo = new THREE.PlaneGeometry(6.5, 2.2);
  const panel = new THREE.Mesh(panelGeo, ceilingLampMat);
  panel.position.set(px, lobbyCeilY - 0.08, pz);
  panel.rotation.x = Math.PI / 2;
  lobby.add(panel);

  const spot = new THREE.SpotLight(0x88ddff, intensity, 260, 0.85, 0.78, 2);
  spot.position.set(px, lobbyCeilY + 0.9, pz);
  spot.target.position.set(px, lobbyFloorY, pz);
  lobby.add(spot);
  lobby.add(spot.target);
}

addCeilingPanelLight(lobbyCenterLocalX, 0, 85);

const panelRingR = 20;
for (let k = 0; k < 6; k++) {
  const a = (k / 6) * Math.PI * 2;
  const px = lobbyCenterLocalX + Math.cos(a) * panelRingR;
  const pz = Math.sin(a) * panelRingR;
  addCeilingPanelLight(px, pz, 48);
}

windowAngles.forEach((angle) => {
  const x = lobbyCenterLocalX + Math.cos(angle) * (lobbyRadius + 8);
  const z = Math.sin(angle) * (lobbyRadius + 8);

  const s = new THREE.SpotLight(0x88ddff, 55, 280, 0.95, 0.86, 2);
  s.position.set(x, lobbyCeilY + 1.0, z);
  s.target.position.set(lobbyCenterLocalX, lobbyFloorY, 0);

  lobby.add(s);
  lobby.add(s.target);
});

// --- KAMERA ---
camera.position.set(lobbyXPos, -3.5, 0);

// --- KONTROLE ---
const keys = {};
window.addEventListener('keydown', e => keys[e.code] = true);
window.addEventListener('keyup', e => keys[e.code] = false);

// -------------------------------
// ✅ KOLIZIJA SA STAKLOM TUNELA
// -------------------------------
const tunnelY = -5;
const tunnelInnerWalkRadius = 4.0;
const tunnelCollisionBuffer = 0.10;

function normalizeAngle(a) {
  a = (a + Math.PI) % (Math.PI * 2);
  if (a < 0) a += Math.PI * 2;
  return a - Math.PI;
}

function isInTunnelGap(theta) {
  const t = normalizeAngle(theta);
  return Math.abs(t) <= (gapAngle / 2 + 0.03);
}

function collidesWithTunnelGlass(pos) {
  const theta = Math.atan2(pos.z, pos.x);
  if (isInTunnelGap(theta)) return false;

  const r = Math.sqrt(pos.x * pos.x + pos.z * pos.z);
  const dy = pos.y - tunnelY;

  const distToCenterline = Math.sqrt((r - tunnelRadius) * (r - tunnelRadius) + dy * dy);
  return distToCenterline > (tunnelInnerWalkRadius - tunnelCollisionBuffer);
}

let t = 0;

const baseGlassOpacity = 0.085;
const baseOuterOpacity = 0.040;

const SHARK_TEXTURES = [
  '/textures/lsh.png',
  '/textures/zsh.png',
  '/textures/sshh.png',
  '/textures/sht.png',
  '/textures/rsh.png',
'/textures/bsh.png'
];

const sharks = [];
const sharkGroup = new THREE.Group();
scene.add(sharkGroup);

const SHARK_COUNT = 13;

function createShark(tex) {

  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();

  const group = new THREE.Group();

  const bodyLayers = 15;      // 🔥 još deblje
  const totalThickness = 0.55;

  const geo = new THREE.PlaneGeometry(18, 8, 1, 10);

  for (let i = 0; i < bodyLayers; i++) {

    const depthOffset = (i - bodyLayers / 2) * (totalThickness / bodyLayers);

    const mat = new THREE.MeshStandardMaterial({
      map: tex,
      transparent: true,
      alphaTest: 0.4,
      side: THREE.DoubleSide,
      roughness: 0.55,
      metalness: 0.05,
      depthWrite: false
    });

    mat.onBeforeCompile = (shader) => {

      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <output_fragment>',
        `
        vec2 centeredUV = vUv - 0.5;
        float radial = length(centeredUV);

        // 🔹 Soft edge fade (uklanja oštru ivicu PNG-a)
        float edgeFade = smoothstep(0.6, 1.0, radial);
        gl_FragColor.a *= (1.0 - edgeFade);

        // 🔹 Darker belly (realna morska gradacija)
        float belly = smoothstep(-0.5, 0.5, vUv.y);
        gl_FragColor.rgb *= mix(0.7, 1.05, belly);

        // 🔹 Fake subsurface scattering
        float sss = pow(1.0 - radial, 2.0);
        gl_FragColor.rgb += vec3(0.08, 0.12, 0.15) * sss;

        // 🔹 dorsal highlight (gornji sjaj)
        float highlight = smoothstep(0.3, 0.0, abs(vUv.y - 0.2));
        gl_FragColor.rgb += highlight * 0.12;

        #include <output_fragment>
        `
      );
    };

    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.z = depthOffset;
    group.add(mesh);
  }

  // 🔥 Realistična sjena ispod
  const shadowGeo = new THREE.CircleGeometry(4.8, 40);
  const shadowMat = new THREE.MeshBasicMaterial({
    color: 0x000000,
    transparent: true,
    opacity: 0.28,
    depthWrite: false
  });

  const shadow = new THREE.Mesh(shadowGeo, shadowMat);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = -4.9;
  shadow.scale.set(1.3, 0.65, 1);

  group.add(shadow);

  return group;
}


loadTextureList(SHARK_TEXTURES, (texList) => {

  for (let i = 0; i < SHARK_COUNT; i++) {

    const texObj = texList[i % texList.length];
    const shark = createShark(texObj.tex);

    // --- SIZE HIERARCHY ---
    let size, speed, depth;

    const r = Math.random();

    if (r < 0.3) {
      size = 4.5 + Math.random() * 1.2;   // velike
      speed = 0.035 + Math.random() * 0.01;
      depth = 15 + Math.random() * 10;
    }
    else if (r < 0.7) {
      size = 3.0 + Math.random() * 1.0;   // srednje
      speed = 0.045 + Math.random() * 0.01;
      depth = 30 + Math.random() * 15;
    }
    else {
      size = 2.0 + Math.random() * 0.8;   // manje
      speed = 0.055 + Math.random() * 0.015;
      depth = 45 + Math.random() * 15;
    }

    shark.scale.setScalar(size);

    shark.position.set(
      (Math.random() - 0.5) * 1200,
      depth,
      (Math.random() - 0.5) * 1200
    );

 shark.userData = {
velocity: new THREE.Vector3(
(Math.random() - 0.5),
 (Math.random() - 0.5) * 0.2,
 (Math.random() - 0.5)
).normalize().multiplyScalar(speed),
size
 };

 sharkGroup.add(shark);
 sharks.push(shark);
 }
});

// ------------------------------------------------
// 🐟 ULTRA REALISTIC FISH SYSTEM
// ------------------------------------------------

const FISH_TEXTURES = [
  '/textures/ef.png',
  '/textures/bf.png',
  '/textures/lf.png',
  '/textures/tf.png'
];

const ultraFishGroup = new THREE.Group();
scene.add(ultraFishGroup);

const ultraFishes = [];
const ULTRA_FISH_COUNT = 80; // više riba

function createUltraFish(tex) {

  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();

  const group = new THREE.Group();

  const bodyLayers = 13;          // debljina
  const totalThickness = 0.45;    // ukupna širina volumena

  const bodyGeo = new THREE.PlaneGeometry(14, 7, 1, 8);

  for (let i = 0; i < bodyLayers; i++) {

    const depthOffset = (i - bodyLayers / 2) * (totalThickness / bodyLayers);

    const mat = new THREE.MeshStandardMaterial({
      map: tex,
      transparent: true,
      alphaTest: 0.35,
      side: THREE.DoubleSide,
      roughness: 0.55,
      metalness: 0.05,
      depthWrite: false
    });

    mat.onBeforeCompile = (shader) => {

      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <output_fragment>',
        `
        vec2 centeredUV = vUv - 0.5;
        float radial = length(centeredUV);

        // 🔹 soft ivice (nema kartonskog PNG-a)
        float edgeFade = smoothstep(0.65, 1.0, radial);
        gl_FragColor.a *= (1.0 - edgeFade);

        // 🔹 gornja zona svjetlija, stomak tamniji
        float verticalGrad = smoothstep(0.0, 1.0, vUv.y);
        gl_FragColor.rgb *= mix(0.75, 1.05, verticalGrad);

        // 🔹 fake subsurface scattering
        float sss = pow(1.0 - radial, 2.2);
        gl_FragColor.rgb += vec3(0.06, 0.1, 0.12) * sss;

        // 🔹 central highlight (riblje tijelo je ovalno)
        float centerGlow = smoothstep(0.45, 0.0, radial);
        gl_FragColor.rgb += centerGlow * 0.08;

        #include <output_fragment>
        `
      );
    };

    const layer = new THREE.Mesh(bodyGeo, mat);
    layer.position.z = depthOffset;
    group.add(layer);
  }

  // 🔥 REALISTIČAN REP (posebno volumenski)
  const tailLayers = 7;
  const tailGeo = new THREE.PlaneGeometry(6, 6, 1, 6);

  for (let i = 0; i < tailLayers; i++) {

    const depthOffset = (i - tailLayers / 2) * 0.25;

    const tailMat = new THREE.MeshStandardMaterial({
      map: tex,
      transparent: true,
      alphaTest: 0.35,
      side: THREE.DoubleSide,
      roughness: 0.65,
      metalness: 0.0,
      depthWrite: false
    });

    const tail = new THREE.Mesh(tailGeo, tailMat);
    tail.position.set(0, 0, -7 + depthOffset);

    group.add(tail);

    if (i === Math.floor(tailLayers / 2)) {
      group.userData.tail = tail;  // centralni rep za animaciju
    }
  }

  // 🔥 volumetric shadow ispod
  const shadowGeo = new THREE.CircleGeometry(3.2, 32);
  const shadowMat = new THREE.MeshBasicMaterial({
    color: 0x000000,
    transparent: true,
    opacity: 0.22,
    depthWrite: false
  });

  const shadow = new THREE.Mesh(shadowGeo, shadowMat);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = -4.9;
  shadow.scale.set(1.2, 0.6, 1);

  group.add(shadow);

  return group;
}


loadTextureList(FISH_TEXTURES, (texList) => {

  for (let i = 0; i < ULTRA_FISH_COUNT; i++) {

    const texObj = texList[i % texList.length];
    const fish = createUltraFish(texObj.tex);

    let size;
const r = Math.random();

if (r < 0.3) {
  size = 1.5 + Math.random() * 0.4; // male
} else if (r < 0.7) {
  size = 2.3 + Math.random() * 0.6; // srednje
} else {
  size = 3.2 + Math.random() * 0.5; // velike
}

fish.scale.setScalar(size);


    fish.position.set(
      (Math.random() - 0.5) * 1200,
      20 + Math.random() * 45,
      (Math.random() - 0.5) * 1200
    );

    ultraFishGroup.add(fish);

    ultraFishes.push({
      mesh: fish,
      velocity: new THREE.Vector3(
        Math.random() - 0.5,
        (Math.random() - 0.5) * 0.2,
        Math.random() - 0.5
      ).normalize().multiplyScalar(0.4 + Math.random() * 0.3),
      baseSpeed: 0.6 + Math.random() * 0.4,
      turnTimer: Math.random() * 100
    });
  }
});

// ------------------------------------------------
// 🐟 CINEMATIC STINGRAYS
// ------------------------------------------------

const RAY_TEXTURE = '/textures/rf.png';

const rayGroup = new THREE.Group();
scene.add(rayGroup);

const rays = [];
const RAY_COUNT = 12;

function createRay(tex) {

  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();

  const group = new THREE.Group();

  const geo = new THREE.PlaneGeometry(10, 10, 1, 8);

  const mat = new THREE.MeshStandardMaterial({
    map: tex,
    transparent: true,
    alphaTest: 0.2,
    side: THREE.DoubleSide,
    roughness: 0.9,
    metalness: 0.0,
    depthWrite: false
  });

  const body = new THREE.Mesh(geo, mat);
  group.add(body);

  return group;
}

textureLoader.load(RAY_TEXTURE, (tex) => {

  for (let i = 0; i < RAY_COUNT; i++) {

    const ray = createRay(tex);

    // 🔥 RAZLIČITE VELIČINE
    const r = Math.random();
    let size;

    if (r < 0.25) size = 3.5 + Math.random() * 0.5;     // ogromne
    else if (r < 0.65) size = 2.2 + Math.random() * 0.4; // srednje
    else size = 1.3 + Math.random() * 0.2;                // male

    ray.scale.setScalar(size);

    rayGroup.add(ray);

    rays.push({
      mesh: ray,
      angle: Math.random() * Math.PI * 2,
      radiusOffset: Math.random() * 25 - 12,  // neke bliže, neke dalje
      baseHeight: 12 + Math.random() * 40,
      heightAmp: 4 + Math.random() * 6,
      heightFreq: 0.3 + Math.random() * 0.5,
      baseSpeed: 0.0008 + Math.random() * 0.0015,
      direction: Math.random() < 0.5 ? 1 : -1,
      glidePhase: Math.random() * Math.PI * 2,
      wingFreq: 0.8 + Math.random() * 0.8,
      wingAmp: 0.15 + Math.random() * 0.15
    });
  }
});


function animate() {
  requestAnimationFrame(animate);
  t += 0.016;
 glass.material.opacity = baseGlassOpacity + Math.sin(t * 0.7) * 0.001;
glassOuter.material.opacity = baseOuterOpacity + Math.sin(t * 0.9) * 0.0008;

  // 🫧 BUBBLES animacija
  const posAttr = bubbles.geometry.getAttribute('position');
  for (let i = 0; i < BUBBLE_COUNT; i++) {
    let x = bubblePos[i * 3 + 0];
    let y = bubblePos[i * 3 + 1];
    let z = bubblePos[i * 3 + 2];

    y += bubbleSpeed[i];

    const ph = bubblePhase[i] + t * 0.9;
    x += Math.sin(ph) * 0.0015;
    z += Math.cos(ph) * 0.0015;

    if (y > bubbleYMax) {
      const a = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random()) * bubbleRMax;

      x = Math.cos(a) * r;
      y = bubbleYMin + Math.random() * 0.7;
      z = Math.sin(a) * r;

      bubbleSpeed[i] = rand(0.015, 0.05);
      bubblePhase[i] = Math.random() * Math.PI * 2;
    }

    bubblePos[i * 3 + 0] = x;
    bubblePos[i * 3 + 1] = y;
    bubblePos[i * 3 + 2] = z;

    posAttr.setXYZ(i, x, y, z);
  }
  posAttr.needsUpdate = true;

  // ✨ PLANKTON animacija
  const plankAttr = plankton.geometry.getAttribute('position');
  for (let i = 0; i < PLANK_COUNT; i++) {
    let x = plankPos[i * 3 + 0];
    let y = plankPos[i * 3 + 1];
    let z = plankPos[i * 3 + 2];

    const vx = plankVel[i * 3 + 0];
    const vy = plankVel[i * 3 + 1];
    const vz = plankVel[i * 3 + 2];

    const ph = plankPhase[i] + t * 0.6;
    x += vx + Math.sin(ph) * 0.0008;
    y += vy;
    z += vz + Math.cos(ph) * 0.0008;

    if (y > plankYMax) {
      y = plankYMin + Math.random() * 0.4;
      const a = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random()) * plankRMax;
      x = Math.cos(a) * r;
      z = Math.sin(a) * r;
      plankPhase[i] = Math.random() * Math.PI * 2;
    }

    const rr = Math.sqrt(x * x + z * z);
    if (rr > plankRMax) {
      const nx = x / (rr + 1e-6);
      const nz = z / (rr + 1e-6);
      x = nx * plankRMax;
      z = nz * plankRMax;
    }

    plankPos[i * 3 + 0] = x;
    plankPos[i * 3 + 1] = y;
    plankPos[i * 3 + 2] = z;

    plankAttr.setXYZ(i, x, y, z);
  }
  plankAttr.needsUpdate = true;

  // 🐠 RIBE
  fishT += 0.016;
  for (const f of fishes) {
    f.angle += f.dir * f.speed;

    const r = clamp(
      f.baseR + Math.sin(fishT * f.rFreq + f.phase) * f.rAmp,
      reefSafeRadius,
      fishRadiusMax
    );

    const y = clamp(
      f.yBase + Math.sin(fishT * f.yFreq + f.phase * 1.3) * f.yAmp,
      fishYMin,
      fishYMax
    );

    const x = Math.cos(f.angle) * r;
    const z = Math.sin(f.angle) * r;

    f.obj.position.set(x, y, z);

    const tx = -Math.sin(f.angle) * f.dir;
    const tz =  Math.cos(f.angle) * f.dir;
    const yaw = Math.atan2(tx, tz);

    const vy = Math.cos(fishT * f.yFreq + f.phase * 1.3) * (f.yAmp * f.yFreq) * 0.015;
    const pitch = THREE.MathUtils.clamp(vy, -0.18, 0.18);

    f.obj.rotation.y = yaw;
    f.obj.rotation.x = -pitch;
    f.obj.rotation.z = 0;
  }

  // 🌊 CAUSTICS animacija
  causticsTex.offset.x = (t * 0.008) % 1;
  causticsTex.offset.y = (t * 0.006) % 1;
  causticsMat.opacity = 0.30 + 0.12 * (0.5 + 0.5 * Math.sin(t * 0.9));

  // light rays puls
  raysGroup.children.forEach((m, i) => {
    m.material.opacity = 0.035 + 0.02 * (0.5 + 0.5 * Math.sin(t * 0.55 + i * 0.9));
  });

  // KRETANJE KAMERE
  const speed = 0.4;
  const dir = new THREE.Vector3();
  camera.getWorldDirection(dir);

  const forward = new THREE.Vector3(dir.x, 0, dir.z).normalize();
  const side = new THREE.Vector3().crossVectors(camera.up, forward).normalize();

  const oldPos = camera.position.clone();

  if (keys.KeyW) camera.position.addScaledVector(forward, speed);
  if (keys.KeyS) camera.position.addScaledVector(forward, -speed);
  if (keys.KeyA) camera.position.addScaledVector(side, speed);
  if (keys.KeyD) camera.position.addScaledVector(side, -speed);

  if (collidesWithCenterTank(camera.position)) camera.position.copy(oldPos);
  if (collidesWithExitDoor(camera.position)) camera.position.copy(oldPos);

  const lobbyCenter = new THREE.Vector2(lobby.position.x + 3, 0);
  const playerPos2D = new THREE.Vector2(camera.position.x, camera.position.z);
  const distFromCenter = playerPos2D.distanceTo(lobbyCenter);
  const buffer = 2.0;

  const hallXMin = lobby.position.x + lobbyRadius - 5;
  const hallXMax = hallXMin + hallLength;
  const hallZBound = hallWidth / 2 - buffer;

  const inHoleXRange = camera.position.x > (hallXStart + lobby.position.x + 10) &&
                       camera.position.x < (hallXStart + lobby.position.x + 30);

  const rNow = Math.sqrt(camera.position.x * camera.position.x + camera.position.z * camera.position.z);
  const dyNow = camera.position.y - tunnelY;
  const distToCenterlineNow = Math.sqrt((rNow - tunnelRadius) * (rNow - tunnelRadius) + dyNow * dyNow);
  const inTunnel = distToCenterlineNow < 6.8;

  if (!inTunnel) {
    if (camera.position.x < hallXMin) {
      if (distFromCenter > (lobbyRadius - buffer)) camera.position.copy(oldPos);
    } else {
      if (!inHoleXRange) {
        if (Math.abs(camera.position.z) > hallZBound) camera.position.z = oldPos.z;
      }
      if (camera.position.x > hallXMax + 15) camera.position.x = oldPos.x;
    }
  }

  if (distToCenterlineNow < 12) {
    if (collidesWithTunnelGlass(camera.position)) camera.position.copy(oldPos);
  }

  // ✅ “Debljina” osjećaj: kad si blizu stakla, opacity malo poraste (subtilno)
  if (inTunnel) {
    const edge = THREE.MathUtils.clamp(
      (distToCenterlineNow - 3.2) / (6.2 - 3.2),
      0, 1
    );
    const nearWall = 1.0 - edge;

    tunnelGlassMat.opacity = baseGlassOpacity + nearWall * 0.045;
    tunnelGlassOuterMat.opacity = baseOuterOpacity + nearWall * 0.020;
  } else {
    tunnelGlassMat.opacity = baseGlassOpacity;
    tunnelGlassOuterMat.opacity = baseOuterOpacity;
  }

  camera.position.y = -3.5;
  controls.target.copy(camera.position).add(dir);
  controls.update();

  // ✅ floor micro-movement (subtilno, ne dira ništa drugo)
  _floorAnimT += 0.016;
  microReliefTex.offset.set((_floorAnimT * 0.003) % 1, (_floorAnimT * 0.002) % 1);
  gravelPatchTex.offset.set((_floorAnimT * 0.0018) % 1, (_floorAnimT * 0.0012) % 1);
  tankMicroTex.offset.set((_floorAnimT * 0.0025) % 1, (_floorAnimT * 0.0017) % 1);
  tankPatchTex.offset.set((_floorAnimT * 0.0016) % 1, (_floorAnimT * 0.0011) % 1);

// update seaweed sway time
seaweedWorld.traverse((o) => {
  if (o.isInstancedMesh && o.userData._seaweedShader) {
    o.userData._seaweedShader.uniforms.uTime.value = t;
  }
});

sharks.forEach((shark, i) => {
  const speed = 1.8; 
  const time = t * 5 + i; 

  // 1. KOREKCIJA SMJERA (Inverzija prethodnog kretanja)
  // Promjenom predznaka (+ u - i obratno) tjeramo model da ide "nosom"
  shark.position.x -= Math.cos(shark.rotation.y) * speed;
  shark.position.z += Math.sin(shark.rotation.y) * speed;

  // 2. BIOMETRIJSKI WANDERING
  // Dodaje malo nasumičnosti u kretanje da ne bude robotski
  shark.rotation.y += Math.sin(t * 0.4 + i) * 0.008;

  // 3. DINAMIČKA ANIMACIJA TIJELA (Anguliformni potisak)
  shark.children.forEach((segment, idx) => {
    // S-kriva: Talas putuje od glave ka repu
    const wave = Math.sin(time - idx * 0.7);
    
    // Snaga raste prema repu (eksponencijalno za realizam)
    const strength = Math.pow(idx / shark.children.length, 1.6);
    
    // Rotacija po Y osi (lijevo-desno)
    segment.rotation.y = wave * 0.35 * strength;
    
    // Blagi roll (naginjanje tijela)
    segment.rotation.z = wave * 0.1 * strength;
  });

  // 4. SMART WRAPPING / BOUNDARIES
  const limit = 1400;
  if (Math.abs(shark.position.x) > limit || Math.abs(shark.position.z) > limit) {
    // Polako okrećemo model ka centru mape (0,0,0)
    const angleToCenter = Math.atan2(shark.position.x, -shark.position.z); 
    shark.rotation.y += (angleToCenter - shark.rotation.y) * 0.05;
  }
});

ultraFishes.forEach((f, i) => {
  const fish = f.mesh;
  const pos = fish.position;
  const time = t + i;

  // 1. SMANJENA BRZINA (Multiplikator smanjen sa 2.8 na 1.4)
  const pulse = Math.max(0.2, Math.sin(time * 3.0)); 
  const currentSpeed = f.baseSpeed * (1.2 + pulse * 0.6) * 1.4; 

  // 2. SMJER KRETANJA (Nos - X osa)
  const forward = new THREE.Vector3(-1, 0, 0); 
  forward.applyQuaternion(fish.quaternion);
  
  // Primjena kretanja
  pos.add(forward.multiplyScalar(currentSpeed));

  // 3. USPORENO MAHANJE REPOM (Usklađeno sa novom brzinom)
  // Frekvencija smanjena sa 12.0 na 6.0
  const wave = Math.sin(time * 6.0); 
  if (fish.userData.tail) {
    // Smanjen i intenzitet zamaha za smireniji izgled
    fish.userData.tail.rotation.y = wave * (0.3 + pulse * 0.15);
  }

  // 4. NAGINJANJE I LAGANO LUTANJE
  fish.rotation.z = wave * 0.05;
  fish.rotation.y += Math.sin(t * 0.3 + i) * 0.005; 

  // 5. GRANICE (Povratak u centar)
  const dist = pos.length();
  if (dist > 800) {
    const angleToCenter = Math.atan2(-pos.x, -pos.z);
    fish.rotation.y += (angleToCenter - fish.rotation.y) * 0.03;
  }
});

// 🐟 CINEMATIC RAY MOVEMENT

rays.forEach((r, i) => {

  // 🔥 Gliding acceleration (nije konstantna brzina)
  const speedVariation =
    r.baseSpeed *
    (1.2 + Math.sin(t * 0.4 + r.glidePhase) * 1.3);

  r.angle += speedVariation * r.direction;

  // različite putanje (šire / uže)
  const dynamicRadius =
    tunnelRadius + r.radiusOffset +
    Math.sin(t * 0.2 + i) * 8;

  const x = Math.cos(r.angle) * dynamicRadius;
  const z = Math.sin(r.angle) * dynamicRadius;

  // vertikalno klizanje
  const y =
    r.baseHeight +
    Math.sin(t * r.heightFreq + i) * r.heightAmp;

  r.mesh.position.set(x, y, z);

  // rotacija da gledaju u smjeru
  r.mesh.rotation.y =
    -r.angle +
    (r.direction === 1 ? Math.PI / 2 : -Math.PI / 2);

  // 🔥 Realistic wing motion (talas kroz tijelo)
  const wave =
    Math.sin(t * r.wingFreq + r.glidePhase);

  r.mesh.rotation.x = wave * r.wingAmp;

  // lagani body roll
  r.mesh.rotation.z =
    Math.sin(t * 0.6 + i) * 0.95;
});

  renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});