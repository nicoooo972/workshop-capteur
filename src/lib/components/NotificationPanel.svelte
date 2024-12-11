<!-- NotificationPanel.svelte -->
<script lang="ts">
    import { notifications } from '$lib/stores/notifications';
    import { fly } from 'svelte/transition';
    import { createEventDispatcher } from 'svelte';

    const dispatch = createEventDispatcher();
    
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
    <!-- Overlay sombre -->
    <div 
        class="fixed inset-0 bg-black bg-opacity-50 z-40"
        on:click={() => dispatch('close')}
        transition:fly={{ opacity: 0, duration: 200 }}
    />

    <!-- Barre latérale -->
    <div
        class="fixed inset-y-0 right-0 w-full sm:w-96 bg-white shadow-lg z-50"
        transition:fly={{ x: 300, duration: 200 }}
    >
        <!-- En-tête -->
        <div class="flex items-center justify-between p-4 border-b border-gray-200">
            <h3 class="font-semibold text-lg">Notifications</h3>
            <div class="flex items-center gap-4">
                <button
                    class="text-sm text-indigo-600 hover:text-indigo-800"
                    on:click={() => notifications.markAllAsRead()}
                >
                    Tout marquer comme lu
                </button>
                <button
                    class="p-2 hover:bg-gray-100 rounded-full"
                    on:click={() => dispatch('close')}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
        </div>
        
        <!-- Liste des notifications -->
        <div class="overflow-y-auto h-[calc(100vh-4rem)]">
            {#if $notifications.length === 0}
                <div class="p-4 text-center text-gray-500">
                    Aucune notification
                </div>
            {:else}
                {#each $notifications as notification (notification.id)}
                    <div
                        class="p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors"
                        class:bg-gray-50={notification.isRead}
                        transition:fly={{ x: 50, duration: 200 }}
                    >
                        <div class="flex items-start gap-3">
                            <span class="text-2xl">{getIcon(notification.type)}</span>
                            <div class="flex-1 min-w-0">
                                <p class="font-medium truncate">
                                    {notification.location} - {notification.type.charAt(0).toUpperCase() + notification.type.slice(1)}
                                </p>
                                <p class="text-sm text-gray-600 truncate">
                                    Valeur: {notification.value} 
                                    (Seuils: {notification.threshold[0]} - {notification.threshold[1]})
                                </p>
                                <p class="text-xs text-gray-500 mt-1">
                                    {formatDate(notification.timestamp)}
                                </p>
                            </div>
                            <span class="shrink-0 px-2 py-1 rounded-full text-xs {notification.severity === 'critical' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}">
                                {notification.severity}
                            </span>
                        </div>
                    </div>
                {/each}
            {/if}
        </div>
    </div>
{/if}

<style>
    /* Empêcher le défilement du body quand le panneau est ouvert */
    :global(body.notifications-open) {
        overflow: hidden;
    }
</style>