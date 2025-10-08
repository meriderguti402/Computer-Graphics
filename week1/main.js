import * as THREE from "https://unpkg.com/three@0.158.0/build/three.module.js";

// Scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x202020);

// Camera
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(0, 0, 10);

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Cube
const geometry = new THREE.BoxGeometry(5, 5, 5);
const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
const cubeMesh = new THREE.Mesh(geometry, material);
scene.add(cubeMesh);

// Initial transform
cubeMesh.rotation.x = Math.PI * 0.25;
cubeMesh.rotation.y = Math.PI * 0.25;

// Axes helper
const axes = new THREE.AxesHelper(8);
scene.add(axes);

// Light
const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(2, 2, 5);
scene.add(light);

// Final transformations
cubeMesh.position.set(0.7, -0.6, 1);
cubeMesh.scale.set(0.25, 0.5, 2);
cubeMesh.rotation.x = Math.PI * 0.25;
cubeMesh.rotation.y = Math.PI * 0.25;

// Animation loop (so it updates and you can extend later)
function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}
animate();

// Handle window resize
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
