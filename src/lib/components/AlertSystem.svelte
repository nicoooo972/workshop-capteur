<script lang="ts">
    import { fade, slide } from 'svelte/transition';
    
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
  
    export let alerts: Alert[] = [];
    
    // Regroupe les alertes par type pour un affichage organisé
    $: groupedAlerts = alerts.reduce((acc, alert) => {
      if (!acc[alert.type]) acc[alert.type] = [];
      acc[alert.type].push(alert);
      return acc;
    }, {} as Record<string, Alert[]>);
    
    // Configuration des icônes et informations pour chaque type d'alerte
    const alertConfig = {
      co2: {
        icon: '💨',
        title: 'CO2',
        color: 'red',
      },
      temperature: {
        icon: '🌡️',
        title: 'Température',
        color: 'orange',
      },
      humidity: {
        icon: '💧',
        title: 'Humidité',
        color: 'blue',
      },
    };
    
    let isExpanded = true;
    let selectedType: string | null = null;
    
    // Formate l'heure pour l'affichage
    function formatTime(timestamp: number): string {
      return new Date(timestamp).toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit'
      });
    }
    
    // Détermine les classes CSS en fonction de la sévérité et de la fraîcheur de l'alerte
    function getAlertClass(alert: Alert): string {
      const severityClass = alert.severity === 'critical' 
        ? 'bg-red-100 border-red-500' 
        : 'bg-yellow-100 border-yellow-500';
      
      const staleClass = alert.isStale ? 'opacity-50' : '';
      
      return `p-4 hover:bg-gray-50 ${severityClass} border-l-4 ${staleClass}`;
    }
  </script>
  
  <div class="fixed bottom-4 right-4 w-96 z-50">
    <div class="bg-white rounded-lg shadow-lg overflow-hidden">
      <!-- En-tête du panneau d'alertes -->
      <button 
        type="button"
        class="px-4 py-3 bg-gray-50 flex items-center justify-between cursor-pointer w-full"
        on:click={() => isExpanded = !isExpanded}
      >
        <div class="flex items-center space-x-2">
          <span class="text-red-500">⚠️</span>
          <h3 class="font-medium">
            Alertes actives ({alerts.length})
          </h3>
        </div>
        <span class="text-gray-500 hover:text-gray-700">
          {isExpanded ? '▼' : '▲'}
        </span>
      </button>
  
      <!-- Corps du panneau d'alertes -->
      {#if isExpanded}
        <div transition:slide class="max-h-96 overflow-y-auto">
          <!-- Filtres par type d'alerte -->
          <div class="flex px-4 py-2 gap-2 border-b">
            {#each Object.keys(alertConfig) as type}
              <button
                class="px-3 py-1 rounded-full text-sm {selectedType === type ? 'bg-blue-500 text-white' : 'bg-gray-100'}"
                on:click={() => selectedType = selectedType === type ? null : type}
              >
                {alertConfig[type].icon} {alertConfig[type].title}
              </button>
            {/each}
          </div>
  
          <!-- Liste des alertes -->
          <div class="divide-y">
            {#each Object.entries(groupedAlerts) as [type, typeAlerts]}
              {#if !selectedType || selectedType === type}
                {#each typeAlerts as alert (alert.id)}
                  <div
                    transition:fade
                    class={getAlertClass(alert)}
                  >
                    <div class="flex justify-between items-start">
                      <div>
                        <div class="flex items-center">
                          <span class="mr-2">{alertConfig[type].icon}</span>
                          <span class="font-medium">
                            {alert.value} {type === 'temperature' ? '°C' : type === 'humidity' ? '%' : 'ppm'}
                          </span>
                        </div>
                        <p class="text-sm text-gray-600 mt-1">
                          Seuils: {alert.threshold[0]} - {alert.threshold[1]}
                        </p>
                      </div>
                      <span class="text-sm text-gray-500">
                        {formatTime(alert.timestamp)}
                      </span>
                    </div>
                    <div class="mt-2 text-sm">
                      <span class="text-gray-600">{alert.location}</span>
                      {#if alert.isStale}
                        <span class="text-orange-500 ml-2">(Données anciennes)</span>
                      {/if}
                    </div>
                  </div>
                {/each}
              {/if}
            {/each}
          </div>
        </div>
      {/if}
    </div>
  </div>