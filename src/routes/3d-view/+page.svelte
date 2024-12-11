<script lang="ts">
    import { onMount } from 'svelte';
    import * as THREE from 'three';
    import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
    import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
    import { FontLoader } from 'three/addons/loaders/FontLoader.js';
    import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
    import { onValue, ref, get, set } from 'firebase/database';
    import { db } from '$lib/firebase';
    import { goto } from '$app/navigation';

    // Interfaces
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

    interface CameraPosition {
        position: { x: number; y: number; z: number; };
        target: { x: number; y: number; z: number; };
    }

    // Variables Three.js et état
    let canvas: HTMLCanvasElement;
    let scene: THREE.Scene;
    let camera: THREE.PerspectiveCamera;
    let renderer: THREE.WebGLRenderer;
    let controls: OrbitControls;
    let font: THREE.Font | null = null;
    let currentModel: THREE.Object3D | null = null;
    let placementPlane: THREE.Mesh;
    let mousePosition = new THREE.Vector3();
    let raycaster = new THREE.Raycaster();
    let clickMouse = new THREE.Vector2();

    // État de l'application
    let currentFloor = 0;
    let loading = true;
    let error = '';
    let sensorsData: SensorData[] = [];
    let editMode = false;
    let selectedSensor: string | null = null;
    let selectedSensorInfo: SensorData | null = null;
    let showSensorInfo = false;
    let showControls = true;
    let isPlacingMode = false;
    let touchTimeout: number | null = null;
    let lastTapTime = 0;

    // Configuration des étages
    const floors = [
        { id: -1, name: 'Sous-sol', model: '/models/Workshop sous-sol.glb' },
    { id: 0, name: 'RDC', model: '/models/Workshop rdc.glb' },
    { id: 1, name: '1er étage', model: '/models/Workshop etage1.glb' },
    { id: 2, name: '2ème étage', model: '/models/Workshop etage2.glb' },
    { id: 3, name: '3ème étage', model: '/models/Workshop etage3.glb' },
    { id: 4, name: '4ème étage', model: '/models/Workshop etage4.glb' },
    { id: 5, name: '5ème étage', model: '/models/Workshop etage5.glb' }
    ];

    // Fonctions de gestion de la caméra
    function saveCameraPosition() {
        const position = {
            position: {
                x: camera.position.x,
                y: camera.position.y,
                z: camera.position.z
            },
            target: {
                x: controls.target.x,
                y: controls.target.y,
                z: controls.target.z
            }
        };
        localStorage.setItem(`cameraPosition_${currentFloor}`, JSON.stringify(position));
    }

    function loadCameraPosition(): CameraPosition | null {
        const savedPosition = localStorage.getItem(`cameraPosition_${currentFloor}`);
        return savedPosition ? JSON.parse(savedPosition) : null;
    }

    // Chargement de la police
    async function loadFont() {
        return new Promise<void>((resolve, reject) => {
            const loader = new FontLoader();
            loader.load(
                'https://threejs.org/examples/fonts/helvetiker_regular.typeface.json',
                (loadedFont) => {
                    font = loadedFont;
                    resolve();
                },
                undefined,
                reject
            );
        });
    }

    // Initialisation de la scène
    function initScene() {
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0xf5f5f5);
        
        camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.set(10, 10, 10);
        
        renderer = new THREE.WebGLRenderer({ 
            canvas,
            antialias: true,
            alpha: true
        });
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        setupLighting();
        setupControls();
        
        const grid = new THREE.GridHelper(20, 20, 0x888888, 0x888888);
        scene.add(grid);
    }

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

    function setupControls() {
        controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.screenSpacePanning = false;
        controls.minDistance = 5;
        controls.maxDistance = 20;
        controls.maxPolarAngle = Math.PI / 2;
        controls.addEventListener('end', saveCameraPosition);
    }

    function createSensorIndicator(data: SensorData) {
        const group = new THREE.Group();
        
        // Sphère du capteur
        const geometry = new THREE.SphereGeometry(0.3, 16, 16);
        const material = new THREE.MeshPhongMaterial({
            color: getSensorColor(data.temperature, data.co2),
            emissive: getSensorColor(data.temperature, data.co2),
            emissiveIntensity: 0.5,
            transparent: true,
            opacity: 0.8
        });
        const indicator = new THREE.Mesh(geometry, material);
        group.add(indicator);
        
        // Halo lumineux
        const glowGeometry = new THREE.SphereGeometry(0.4, 16, 16);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: getSensorColor(data.temperature, data.co2),
            transparent: true,
            opacity: 0.2
        });
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        group.add(glow);
        
        // Point lumineux
        const pointLight = new THREE.PointLight(
            getSensorColor(data.temperature, data.co2),
            1,
            2
        );
        pointLight.position.set(0, 0.2, 0);
        group.add(pointLight);
        
        // Ajouter le texte 3D
        if (font) {
            const textGeometry = new TextGeometry(data.roomName, {
                font: font,
                size: 0.3,
                height: 0.05,
                curveSegments: 12,
                bevelEnabled: false
            });
            
            // Centrer le texte
            textGeometry.computeBoundingBox();
            const textWidth = textGeometry.boundingBox!.max.x - textGeometry.boundingBox!.min.x;
            
            const textMaterial = new THREE.MeshPhongMaterial({ color: 0x000000 });
            const textMesh = new THREE.Mesh(textGeometry, textMaterial);
            
            // Positionner le texte au-dessus du capteur
            textMesh.position.set(-textWidth/2, 1.2, 0);
            
            // Faire face à la caméra
            const textGroup = new THREE.Group();
            textGroup.add(textMesh);
            group.add(textGroup);
            
            // Mettre à jour la rotation du texte pour qu'il fasse face à la caméra
            group.userData.animate = () => {
                textGroup.quaternion.copy(camera.quaternion);
                indicator.scale.copy(initialScale).multiplyScalar(1 + Math.sin(Date.now() * 0.003) * 0.2);
                glow.scale.copy(initialScale).multiplyScalar(1.2 + Math.sin(Date.now() * 0.003) * 0.3);
            };
        }

        // Animation de base du capteur
        const initialScale = indicator.scale.clone();
        
        // Positionner le capteur plus bas
        group.position.y = 0.1;
        
        return group;
    }

    // Plan de placement
    function initPlacementPlane() {
        const geometry = new THREE.PlaneGeometry(100, 100);
        const material = new THREE.MeshBasicMaterial({
            color: 0x808080,
            transparent: true,
            opacity: 0.0,
            side: THREE.DoubleSide
        });
        placementPlane = new THREE.Mesh(geometry, material);
        placementPlane.rotation.x = -Math.PI / 2;
        placementPlane.position.y = 0;
        placementPlane.name = 'placementPlane';
        scene.add(placementPlane);
    }

    function animate() {
        requestAnimationFrame(animate);
        controls.update();
        
        scene.children
            .filter(child => child.userData.isSensor)
            .forEach(sensor => {
                if (sensor.userData.animate) {
                    sensor.userData.animate();
                }
            });
        
        renderer.render(scene, camera);
    }

    function getSensorColor(temperature: number, co2: number): number {
        if (co2 > 1000) return 0xff0000;
        if (temperature > 26) return 0xff6b6b;
        if (temperature < 18) return 0x6b6bff;
        return 0x00ff00;
    }

    async function updateSensorsData(data: any) {
        if (!data) {
            console.log("Pas de données reçues de Firebase");
            sensorsData = [];
            return;
        }

        try {
            // Récupérer les positions séparément
            const positionsRef = ref(db, 'sensorPositions');
            const positionsSnapshot = await get(positionsRef);
            const positions = positionsSnapshot.val() || {};

            sensorsData = Object.entries(data)
                .map(([sensorKey, sensorData]: [string, any]) => {
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
                        position: positions[sensorKey]
                    };
                })
                .filter(data => data !== null) as SensorData[];

            updateSensorVisuals();
        } catch (error) {
            console.error("Erreur lors du traitement des données:", error);
            sensorsData = [];
        }
    }

    function updateSensorVisuals() {
        // Supprime les anciens capteurs
        scene.children
            .filter(child => child.userData.isSensor)
            .forEach(sensor => scene.remove(sensor));

        sensorsData.forEach(data => {
            if (data.position || (isPlacingMode && data.id === selectedSensor)) {
                const indicator = createSensorIndicator(data);
                indicator.userData.isSensor = true;
                indicator.userData.sensorData = data;
                
                if (isPlacingMode && !data.position) {
                    indicator.position.copy(mousePosition);
                } else if (data.position) {
                    indicator.position.set(
                        data.position.x,
                        0.1,
                        data.position.z
                    );
                }
                
                scene.add(indicator);
            }
        });
    }

    function onMouseMove(event: MouseEvent) {
        if (!isPlacingMode || !selectedSensor) return;
        
        const rect = canvas.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / canvas.clientWidth) * 2 - 1;
        const y = -((event.clientY - rect.top) / canvas.clientHeight) * 2 + 1;

        raycaster.setFromCamera(new THREE.Vector2(x, y), camera);
        const intersects = raycaster.intersectObject(placementPlane);
        
        if (intersects.length > 0) {
            mousePosition.copy(intersects[0].point);
            mousePosition.y = 0.1;
            updateSensorVisuals();
        }
    }

    async function onPlacementClick(event: MouseEvent) {
        if (!selectedSensor || !isPlacingMode) return;

        const rect = canvas.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / canvas.clientWidth) * 2 - 1;
        const y = -((event.clientY - rect.top) / canvas.clientHeight) * 2 + 1;

        raycaster.setFromCamera(new THREE.Vector2(x, y), camera);
        const intersects = raycaster.intersectObject(placementPlane);

        if (intersects.length > 0) {
            const position = intersects[0].point;
            const newPosition = {
                x: position.x,
                y: 0.1,
                z: position.z
            };

            try {
                // Création d'un noeud séparé pour les positions des capteurs
                const sensorPositionRef = ref(db, `sensorPositions/${selectedSensor}`);
                await set(sensorPositionRef, newPosition);
                
                // Mettre à jour le state local
                sensorsData = sensorsData.map(sensor => {
                    if (sensor.id === selectedSensor) {
                        return { ...sensor, position: newPosition };
                    }
                    return sensor;
                });

                // Mettre à jour les visuels
                updateSensorVisuals();

                // Reset selection
                selectedSensor = null;

                // Success notification
                const toast = document.createElement('div');
                toast.className = 'fixed bottom-20 left-1/2 transform -translate-x-1/2 bg-green-500 text-white px-4 py-2 rounded-lg z-50';
                toast.textContent = 'Capteur placé avec succès';
                document.body.appendChild(toast);
                setTimeout(() => toast.remove(), 2000);
                
            } catch (error) {
                console.error("Erreur lors de la sauvegarde de la position:", error);
                const toast = document.createElement('div');
                toast.className = 'fixed bottom-20 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-4 py-2 rounded-lg z-50';
                toast.textContent = 'Erreur lors du placement du capteur';
                document.body.appendChild(toast);
                setTimeout(() => toast.remove(), 2000);
            }
        }
    }

    function handleSensorClick(event: MouseEvent) {
    const rect = canvas.getBoundingClientRect();
    clickMouse.x = ((event.clientX - rect.left) / canvas.clientWidth) * 2 - 1;
    clickMouse.y = -((event.clientY - rect.top) / canvas.clientHeight) * 2 + 1;

    raycaster.setFromCamera(clickMouse, camera);
    const sensors = scene.children.filter(child => child.userData.isSensor);
    const intersects = raycaster.intersectObjects(sensors, true);

    if (intersects.length > 0) {
        const clickedSensor = intersects[0].object.parent;
        if (clickedSensor) {
            if (editMode) {
                // En mode édition, on retire le capteur
                removeSensor(clickedSensor.userData.sensorData);
            } else {
                // En mode normal, on affiche les infos
                selectedSensorInfo = clickedSensor.userData.sensorData;
                showSensorInfo = true;
            }
        }
    } else {
        selectedSensorInfo = null;
        showSensorInfo = false;
    }
}

async function removeSensor(sensorData: SensorData) {
    if (!sensorData || !sensorData.id) return;

    try {
        // Supprimer la position dans Firebase
        const sensorPositionRef = ref(db, `sensorPositions/${sensorData.id}`);
        await set(sensorPositionRef, null);

        // Mettre à jour le state local
        sensorsData = sensorsData.map(sensor => {
            if (sensor.id === sensorData.id) {
                return { ...sensor, position: undefined };
            }
            return sensor;
        });

        // Mettre à jour les visuels
        updateSensorVisuals();

        // Notification de succès
        const toast = document.createElement('div');
        toast.className = 'fixed bottom-20 left-1/2 transform -translate-x-1/2 bg-green-500 text-white px-4 py-2 rounded-lg z-50';
        toast.textContent = 'Capteur retiré avec succès';
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 2000);
        
    } catch (error) {
        console.error("Erreur lors du retrait du capteur:", error);
        const toast = document.createElement('div');
        toast.className = 'fixed bottom-20 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-4 py-2 rounded-lg z-50';
        toast.textContent = 'Erreur lors du retrait du capteur';
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 2000);
    }
}


    function handleResize() {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }

    function handleTouchStart(event: TouchEvent) {
        const now = Date.now();
        const timeDiff = now - lastTapTime;
        
        if (timeDiff < 300) {
            handleDoubleTap(event);
        }
        
        lastTapTime = now;
        
        if (event.touches.length === 1) {
            touchTimeout = window.setTimeout(() => {
                handleLongPress(event);
            }, 500);
        }
    }

    function handleTouchEnd() {
        if (touchTimeout) {
            clearTimeout(touchTimeout);
            touchTimeout = null;
        }
    }

    function handleTouchMove() {
        if (touchTimeout) {
            clearTimeout(touchTimeout);
            touchTimeout = null;
        }
    }

    function handleDoubleTap(event: TouchEvent) {
        if (!editMode) {
            const touch = event.touches[0];
            handleSensorClick({
                clientX: touch.clientX,
                clientY: touch.clientY,
                preventDefault: () => {}
            } as MouseEvent);
        }
    }

    function handleLongPress(event: TouchEvent) {
        if (isPlacingMode && selectedSensor) {
            const touch = event.touches[0];
            onPlacementClick({
                clientX: touch.clientX,
                clientY: touch.clientY,
                preventDefault: () => {}
            } as MouseEvent);
        }
    }

    function togglePlacementMode() {
    isPlacingMode = !isPlacingMode;
    editMode = isPlacingMode;
    
    if (isPlacingMode) {
        canvas.addEventListener('click', onPlacementClick);
        canvas.addEventListener('mousemove', onMouseMove);
    } else {
        canvas.removeEventListener('click', onPlacementClick);
        canvas.removeEventListener('mousemove', onMouseMove);
        selectedSensor = null;
    }
    
    if (placementPlane) {
        placementPlane.visible = isPlacingMode;
    }
}

    function onSensorSelect(sensorId: string | null) {
        selectedSensor = sensorId;
        updateSensorVisuals();
    }

    function changeFloor(floorId: number) {
        saveCameraPosition();
        currentFloor = floorId;
        loadFloorModel(floorId);
    }

    // Initialisation
    onMount(async () => {
        try {
            await loadFont();
        } catch (error) {
            console.error("Erreur lors du chargement de la police:", error);
        }
        
        initScene();
        initPlacementPlane();
        loadFloorModel(currentFloor);
        animate();

        canvas.addEventListener('click', handleSensorClick);
        canvas.addEventListener('touchstart', handleTouchStart, { passive: true });
        canvas.addEventListener('touchend', handleTouchEnd, { passive: true });
        canvas.addEventListener('touchmove', handleTouchMove, { passive: true });
        window.addEventListener('resize', handleResize);

        const sensorsRef = ref(db, 'dcCampus');
        const unsubscribe = onValue(sensorsRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                updateSensorsData(data);
            }
        });

        return () => {
            saveCameraPosition();
            unsubscribe();
            
            canvas.removeEventListener('click', handleSensorClick);
            if (isPlacingMode) {
                canvas.removeEventListener('click', onPlacementClick);
                canvas.removeEventListener('mousemove', onMouseMove);
            }
            canvas.removeEventListener('touchstart', handleTouchStart);
            canvas.removeEventListener('touchend', handleTouchEnd);
            canvas.removeEventListener('touchmove', handleTouchMove);
            window.removeEventListener('resize', handleResize);
            
            if (renderer) {
                renderer.dispose();
                renderer.forceContextLoss();
            }
            
            if (controls) {
                controls.dispose();
            }
            
            scene.traverse((object) => {
                if (object instanceof THREE.Mesh) {
                    if (object.geometry) object.geometry.dispose();
                    if (object.material) {
                        if (Array.isArray(object.material)) {
                            object.material.forEach(material => material.dispose());
                        } else {
                            object.material.dispose();
                        }
                    }
                }
            });
            
            scene.clear();
        };
    });

// Gestion du modèle 3D
function loadFloorModel(floorId: number) {
    const floor = floors.find(f => f.id === floorId);
    if (!floor) return;

    loading = true;
    error = '';

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

    const loader = new GLTFLoader();
    loader.load(
        floor.model,
        (gltf) => {
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

            const savedPosition = loadCameraPosition();
            if (savedPosition) {
                camera.position.set(
                    savedPosition.position.x,
                    savedPosition.position.y,
                    savedPosition.position.z
                );
                controls.target.set(
                    savedPosition.target.x,
                    savedPosition.target.y,
                    savedPosition.target.z
                );
                controls.update();
            }

            updateSensorVisuals();
            loading = false;
        },
        undefined,
        (err) => {
            error = `Erreur de chargement: ${err.message}`;
            loading = false;
        }
    );
}

</script>
<!-- Template -->
<div class="relative w-full h-screen bg-gray-100">
    <!-- Header -->
    <header class="fixed top-0 left-0 right-0 bg-white z-50 shadow-sm">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="py-4 flex items-center justify-between">
                <div class="flex items-center gap-4">
                    <button
                        on:click={() => goto('/')}
                        class="p-2 rounded-full hover:bg-gray-100 transition-colors"
                        aria-label="Retour"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <div>
                        <h1 class="text-xl font-bold text-gray-900 sm:text-2xl">Vue 3D</h1>
                        <p class="mt-1 text-sm text-gray-600">{floors[currentFloor + 1]?.name || ''}</p>
                    </div>
                </div>
            </div>
        </div>
    </header>

    <!-- Sélecteur d'étage -->
    <div class="fixed top-24 left-4 z-10 bg-white p-4 rounded-lg shadow-lg sm:block {showControls ? '' : 'hidden'}">
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

    <!-- Interface mobile de placement -->
    <div class="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-20 w-full max-w-sm px-4
                {showControls ? 'translate-y-0' : 'translate-y-full'} 
                transition-transform duration-300 ease-in-out">
        <div class="bg-white rounded-lg shadow-lg p-4">
            {#if isPlacingMode}
                <div class="text-center mb-4">
                    <p class="text-sm font-medium text-gray-700">
                        Sélectionnez un capteur puis cliquez sur la position souhaitée
                    </p>
                </div>
            {/if}
            
            <div class="space-y-2">
                <button
                    class="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg 
                           hover:bg-indigo-700 transition-colors text-sm font-medium"
                    on:click={togglePlacementMode}
                >
                    {isPlacingMode ? 'Terminer le placement' : 'Placer des capteurs'}
                </button>

                {#if isPlacingMode}
                    <select
                        value={selectedSensor}
                        on:change={(e) => onSensorSelect(e.target.value)}
                        class="w-full p-2 border rounded-md text-sm"
                    >
                        <option value={null}>Sélectionnez une salle</option>
                        {#each sensorsData.filter(s => !s.position) as sensor}
                            <option value={sensor.id}>
                                {sensor.roomName} - {sensor.title}
                            </option>
                        {/each}
                    </select>
                {/if}
            </div>
        </div>
    </div>

    <!-- Chargement -->
    {#if loading}
        <div class="fixed inset-0 bg-black bg-opacity-20 flex items-center justify-center z-50">
            <div class="bg-white p-6 rounded-lg shadow-xl text-center">
                <div class="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-500 border-t-transparent"></div>
                <p class="mt-2 text-gray-700">Chargement de l'étage...</p>
            </div>
        </div>
    {/if}

    <!-- Message d'erreur -->
    {#if error}
        <div class="fixed top-4 left-1/2 transform -translate-x-1/2 z-50">
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
    <canvas bind:this={canvas} class="w-full h-full touch-none"/>

    <!-- Modal d'information du capteur -->
    {#if showSensorInfo && selectedSensorInfo}
        <div class="fixed left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 
                    bg-white p-6 rounded-lg shadow-xl z-50 max-w-md w-full mx-4">
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

    <!-- Légende -->
    <div class="fixed bottom-4 right-4 bg-white p-4 rounded-lg shadow-lg {showControls ? '' : 'hidden'}">
        <h3 class="font-bold mb-2">Légende</h3>
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
</div>