<script lang="ts">
    interface Alert {
        id: string;
        type: 'co2' | 'temperature' | 'humidity';
        value: number;
        threshold: [number, number];
        timestamp: number;
        location: string;
        severity: 'warning' | 'critical';
        isStale?: boolean;
    }
    
    export let alerts: Alert[];
    
    function getSeverityClass(type: string, value: number, threshold: [number, number]): string {
        if (type === 'co2' && value > threshold[1]) return 'bg-red-50';
        if (type === 'temperature' && (value < threshold[0] || value > threshold[1])) return 'bg-yellow-50';
        return 'bg-blue-50';
    }
    
    function getIcon(type: string): string {
        switch (type) {
            case 'co2':
                return '❄️';
            case 'temperature':
                return '🌡️';
            case 'humidity':
                return '💧';
            default:
                return '⚠️';
        }
    }
    
    function formatTime(timestamp: number): string {
        return new Date(timestamp).toLocaleTimeString('fr-FR', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }
    </script>
    
    <div class="flex flex-col gap-2 p-4">
        {#if alerts.length > 0}
            <div class="flex items-center gap-2 mb-2">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-yellow-600" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
                </svg>
                <span class="font-medium">Alertes actives ({alerts.length})</span>
            </div>
    
            <div class="flex gap-2 mb-4">
                <span class="flex items-center gap-1 text-sm text-gray-600">
                    <span>❄️</span> CO2
                </span>
                <span class="flex items-center gap-1 text-sm text-gray-600">
                    <span>🌡️</span> Température
                </span>
                <span class="flex items-center gap-1 text-sm text-gray-600">
                    <span>💧</span> Humidité
                </span>
            </div>
    
            {#each alerts as alert (alert.id)}
                <div class="rounded-lg p-4 {getSeverityClass(alert.type, alert.value, alert.threshold)}">
                    <div class="flex items-center justify-between mb-1">
                        <div class="flex items-center gap-2">
                            <span>{getIcon(alert.type)}</span>
                            <span class="font-medium">{alert.value.toFixed(5)} {alert.type === 'co2' ? 'ppm' : alert.type === 'temperature' ? '°C' : '%'}</span>
                        </div>
                        <span class="text-sm text-gray-500">{formatTime(alert.timestamp)}</span>
                    </div>
                    <div class="text-sm text-gray-600">
                        Seuils: {alert.threshold[0]} - {alert.threshold[1]}
                    </div>
                    {#if alert.isStale}
                        <div class="text-sm text-gray-500 mt-1 italic">
                            51er envoi (Données anciennes)
                        </div>
                    {/if}
                </div>
            {/each}
        {:else}
            <div class="text-gray-500 text-center py-4">
                Aucune alerte active
            </div>
        {/if}
    </div>