import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);

// Ground
const groundGeometry = new THREE.PlaneGeometry(100, 100);
const groundMaterial = new THREE.MeshLambertMaterial({ color: 0x228B22 });
const ground = new THREE.Mesh(groundGeometry, groundMaterial);
ground.rotation.x = -Math.PI / 2;
scene.add(ground);

// Main road
const roadGeometry = new THREE.BoxGeometry(60, 0.1, 6);
const roadMaterial = new THREE.MeshLambertMaterial({ color: 0x808080 });
const mainRoad = new THREE.Mesh(roadGeometry, roadMaterial);
mainRoad.position.set(0, 0.05, 0);
scene.add(mainRoad);

// Side road (swapped position with white building)
const sideRoadGeometry = new THREE.BoxGeometry(10, 0.1, 3);
const sideRoad = new THREE.Mesh(sideRoadGeometry, roadMaterial);
sideRoad.rotation.y = Math.PI / 4;
sideRoad.position.set(10, 0.05, 6);
scene.add(sideRoad);

const topBuildingMat = new THREE.MeshPhongMaterial({ color: 0xffffff });
const topBuilding = new THREE.Mesh(new THREE.BoxGeometry(6, 4, 16), topBuildingMat);
topBuilding.position.set(-10, 1.5, 11);
topBuilding.rotation.y = Math.PI / -3;
scene.add(topBuilding);

// White building (moved where the old side road was)
const whiteBuildingGeometry = new THREE.BoxGeometry(15, 3, 5);
const whiteBuildingMaterial = new THREE.MeshLambertMaterial({ color: 0xffffff });
const whiteBuilding = new THREE.Mesh(whiteBuildingGeometry, whiteBuildingMaterial);
whiteBuilding.position.set(8, 1.5, -5);
scene.add(whiteBuilding);

// Blue building next to white one, with some distance
const blueBuildingGeometry = new THREE.BoxGeometry(15, 3, 5);
const blueBuildingMaterial = new THREE.MeshLambertMaterial({ color: 0xadd8e6 });
const blueBuilding = new THREE.Mesh(blueBuildingGeometry, blueBuildingMaterial);
blueBuilding.position.set(28, 1.5, -5); // some distance from white building
scene.add(blueBuilding);

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(10, 20, 10);
scene.add(directionalLight);

camera.position.set(30, 20, 30);
controls.update();

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});