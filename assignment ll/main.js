import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

/* ======================
   SCENE, CAMERA, RENDERER
====================== */
const scene = new THREE.Scene()
scene.background = new THREE.Color(0x87ceeb)

const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.shadowMap.enabled = true
document.body.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true

/* ======================
   LIGHTING (IMPROVED)
====================== */
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5)
scene.add(ambientLight)

const directionalLight = new THREE.DirectionalLight(0xffffff, 1)
directionalLight.position.set(10, 20, 10)
directionalLight.castShadow = true
scene.add(directionalLight)

/* ======================
   TEXTURE LOADER
====================== */
const textureLoader = new THREE.TextureLoader()

const grassTexture = textureLoader.load('/textures/grass.jpg')
grassTexture.wrapS = grassTexture.wrapT = THREE.RepeatWrapping
grassTexture.repeat.set(10, 10)

const roadTexture = textureLoader.load('/textures/road.jpg')
roadTexture.wrapS = roadTexture.wrapT = THREE.RepeatWrapping
roadTexture.repeat.set(4, 1)

const brickTexture = textureLoader.load('/textures/brick.jpg')
const concreteTexture = textureLoader.load('/textures/concrete.jpg')

/* ======================
   GROUND (GRASS)
====================== */
const groundGeometry = new THREE.PlaneGeometry(100, 100)
const groundMaterial = new THREE.MeshStandardMaterial({
  map: grassTexture
})
const ground = new THREE.Mesh(groundGeometry, groundMaterial)
ground.rotation.x = -Math.PI / 2
ground.receiveShadow = true
scene.add(ground)

/* ======================
   ROADS (TEXTURED)
====================== */
const roadMaterial = new THREE.MeshStandardMaterial({
  map: roadTexture
})

const mainRoad = new THREE.Mesh(
  new THREE.BoxGeometry(60, 0.1, 6),
  roadMaterial
)
mainRoad.position.set(0, 0.05, 0)
scene.add(mainRoad)

const sideRoad = new THREE.Mesh(
  new THREE.BoxGeometry(10, 0.1, 3),
  roadMaterial
)
sideRoad.rotation.y = Math.PI / 4
sideRoad.position.set(10, 0.05, 6)
scene.add(sideRoad)

/* ======================
   BUILDINGS (TEXTURED)
====================== */
// Brick building
const topBuilding = new THREE.Mesh(
  new THREE.BoxGeometry(6, 4, 16),
  new THREE.MeshStandardMaterial({ map: brickTexture })
)
topBuilding.position.set(-10, 1.5, 11)
topBuilding.rotation.y = Math.PI / -3
topBuilding.castShadow = true
scene.add(topBuilding)

// Concrete building
const whiteBuilding = new THREE.Mesh(
  new THREE.BoxGeometry(15, 3, 5),
  new THREE.MeshStandardMaterial({ map: concreteTexture })
)
whiteBuilding.position.set(8, 1.5, -5)
whiteBuilding.castShadow = true
scene.add(whiteBuilding)

/* ======================
   GLASS BUILDING (TRANSPARENT)
====================== */
const glassMaterial = new THREE.MeshStandardMaterial({
  color: 0x99ccff,
  transparent: true,
  opacity: 0.5
})

const glassBuilding = new THREE.Mesh(
  new THREE.BoxGeometry(15, 3, 5),
  glassMaterial
)
glassBuilding.position.set(28, 1.5, -5)
scene.add(glassBuilding)

/* ======================
   LOAD GLTF MODEL
====================== */
const gltfLoader = new GLTFLoader()

gltfLoader.load(
  '/models/birch_tree.blend',
  (gltf) => {
    const model = gltf.scene
    model.scale.set(2, 2, 2)
    model.position.set(-20, 0, -10)
    scene.add(model)
  },
  undefined,
  (error) => {
    console.error(error)
  }
)

/* ======================
   INTERACTION (HOVER + CLICK)
====================== */
const raycaster = new THREE.Raycaster()
const mouse = new THREE.Vector2()
let hoveredObject = null

window.addEventListener('mousemove', (event) => {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1
})

window.addEventListener('click', () => {
  if (hoveredObject) {
    hoveredObject.material.color.set(Math.random() * 0xffffff)
  }
})

/* ======================
   CAMERA POSITION
====================== */
camera.position.set(30, 20, 30)

/* ======================
   ANIMATION LOOP
====================== */
let lightAngle = 0

function animate() {
  requestAnimationFrame(animate)

  controls.update()

  // Animate glass building
  glassBuilding.rotation.y += 0.005

  // Animate light
  lightAngle += 0.01
  directionalLight.position.x = Math.sin(lightAngle) * 20
  directionalLight.position.z = Math.cos(lightAngle) * 20

  // Hover detection
  raycaster.setFromCamera(mouse, camera)
  const intersects = raycaster.intersectObjects(scene.children)

  if (hoveredObject) {
    hoveredObject.material.emissive?.set(0x000000)
    hoveredObject = null
  }

  if (intersects.length > 0) {
    const obj = intersects[0].object
    if (obj.material && obj.material.emissive) {
      hoveredObject = obj
      obj.material.emissive.set(0x333333)
    }
  }

  renderer.render(scene, camera)
}

animate()

/* ======================
   RESPONSIVE
====================== */
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
})
