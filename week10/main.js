import * as THREE from 'three'

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000)
camera.position.z = 3;

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const textureLoader = new THREE.TextureLoader();
const texture = textureLoader.load('textures/Stylized_Wood_Floor_001_basecolor.png')

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
  cube.rotation.x +=0.01;
  renderer.render(scene,camera);
}

animate();
