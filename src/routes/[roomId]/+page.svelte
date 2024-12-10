<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { onValue, ref } from 'firebase/database';
  import { db } from '$lib/firebase';
  import MetricCard from '$lib/components/MetricCard.svelte';
  import SensorChart from '$lib/components/SensorChart.svelte';
  import AlertSystem from '$lib/components/AlertSystem.svelte';
  import { goto } from '$app/navigation';

  // Récupération de l'ID de la salle depuis l'URL
  $: roomId = $page.params.roomId;

  type SensorData = {
    co2: number;
    humidity: number;
    temperature: number;
    timestamp: number;
    title: string;
  };

  type Alert = {
    id: string;
    type: 'co2' | 'temperature' | 'humidity';
    value: number;
    threshold: [number, number];
    timestamp: number;
    location: string;
    severity: 'warning' | 'critical';
    isStale?: boolean;
  };

  let roomData: SensorData[] = [];
  let selectedTimeRange = '24h';
  let selectedMetric = 'temperature';
  let roomTitle = '';
  
  const thresholds = {
    co2: [400, 1000],
    temperature: [18, 26],
    humidity: [30, 70]
  };
  
  const timeRanges = {
    '1h': 60 * 60 * 1000,
    '24h': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
    '30d': 30 * 24 * 60 * 60 * 1000
  };

  function getLatestData(data: SensorData[]): SensorData | null {
    if (!data.length) return null;
    const sortedData = [...data].sort((a, b) => b.timestamp - a.timestamp);
    return sortedData[0];
  }

  $: filteredData = roomData.filter(entry => {
    const now = Date.now();
    return entry.timestamp > now - timeRanges[selectedTimeRange];
  });

  $: latestData = getLatestData(roomData);
  $: currentAlerts = latestData ? generateAlerts(latestData) : [];

  function generateAlerts(data: SensorData): Alert[] {
    const now = Date.now();
    const isStale = now - data.timestamp > 5 * 60 * 1000;

    return [
      data.co2 < thresholds.co2[0] || data.co2 > thresholds.co2[1] 
        ? {
            id: `co2-${data.timestamp}`,
            type: 'co2',
            value: data.co2,
            threshold: thresholds.co2,
            timestamp: data.timestamp,
            location: data.title,
            severity: data.co2 > thresholds.co2[1] * 1.2 ? 'critical' : 'warning',
            isStale
          }
        : null,
      data.temperature < thresholds.temperature[0] || data.temperature > thresholds.temperature[1]
        ? {
            id: `temp-${data.timestamp}`,
            type: 'temperature',
            value: data.temperature,
            threshold: thresholds.temperature,
            timestamp: data.timestamp,
            location: data.title,
            severity: Math.abs(data.temperature - thresholds.temperature[1]) > 5 ? 'critical' : 'warning',
            isStale
          }
        : null,
      data.humidity < thresholds.humidity[0] || data.humidity > thresholds.humidity[1]
        ? {
            id: `humid-${data.timestamp}`,
            type: 'humidity',
            value: data.humidity,
            threshold: thresholds.humidity,
            timestamp: data.timestamp,
            location: data.title,
            severity: Math.abs(data.humidity - thresholds.humidity[1]) > 15 ? 'critical' : 'warning',
            isStale
          }
        : null
    ].filter(Boolean);
  }

  function formatDate(timestamp: number): string {
    return new Date(timestamp).toLocaleString('fr-FR', {
      dateStyle: 'short',
      timeStyle: 'short'
    });
  }

  // Gestion du retour à la liste des salles
  function goBack() {
    goto('/');
  }

  onMount(() => {
    // Protection contre les IDs invalides
    if (!roomId.startsWith('salle_')) {
      goBack();
      return;
    }

    const roomRef = ref(db, `dcCampus/${roomId}`);
    
    const unsubscribe = onValue(roomRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        roomData = Object.values(data).sort((a, b) => b.timestamp - a.timestamp) as SensorData[];
        roomTitle = roomData[0]?.title || `Salle ${roomId.split('_').pop()}`;
      } else {
        // Si pas de données, retour à la liste des salles
        goBack();
      }
    });
    
    return () => unsubscribe();
  });
</script>

<div class="container mx-auto p-6">
  <!-- En-tête du dashboard avec bouton retour -->
  <header class="mb-8">
    <div class="flex items-center gap-4 mb-2">
      <button
        on:click={goBack}
        class="p-2 rounded-full hover:bg-gray-100 transition-colors"
        aria-label="Retour à la liste des salles"
      >
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
      </button>
      <h1 class="text-3xl font-bold text-gray-800">{roomTitle}</h1>
    </div>
    <p class="text-gray-600 mt-2">Surveillance en temps réel des conditions environnementales</p>
  </header>

  <!-- Filtres de visualisation -->
  <div class="mb-8 space-y-6">
    <!-- Période d'analyse -->
    <div class="space-y-3">
      <label class="block text-sm font-medium text-gray-700">Période d'analyse</label>
      <div class="flex flex-wrap gap-2">
        {#each Object.entries(timeRanges) as [key, _]}
          <button
            class="px-4 py-2 rounded-md transition-all duration-200 {selectedTimeRange === key 
              ? 'bg-indigo-600 text-white ring-2 ring-indigo-600 ring-offset-2' 
              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 hover:border-indigo-300'}"
            on:click={() => selectedTimeRange = key}
          >
            {#if key === '1h'}
              1 heure
            {:else if key === '24h'}
              24 heures
            {:else if key === '7d'}
              7 jours
            {:else if key === '30d'}
              30 jours
            {/if}
          </button>
        {/each}
      </div>
    </div>

    <!-- Métrique à afficher -->
    <div class="space-y-3">
      <label class="block text-sm font-medium text-gray-700">Métrique à afficher</label>
      <div class="flex flex-wrap gap-2">
        <button
          class="flex items-center gap-2 px-4 py-2 rounded-md transition-all duration-200 {selectedMetric === 'temperature' 
            ? 'bg-blue-600 text-white ring-2 ring-blue-600 ring-offset-2' 
            : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 hover:border-blue-300'}"
          on:click={() => selectedMetric = 'temperature'}
        >
          <span>🌡️</span>
          <span>Température</span>
        </button>

        <button
          class="flex items-center gap-2 px-4 py-2 rounded-md transition-all duration-200 {selectedMetric === 'humidity' 
            ? 'bg-blue-600 text-white ring-2 ring-blue-600 ring-offset-2' 
            : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 hover:border-blue-300'}"
          on:click={() => selectedMetric = 'humidity'}
        >
          <span>💧</span>
          <span>Humidité</span>
        </button>

        <button
          class="flex items-center gap-2 px-4 py-2 rounded-md transition-all duration-200 {selectedMetric === 'co2' 
            ? 'bg-blue-600 text-white ring-2 ring-blue-600 ring-offset-2' 
            : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 hover:border-blue-300'}"
          on:click={() => selectedMetric = 'co2'}
        >
          <span>📊</span>
          <span>CO2</span>
        </button>
      </div>
    </div>
  </div>

  <!-- Graphique d'évolution -->
  <div class="bg-white p-4 rounded-lg shadow-md mb-8">
    <h2 class="text-lg font-semibold mb-4">Évolution des mesures</h2>
    <SensorChart 
      data={filteredData} 
      metric={selectedMetric} 
    />
  </div>

  <!-- Cartes des métriques en temps réel -->
  <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
    {#if latestData}
      <MetricCard
        title="CO2"
        value={latestData.co2}
        unit="ppm"
        thresholds={thresholds.co2}
        icon="📊"
      />
      
      <MetricCard
        title="Température"
        value={latestData.temperature}
        unit="°C"
        thresholds={thresholds.temperature}
        icon="🌡️"
      />
      
      <MetricCard
        title="Humidité"
        value={latestData.humidity}
        unit="%"
        thresholds={thresholds.humidity}
        icon="💧"
      />

      <!-- Indicateur de fraîcheur des données -->
      <div class="text-sm text-gray-500 col-span-3 flex items-center justify-between">
        <span>
          Dernière mise à jour : {formatDate(latestData.timestamp)}
        </span>
        {#if Date.now() - latestData.timestamp > 5 * 60 * 1000}
          <span class="text-orange-500 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
            </svg>
            Données potentiellement obsolètes
          </span>
        {/if}
      </div>
    {/if}
  </div>

  <!-- Système d'alertes flottant -->
  <AlertSystem alerts={currentAlerts} />
</div>

<style>
  :global(body) {
    background-color: #f9fafb;
  }
</style>