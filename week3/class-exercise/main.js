import * as THREE from 'https://unpkg.com/three@0.164.1/build/three.module.js';

// --- SCENE ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x202030);

// --- CAMERA ---
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(3, 3, 6);

// --- RENDERER ---
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true; // Enable shadows
document.body.appendChild(renderer.domElement);

// --- FLOOR (Plane) ---
const planeGeometry = new THREE.PlaneGeometry(20, 20);
const planeMaterial = new THREE.MeshStandardMaterial({ color: 0x444444 });
const floor = new THREE.Mesh(planeGeometry, planeMaterial);
floor.rotation.x = -Math.PI / 2;
floor.position.y = -1;
floor.receiveShadow = true;
scene.add(floor);

// --- GEOMETRIES ---
const boxGeometry = new THREE.BoxGeometry();
const boxMaterial = new THREE.MeshPhongMaterial({ color: 0xff69b4 });
const box = new THREE.Mesh(boxGeometry, boxMaterial);
box.position.set(-2, 0, 0);
box.castShadow = true;
scene.add(box);

const sphereGeometry = new THREE.SphereGeometry(0.8, 32, 32);
const sphereMaterial = new THREE.MeshStandardMaterial({
  color: 0x44ff44,
  wireframe: true,
  metalness: 0.5,
  roughness: 0.3,
});
const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
sphere.position.set(0, 0, 0);
sphere.castShadow = true;
scene.add(sphere);

const coneGeometry = new THREE.ConeGeometry(0.7, 1.5, 32);
const coneMaterial = new THREE.MeshLambertMaterial({ color: 0x4488ff });
const cone = new THREE.Mesh(coneGeometry, coneMaterial);
cone.position.set(2, 0, 0);
cone.castShadow = true;
scene.add(cone);

// --- LIGHTS ---
const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(5, 10, 5);
directionalLight.castShadow = true;
scene.add(directionalLight);

const pointLight = new THREE.PointLight(0xffaa00, 0.8);
pointLight.position.set(-5, 5, 2);
scene.add(pointLight);

// --- ANIMATION LOOP ---
function animate() {
  requestAnimationFrame(animate);

  box.rotation.x += 0.01;
  box.rotation.y += 0.01;

  sphere.rotation.y += 0.02;

  cone.rotation.x += 0.015;
  cone.rotation.z += 0.015;

  renderer.render(scene, camera);
}
animate();

// --- RESPONSIVE RESIZE ---
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
