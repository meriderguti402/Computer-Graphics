import * as THREE from 'three'

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000)
camera.position.z = 3;

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const textureLoader = new THREE.TextureLoader();
const texture = textureLoader.load('textures/brown.jpg')

textureLoader.wrapS = THREE.RepeatWrapping;
textureLoader.wrapT = THREE.RepeatWrapping;
texture.repeat.set(2,4);


const material = new THREE.MeshBasicMaterial({
  map:texture
});
const cube = new THREE.Mesh(
  new THREE.BoxGeometry(1,1,1),
  material
);
scene.add(cube);

function animate(){
  requestAnimationFrame(animate);
  cube.rotation.x += 0.01;
  sphere.rotation.y += 0.01;
  pyramid.rotation.x += 0.01;
  pyramid.rotation.y += 0.01;
  renderer.render(scene,camera);
}

const sphereTexture = textureLoader.load('textures/blue.jpg');

const sphereMaterial = new THREE.MeshBasicMaterial({
  map: sphereTexture
});

const sphere = new THREE.Mesh(
  new THREE.SphereGeometry(0.7, 32, 32),
  sphereMaterial
);


sphere.position.x = -2;
scene.add(sphere);

const pyramidTexture = textureLoader.load('textures/Metallic-pink.jpg');

const pyramidMaterial = new THREE.MeshBasicMaterial({
  map: pyramidTexture
});

const pyramid = new THREE.Mesh(
  new THREE.TetrahedronGeometry(0.9),
  pyramidMaterial
);

pyramid.position.x = 2;
scene.add(pyramid);

animate()