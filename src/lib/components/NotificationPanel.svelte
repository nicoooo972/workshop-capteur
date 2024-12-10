<script lang="ts">
    import { notifications } from '$lib/stores/notifications';
    import { fade, slide } from 'svelte/transition';
    
    export let show = false;
    
    function formatDate(timestamp: number) {
        return new Date(timestamp).toLocaleString('fr-FR', {
            dateStyle: 'short',
            timeStyle: 'short'
        });
    }
    
    const getIcon = (type: string) => {
        switch(type) {
            case 'temperature': return '🌡️';
            case 'humidity': return '💧';
            case 'co2': return '📊';
            default: return '❗';
        }
    };
</script>

{#if show}
    <div
        class="absolute right-0 top-full mt-2 w-96 bg-white rounded-lg shadow-lg overflow-hidden"
        transition:slide
    >
        <div class="p-4 border-b border-gray-200 flex justify-between items-center">
            <h3 class="font-semibold">Notifications</h3>
            <button
                class="text-sm text-indigo-600 hover:text-indigo-800"
                on:click={() => notifications.markAllAsRead()}
            >
                Tout marquer comme lu
            </button>
        </div>
        
        <div class="max-h-96 overflow-y-auto">
            {#if $notifications.length === 0}
                <div class="p-4 text-center text-gray-500">
                    Aucune notification
                </div>
            {:else}
                {#each $notifications as notification (notification.id)}
                    <div
                        class="p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors"
                        class:bg-gray-50={notification.isRead}
                        transition:fade
                    >
                        <div class="flex items-start gap-3">
                            <span class="text-2xl">{getIcon(notification.type)}</span>
                            <div class="flex-1">
                                <p class="font-medium">
                                    {notification.location} - {notification.type.charAt(0).toUpperCase() + notification.type.slice(1)}
                                </p>
                                <p class="text-sm text-gray-600">
                                    Valeur: {notification.value} 
                                    (Seuils: {notification.threshold[0]} - {notification.threshold[1]})
                                </p>
                                <p class="text-xs text-gray-500 mt-1">
                                    {formatDate(notification.timestamp)}
                                </p>
                            </div>
                            <span class={`px-2 py-1 rounded-full text-xs ${notification.severity === 'critical' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                {notification.severity}
                            </span>
                        </div>
                    </div>
                {/each}
            {/if}
        </div>
    </div>
{/if}