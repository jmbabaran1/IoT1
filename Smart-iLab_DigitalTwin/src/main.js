// ---------- Some node package manager installs necessary ----------
// npm install three
// npm install gsap

const ip = "http://10.158.66.30:80"; // IP of REST API




// ---------- Foundation of the Scene ----------
// [0] Import Modules

// ThreeJS for 3D Scenes Support
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.172.0/build/three.module.js';
// OrbitControls for 3D Camera Controls
import { OrbitControls } from "https://cdn.jsdelivr.net/npm/three@0.172.0/examples/jsm/controls/OrbitControls.js";
// GLTFLoader for .gltf file-loading
import { GLTFLoader } from "https://cdn.jsdelivr.net/npm/three@0.172.0/examples/jsm/loaders/GLTFLoader.js";
// OutlinePass for outlines
import { OutlinePass } from 'https://cdn.jsdelivr.net/npm/three@0.172.0/examples/jsm/postprocessing/OutlinePass.js';
// EffectComposer for OutlinePass support?
import { EffectComposer } from 'https://cdn.jsdelivr.net/npm/three@0.172.0/examples/jsm/postprocessing/EffectComposer.js';
// RenderPass for OutlinePass support?
import { RenderPass } from 'https://cdn.jsdelivr.net/npm/three@0.172.0/examples/jsm/postprocessing/RenderPass.js';
// ShaderPass for shadow correction in tandem with GammaCorrectionShader
import { ShaderPass } from 'https://cdn.jsdelivr.net/npm/three@0.172.0/examples/jsm/postprocessing/ShaderPass.js';
// Gamma correction because Effect Composer makes scene darker
import { GammaCorrectionShader } from 'https://cdn.jsdelivr.net/npm/three@0.172.0/examples/jsm/shaders/GammaCorrectionShader.js';
// CSS2D for HTML Position Projection 
import { CSS2DRenderer, CSS2DObject } from 'https://cdn.jsdelivr.net/npm/three@0.172.0/examples/jsm/renderers/CSS2DRenderer.js';
import { DoubleSide } from 'three';
// Chart.js for data visualization -- graphical representation
//import { Chart } from './node_modules/chart.js/auto/auto.js';


// [1] The Three + 1 Fundamentals

// (a) Main Scene
const scene = new THREE.Scene();

// (b) Camera and Properties
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(20,20,20);
camera.lookAt(0, 0, 0);
camera.zoom = 1;
camera.near = 0.1;
camera.far = 1000;

// (c) Renderer and Properties
const renderer = new THREE.WebGLRenderer({antialias: false});

renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
document.body.appendChild(renderer.domElement);

// (d) Orbit Controls Drifting, Sensitivity, and Bounds
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.1;
controls.maxPolarAngle = Math.PI/2 -0.1;
controls.mouseButtons.RIGHT = THREE.MOUSE.ROTATE;
controls.mouseButtons.LEFT = THREE.MOUSE.PAN; // Turn on if want panning
//controls.mouseButtons.LEFT = null;

// [2] Creating ambient light
const ambient = new THREE.AmbientLight(0xffffff, 0.6);
ambient.castShadow = false;
scene.add(ambient);

// [3] Adding directional light
const light = new THREE.DirectionalLight(0xe2e2e2, 1);
light.position.set(10,50,20);
// Setting bounds of the directional light
light.shadow.mapSize.width = 1024;
light.shadow.mapSize.height = 1024;
light.shadow.camera.near = 0.1;
light.shadow.camera.far = 500;
light.shadow.camera.left = 50;
light.shadow.camera.right = -50;
light.shadow.camera.top = 50;
light.shadow.camera.bottom = -50;
light.castShadow = true;
light.shadow.bias = -0.0004;
scene.add(light);
// Directional Light Helper
// const helper = new THREE.DirectionalLightHelper(light, 1);
// scene.add(helper);

// [4] Adding a ground plane
const groundGeometry = new THREE.PlaneGeometry(1000,1000,1,1);
groundGeometry.rotateX(-Math.PI /2);
const groundMaterial = new THREE.MeshStandardMaterial({
    // color:  0xa1edf7,
    color: 0x1a1a1a,
    side: THREE.DoubleSide
});
groundMaterial.metalness = 0.8;
groundMaterial.roughness = 0.6;
const groundMesh = new THREE.Mesh(groundGeometry, groundMaterial);
groundMesh.castShadow = false;
groundMesh.receiveShadow = true;
scene.add(groundMesh);

// [4] Adding my gltf scenes
const loader = new GLTFLoader().setPath('../assets/');

// Loading Shiba Inu
loader.load('shiba/scene.gltf', (gltf) => {
    const dog_mesh = gltf.scene;

    dog_mesh.traverse((child) => {
        if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
        }
    });

    dog_mesh.position.set(-1.65,3.3,-8);
    dog_mesh.scale.set(1,1,1);
    scene.add(dog_mesh);
});
// Loading Smart I-Lab
loader.load('smart_ilab_3d/scene.gltf', (gltf) => {
    const lab = gltf.scene;

    lab.traverse((child) => {
        if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
        }
    });
    
    lab.position.set(-15,0.05,-15);
    lab.scale.set(0.03, 0.03, 0.03);
    scene.add(lab);
});

// Loading skybox
/*
loader.load('skybox/scene.gltf', (gltf) => {
    const sky = gltf.scene;
    scene.add(sky);
});
*/

// Adding color to background
scene.background = new THREE.Color( 0x1a1a1a);

// Logging in using API key
var on_login_screen = true;
var has_key = false;
var API_key;

const btn_no_key = document.getElementById("enter_no_key");
const btn_with_key = document.getElementById("enter_with_key");

// Case 1: Using Digital Twin without API Key
btn_no_key.onclick = function () {
    has_key = false;         // no API Key given
    on_login_screen = false;    // Allow raytracing

    // Disable switch for zigbeelights
    light_switch.style.pointerEvents = 'none';
    document.getElementById("switch_handler").style.pointerEvents = 'none';

    // Move login screen to back of everything and make it invisible
    const login_screen = document.getElementById("login_screen");
    login_screen.style.opacity = '0%';
    login_screen.style.zIndex = '-100';
}


// Case 2: Using Digital Twin with API Key
btn_with_key.onclick = function () {
    API_key = document.getElementById("key_input").value;
    if (API_key == ``) {
        document.getElementById(`login_error_text`).innerHTML = `Please enter an API Key.`;
        return;
    }
    console.log(API_key);
    document.getElementById(`login_error_text`).innerHTML = `Loading...`
    // Check if key is valid
    fetch(ip + `/access/${API_key}`, { method: 'GET', headers: { 'Accept' : '*/*', 'X-API-KEY' : '54b4310c-da79-441b-b135-d9b00ba073fe'} })
        .then(res => res.json())
        .then(data => {
            // Check state of each light
            console.log(data);
            if (data == 2 || data == 0){
                has_key = true;             // API Key given
                on_login_screen = false;    // Allow raytracing
                // Move login screen to back of everything and make it invisible
                const login_screen = document.getElementById("login_screen");
                login_screen.style.opacity = '0%';
                login_screen.style.zIndex = '-100';
            } else if (data == 1) {
                document.getElementById(`login_error_text`).innerHTML = `Your API Key is READ-ONLY. Please enter a READ and WRITE API Key. Contact admin for further support.`
            } else {
                document.getElementById(`login_error_text`).innerHTML = `Please enter a valid API Key. Contact admin for further support.`
            }
    })
}




// ---------- Functionalities ----------

// [0] Disable Raytracer if mouse is being held
var mouse_held = false;
window.addEventListener('mousedown', function(){
    mouse_held = true;
});
window.addEventListener('mouseup', function(){
    mouse_held = false;
});


// [1] Camera Reset
    // [1.1] Isometric View
var rst_cam_btn = document.getElementById("rst_cam_btn");
rst_cam_btn.onclick = function(){
    gsap.to(controls.target,{ x: 0, y: 0, z: 0, duration: 1, ease: 'power2.inOut'});
    gsap.to(camera.position,{ x: 20, y: 20, z: 20, duration: 1, ease: 'power2.inOut'});
};
     // [1.2] Overhead View
var rst_cam_btn = document.getElementById("top_cam_btn");
rst_cam_btn.onclick = function(){
    gsap.to(controls.target,{ x: 0, y: 0, z: 0, duration: 1, ease: 'power2.inOut'});
    gsap.to(camera.position,{ x: 0, y: 30, z: 0.1, duration: 1, ease: 'power2.inOut'});
};

// [2] Table Selection 
    // [2.1] Plane and Wireframe Generation for each table and aircon (for object detection)

    // table_geometry sets the table dimensions and orientation
    const table_geometry = new THREE.PlaneGeometry(3,4.77,1,1);
    table_geometry.rotateX(Math.PI/2);
    // table_material sets the table color
    const table_material = new THREE.MeshToonMaterial({
        color:  0xcccccc,
        side: THREE.DoubleSide
    });
    table_material.roughness = 0.6;

    // Define positions of table (tops)
    const table_positions = [
        [9.79, 2.305, -4.65],
        [9.79, 2.305, 0.28],
        [9.79, 2.305, 5.24],
        [9.79, 2.305, 10.21],
        [-0.1, 2.305, -4.65],
        [-0.1, 2.305, 0.28],
        [-0.1, 2.305, 5.24],
        [-0.1, 2.305, 10.21],
        [-3.25, 2.305, -4.65],
        [-3.25, 2.305, 0.28],
        [-3.25, 2.305, 5.24],
        [-3.25, 2.305, 10.21],
        [-12.48, 2.305, -4.65],
        [-12.48, 2.305, 0.28],
        [-12.48, 2.305, 5.24],
        [-12.48, 2.305, 10.21]
    ];
    
    const tables = [];

    // Create a plane for each table top
    table_positions.forEach((pos, index) => {
        const table = new THREE.Mesh(table_geometry, table_material);
        table.castShadow = false;
        table.receiveShadow = true;
        table.name = `Table${index + 1}_InputModel`;
        scene.add(table);
        table.position.set(...pos);
        tables.push(table);
    });

    // Define positions of occupancy indicators
    const occupancy_positions = [
        [7.79, 3, -4.65],
        [7.79, 3, 0.28],
        [7.79, 3, 5.24],
        [7.79, 3, 10.21],
        [1.9, 3, -4.65],
        [1.9, 3, 0.28],
        [1.9, 3, 5.24],
        [1.9, 3, 10.21],
        [-5.25, 3, -4.65],
        [-5.25, 3, 0.28],
        [-5.25, 3, 5.24],
        [-5.25, 3, 10.21],
        [-10.48, 3, -4.65],
        [-10.48, 3, 0.28],
        [-10.48, 3, 5.24],
        [-10.48, 3, 10.21]
    ];

    const occupancy_models = [];
    const light_occupancy = []

    // Define Occupancy Models and Material
    const occupancy_material = new THREE.MeshToonMaterial({color: 0x44b027});
    const occupancy_geometry = new THREE.OctahedronGeometry(0.4);

    occupancy_positions.forEach((pos, index) => {
        const occupancy = new THREE.Mesh(occupancy_geometry, occupancy_material);
        occupancy.castShadow = false;
        occupancy.receiveShadow = false;
        occupancy.name = `Occupancy${index + 1}_InputModel`;
        occupancy.castShadow = true;
        scene.add(occupancy);
        occupancy.position.set(...pos);
        occupancy_models.push(occupancy);
        const light = new THREE.PointLight( 0x00ff00, 0.2, 1 );
        light.position.set(...pos);
        scene.add( light );
        light_occupancy.push(light);
    });

    // Define positions of Horn models to visualize MSR-2 Buzzer
    const horn_positions = [
        [9.79, 2.805, -3.65],
        [9.79, 2.805, 1.28],
        [9.79, 2.805, 6.24],
        [9.79, 2.805, 11.21],
        [-0.1, 2.805, -3.65],
        [-0.1, 2.805, 1.28],
        [-0.1, 2.805, 6.24],
        [-0.1, 2.805, 11.21],
        [-3.25, 2.805, -3.65],
        [-3.25, 2.805, 1.28],
        [-3.25, 2.805, 6.24],
        [-3.25, 2.805, 11.21],
        [-12.48, 2.805, -3.65],
        [-12.48, 2.805, 1.28],
        [-12.48, 2.805, 6.24],
        [-12.48, 2.805, 11.21]
    ];      
    
    const horn_models = [];

    horn_positions.forEach((pos,index) => {
        const geometry = new THREE.ConeGeometry( 5, 9, 12, 1, true );
        if ((index > 3 && index < 8) || index > 11) {
            geometry.rotateZ(Math.PI/2);
            geometry.rotateX(Math.PI/2);
        } else {
            geometry.rotateZ(-Math.PI/2);
            geometry.rotateX(Math.PI/2);
        }
        const material = new THREE.MeshMatcapMaterial( {color: 0x1478a6 , side: THREE.DoubleSide} );
        const cone = new THREE.Mesh(geometry, material); 
        cone.position.set(...pos);
        cone.castShadow = true;
        cone.receiveShadow = true;
        cone.scale.set(0.1,0.1,0.1);
        cone.name = `Horn${index + 1}_InputModel`;
        horn_models.push(cone);
        scene.add( cone );
    })

    // Box Geometry creation for Sensibo (Aircon) object detection
    const aircon_geometry = new THREE.BoxGeometry(3.2, 1.1, 0.72);
    const aircon_material = new THREE.MeshStandardMaterial({
        color: 0x0000ff,
        opacity: 0,
        transparent: true,
    });
    const aircon_positions = [ 
        [-9.8,7.55,14.65],      // back left
        [6.4,7.55,14.65],       // back right
        [-9.8,7.55,-14.65],     // Front-left
        [6.3,7.55,-14.65]       // Front-right
    ];

    // Fetch AC names from REST API
    var aircon_names = [];
    const aircons = [];
    
    fetch(ip + '/sensibo', { method: 'GET', headers: { 'Accept' : '*/*', 'X-API-KEY' : '54b4310c-da79-441b-b135-d9b00ba073fe'} })
    .then(res => res.json())
    .then(data => {
        aircon_names = data;

        // Instantiate aircon geometries
        aircon_positions.forEach((pos, index) => {
        const aircon = new THREE.Mesh(aircon_geometry, aircon_material);
        aircon.castShadow = false;
        aircon.receiveShadow = false;
        aircon.name = `${aircon_names[index]}_InputModel`; // Name for object detection
        aircon.position.set(...pos);
        scene.add(aircon);
        aircons.push(aircon);
    });
    })
    .catch(error => console.error(`Error fetching Sensibo IDs:`, error));

    // [2.2] OutlinePass creation for outlines when hovering over interactable objects
    let composer, outlinePass;
    composer = new EffectComposer( renderer );

    let renderPass = new RenderPass( scene, camera );
	composer.addPass( renderPass );

    outlinePass = new OutlinePass( new THREE.Vector2( window.innerWidth, window.innerHeight ), scene, camera );
    composer.addPass( outlinePass );
    outlinePass.edgeStrength = 5;
    outlinePass.edgeGlow = 0.9;
    outlinePass.edgeThickness = 4;
    outlinePass.pulsePeriod = 1;
    outlinePass.visibleEdgeColor.set("#ffffff");
    outlinePass.hiddenEdgeColor.set("#ffffff");

    // Gamma correction in Effect Composer
    const gammaCorrectionPass = new ShaderPass(GammaCorrectionShader);  
    composer.addPass(gammaCorrectionPass);
    
    // [2.3] Raycaster and Pointer for Object Detection
    const pointer = new THREE.Vector2();    // For 2D Coordinates of mouse on the window
    const raycaster = new THREE.Raycaster();    // For intersection detection between pointer and an object (our table planes)

    // While mouse is moving: Function for calculating pointer position, raycasting information...
    const onMouseMove = (event) => {
            if(mouse_held) return; // If mouse is being held down i.e. rotating the scene, DO NOT TRACE RAYS
            if(on_login_screen) return; // If user is in login screen, DO NOT TRACE RAYS

            // calculate pointer position in normalized device coordinates
            // [-1 to +1] for both components
            pointer.x = (event.clientX / window.innerWidth)  * 2 - 1;
            pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;

            raycaster.setFromCamera(pointer, camera);
            const intersects = raycaster.intersectObjects(scene.children.filter(child => child.name.includes("InputModel")), false); // false -> non-recursive, better performance
            // Reset AG1 Label
            air_gradient_one_label.style.opacity = '0%'; // Hide label
            
            // If there are intersected objects with the ray...
            if (intersects.length > 0) {
                outlinePass.selectedObjects = [];
                let top_object = intersects[0].object
                document.getElementById("the_body").style.cursor = "default";

                if (top_object.name.includes("Table")){ // If the object at the top is a "Table" identified via object.name as defined here in code
                    document.getElementById("the_body").style.cursor = "pointer";
                    outlinePass.selectedObjects = [top_object];
                } else if (top_object.name.includes("AirGradientOne")) { // If the object at the top is a "AirGradientOne" identified via object.name as defined here in code
                    document.getElementById("the_body").style.cursor = "pointer";
                    outlinePass.selectedObjects = [top_object];
                    air_gradient_one_label.style.opacity = '70%'; // Show label
                } else if (top_object.name.includes("sensibo_air")) { // If the object at the top is a "sensibo_air" identified via object.name as defined here in code
                    document.getElementById("the_body").style.cursor = "pointer";
                    outlinePass.selectedObjects = [top_object];
                }
            } else {
                outlinePass.selectedObjects = [];
                document.getElementById("the_body").style.cursor = "default";
            }
            
    
    };
    // Event listener for mouse moving, calls function 'onMouseMove'
    window.addEventListener('mousemove', onMouseMove);

    // [2.4] Move Camera to table view onClick + Show dashboard
    
    const closeBtn = document.getElementById("closeModal");     // Dashboard close button
    const modal = document.getElementById("modal");             // Dashboard reference
    const aircon_modal = document.getElementById("aircon_modal"); // Aircon Dashboard reference

    var dashboard_data;
    var current_table;

    closeBtn.addEventListener("click", () => {
        clearInterval(dashboard_data);                                                      // Stop updating for a table
        modal.classList.remove("open");                                                     // Close Dashboard
        window.addEventListener('mousemove', onMouseMove);                                  // Turn on raycasting for onMouseMove
        window.addEventListener('click', onMouseClick);                                     // Turn on raycasting for onMouseClick
        gsap.to(controls.target,{ x: 0, y: 0, z: 0, duration: 1, ease: 'power2.inOut'});    // Return to default view
        gsap.to(camera.position,{ x: 20, y: 20, z: 20, duration: 1, ease: 'power2.inOut'});
        // Reset dashboard view
        document.getElementById("output_data").innerHTML = `
                  <div class="sensor_data " id="msr-2-data">
            <!--Added via JavaScript innerHTML-->
          </div>
          <div class="sensor_data" id="air-1-data">
            <!--Added via JavaScript innerHTML-->
          </div>
          <div class="sensor_data" id="smart-plug-1-data">
            <!--Added via JavaScript innerHTML-->
          </div>
          <div class="sensor_data" id="smart-plug-2-data">
            <!--Added via JavaScript innerHTML-->
          </div>
        `;
        document.getElementById("dash_body_header").style.opacity = '100%';             // Show devices and sensor IDs
        document.getElementById("output_data").style.justifyContent = 'space-between';  // Hide devices and sensor IDs
        document.getElementById("output_data").style.display = 'flex';                  // Hide devices and sensor IDs
        dash_on = false;
        document.getElementById("text_change").innerHTML = "Download Data";             // Change from "Display Data" -> "Download Data"
        document.getElementById("dl_icon").src = "./assets/icons/download_icon.png";    // Change icon

        // Reset chart information
        reset_chart();
    });

    // When mouse is clicked: Function for calculating pointer position, raycasting information...
    const onMouseClick = (event) => {
            if(on_login_screen) return; // If user is in login screen, DO NOT TRACE RAYS

            // calculate pointer position in normalized device coordinates
            // [-1 to +1] for both components
            pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
            pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;

            raycaster.setFromCamera(pointer, camera);
            const intersects = raycaster.intersectObjects(scene.children.filter(child => child.name.includes("InputModel")), false); // false -> non-recursive, better performance

            // If there are intersected objects with the ray...
            if (intersects.length > 0) {
                let top_object = intersects[0].object
                let ObjectName = top_object.name;

                // Check which if and which table is clicked
                if (ObjectName.includes("Table")) {
                    let tableNumber = parseInt(ObjectName.replace("Table", ""), 10);
                
                    let positions = {
                        target: { x: 10, y: 3, z: 0 },
                        camera: { x: 5, y: 4, z: 0 }
                    };
                
                    if (tableNumber >= 1 && tableNumber <= 4) {
                        positions.target.x = 10;
                        positions.camera.x = 5;
                        positions.target.z = [-4.65, 0.28, 5.24, 10.21][tableNumber - 1];
                        positions.camera.z = positions.target.z;
                    } else if (tableNumber >= 5 && tableNumber <= 8) {
                        positions.target.x = -6;
                        positions.camera.x = 5;
                        positions.target.z = [-4.65, 0.28, 5.24, 10.21][tableNumber - 5];
                        positions.camera.z = positions.target.z;
                    } else if (tableNumber >= 9 && tableNumber <= 12) {
                        positions.target.x = -2;
                        positions.camera.x = -8;
                        positions.target.z = [-4.65, 0.28, 5.24, 10.21][tableNumber - 9];
                        positions.camera.z = positions.target.z;
                    } else if (tableNumber >= 13 && tableNumber <= 16) {
                        positions.target.x = -13.5;
                        positions.camera.x = -8;
                        positions.target.z = [-4.65, 0.28, 5.24, 10.21][tableNumber - 13];
                        positions.camera.z = positions.target.z;
                    }
                
                    gsap.to(controls.target, { ...positions.target, duration: 1, ease: 'power2.inOut' });   // Look at table
                    gsap.to(camera.position, { ...positions.camera, duration: 1, ease: 'power2.inOut' });   // Set camera position
                    document.getElementById("the_body").style.cursor = "default";       // Turn pointer to default
                    modal.classList.add("open");                                        // Open Dashboard
                    window.removeEventListener('mousemove', onMouseMove);               // Turn off raycasting for onMouseMove
                    window.removeEventListener('click', onMouseClick);                  // Turn off raycasting for onMouseClick

                    // Add table number in Dashboard view
                    document.getElementById("table_num").innerHTML = '<img src="/assets/icons/table-Icon.png" height="15px" style="margin-right: 10px;">Table '+tableNumber;
                    // Add sensor ID in dashboard sensor header
                    document.getElementById("msr-2-id").innerHTML = '#'+ msr_2_ids[tableNumber-1];
                    document.getElementById("air-1-id").innerHTML = '#'+ air_1_ids[tableNumber-1];
                    document.getElementById("smart-plug-1-id").innerHTML = '#'+ smart_plug_1_ids[tableNumber-1];
                    document.getElementById("smart-plug-2-id").innerHTML = '#'+ smart_plug_2_ids[tableNumber-1];
                    
                    current_table = tableNumber;
                    reset_chart(); // Reset chart information
                    initiate_chart(); // Initial update chart information
                    update_sensors(tableNumber);                                            // Initial update for a table
                    dashboard_data = setInterval(() => update_sensors(tableNumber), 5000); // Update every 5s for a table
                
                // If the object at the top is a "sensibo_air" (Aircon) identified via ObjectName as defined here in code
                } else if (ObjectName.includes("sensibo_air")) {
                    if (!has_key) return;                   // Do nothing if user doesn't have API Key
                    aircon_modal.classList.add("open");     // Open Aircon Dashboard if user has API key

                    // Code to look at aircon clicked
                    gsap.to(controls.target, { x: top_object.position.x, y: top_object.position.y, z: top_object.position.z, duration: 1, ease: 'power2.inOut' });
                    // Code to move camera to near aircon clicked
                    if (ObjectName.includes("back_left") || ObjectName.includes("back_right")) {
                        gsap.to(camera.position, { x: top_object.position.x, y: top_object.position.y, z: top_object.position.z - 13, duration: 1, ease: 'power2.inOut' });   // Set camera position
                    } else {
                        gsap.to(camera.position, { x: top_object.position.x, y: top_object.position.y, z: top_object.position.z + 13, duration: 1, ease: 'power2.inOut' });   // Set camera position
                    }

                    window.removeEventListener('mousemove', onMouseMove);               // Turn off raycasting for onMouseMove
                    window.removeEventListener('click', onMouseClick);                  // Turn off raycasting for onMouseClick
                    document.getElementById("the_body").style.cursor = "default";       // Turn pointer to default

                    controls.mouseButtons.RIGHT = null;                   // Turn off rotating
                    controls.mouseButtons.LEFT = null;                       // Turn off panning
                    controls.enableZoom = false;                            // Turn off zooming

                    initialize_remote(ObjectName.slice(0, ObjectName.indexOf("_InputModel")));  // Initialize remote control for selected aircon
                }
            } 
             
    };
    
    // When exit button of Aircon Dashboard is clicked
    document.getElementById("closeAirconModal").addEventListener("click", () => {
        aircon_modal.classList.remove("open"); // Close Aircon Dashboard
        window.addEventListener('mousemove', onMouseMove);                                  // Turn on raycasting for onMouseMove
        window.addEventListener('click', onMouseClick);                                     // Turn on raycasting for onMouseClick
        gsap.to(controls.target,{ x: 0, y: 0, z: 0, duration: 1, ease: 'power2.inOut'});    // Return to default view
        gsap.to(camera.position,{ x: 20, y: 20, z: 20, duration: 1, ease: 'power2.inOut'});

        controls.mouseButtons.RIGHT = THREE.MOUSE.ROTATE;       // Turn on rotation
        controls.mouseButtons.LEFT = THREE.MOUSE.PAN;           // Turn on panning
        controls.enableZoom = true;                            // Turn on zooming
    });

    // Event listsener for mouse click, sets clicked to True. Otherwise, sets it to false.
    window.addEventListener('click', onMouseClick);

    // Define function for updating remote control aircon data
    function initialize_remote(aircon_name) {
        const hvac_modes = [`hvac_off`, `hvac_cool`, `hvac_heat`];
        // Fetch aircon data
        fetch(ip + `/sensibo/${aircon_name}`, { method: 'GET', headers: { 'Accept' : '*/*', 'X-API-KEY' : '54b4310c-da79-441b-b135-d9b00ba073fe'} })
        .then(res => res.json())
        .then(data => {
            // Reset fontWeights of hvac_modes
            hvac_modes.forEach(mode => {
                document.getElementById(mode).style.fontWeight = 'normal';
            });
            // Update aircon data
            document.getElementById("remote_temperature_display").innerHTML = `${data['temperature'].toFixed(1)}`;
            let hvac_mode = `hvac_${data['hvac_mode']}`;
            let set_temp = data['temperature'];
            document.getElementById(`${hvac_mode}`).style.fontWeight = 'bold';

            // Move HVAC mode selector to the left
            document.getElementById(`hvac_left_btn`).onclick = function move_left() {
                let current_index = hvac_modes.indexOf(hvac_mode);
                let new_index = (current_index - 1 + 3) % 3;
                document.getElementById(`${hvac_mode}`).style.fontWeight = 'normal';
                document.getElementById(`${hvac_modes[new_index]}`).style.fontWeight = 'bold';
                hvac_mode = hvac_modes[new_index];
            };

            // Move HVAC mode selector to the right
            document.getElementById(`hvac_right_btn`).onclick = function move_right() {
                let current_index = hvac_modes.indexOf(hvac_mode);
                let new_index = (current_index + 1) % 3;
                document.getElementById(`${hvac_mode}`).style.fontWeight = 'normal';
                document.getElementById(`${hvac_modes[new_index]}`).style.fontWeight = 'bold';
                hvac_mode = hvac_modes[new_index];
            };

            // Increase temperature by 0.1
            document.getElementById("temp_up_btn").onclick = function move_up() {
                let new_temp = parseFloat(document.getElementById("remote_temperature_display").innerHTML) + 0.1;
                if (new_temp > 30) {
                    new_temp = 30;
                }
                set_temp = new_temp;
                document.getElementById("remote_temperature_display").innerHTML = new_temp.toFixed(1);
            };

            // Decrease temperature by 0.1
            document.getElementById("temp_down_btn").onclick = function move_down() {
                let new_temp = parseFloat(document.getElementById("remote_temperature_display").innerHTML) - 0.1;
                if (new_temp < 10) {
                    new_temp = 10;
                }
                set_temp = new_temp;
                document.getElementById("remote_temperature_display").innerHTML = new_temp.toFixed(1);
            };

            // Send new temperature and hvac mode to aircon
            document.getElementById(`set_hvac_mode_btn`).onclick = function set_hvac() {
                send_hvac_mode(aircon_name, hvac_mode.split("_")[1], set_temp.toFixed(1));
            };
        })
        .catch(error => console.error(`Error fetching Sensibo Data:`, error));
    }

    // Define function for sending new hvac mode and temperature to aircon
    function send_hvac_mode(aircon_name, hvac_mode, set_temp) {
        console.log(`Sending ${hvac_mode} and ${set_temp} to ${aircon_name}`);
        fetch(ip + `/sensibo/${aircon_name}/hvac?hvac_mode=${hvac_mode}&target_temperature=${set_temp}`, { method: 'POST', headers: { 'Accept' : '*/*', 'X-API-KEY' : `${API_key}`} })
            .catch(error => console.log(`Error connecting to Sensibo:`, error));
    }

    // Define positions of light
    const bulb_positions =[
        [11, 2.37, -5.15],
        [11, 2.37, -0.22],
        [11, 2.37, 4.74],
        [11, 2.37, 9.71],
        [-1.28, 2.37, -5.15],
        [-1.28, 2.37, -0.22],
        [-1.28, 2.37, 4.74],
        [-1.28, 2.37, 9.71],
        [-2.05, 2.37, -5.15],
        [-2.05, 2.37, -0.22],
        [-2.05, 2.37, 4.74],
        [-2.05, 2.37, 9.71],
        [-13.68, 2.37, -5.15],
        [-13.68, 2.37, -0.22],
        [-13.68, 2.37, 4.74],
        [-13.68, 2.37, 9.71]
    ];
    // Store bulbs/spheres in this array
    const bulbs = [];
    const bulb_geometry = new THREE.SphereGeometry(0.15,8,6);

    // Make bulbs and push into storage array
    bulb_positions.forEach((id, index) => {
        const bulb = new THREE.Mesh(bulb_geometry,  new THREE.MeshToonMaterial({
            color:  0x000000,
        }));
        bulb.position.set(...bulb_positions[index]);
        scene.add(bulb);
        bulbs.push(bulb);
    });

    // Make light sources as well
    const bulb_lights = [];

    // Make lights and push into storage array
    bulb_positions.forEach((id, index) => {
        const ptlight = new THREE.PointLight(new THREE.Color().setRGB( 0.5, 0.5, 0.5 ) , 2, 12);
        ptlight.position.set(...bulb_positions[index]);
        scene.add( ptlight );
        bulb_lights.push(ptlight);
    });

    // Adding 3D Model of Air Gradient One
    const geometry = new THREE.BoxGeometry( 0.5, 0.15, 0.5); 
    const material = new THREE.MeshToonMaterial( { color: 0xedfff9 } );
    const cube = new THREE.Mesh( geometry, material ); 
    cube.position.set(-0.5,2.4,-8);
    cube.castShadow = true;
    cube.receiveShadow = true;
    cube.name = "AirGradientOne_InputModel";
    scene.add( cube );

// [3] Turn on and off ALL the Lights
    const light_switch = document.getElementById("light_switch");
    light_switch.addEventListener("click", () => {
        if (!has_key) return;
        // Fetch depends on light_switch state
        if (light_switch.checked) {
            fetch(ip + '/zigbee2mqtt/table_lights_switch?switch_state=ON', { method: 'POST', headers: { 'Accept' : '*/*', 'X-API-KEY' : `${API_key}`} })
                .catch(error => console.error(`Error fetching tables/set:`, error));
        } else {
            fetch(ip + '/zigbee2mqtt/table_lights_switch?switch_state=OFF', { method: 'POST', headers: { 'Accept' : '*/*', 'X-API-KEY' : `${API_key}`} })
                .catch(error => console.error(`Error fetching tables/set:`, error));
        }
    });

    // [3.1] Check if ALL lights are ON/OFF and adjust the checkbox accordingly
    const zigbeelights_ids = [];

    function check_lights() {
        let all_on = true;
        let all_off = true;
        fetch(ip + '/zigbee2mqtt/table_lights_switch', { method: 'GET', headers: { 'Accept' : '*/*', 'X-API-KEY' : '54b4310c-da79-441b-b135-d9b00ba073fe'} })
            .then(res => res.json())
            .then(data => {
                if (data[`state`] == `ON`){
                    zigbeelights_update();
                    light_switch.checked = true;
                } else {
                    light_switch.checked = false;   // Switch OFF Switch UI
                    // Turn off all spotlights
                    for (let i = 1; i < 17; i++) {
                        spotLights[i-1].intensity = 0;
                    }
                }
            })
            .catch(error => console.error(`Error fetching Zigbee Lights Group Data`, error));

    
    }

    check_lights();
    const light_check = setInterval(check_lights, 2000); // Run function every 1000ms (1s)

    // Define Positions of Blinds #1 fans when CLOSED
    const blinds1_positions_closed = [
        [-15, 4.65, 0.0],
        [-15, 4.65, -0.4],
        [-15, 4.65, -0.8],
        [-15, 4.65, -1.2],
        [-15, 4.65, -1.6],
        [-15, 4.65, -2.0],
        [-15, 4.65, -2.4],
        [-15, 4.65, -2.8],
        [-15, 4.65, -3.2],
        [-15, 4.65, -3.6],
        [-15, 4.65, -4.0],
        [-15, 4.65, -4.4],
    ];
    
    // Store bulbs/spheres in this array
    const blinds1_fans = [];
    const fan_geometry = new THREE.PlaneGeometry(0.35, 3.8);
    const fan_material = new THREE.MeshToonMaterial( {color: 0xe0cc92, side: THREE.DoubleSide} );

    // Make bulbs and push into storage array
    blinds1_positions_closed.forEach((id, index) => {
        const fan = new THREE.Mesh(fan_geometry, fan_material);
        fan.position.set(...blinds1_positions_closed[index]);
        // Rotate fan 15 degrees
        fan.rotateY(-Math.PI/1.8);
        fan.castShadow = true;
        fan.receiveShadow = true;
        scene.add(fan);
        blinds1_fans.push(fan);
    });



// ---------- Properties ----------

// [1] Overview Position Projection (HTML Element Following Object)

// Creation of Label Renderer as a CSS2D Renderer
    let labelRenderer = new CSS2DRenderer();
    labelRenderer.setSize( window.innerWidth, window.innerHeight );
    labelRenderer.domElement.style.position = 'absolute';   // Place on top most layer
    labelRenderer.domElement.style.top = '0px';
    labelRenderer.domElement.style.pointerEvents = 'none';  // Do not capture mouse events
    document.body.appendChild( labelRenderer.domElement );

// Creation of HTML Objects that will be placed as MSR-2 Temperature labels on 3D space
    const temp_labels = [];

    table_positions.forEach((pos) => {
        let tempElement = document.createElement('p');
        tempElement.textContent = "Loading..."; // Placeholder for REST API data
        tempElement.className = "label";  // Apply styling based on temperature

        let tempLabel = new CSS2DObject(tempElement);
        scene.add(tempLabel);
        tempLabel.position.set(...pos);

        temp_labels.push(tempElement); // Store references for later updates
    });

// Hide labels if checkbox is turned off
    const temp_checkbox = document.getElementById("temp_checkbox");

    function checkbox()  {
        let msr2_opacityValue = temp_checkbox.checked ? '75%' : '0%';    // true : false
        let sensibo_opacityValue = temp_checkbox.checked ? '50%' : '0%';    // true : false

        for (let i = 0; i < 16; i++) {
            temp_labels[i].style.opacity = msr2_opacityValue;
        }
        for (let i = 0; i < 4; i++) {
            sensibo_labels[i].style.opacity = sensibo_opacityValue;
        }
    }

// Creation of HTML Objects that will be placed as Sensibo State Labels
    const sensibo_positions = [
        [-7, 7.7, 14.8],    // back-left
        [3.5, 7.7, 14.8],    // back-right
        [-7, 7.7, -15.2],   // front-left
        [3.5, 7.7, -15.2]  // front-right

    ]
    const sensibo_labels = [];

    sensibo_positions.forEach((pos) => {
        let sensiboElement = document.createElement('p');
        sensiboElement.textContent = "Loading..."; // Placeholder for REST API data
        sensiboElement.className = "sensibo_label";  // Apply styling based on temperature

        let tempLabel = new CSS2DObject(sensiboElement);
        scene.add(tempLabel);
        tempLabel.position.set(...pos);

        sensibo_labels.push(sensiboElement); // Store references for later updates
    });

// Creation of HTML Object that will be placed as Air Gradient One label
    const air_gradient_one_label = document.createElement('p');
    air_gradient_one_label.innerHTML = "Loading AG1..."; // Placeholder for REST API data
    air_gradient_one_label.className = "AG1_label";  // Apply styling based on temperature

    let airGradientOneLabel = new CSS2DObject(air_gradient_one_label);
    scene.add(airGradientOneLabel);
    airGradientOneLabel.position.set(1.5,2.4,-8);
    air_gradient_one_label.style.opacity = '0%'; // Initially hidden
    

// [2] Getting Information from REST API

// API for get requests
var time_update;

// Future reference: GET msr_2_ids instead?
const msr_2_ids = [
    '2b7624',
    '87a5f4',
    'c07ce8',
    'cc0b5c',
    '89f464',
    '87a5dc',
    '1ee998',
    '87a5ec',
    '1ef110',
    '87a298',
    '89304c',
    '88edc8',
    'cd7014',
    'c660fc',
    'c8f5b4',
    'c7b650'
];

const air_1_ids = [
    '88e4c8',
    '89e8d8',
    '88e590',
    '87b074',
    '889720',
    '87f510',
    '2da640',
    '89ea14',
    '889b88',
    '889938',
    '88e85c',
    '89e548',
    '88970c',
    '2deb24',
    '89e5f0',
    'cc8f24'
];

const smart_plug_1_ids =[
    '9d86e0',
    '9d9572',
    '9d923d',
    '9d929b',
    '9d88e7',
    '9d929e',
    '9d9421',
    '9d89d4',
    '9d92a3',
    '9d8718',
    '9d3535',
    '9d90c3',
    '9d97ec',
    '9d927c',
    '9d88c5',
    '9cdee5'
];

const smart_plug_2_ids = [
    '9d86aa',
    '9d93d2',
    '9d8665',
    '9d9293',
    '9d924e',
    '9d9265',
    '9d8877',
    '9d8a03',
    '9d88e6',
    '9cda9a',
    '9d90b9',
    '9d94a6',
    '9d8671',
    '9d356f',
    '9d887f',
    '9d893e'
];

// To add: Update ALL table's AIR-1 Live Temperature and MSR-2 LED State
function table_update() {
    // Update live temeprature
    air_1_ids.forEach((id, index) => {
        fetch(ip + `/air-1/${id}`, { method: 'GET', headers: { 'Accept' : '*/*', 'X-API-KEY' : '54b4310c-da79-441b-b135-d9b00ba073fe'} })
            .then(res => res.json())
            .then(data => {
                // Changing the temperature value
                if (temp_labels[index]) {
                    temp_labels[index].textContent = `${(data['temperature']).toFixed(2)}°C`;
                }
                // REMOVE THIS FOR LAST UPDATED TIME -- DASHBOARD HEADER
                if (id == '87b074') {
                    let new_time = new Date(data['timestamp']);
                    time_update = `Server last updated: ${new_time}`;
                    // Add last updated time in Dashboard view
                    document.getElementById("last_update").innerHTML = time_update;
                }
            })
            .catch(error => console.error(`Error fetching sensor ${id}:`, error));
        });
    msr_2_ids.forEach((id, index) => {
        fetch(ip + `/msr-2/${id}`, { method: 'GET', headers: { 'Accept' : '*/*', 'X-API-KEY' : '54b4310c-da79-441b-b135-d9b00ba073fe'} })
            .then(res => res.json())
            .then(data => {
                // Update MSR-2 Lights/Bulbs here

                // If light state is OFF
                if(data['state'] == false) {
                    // Turn the bulb model OFF
                    bulbs[index].material.color.set(0.5,0.5,0.5);
                    bulb_lights[index].color.set(0,0,0);
                    occupancy_models[index].visible = false;
                    light_occupancy[index].intensity = 0;

                } else {
                    // Set colors
                    bulbs[index].material.color.set(data['r'], data['g'], data['b']);
                    bulb_lights[index].color.set(data['r'], data['g'], data['b']);

                    // Set brightness
                    bulb_lights[index].power = data['brightness'];

                    // Set occupancy indicator ()
                    occupancy_models[index].visible = true;
                    light_occupancy[index].intensity = 0.5;
                }

                // Make horn model visible if buzzer state is ON
                if(data['buzzer_state'] == true) {
                    horn_models[index].visible = true;
                } else {
                    horn_models[index].visible = false;
                }

            })
        });

    }

table_update();
const table_temperature = setInterval(table_update, 1000); // Run function every 1000ms (1s)

// Creation of spotLights and storing them to an array
const spotLights = [];

table_positions.forEach((id, index) => {
    const spotLight = new THREE.SpotLight( 0xffffff );
    spotLight.position.set(table_positions[index][0],7,table_positions[index][2]);
    spotLight.target = tables[index];
    spotLight.angle =  Math.PI/7;
    spotLight.intensity = 50;
    spotLight.castShadow = false;
    spotLight.penumbra = 0.2;
    scene.add( spotLight );
    spotLights.push(spotLight);    
  });

// Functions to convert RGB to hexcode
  const componentToHex = (c) => {
    const hex = c.toString(16);
    return hex.length == 1 ? "0" + hex : hex;
  }
  
  const rgbToHex = (r, g, b) => {
    return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
  }

// Function to update Zigbee Light per table/workstation
function zigbeelights_update() {
    // Update Zigbee lights
    for (let i = 1; i < 17; i++) {
        fetch(ip + `/zigbee2mqtt/table_${i}`, { method: 'GET', headers: { 'Accept' : '*/*', 'X-API-KEY' : '54b4310c-da79-441b-b135-d9b00ba073fe'} })
            .then(res => res.json())
            .then(data => {
                if(data['state']=="OFF"){
                    spotLights[i-1].intensity = 0;
                } else{
                    spotLights[i-1].intensity = data['brightness']/2;
                    let g = Math.floor(-0.3*(data['color_temp']-153) + 255);
                    let b = Math.floor(-0.6*(data['color_temp']-153) + 255);
                    spotLights[i-1].color.set(rgbToHex(255,g,b));
                }

            })
            .catch(error => console.error(`Error fetching Zigbee Light table_${i}:`, error));
      }
}

// Call the function to update Zigbee2MQTT Lights here (spotlight)
zigbeelights_update();

function zigbeeblinds_update() {
    // Update Zigbee blinds
    fetch(ip + `/zigbee2mqtt/aqara_driver_1`, { method: 'GET', headers: { 'Accept' : '*/*', 'X-API-KEY' : '54b4310c-da79-441b-b135-d9b00ba073fe'} })
    .then(res => res.json())
    .then(data => {
        blinds1_fans.forEach((fan, index) => {
            let scale = 1 - 0.85*(1 - data['position']/100);
            fan.position.set(blinds1_positions_closed[index][0],blinds1_positions_closed[index][1],blinds1_positions_closed[index][2]*scale)
            fan.rotation.set(0,-Math.PI/(1.4+(scale*0.4)),0);
        });
    })
    .catch(error => console.error(`Error fetching Zigbee Blinds State:`, error));
}

// Call the function to update Zigbee2MQTT Blinds here
zigbeeblinds_update();
const blinds_state = setInterval(zigbeeblinds_update, 5000); // Run function every 5000ms (5s)

// Get and store all available Sensibo Air Pro IDs
const sensibo_ids = [];

fetch(ip + '/sensibo', { method: 'GET', headers: { 'Accept' : '*/*', 'X-API-KEY' : '54b4310c-da79-441b-b135-d9b00ba073fe'} })
    .then(res => res.json())
    .then(data => {
        sensibo_ids.push(data[0]);
        sensibo_ids.push(data[1]);
        sensibo_ids.push(data[2]);
        sensibo_ids.push(data[3]);
        sensibo_update();
    })
    .catch(error => console.error(`Error fetching Sensibo IDs:`, error));

const sensibo_state = setInterval(sensibo_update, 5000); // Run function every 5000ms (5s)

// Function to update sensibo labels
function sensibo_update() {
    for (let i = 0; i < 4; i++) {
        fetch(ip + `/sensibo/${sensibo_ids[i]}`, { method: 'GET', headers: { 'Accept' : '*/*', 'X-API-KEY' : '54b4310c-da79-441b-b135-d9b00ba073fe'} })
            .then(res => res.json())
            .then(data => {
                sensibo_labels[i].textContent = `${data['temperature'].toFixed(1)} °C`;
                
                if (data['hvac_mode'] == 'heat') {
                    sensibo_labels[i].style.color = 'darkred';
                    sensibo_labels[i].style.borderColor = 'darkred';
                } else if (data['hvac_mode'] == 'cool'){
                    sensibo_labels[i].style.color = '#84c7d3';
                    sensibo_labels[i].style.borderColor = '#5cb5c5';
                } else {
                    sensibo_labels[i].style.color = '#202020';
                    sensibo_labels[i].style.borderColor = '#494949';
                }
            })
            .catch(error => console.error(`Error fetching Sensibo ${i}:`, error));
    }
}

// Get and store available Air Gradient One ID
var air_gradient_one_id;

fetch(ip + '/ag-one', { method: 'GET', headers: { 'Accept' : '*/*', 'X-API-KEY' : '54b4310c-da79-441b-b135-d9b00ba073fe'} })
    .then(res => res.json())
    .then(data => {
        air_gradient_one_id = data[0];
        air_gradient_one_update();
    })
    .catch(error => console.error(`Error fetching Air Gradient One ID:`, error));

// Function to update Air Gradient One label
function air_gradient_one_update() {
    fetch(ip + `/ag-one/${air_gradient_one_id}`, { method: 'GET', headers: { 'Accept' : '*/*', 'X-API-KEY' : '54b4310c-da79-441b-b135-d9b00ba073fe'} })
        .then(res => res.json())
        .then(data => {
            air_gradient_one_label.innerHTML =    
                `${data['timestamp']} <br>
                CO2: ${data['co2'].toFixed(1)} <br>
                Temp: ${data['temperature'].toFixed(1)} <br>
                Humidity: ${data['humidity'].toFixed(1)} <br>
                NOX: ${data['nox'].toFixed(1)} <br>
                VOC: ${data['voc'].toFixed(1)} <br>
                PM0.3: ${data['pm_0_3'].toFixed(1)}`;
                
        })
        .catch(error => console.error(`Error fetching Air Gradient One:`, error));
}

const ag1_state = setInterval(air_gradient_one_update, 5000); // Run function every 5000ms (5s)


// Function to update data in Dashboard view
function update_sensors(table_no){
    fetch(ip + `/msr-2/${msr_2_ids[table_no-1]}`, { method: 'GET', headers: { 'Accept' : '*/*', 'X-API-KEY' : '54b4310c-da79-441b-b135-d9b00ba073fe'} })    // IP address to change
            .then(res => res.json())
            .then(data => {
                let keys = Object.keys(data);           // Store keys (parameters) in JSON to temporary variable
                let new_data = "";                      // Store new data to be shown as HTML
                
                keys.forEach((id, index) => {           // For each parameter, careful with changing this
                    if (keys[index] == 'timestamp') {
                        let time = new Date(data[keys[index]]);
                        new_data = new_data + 
                        `<div class="key-value">
                        <p class="key">${keys[index]}</p>
                        <p class="value">${time.toUTCString()}</p>
                        </div>`;
                    } else {
                        new_data = new_data + 
                        `<div class="key-value">
                        <p class="key">${keys[index]}</p>
                        <p class="value">${data[keys[index]]}</p>
                        </div>`;
                    }
                });
                document.getElementById("msr-2-data").innerHTML = new_data;
            });
    fetch(ip + `/air-1/${air_1_ids[table_no-1]}`, { method: 'GET', headers: { 'Accept' : '*/*', 'X-API-KEY' : '54b4310c-da79-441b-b135-d9b00ba073fe'} })    // IP address to change
            .then(res => res.json())
            .then(data => {
                let keys = Object.keys(data);           // Store keys (parameters) in JSON to temporary variable
                let new_data = "";                      // Store new data to be shown as HTML
                keys.forEach((id, index) => {           // For each parameter, careful with changing this
                    if (keys[index] == 'timestamp') {
                        let time = new Date(data[keys[index]]);
                        new_data = new_data + 
                        `<div class="key-value">
                        <p class="key">${keys[index]}</p>
                        <p class="value">${time.toUTCString()}</p>
                        </div>`;
                    } else {
                        new_data = new_data + 
                        `<div class="key-value">
                        <p class="key">${keys[index]}</p>
                        <p class="value">${data[keys[index]]}</p>
                        </div>`;
                    }
                });
                document.getElementById("air-1-data").innerHTML = new_data;
            });
    fetch(ip + `/smart-plug-v2/${smart_plug_1_ids[table_no-1]}`, { method: 'GET', headers: { 'Accept' : '*/*', 'X-API-KEY' : '54b4310c-da79-441b-b135-d9b00ba073fe'} })    // IP address to change
            .then(res => res.json())
            .then(data => {
                let keys = Object.keys(data);           // Store keys (parameters) in JSON to temporary variable
                let new_data = "";                      // Store new data to be shown as HTML
                keys.forEach((id, index) => {           // For each parameter, careful with changing this
                    if (keys[index] == 'timestamp') {
                        let time = new Date(data[keys[index]]);
                        new_data = new_data + 
                        `<div class="key-value">
                        <p class="key">${keys[index]}</p>
                        <p class="value">${time.toUTCString()}</p>
                        </div>`;
                    } else {
                        new_data = new_data + 
                        `<div class="key-value">
                        <p class="key">${keys[index]}</p>
                        <p class="value">${data[keys[index]]}</p>
                        </div>`;
                    }
                });
                document.getElementById("smart-plug-1-data").innerHTML = new_data;
            });
    fetch(ip + `/smart-plug-v2/${smart_plug_2_ids[table_no-1]}`, { method: 'GET', headers: { 'Accept' : '*/*', 'X-API-KEY' : '54b4310c-da79-441b-b135-d9b00ba073fe'} })    // IP address to change
            .then(res => res.json())
            .then(data => {
                let keys = Object.keys(data);           // Store keys (parameters) in JSON to temporary variable
                let new_data = "";                      // Store new data to be shown as HTML
                keys.forEach((id, index) => {           // For each parameter, careful with changing this
                    if (keys[index] == 'timestamp') {
                        let time = new Date(data[keys[index]]);
                        new_data = new_data + 
                        `<div class="key-value">
                        <p class="key">${keys[index]}</p>
                        <p class="value">${time.toUTCString()}</p>
                        </div>`;
                    } else {
                        new_data = new_data + 
                        `<div class="key-value">
                        <p class="key">${keys[index]}</p>
                        <p class="value">${data[keys[index]]}</p>
                        </div>`;
                    }
                });
                document.getElementById("smart-plug-2-data").innerHTML = new_data;
            });
    update_chart();
}

// [3] Downloading Historical Data from REST API while on Dashboard view

    // Helpers for showing input view
var dash_on = false;
const change_interface = document.getElementById("download_data");

change_interface.addEventListener("click",show_download_options);

function show_download_options() {
    if(dash_on){
        // Go back to output data
        document.getElementById("output_data").innerHTML = `
                  <div class="sensor_data " id="msr-2-data">
            <!--Added via JavaScript innerHTML-->
          </div>
          <div class="sensor_data" id="air-1-data">
            <!--Added via JavaScript innerHTML-->
          </div>
          <div class="sensor_data" id="smart-plug-1-data">
            <!--Added via JavaScript innerHTML-->
          </div>
          <div class="sensor_data" id="smart-plug-2-data">
            <!--Added via JavaScript innerHTML-->
          </div>
        `;
        update_sensors(current_table);                                                  // Initial update for a table
        dashboard_data = setInterval(() => update_sensors(current_table), 10000);       // Update every 10s for a table
        document.getElementById("dash_body_header").style.opacity = '100%';             // Show devices and sensor IDs
        document.getElementById("output_data").style.justifyContent = 'space-between';  // Hide devices and sensor IDs
        document.getElementById("output_data").style.display = 'flex';                  // Hide devices and sensor IDs
        document.getElementById("text_change").innerHTML = "Download Data";             // Change from "Display Data" -> "Download Data"
        document.getElementById("dl_icon").src = "./assets/icons/download_icon.png";    // Change icon
        document.getElementById("chart_div").style.opacity = '1';                       // Show Chart
    }else{
        // Switch to download data view
        clearInterval(dashboard_data);
        document.getElementById("dl_icon").src = "./assets/icons/minimize_icon.png";    // Change icon
        document.getElementById("text_change").innerHTML = "Display Data";              // Change from "Download Data" -> "Display Data"
        document.getElementById("dash_body_header").style.opacity = '0%';               // Hide devices and sensor IDs
        document.getElementById("output_data").style.justifyContent = 'space-around';   // Hide devices and sensor IDs
        document.getElementById("output_data").style.display = 'block';                 // Hide devices and sensor IDs
        document.getElementById("output_data").innerHTML = `
        <h2 style="color: white; font-family:'Segoe UI'">Download Device Historical Data</h2>
        <div class="input_div">
            <label class="download_label" for="start_time">Start Date and Time:</label>
            <input class="date_select" type="datetime-local" id="start_time" name="start_time">
        </div>
        <div class="input_div">
            <label class="download_label" for="end_time">End Date and Time:</label>
            <input class="date_select" type="datetime-local" id="end_time" name="end_time">
        </div>
        <div class="input_div">
            <label class="download_label for="select_device">Select Device:</label>

            <select name="select_device" id="select_device">
            <option value="msr-2">msr-2: ${msr_2_ids[current_table-1]}</option>
            <option value="air-1">air-1: ${air_1_ids[current_table-1]}</option>
            <option value="smart-plug-1">[1] smart-plug-v2: ${smart_plug_1_ids[current_table-1]}</option>
            <option value="smart-plug-2">[2] smart-plug-v2: ${smart_plug_2_ids[current_table-1]}</option>
            </select>
        </div>
        <button style="margin-top: 20px;" id="download_button">Download</button>
        <p style="color: red; font-weight: bold; opacity: 0; font-family: 'Segoe UI'" id="warning">Please double check your input date(s).</p>

        `;

        let download_button = document.getElementById("download_button");
        download_button.addEventListener("click", () => download_device_data());

        document.getElementById("chart_div").style.opacity = '0';                 // Hide Chart
    }
    dash_on = !dash_on;
}

    // Function to GET from REST API itself
function download_device_data() {
    let start = new Date(document.getElementById("start_time").value);
    let end = new Date(document.getElementById("end_time").value);
    let device = document.getElementById("select_device").value;
    // console.log(start + end + device);

    if(start == "Invalid Date" || end == "Invalid Date"){
        // If input is lacking, inform the user and don't do anything
        document.getElementById("warning").innerHTML = "Please double check your input date(s).";
        document.getElementById("warning").style.opacity = 0.9;
    }else if(end < start){
        // If input makes no sense, warn the user and don't do anything
        document.getElementById("warning").innerHTML = "End date is before start date.";
        document.getElementById("warning").style.opacity = 0.9;
    }else{
        // If all good, fetch the data (if any)
        document.getElementById("warning").innerHTML = "Please double check your input date(s).";
        document.getElementById("warning").style.opacity = 0;

        let sensor_id;
        if(device == 'msr-2'){
            sensor_id = msr_2_ids[current_table-1];
        }else if(device == 'air-1'){
            sensor_id = air_1_ids[current_table-1];
        }else if(device == 'smart-plug-1'){
            sensor_id = smart_plug_1_ids[current_table-1];
        }else{
            sensor_id = smart_plug_2_ids[current_table-1];
        }

        start = encodeURIComponent(start.toISOString());
        end = encodeURIComponent(end.toISOString());
        let query = `time_start=${start}&time_end=${end}`;
        console.log(ip + `/${device}/${sensor_id}?${query}`);
        fetch(ip + `/${device}/${sensor_id}?${query}`, { method: 'GET', headers: { 'Accept' : '*/*', 'X-API-KEY' : '54b4310c-da79-441b-b135-d9b00ba073fe'} })    // GET Historical Data
            .then(res => res.json())
            .then(data => {
                console.log(data);
                // Convert data to a JSON string
                let jsonString = JSON.stringify(data, null, 2);

                // Create a Blob (Binary Large Object) with JSON content
                let blob = new Blob([jsonString], { type: "application/json" });

                // Create a temporary download link
                let a = document.createElement("a");
                a.href = URL.createObjectURL(blob);
                a.download = "data.json"; // File name

                // Trigger download
                document.body.appendChild(a);
                a.click();

                // Cleanup
                document.body.removeChild(a);
                URL.revokeObjectURL(a.href);
            });

    }
}

// [4] Displaying data onto graph

// Define chart element
const ctx = document.getElementById('myChart');

// Define chart properties
var values = [];

var info = {
  labels: [],
  datasets: [{
    label: 'AIR-1 Temperature (°C)',
    data: values,
    fill: true,
    borderColor: 'rgb(75, 192, 192)',
    tension: 0,
    pointBackgroundColor: 'rgb(75, 192, 192)',
  }]
};
const config = {
    type: 'line',
    data: info,
  };

// Initiate chart
const chart = new Chart(ctx, config);

function initiate_chart() {
    let end_time;
    let start_time;
    let end;
    let start;
    // Get most recent timestamp
    fetch(ip + `/msr-2/${msr_2_ids[current_table-1]}`, { method: 'GET', headers: { 'Accept' : '*/*', 'X-API-KEY' : '54b4310c-da79-441b-b135-d9b00ba073fe'} })    // IP address to change
            .then(res => res.json())
            .then(data => {
                end_time = new Date(Date.parse(data['timestamp']));
                start_time = new Date(end_time.getTime() - 50*1000); // Last 1 minute
                end = encodeURIComponent(end_time.toISOString()).replace(':', '%3A').replace('Z', '').replace('T', '%20');
                start = encodeURIComponent(start_time.toISOString()).replace(':', '%3A').replace('Z', '').replace('T', '%20');
                // Fetch 5 most recent timestamp data
                fetch(ip + `/msr-2/${msr_2_ids[current_table-1]}?time_start=${start}&time_end=${end}`, { method: 'GET', headers: { 'Accept' : '*/*', 'X-API-KEY' : '54b4310c-da79-441b-b135-d9b00ba073fe'} })    // IP address to change
                .then(res => res.json())
                .then(data => {
                    for (let i = data.length-1; i >=0; i--) {
                        values.push(data[i]['temperature']);
                        info['labels'].push(data[i]['timestamp']);
                        chart.update();
                    }
                });
            });
}

function update_chart() {
    fetch(ip + `/msr-2/${msr_2_ids[current_table-1]}`, { method: 'GET', headers: { 'Accept' : '*/*', 'X-API-KEY' : '54b4310c-da79-441b-b135-d9b00ba073fe'} })    // IP address to change
            .then(res => res.json())
            .then(data => {
                // Exit if the data is the same as the last one
                if (data['timestamp'] == info['labels'][info['labels'].length-1]) return;

                values.push(data['temperature']);
                values.shift();
                info['labels'].push(data['timestamp']);
                info['labels'].shift();
                chart.update();
            });
}

function reset_chart() {
    chart.data.labels = [];
    values = [];
    chart.data.datasets[0]['data'] = values;
    info['datasets'][0]['label'] = 'MSR-2 Temperature';
}



// ---------- RENDERING ----------
// For Camera Testing:
const cam_test = document.getElementById("CAM_TEST");

// [X] Creating a looping function
function animate(t = 0) {
    cam_test.innerHTML = camera.position.x.toFixed(2) + " " + camera.position.y.toFixed(2) + " " + camera.position.z.toFixed(2);
    requestAnimationFrame(animate);
    renderer.render(scene, camera);         // Render Scene
    controls.update();                      // Update OrbitControls
    composer.render();                      // Render Composre (for OutlinePass)
    labelRenderer.render(scene, camera);    // Render Labels
    checkbox();                             // Check if checkbox is selected

    // Animate rotation of visible occupancy models
    occupancy_models.forEach((id, index) => {
        occupancy_models[index].rotation.y += 0.005;
    });

    // Animate rotation of visible horn models
    horn_models.forEach((id, index) => {
        horn_models[index].rotation.x += 0.01;
        horn_models[index].scale.x = 0.05 + 0.005*Math.sin(t/200);
        horn_models[index].scale.y = 0.05 + 0.005*Math.sin(t/200);
        horn_models[index].scale.z = 0.05 + 0.005*Math.sin(t/200);
    });

  };
  animate();

// For when window resizes
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    labelRenderer.setSize(window.innerWidth, window.innerHeight); // Resize CSS2DRenderer
})
