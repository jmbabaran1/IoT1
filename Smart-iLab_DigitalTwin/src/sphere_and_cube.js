import * as THREE from 'three';
import { OrbitControls } from "jsm/controls/OrbitControls.js";

// The Three Fundamentals
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.setZ(2);
const renderer = new THREE.WebGLRenderer({antialias: true});

renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.03;

// [1] Creating a "Sphere"
const geo = new THREE.IcosahedronGeometry(1.0, 2);
const material = new THREE.MeshStandardMaterial({
  color: 0xffffff,
  flatShading: true,
});
const mesh = new THREE.Mesh(geo, material);
scene.add(mesh); 

// [1.1] Creating a wireframe
const wireMat = new THREE.MeshBasicMaterial({
  color: 0xffffff,
  wireframe: true
});
const wireMesh = new THREE.Mesh(geo, wireMat);
wireMesh.scale.setScalar(1.001);
mesh.add(wireMesh);

// [2] Creating a Hemilight
const light = new THREE.AmbientLight(0xffccff, 0.5);
scene.add(light);

// [3] Adding a blue cube to the left of the current geometry
const cubeGeo = new THREE.BoxGeometry(0.5, 0.5, 0.5); // Cube with dimensions 0.5x0.5x0.5
const cubeMat = new THREE.MeshStandardMaterial({ color: 0x0000ff }); // Blue material
const cubeMesh = new THREE.Mesh(cubeGeo, cubeMat);
cubeMesh.position.set(-1.5, 0, 0); // Position the cube to the left of the current geometry
scene.add(cubeMesh); // Add the cube to the scene

// [3] Creating a looping function
function animate(t = 0) {
  mesh.rotation.y = t * 0.0001;
  cubeMesh.position.x = 2*Math.cos(t * 0.001);
  cubeMesh.position.z = 2*Math.sin(t * 0.001);
  cubeMesh.rotation.y = t * -0.001;
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
  controls.update();
};
animate();