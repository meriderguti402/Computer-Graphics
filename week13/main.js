// Scene
const scene = new THREE.Scene();

// Camera
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.z = 30;

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(10, 10, 10);
scene.add(directionalLight);

const cubes = [];

for (let i = 0; i < 20; i++) {
  // Random size
  const width = Math.random() * 3 + 1;
  const height = Math.random() * 3 + 1;
  const depth = Math.random() * 3 + 1;

  const geometry = new THREE.BoxGeometry(width, height, depth);

  // Random color
  const material = new THREE.MeshStandardMaterial({
    color: Math.random() * 0xffffff
  });

  const cube = new THREE.Mesh(geometry, material);

  // Random position
  cube.position.set(
    (Math.random() - 0.5) * 40,
    (Math.random() - 0.5) * 40,
    (Math.random() - 0.5) * 40
  );

  // Save size data
  cube.userData.size = { width, height, depth };
  cube.userData.originalColor = cube.material.color.clone();

  cubes.push(cube);
  scene.add(cube);
}

function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}

animate();

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const infoPanel = document.getElementById("infoPanel");

let selectedCube = null;

window.addEventListener("click", (event) => {
  // Convert mouse to normalized device coordinates
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);

  const intersects = raycaster.intersectObjects(cubes);

  // Reset previous cube highlight
  if (selectedCube) {
    selectedCube.material.color.copy(selectedCube.userData.originalColor);
    selectedCube.scale.set(1, 1, 1);
  }

  if (intersects.length > 0) {
    selectedCube = intersects[0].object;

    // Highlight cube (bonus)
    selectedCube.material.color.set(0xffff00);
    selectedCube.scale.set(1.2, 1.2, 1.2);

    const pos = selectedCube.position;
    const size = selectedCube.userData.size;

    infoPanel.innerHTML = `
      <strong>Cube Information</strong><br><br>
      <strong>Position:</strong><br>
      x: ${pos.x.toFixed(2)}<br>
      y: ${pos.y.toFixed(2)}<br>
      z: ${pos.z.toFixed(2)}<br><br>

      <strong>Size:</strong><br>
      width: ${size.width.toFixed(2)}<br>
      height: ${size.height.toFixed(2)}<br>
      depth: ${size.depth.toFixed(2)}
    `;
  } else {
    // Clicked empty space
    selectedCube = null;
    infoPanel.innerHTML = "No object selected.";
  }
});

