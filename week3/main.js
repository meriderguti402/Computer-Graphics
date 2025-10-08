// Import the library
import * as THREE from 'https://unpkg.com/three@0.164.1/build/three.module.js';



// Create the scene (constructor)
const scene = new THREE.Scene();

// Create a camera (constructor)
const camera = new THREE.PerspectiveCamera(
  75, 
  window.innerWidth / window.innerHeight, 
  0.1, 
  1000
);

// Create a renderer (constructor)
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Create geometry using the TorusGeometry constructor
const geometry = new THREE.TorusGeometry(1, 0.4, 16, 100);
//const geometry = new THREE.ConeGeometry(1, 2, 32);
//const geometry = new THREE.CylinderGeometry(1,1,2,10);
//const geometry = new THREE.SphereGeometry(1, 32, 32);

// Create material using MeshBasicMaterial constructor
//const material = new THREE.MeshBasicMaterial({ color: 0xff0000, wireframe:true });
//const material = new THREE.MeshLambertMaterial({ color: 0x8844ff});
//const material = new THREE.MeshStandardMaterial({
 // color:0x8844ff,
 // metalness:0.4,
 // roughness:0.3,
  //emissive:0x220044,
//});

const material = new THREE.MeshPhongMaterial({
  color: 0x8844ff,
  specular: 0xffffff,
  shininess: 50
});

// Combine geometry + material into a mesh
const torus = new THREE.Mesh(geometry, material);
scene.add(torus);

//const cone = new THREE.Mesh(geometry, material);
//scene.add(cone);


const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
directionalLight.position.set(1, 3, 5);
scene.add(directionalLight);

const lightHelper = new THREE.DirectionalLightHelper(directionalLight, 0.5);
scene.add(lightHelper);

ambientLight.intensity = 0.4;
directionalLight.intensity = 1.2;
// Position the camera
camera.position.z = 5;


// Animation loop
function animate() {
  requestAnimationFrame(animate);
  torus.rotation.x += 0.01;
  torus.rotation.y += 0.01;
  renderer.render(scene, camera);
}

animate();