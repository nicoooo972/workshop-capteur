<script lang="ts">
    import { onMount } from 'svelte';
    import { onValue, ref } from 'firebase/database';
    import { db } from '$lib/firebase';
    import { Dialog } from '$lib/components/ui/dialog';
    import { Tabs, TabsContent, TabsList, TabsTrigger } from '$lib/components/ui/tabs';
    import MetricCard from '$lib/components/MetricCard.svelte';
    import SensorChart from '$lib/components/SensorChart.svelte';
    import AlertSystem from '$lib/components/AlertSystem.svelte';
    import { page } from '$app/stores';
    import { goto } from '$app/navigation';
    import { jsPDF } from 'jspdf';
    import 'jspdf-autotable';
    import EnhancedAnalytics from '$lib/components/EnhancedAnalytics.svelte';
	import MetricAnalysis from '$lib/components/MetricAnalysis.svelte';
	import UnifiedAnalysis from '$lib/components/UnifiedAnalysis.svelte';

    
    // Types
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

    type Room = {
        id: string;
        name: string;
        description: string;
    };
    
    // État initial et configuration
    let roomData: SensorData[] = [];
    let selectedTimeRange = '24h';
    let selectedMetric = 'temperature';
    let showExportDialog = false;
    let exportFormat: 'csv' | 'pdf' | 'xml' = 'csv';
    let currentRoom: Room | null = null;
    let availableRooms: Room[] = [];
    let isLoading = true;
    let chart: any = null; // Référence pour le graphique
    let showAlerts = true;
    
    const thresholds = {
        co2: [400, 1000],        // ppm
        temperature: [18, 26],    // °C
        humidity: [30, 70]        // %
    };
    
    const timeRanges = {
        '1h': 60 * 60 * 1000,
        '24h': 24 * 60 * 60 * 1000,
        '7d': 7 * 24 * 60 * 60 * 1000,
        '30d': 30 * 24 * 60 * 60 * 1000
    };

    // Récupération de l'ID de la salle depuis l'URL
    $: roomId = $page.params.roomId;

    // Réactivité
    $: filteredData = roomData.filter(entry => {
        const now = Date.now();
        return entry.timestamp > now - timeRanges[selectedTimeRange];
    });

    $: latestData = getLatestData(roomData);
    $: currentAlerts = latestData ? generateAlerts(latestData) : [];

    // Fonctions utilitaires
    function getLatestData(data: SensorData[]): SensorData | null {
        if (!data.length) return null;
        const sortedData = [...data].sort((a, b) => b.timestamp - a.timestamp);
        return sortedData[0];
    }

    function formatDate(timestamp: number): string {
        return new Date(timestamp).toLocaleString('fr-FR', {
            dateStyle: 'short',
            timeStyle: 'short'
        });
    }

    function handleDialogOpen(open: boolean) {
    showExportDialog = open;
}



    function generateAlerts(data: SensorData): Alert[] {
        const now = Date.now();
        const isStale = now - data.timestamp > 5 * 60 * 1000;

        return [
            // Alerte CO2
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
            // Alerte température
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
            // Alerte humidité
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

    // Fonctions de calcul des statistiques
    function calculateStats(data: any[], metricKey: string) {
        if (!data || data.length === 0) return { min: 0, max: 0, avg: 0 };
        
        const values = data.map(d => d[metricKey]);
        return {
            min: Math.min(...values).toFixed(1),
            max: Math.max(...values).toFixed(1),
            avg: (values.reduce((a, b) => a + b, 0) / values.length).toFixed(1)
        };
    }

    // Utilitaire pour obtenir l'unité selon le type
    function getUnitForType(type: string): string {
        switch (type) {
            case 'co2': return 'ppm';
            case 'temperature': return '°C';
            case 'humidity': return '%';
            default: return '';
        }
    }

    // Chargement des données de la salle
    async function loadRoomData(roomId: string) {
        isLoading = true;
        const roomRef = ref(db, `dcCampus/${roomId}`);
        
        const unsubscribe = onValue(roomRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                roomData = Object.values(data).sort((a, b) => b.timestamp - a.timestamp) as SensorData[];
                if (roomData.length > 0) {
                    currentRoom = {
                        id: roomId,
                        name: roomData[0].title,
                        description: `Surveillance en temps réel - ${roomData[0].title}`
                    };
                }
            }
            isLoading = false;
        });
        
        return unsubscribe;
    }

    // Chargement de la liste des salles disponibles
    async function loadAvailableRooms() {
        const roomsRef = ref(db, 'dcCampus');
        
        onValue(roomsRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                availableRooms = Object.keys(data).map(key => {
                    const roomData = Object.values(data[key])[0] as any;
                    return {
                        id: key,
                        name: roomData.title,
                        description: `Salle ${roomData.title}`
                    };
                });
            }
        });
    }

    // Navigation vers une autre salle
    function navigateToRoom(roomId: string) {
        goto(`/rooms/${roomId}`);
    }

    onMount(async () => {
        await loadAvailableRooms();
        if (roomId) {
            const unsubscribe = await loadRoomData(roomId);
            return () => unsubscribe();
        }
    });

    $: if (roomId) {
        loadRoomData(roomId);
    }
    let showAllAnalytics = false;
</script>

<div class="min-h-screen flex flex-col bg-gray-50">
  {#if isLoading}
      <div class="container mx-auto p-6 flex justify-center items-center min-h-[200px]">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
  {:else if currentRoom}
      <main class="flex-1 overflow-auto">
          <div class="container mx-auto p-6">
              <!-- En-tête -->
              <header class="mb-8 flex justify-between items-start">
                  <div>
                      <h1 class="text-3xl font-bold text-gray-800">{currentRoom.name}</h1>
                      <p class="text-gray-600 mt-2">{currentRoom.description}</p>
                  </div>
                  <button
                      class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors duration-200 flex items-center gap-2"
                      on:click={() => showExportDialog = true}
                  >
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd" />
                      </svg>
                      Exporter les données
                  </button>
              </header>

              {#if showExportDialog}
    <Dialog 
        open={showExportDialog} 
        onOpenChange={handleDialogOpen}
    >
        <div class="p-6">
            <h2 class="text-xl font-bold mb-4">Exporter les données</h2>
            
            <div class="space-y-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Format d'export</label>
                    <div class="grid grid-cols-3 gap-2">
                        <button
                            class="p-4 border rounded-lg text-center transition-colors duration-200 
                                {exportFormat === 'csv' ? 'border-indigo-500 bg-indigo-50' : 'hover:bg-gray-50'}"
                            on:click={() => exportFormat = 'csv'}
                        >
                            CSV
                        </button>
                        <button
                            class="p-4 border rounded-lg text-center transition-colors duration-200 
                                {exportFormat === 'pdf' ? 'border-indigo-500 bg-indigo-50' : 'hover:bg-gray-50'}"
                            on:click={() => exportFormat = 'pdf'}
                        >
                            PDF
                        </button>
                        <button
                            class="p-4 border rounded-lg text-center transition-colors duration-200 
                                {exportFormat === 'xml' ? 'border-indigo-500 bg-indigo-50' : 'hover:bg-gray-50'}"
                            on:click={() => exportFormat = 'xml'}
                        >
                            XML
                        </button>
                    </div>
                </div>

                <div class="flex justify-end gap-2">
                    <button
                        class="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md transition-colors duration-200"
                        on:click={() => showExportDialog = false}
                    >
                        Annuler
                    </button>
                    <button
                        class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors duration-200"
                        on:click={() => {
                            try {
                                if (exportFormat === 'csv') {
                                    // Export CSV
                                    const headers = ['Timestamp', 'CO2 (ppm)', 'Température (°C)', 'Humidité (%)', 'Statut'];
                                    const rows = filteredData.map(row => [
                                        new Date(row.timestamp).toISOString(),
                                        row.co2.toFixed(1),
                                        row.temperature.toFixed(1),
                                        row.humidity.toFixed(1),
                                        generateAlerts(row).length > 0 ? 'Alerte' : 'Normal'
                                    ]);
                                    
                                    const csvContent = [
                                        headers.join(','),
                                        ...rows.map(row => row.join(','))
                                    ].join('\n');

                                    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                                    const url = URL.createObjectURL(blob);
                                    const link = document.createElement('a');
                                    link.href = url;
                                    link.download = `${currentRoom?.name}_${new Date().toISOString().slice(0,10)}.csv`;
                                    document.body.appendChild(link);
                                    link.click();
                                    document.body.removeChild(link);
                                    URL.revokeObjectURL(url);
                                } 
                                else if (exportFormat === 'xml') {
                                    // Export XML
                                    let xmlContent = '<?xml version="1.0" encoding="UTF-8"?>\n';
                                    xmlContent += `<mesures salle="${currentRoom?.name}">\n`;
                                    
                                    filteredData.forEach(row => {
                                        xmlContent += '  <mesure>\n';
                                        xmlContent += `    <timestamp>${new Date(row.timestamp).toISOString()}</timestamp>\n`;
                                        xmlContent += `    <co2 unite="ppm">${row.co2.toFixed(1)}</co2>\n`;
                                        xmlContent += `    <temperature unite="celsius">${row.temperature.toFixed(1)}</temperature>\n`;
                                        xmlContent += `    <humidite unite="pourcent">${row.humidity.toFixed(1)}</humidite>\n`;
                                        xmlContent += `    <statut>${generateAlerts(row).length > 0 ? 'alerte' : 'normal'}</statut>\n`;
                                        xmlContent += '  </mesure>\n';
                                    });
                                    
                                    xmlContent += '</mesures>';

                                    const blob = new Blob([xmlContent], { type: 'application/xml;charset=utf-8;' });
                                    const url = URL.createObjectURL(blob);
                                    const link = document.createElement('a');
                                    link.href = url;
                                    link.download = `${currentRoom?.name}_${new Date().toISOString().slice(0,10)}.xml`;
                                    document.body.appendChild(link);
                                    link.click();
                                    document.body.removeChild(link);
                                    URL.revokeObjectURL(url);
                                }
                                else if (exportFormat === 'pdf') {
                                    // Export PDF
                                    const doc = new jsPDF();
                                    
                                    // En-tête
                                    doc.setFontSize(20);
                                    doc.text(`Rapport - ${currentRoom?.name}`, 20, 20);
                                    
                                    // Informations générales
                                    doc.setFontSize(12);
                                    const startDate = formatDate(filteredData[filteredData.length - 1].timestamp);
                                    const endDate = formatDate(filteredData[0].timestamp);
                                    doc.text(`Période : ${startDate} - ${endDate}`, 20, 40);
                                    
                                    // Tableau des statistiques
                                    const stats = {
                                        co2: calculateStats(filteredData, 'co2'),
                                        temperature: calculateStats(filteredData, 'temperature'),
                                        humidity: calculateStats(filteredData, 'humidity')
                                    };

                                    doc.autoTable({
                                        head: [['Métrique', 'Minimum', 'Maximum', 'Moyenne']],
                                        body: [
                                            ['CO2 (ppm)', stats.co2.min, stats.co2.max, stats.co2.avg],
                                            ['Température (°C)', stats.temperature.min, stats.temperature.max, stats.temperature.avg],
                                            ['Humidité (%)', stats.humidity.min, stats.humidity.max, stats.humidity.avg]
                                        ],
                                        startY: 50
                                    });
                                    
                                    // Graphique si disponible
                                    if (chart) {
                                        const canvas = chart.canvas;
                                        if (canvas) {
                                            const imageData = canvas.toDataURL('image/png');
                                            doc.addPage();
                                            doc.text('Graphique', 20, 20);
                                            doc.addImage(imageData, 'PNG', 20, 30, 170, 80);
                                        }
                                    }
                                    
                                    doc.save(`${currentRoom?.name}_${new Date().toISOString().slice(0,10)}.pdf`);
                                }
                            } catch (error) {
                                console.error('Erreur lors de l\'export:', error);
                                // Ici vous pourriez ajouter une notification d'erreur
                            }
                            
                            showExportDialog = false;
                        }}
                    >
                        Exporter
                    </button>
                </div>
            </div>
        </div>
    </Dialog>
{/if}

              <!-- Filtres de visualisation -->
              <div class="mb-8 space-y-6 bg-white rounded-lg shadow-sm p-6">
                <div class="space-y-3">
                  <label class="block text-sm font-medium text-gray-700 mb-1">Période d'analyse</label>
                  <div class="flex flex-wrap gap-3">
                      {#each Object.entries(timeRanges) as [key, _]}
                          <button
                              class="relative flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all duration-200
                                  font-medium text-sm
                                  {selectedTimeRange === key 
                                      ? 'bg-indigo-600 text-white shadow-md scale-105' 
                                      : 'bg-white text-gray-700 border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50'}"
                              on:click={() => selectedTimeRange = key}
                          >
                              {#if key === '1h'}
                                  <span class="text-lg">⚡</span>
                                  <span>1 heure</span>
                              {:else if key === '24h'}
                                  <span class="text-lg">🕒</span>
                                  <span>24 heures</span>
                              {:else if key === '7d'}
                                  <span class="text-lg">📅</span>
                                  <span>7 jours</span>
                              {:else if key === '30d'}
                                  <span class="text-lg">📊</span>
                                  <span>30 jours</span>
                              {/if}
                              {#if selectedTimeRange === key}
                                  <span class="ml-1 w-2 h-2 rounded-full bg-white"/>
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
                              class="flex items-center gap-2 px-4 py-2 rounded-md transition-all duration-200 
                                  {selectedMetric === 'temperature' ? 'bg-blue-600 text-white ring-2 ring-blue-600 ring-offset-2' 
                                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 hover:border-blue-300'}"
                              on:click={() => selectedMetric = 'temperature'}
                          >
                              <span>🌡️</span>
                              <span>Température</span>
                          </button>

                          <button
                              class="flex items-center gap-2 px-4 py-2 rounded-md transition-all duration-200 
                                  {selectedMetric === 'humidity' ? 'bg-blue-600 text-white ring-2 ring-blue-600 ring-offset-2' 
                                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 hover:border-blue-300'}"
                              on:click={() => selectedMetric = 'humidity'}
                          >
                              <span>💧</span>
                              <span>Humidité</span>
                          </button>

                          <button
                              class="flex items-center gap-2 px-4 py-2 rounded-md transition-all duration-200 
                                  {selectedMetric === 'co2' ? 'bg-blue-600 text-white ring-2 ring-blue-600 ring-offset-2' 
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
              <div class="bg-white p-6 rounded-lg shadow-sm mb-8">
                  <h2 class="text-lg font-semibold mb-4">Évolution des mesures</h2>
                  <div class="h-[400px]">
                      <SensorChart 
                          data={filteredData} 
                          metric={selectedMetric}
                          bind:chart
                      />
                  </div>
              </div>

              <div class="mb-8">
                <UnifiedAnalysis data={filteredData} />
            </div>

              <!-- Cartes des métriques -->
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
                  {/if}
              </div>

              <!-- Indicateur de fraîcheur des données -->
              {#if latestData}
                  <div class="bg-white rounded-lg shadow-sm p-4 mb-8">
                      <div class="text-sm text-gray-500 flex items-center justify-between">
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
                  </div>
              {/if}
          </div>
      </main>

      <!-- Système d'alertes coulissant -->
      <div 
          class="fixed top-0 right-0 h-full bg-white shadow-lg transform transition-transform duration-300 z-50 w-96"
          class:translate-x-full={!showAlerts}
      >
          <!-- En-tête des alertes -->
          <div class="p-4 border-b bg-gray-50 flex justify-between items-center">
              <h3 class="font-semibold text-gray-800">Alertes actives</h3>
              <button
                  class="p-2 hover:bg-gray-200 rounded-full transition-colors duration-200"
                  on:click={() => showAlerts = false}
              >
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
                  </svg>
              </button>
          </div>

          <!-- Contenu des alertes -->
          <div class="overflow-y-auto h-[calc(100%-4rem)]">
              <AlertSystem alerts={currentAlerts} />
          </div>
      </div>

      <!-- Bouton pour afficher les alertes -->
      <button
          class="fixed left-0 top-1/2 -translate-y-1/2 bg-white shadow-lg p-2 rounded-r-lg hover:bg-gray-50 transition-colors duration-200 z-40 {showAlerts ? 'opacity-0' : 'opacity-100'}"
          on:click={() => showAlerts = true}
          class:pointer-events-none={showAlerts}
      >
          <div class="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-600" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
              </svg>
              {#if currentAlerts.length > 0}
                  <span class="bg-red-500 text-white rounded-full h-5 w-5 flex items-center justify-center text-xs">
                      {currentAlerts.length}
                  </span>
              {/if}
          </div>
      </button>

  {:else}
      <div class="container mx-auto p-6">
          <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p class="text-yellow-700">Veuillez sélectionner une salle pour afficher ses données.</p>
          </div>
      </div>
  {/if}
</div>



<style>
:global(body) {
@apply bg-gray-50;
margin: 0;
padding: 0;
overflow-y: scroll !important;
}

:global(::-webkit-scrollbar) {
width: 14px;
}

:global(::-webkit-scrollbar-track) {
background-color: transparent;
}

:global(::-webkit-scrollbar-thumb) {
background-color: #cbd5e1;
border: 4px solid white;
border-radius: 7px;
}

:global(::-webkit-scrollbar-thumb:hover) {
background-color: #94a3b8;
}

:global(html) {
overflow-y: scroll !important;
}
</style>