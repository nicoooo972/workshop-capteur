<script lang="ts">
    import { onMount } from 'svelte';
    import * as THREE from 'three';
    import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
  
    let canvas: HTMLCanvasElement;
  
    onMount(() => {
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
      const renderer = new THREE.WebGLRenderer({ canvas });
  
      camera.position.z = 5;
  
      const light = new THREE.AmbientLight(0xffffff, 0.8);
      scene.add(light);
  
      const loader = new GLTFLoader();
      loader.load('src/models/Workshop rdc.glb', (glb: { scene: THREE.Object3D<THREE.Object3DEventMap>; }) => {
        scene.add(glb.scene);
      });
  
      const animate = () => {
        requestAnimationFrame(animate);
        renderer.render(scene, camera);
      };
      animate();
    });
  </script>
  
  <canvas bind:this={canvas} class="w-full h-[500px]"></canvas>
  