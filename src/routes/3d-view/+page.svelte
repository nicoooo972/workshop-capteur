<script lang="ts">
    import { onMount } from 'svelte';
    import * as THREE from 'three';
    import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
    import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
    import { onValue, ref, update, get } from 'firebase/database';
    import { db } from '$lib/firebase';
    import { goto } from '$app/navigation';

    // Définition des interfaces
    interface SensorData {
        id: string;
        roomName: string;
        temperature: number;
        co2: number;
        humidity: number;
        timestamp: number;
        title: string;
        position?: { x: number; y: number; z: number };
    }

    // Variables Three.js
    let canvas: HTMLCanvasElement;
    let scene: THREE.Scene;
    let camera: THREE.PerspectiveCamera;
    let renderer: THREE.WebGLRenderer;
    let controls: OrbitControls;
    let currentModel: THREE.Object3D | null = null;

    // État de l'application
    let currentFloor = 0;
    let loading = true;
    let error = '';
    let sensorsData: SensorData[] = [];
    let editMode = false;
    let selectedSensor: string | null = null;
    let selectedSensorInfo: SensorData | null = null;
    let showSensorInfo = false;

    // Variables de positionnement
    let placementPlane: THREE.Mesh;
    let mousePosition = new THREE.Vector3();
    let raycaster = new THREE.Raycaster();
    let clickMouse = new THREE.Vector2();

    // Configuration des étages
    const floors = [
        { id: -1, name: 'Sous-sol', model: 'src/models/Workshop sous-sol.glb' },
        { id: 0, name: 'RDC', model: 'src/models/Workshop rdc.glb' },
        { id: 1, name: '1er étage', model: 'src/models/Workshop etage1.glb' },
        { id: 2, name: '2ème étage', model: 'src/models/Workshop etage2.glb' },
        { id: 3, name: '3ème étage', model: 'src/models/Workshop etage3.glb' },
        { id: 4, name: '4ème étage', model: 'src/models/Workshop etage4.glb' },
        { id: 5, name: '5ème étage', model: 'src/models/Workshop etage5.glb' }
    ];

    // Initialisation de la scène Three.js
    function initScene() {
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0xf5f5f5);
        
        camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.set(10, 10, 10);
        
        renderer = new THREE.WebGLRenderer({ 
            canvas,
            antialias: true
        });
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        setupLighting();
        setupControls();

        const grid = new THREE.GridHelper(20, 20, 0x888888, 0x888888);
        scene.add(grid);

        animate();
    }

    // Configuration de l'éclairage
    function setupLighting() {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
        scene.add(ambientLight);

        const directionalLight1 = new THREE.DirectionalLight(0xffffff, 0.5);
        directionalLight1.position.set(5, 5, 5);
        directionalLight1.castShadow = true;
        configureLight(directionalLight1);
        scene.add(directionalLight1);

        const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.3);
        directionalLight2.position.set(-5, 5, -5);
        directionalLight2.castShadow = true;
        configureLight(directionalLight2);
        scene.add(directionalLight2);

        const directionalLight3 = new THREE.DirectionalLight(0xffffff, 0.2);
        directionalLight3.position.set(0, 5, 0);
        directionalLight3.castShadow = true;
        configureLight(directionalLight3);
        scene.add(directionalLight3);
    }

    function configureLight(light: THREE.DirectionalLight) {
        light.shadow.mapSize.width = 2048;
        light.shadow.mapSize.height = 2048;
        light.shadow.camera.near = 0.5;
        light.shadow.camera.far = 50;
        light.shadow.camera.left = -10;
        light.shadow.camera.right = 10;
        light.shadow.camera.top = 10;
        light.shadow.camera.bottom = -10;
    }

    // Configuration des contrôles
    function setupControls() {
        controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.screenSpacePanning = false;
        controls.minDistance = 5;
        controls.maxDistance = 20;
        controls.maxPolarAngle = Math.PI / 2;
    }

    // Animation
    function animate() {
        requestAnimationFrame(animate);
        
        scene.children
            .filter(child => child.userData.isSensor)
            .forEach(sensor => {
                if (sensor.userData.animate) {
                    sensor.userData.animate();
                }
            });
        
        controls.update();
        renderer.render(scene, camera);
    }

    // Gestion du redimensionnement
    function handleResize() {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }

    // Initialisation du plan de placement
    function initPlacementPlane() {
        const geometry = new THREE.PlaneGeometry(20, 20);
        const material = new THREE.MeshBasicMaterial({
            color: 0xffff00,
            transparent: true,
            opacity: 0.2,
            side: THREE.DoubleSide,
            visible: false
        });
        placementPlane = new THREE.Mesh(geometry, material);
        placementPlane.rotation.x = -Math.PI / 2;
        scene.add(placementPlane);
    }

    // Gestion des modèles 3D
    function loadFloorModel(floorId: number) {
        const floor = floors.find(f => f.id === floorId);
        if (!floor) return;

        loading = true;
        error = '';

        cleanupCurrentModel();

        const loader = new GLTFLoader();
        loader.load(
            floor.model,
            (gltf) => {
                setupNewModel(gltf);
                loading = false;
            },
            undefined,
            (err) => {
                error = `Erreur de chargement: ${err.message}`;
                loading = false;
            }
        );
    }

    function cleanupCurrentModel() {
        if (currentModel) {
            scene.remove(currentModel);
            currentModel.traverse((child) => {
                if (child instanceof THREE.Mesh) {
                    if (child.geometry) child.geometry.dispose();
                    if (child.material) {
                        if (Array.isArray(child.material)) {
                            child.material.forEach(material => material.dispose());
                        } else {
                            child.material.dispose();
                        }
                    }
                }
            });
            currentModel = null;
        }
    }

    function setupNewModel(gltf: any) {
        currentModel = gltf.scene;
        
        currentModel.traverse((child) => {
            if (child instanceof THREE.Mesh) {
                child.material = new THREE.MeshPhongMaterial({
                    color: 0x808080,
                    shininess: 30,
                    flatShading: false,
                    side: THREE.DoubleSide,
                });
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });

        scene.add(currentModel);

        const box = new THREE.Box3().setFromObject(currentModel);
        const center = box.getCenter(new THREE.Vector3());
        controls.target.copy(center);
        camera.lookAt(center);

        updateSensorVisuals();
    }

    // Gestion des capteurs
    function createSensorIndicator(data: SensorData) {
        const geometry = new THREE.SphereGeometry(0.2, 16, 16);
        const material = new THREE.MeshPhongMaterial({
            color: getSensorColor(data.temperature, data.co2),
            emissive: getSensorColor(data.temperature, data.co2),
            emissiveIntensity: 0.2
        });
        const indicator = new THREE.Mesh(geometry, material);
        
        const pointLight = new THREE.PointLight(
            getSensorColor(data.temperature, data.co2),
            0.5,
            1
        );
        indicator.add(pointLight);
        
        // Animation
        const initialScale = indicator.scale.clone();
        indicator.userData.animate = () => {
            indicator.scale.copy(initialScale).multiplyScalar(1 + Math.sin(Date.now() * 0.003) * 0.1);
        };
        
        return indicator;
    }

    function getSensorColor(temperature: number, co2: number): number {
        if (co2 > 1000) return 0xff0000;
        if (temperature > 26) return 0xff6b6b;
        if (temperature < 18) return 0x6b6bff;
        return 0x00ff00;
    }

    function updateSensorVisuals() {
        scene.children
            .filter(child => child.userData.isSensor)
            .forEach(sensor => scene.remove(sensor));

        sensorsData.forEach(data => {
            if ((!editMode && data.position) || (editMode && data.id === selectedSensor)) {
                const indicator = createSensorIndicator(data);
                indicator.userData.isSensor = true;
                indicator.userData.sensorData = data;
                
                if (editMode && !data.position) {
                    indicator.position.copy(mousePosition);
                } else if (data.position) {
                    indicator.position.set(data.position.x, data.position.y, data.position.z);
                }
                
                scene.add(indicator);
            }
        });
    }

    function updateSensorsData(data: any) {
        if (!data) {
            console.log("Pas de données reçues de Firebase");
            sensorsData = [];
            return;
        }

        try {
            sensorsData = Object.entries(data).map(([sensorKey, sensorData]: [string, any]) => {
                if (!sensorData) return null;

                const reports = Object.entries(sensorData)
                    .map(([key, value]) => ({
                        id: parseInt(key),
                        ...value as any
                    }))
                    .sort((a, b) => b.id - a.id);

                const latestData = reports[0];
                
                if (!latestData || !latestData.temperature || !latestData.co2 || !latestData.humidity) return null;

                return {
                    id: sensorKey,
                    roomName: `Salle ${sensorKey.split('_').slice(1).join('_')}`,
                    temperature: Number(latestData.temperature),
                    co2: Number(latestData.co2),
                    humidity: Number(latestData.humidity),
                    timestamp: latestData.timestamp || Date.now(),
                    title: latestData.title || '',
                    position: latestData.position
                };
            }).filter(data => data !== null);

            updateSensorVisuals();
        } catch (error) {
            console.error("Erreur lors du traitement des données:", error);
            sensorsData = [];
        }
    }

    // Gestion des interactions
    function handleSensorClick(event: MouseEvent) {
        if (editMode) return;

        const rect = canvas.getBoundingClientRect();
        clickMouse.x = ((event.clientX - rect.left) / canvas.clientWidth) * 2 - 1;
        clickMouse.y = -((event.clientY - rect.top) / canvas.clientHeight) * 2 + 1;

        raycaster.setFromCamera(clickMouse, camera);
        const sensors = scene.children.filter(child => child.userData.isSensor);
        const intersects = raycaster.intersectObjects(sensors);

        if (intersects.length > 0) {
            const clickedSensor = intersects[0].object;
            selectedSensorInfo = clickedSensor.userData.sensorData;
            showSensorInfo = true;
        } else {
            selectedSensorInfo = null;
            showSensorInfo = false;
        }
    }

    function onSensorSelect(sensorId: string | null) {
        selectedSensor = sensorId;
        updateSensorVisuals();
    }

    function toggleEditMode() {
        editMode = !editMode;
        controls.enabled = !editMode;
        placementPlane.material.visible = editMode;
        
        if (editMode) {
            canvas.addEventListener('mousemove', onMouseMove);
            canvas.addEventListener('click', onPlacementClick);
        } else {
            canvas.removeEventListener('mousemove', onMouseMove);
            canvas.removeEventListener('click', onPlacementClick);
            selectedSensor = null;
        }
        
        updateSensorVisuals();
    }

    function onMouseMove(event: MouseEvent) {
        const rect = canvas.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / canvas.clientWidth) * 2 - 1;
        const y = -((event.clientY - rect.top) / canvas.clientHeight) * 2 + 1;

        raycaster.setFromCamera(new THREE.Vector2(x, y), camera);
        const intersects = raycaster.intersectObject(placementPlane);
        
        if (intersects.length > 0) {
            mousePosition.copy(intersects[0].point);
            updateSensorVisuals();
        }
    }

    async function onPlacementClick() {
        if (!selectedSensor || !editMode) return;

        const newPosition = {
            x: mousePosition.x,
            y: mousePosition.y,
            z: mousePosition.z
        };

        try {
            const updates = {};
            updates[`dcCampus/${selectedSensor}/1/position`] = newPosition;
            await update(ref(db), updates);
            
            sensorsData = sensorsData.map(sensor => {
                if (sensor.id === selectedSensor) {
                    return { ...sensor, position: newPosition };
                }
                return sensor;
            });

            toggleEditMode();
        } catch (error) {
            console.error("Erreur lors de la sauvegarde de la position:", error);
        }
    }

    function changeFloor(floorId: number) {
        currentFloor = floorId;
        loadFloorModel(floorId);
    }

    // Initialisation au montage du composant
    onMount(() => {
        initScene();
        initPlacementPlane();
        loadFloorModel(currentFloor);

        canvas.addEventListener('click', handleSensorClick);
        window.addEventListener('resize', handleResize);

        const sensorsRef = ref(db, 'dcCampus');
        const unsubscribe = onValue(sensorsRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                updateSensorsData(data);
            }
        });

        return () => {
            unsubscribe();
            window.removeEventListener('resize', handleResize);
            if (renderer) renderer.dispose();
            if (controls) controls.dispose();
            canvas.removeEventListener('mousemove', onMouseMove);
            canvas.removeEventListener('click', onPlacementClick);
            canvas.removeEventListener('click', handleSensorClick);
        };
    });
</script>

<!-- Template -->
<div class="relative w-full h-screen bg-gray-100">

    <div class="absolute top-4 left-4 z-20">
        <button
            on:click={() => goto('/')}
            class="flex items-center gap-2 px-4 py-2 bg-white text-gray-700 rounded-lg shadow-lg hover:bg-gray-50 transition-colors border border-gray-200"
        >
            <svg 
                xmlns="http://www.w3.org/2000/svg" 
                class="h-5 w-5" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
            >
                <path 
                    stroke-linecap="round" 
                    stroke-linejoin="round" 
                    stroke-width="2" 
                    d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" 
                />
            </svg>
            <span>Accueil</span>
        </button>
    </div>
    <!-- Sélecteur d'étage -->
    <div class="absolute top-24 left-4 z-10 bg-white p-4 rounded-lg shadow-lg">
        <h2 class="text-lg font-bold mb-4">Étages</h2>
        <div class="flex flex-col space-y-2">
            {#each floors as floor}
                <button
                    class="px-4 py-2 rounded-md text-sm font-medium transition-colors
                        {currentFloor === floor.id ? 
                            'bg-indigo-600 text-white' : 
                            'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'}"
                    on:click={() => changeFloor(floor.id)}
                >
                    {floor.name}
                </button>
            {/each}
        </div>
    </div>

    <!-- Interface de placement des capteurs -->
    <div class="absolute top-4 right-4 z-10 bg-white p-4 rounded-lg shadow-lg">
        <h3 class="font-bold mb-2">Placement des capteurs</h3>
        <div class="space-y-2">
            <button
                class="px-4 py-2 rounded-md text-sm font-medium w-full transition-colors
                    {editMode ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-indigo-600 text-white hover:bg-indigo-700'}"
                on:click={toggleEditMode}
            >
                {editMode ? 'Annuler le placement' : 'Placer un capteur'}
            </button>
            
            {#if editMode}
                <div class="p-2 bg-yellow-50 rounded-md text-sm text-yellow-800">
                    Mode placement actif. Sélectionnez une salle puis cliquez sur la position souhaitée.
                </div>
                <select
                    value={selectedSensor}
                    on:change={(e) => onSensorSelect(e.target.value)}
                    class="w-full p-2 border rounded-md"
                    disabled={!editMode}
                >
                    <option value={null}>Sélectionnez une salle</option>
                    {#each sensorsData as sensor}
                        <option value={sensor.id}>
                            {sensor.roomName} - {sensor.title}
                            ({sensor.temperature.toFixed(1)}°C - {sensor.co2.toFixed(0)} ppm)
                        </option>
                    {/each}
                </select>

                {#if selectedSensor}
                    {#if (sensor = sensorsData.find(s => s.id === selectedSensor))}
                        <div class="mt-2 p-2 bg-gray-50 rounded-md text-sm space-y-1">
                            <p class="font-medium">{sensor.roomName}</p>
                            <p class="text-gray-600">{sensor.title}</p>
                            <p>Température: {sensor.temperature.toFixed(1)}°C</p>
                            <p>CO₂: {sensor.co2.toFixed(0)} ppm</p>
                            <p>Humidité: {sensor.humidity.toFixed(0)}%</p>
                            <p class="text-xs text-gray-500">
                                Dernière mise à jour: {new Date(sensor.timestamp).toLocaleString()}
                            </p>
                        </div>
                    {/if}
                {/if}
            {/if}
        </div>
    </div>

    <!-- Indicateur de chargement -->
    {#if loading}
        <div class="absolute inset-0 bg-black bg-opacity-20 flex items-center justify-center z-50">
            <div class="bg-white p-6 rounded-lg shadow-xl text-center">
                <div class="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-500 border-t-transparent"></div>
                <p class="mt-2 text-gray-700">Chargement de l'étage en cours...</p>
            </div>
        </div>
    {/if}

    <!-- Message d'erreur -->
    {#if error}
        <div class="absolute top-4 left-1/2 transform -translate-x-1/2 z-50">
            <div class="bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center">
                <svg class="w-6 h-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                          d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{error}</span>
            </div>
        </div>
    {/if}

    <!-- Canvas Three.js -->
    <canvas bind:this={canvas} class="w-full h-full"/>

    <!-- Fenêtre modale d'information du capteur -->
    {#if showSensorInfo && selectedSensorInfo}
        <div class="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 
                    bg-white p-6 rounded-lg shadow-xl z-50 max-w-md w-full">
            <div class="flex justify-between items-start mb-4">
                <h3 class="text-lg font-bold">
                    {selectedSensorInfo.roomName}
                </h3>
                <button 
                    class="text-gray-400 hover:text-gray-600 transition-colors"
                    on:click={() => showSensorInfo = false}
                >
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
            
            <div class="space-y-4">
                <div>
                    <p class="text-sm text-gray-500">Titre</p>
                    <p class="font-medium">{selectedSensorInfo.title}</p>
                </div>
                
                <div class="grid grid-cols-3 gap-4">
                    <div class="bg-blue-50 p-3 rounded-lg">
                        <p class="text-sm text-blue-600">Température</p>
                        <p class="font-bold text-lg">
                            {selectedSensorInfo.temperature.toFixed(1)}°C
                        </p>
                    </div>
                    
                    <div class="bg-green-50 p-3 rounded-lg">
                        <p class="text-sm text-green-600">CO₂</p>
                        <p class="font-bold text-lg">
                            {selectedSensorInfo.co2.toFixed(0)} ppm
                        </p>
                    </div>
                    
                    <div class="bg-purple-50 p-3 rounded-lg">
                        <p class="text-sm text-purple-600">Humidité</p>
                        <p class="font-bold text-lg">
                            {selectedSensorInfo.humidity.toFixed(0)}%
                        </p>
                    </div>
                </div>
                
                <div class="text-sm text-gray-500">
                    Dernière mise à jour : {new Date(selectedSensorInfo.timestamp).toLocaleString()}
                </div>
            </div>
        </div>
    {/if}

    <!-- Légende des capteurs -->
    <div class="absolute bottom-4 right-4 bg-white p-4 rounded-lg shadow-lg">
        <h3 class="font-bold mb-2">Légende des capteurs</h3>
        <div class="space-y-2">
            <div class="flex items-center">
                <span class="w-4 h-4 rounded-full bg-red-500 mr-2"></span>
                <span class="text-sm">CO₂ élevé (&gt;1000 ppm)</span>
            </div>
            <div class="flex items-center">
                <span class="w-4 h-4 rounded-full bg-red-300 mr-2"></span>
                <span class="text-sm">Température élevée (&gt;26°C)</span>
            </div>
            <div class="flex items-center">
                <span class="w-4 h-4 rounded-full bg-blue-500 mr-2"></span>
                <span class="text-sm">Température basse (&lt;18°C)</span>
            </div>
            <div class="flex items-center">
                <span class="w-4 h-4 rounded-full bg-green-500 mr-2"></span>
                <span class="text-sm">Conditions normales</span>
            </div>
        </div>
    </div>

    <!-- Statistiques des capteurs -->
    <div class="absolute bottom-4 left-4 bg-white p-4 rounded-lg shadow-lg">
        <h3 class="font-bold mb-2">Statistiques de l'étage</h3>
        <div class="space-y-1 text-sm">
            <p>Nombre de capteurs : {sensorsData.length}</p>
            <p>Capteurs en alerte : {sensorsData.filter(s => s.co2 > 1000 || s.temperature > 26 || s.temperature < 18).length}</p>
            <p>Température moyenne : {(sensorsData.reduce((acc, s) => acc + s.temperature, 0) / Math.max(sensorsData.length, 1)).toFixed(1)}°C</p>
            <p>CO₂ moyen : {(sensorsData.reduce((acc, s) => acc + s.co2, 0) / Math.max(sensorsData.length, 1)).toFixed(0)} ppm</p>
            <p>Humidité moyenne : {(sensorsData.reduce((acc, s) => acc + s.humidity, 0) / Math.max(sensorsData.length, 1)).toFixed(0)}%</p>
        </div>
    </div>
</div>