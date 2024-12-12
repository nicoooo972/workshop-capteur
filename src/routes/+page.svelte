<script lang="ts">
    import { onMount } from 'svelte';
    import { onValue, ref, update } from 'firebase/database';
    import { db } from '$lib/firebase';
    import { goto } from '$app/navigation';
    import Header from './Header.svelte';

    type RoomInfo = {
        id: string;
        name: string;
        lastUpdate?: number;
        status: 'online' | 'offline' | 'warning';
        location: string;
        floor: number;
        isEditing?: boolean;
        temperature?: number;
        humidity?: number;
        co2?: number;
        timestamp?: number;
    };

    const CACHE_KEY = 'roomCustomNames';
  
    let rooms: RoomInfo[] = [];
    let searchQuery = '';
    let loading = true;
    let selectedFloor: number | null = null;

    // Configuration des seuils
    const thresholds = {
        co2: [400, 1000],        // ppm
        temperature: [18, 26],    // °C
        humidity: [40, 60]        // %
    };

    // Gestion du cache des noms personnalisés
    function getCustomNamesFromCache(): Record<string, string> {
        const cached = localStorage.getItem(CACHE_KEY);
        return cached ? JSON.parse(cached) : {};
    }

    function saveCustomNameToCache(roomId: string, name: string) {
        const customNames = getCustomNamesFromCache();
        customNames[roomId] = name;
        localStorage.setItem(CACHE_KEY, JSON.stringify(customNames));
    }

    function getRoomName(roomId: string, defaultName: string): string {
        const customNames = getCustomNamesFromCache();
        return customNames[roomId] || defaultName;
    }

    // Configuration des étages
    const floors = [
        { number: -1, name: 'Sous-sol' },
        { number: 0, name: 'RDC' },
        { number: 1, name: '1er étage' },
        { number: 2, name: '2ème étage' },
        { number: 3, name: '3ème étage' },
        { number: 4, name: '4ème étage' },
        { number: 5, name: '5ème étage' }
    ];

    // Fonctions utilitaires
    function getRoomStatus(lastUpdate: number): 'online' | 'offline' | 'warning' {
        const now = Date.now();
        const timeDiff = now - lastUpdate;
        
        if (timeDiff > 30 * 60 * 1000) return 'offline';
        if (timeDiff > 5 * 60 * 1000) return 'warning';
        return 'online';
    }

    function getMetricStatus(value: number, thresholds: number[]): string {
        if (value < thresholds[0] || value > thresholds[1]) return 'bg-red-500';
        return 'bg-green-500';
    }

    function formatFloorName(floorNumber: number): string {
        switch (floorNumber) {
            case -1:
                return 'Sous-sol';
            case 0:
                return 'RDC';
            default:
                return `${floorNumber}${floorNumber === 1 ? 'er' : 'ème'} étage`;
        }
    }

    function getStatusColor(status: string): string {
        switch (status) {
            case 'online': return 'bg-green-500';
            case 'warning': return 'bg-yellow-500';
            case 'offline': return 'bg-red-500';
            default: return 'bg-gray-500';
        }
    }

    function formatLastUpdate(timestamp: number): string {
        if (!timestamp) return 'Jamais connecté';
        return new Date(timestamp).toLocaleString('fr-FR', {
            dateStyle: 'short',
            timeStyle: 'short'
        });
    }

    function getStatusText(status: string): string {
        switch (status) {
            case 'online': return 'En ligne';
            case 'warning': return 'Attention';
            case 'offline': return 'Hors ligne';
            default: return 'Inconnu';
        }
    }
  
    // Filtrage des salles
    $: filteredRooms = rooms.filter(room => {
        const matchesSearch = room.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            room.location.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesFloor = selectedFloor === null || room.floor === selectedFloor;
        return matchesSearch && matchesFloor;
    });

    // Navigation et édition
    function navigateToRoom(roomId: string) {
        goto(`/${roomId}`);
    }

    function startEditing(room: RoomInfo) {
        rooms = rooms.map(r => ({
            ...r,
            isEditing: r.id === room.id
        }));
    }

    async function saveRoomName(room: RoomInfo, newName: string) {
        if (!newName.trim()) return;

        try {
            saveCustomNameToCache(room.id, newName);
            rooms = rooms.map(r => {
                if (r.id === room.id) {
                    return { ...r, name: newName, isEditing: false };
                }
                return r;
            });
        } catch (error) {
            console.error('Erreur lors de la mise à jour du nom:', error);
            alert('Erreur lors de la mise à jour du nom de la salle');
        }
    }

    function cancelEditing(room: RoomInfo) {
        rooms = rooms.map(r => ({
            ...r,
            isEditing: false
        }));
    }

    // Initialisation des données
    onMount(() => {
        const campusRef = ref(db, 'dcCampus');
        
        const unsubscribe = onValue(campusRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                rooms = Object.entries(data)
                    .map(([key, value]: [string, any]) => {
                        const latestData = Object.values(value || {})[0] || {};
                        const floor = parseInt(key.split('_')[1]) || 0;
                        const defaultName = `Salle ${key.split('_').pop()}`;
                        
                        return {
                            id: key,
                            name: getRoomName(key, defaultName),
                            lastUpdate: latestData.date,
                            status: getRoomStatus(latestData.date),
                            location: 'Digital Campus',
                            floor,
                            isEditing: false,
                            temperature: latestData.temperature,
                            humidity: latestData.humidity,
                            co2: latestData.co2,
                            timestamp: latestData.date
                        };
                    })
                    .filter(room => room !== null);
            }
            loading = false;
        });

        return () => unsubscribe();
    });
</script>

<svelte:head>
    <title>Monitoring des Salles - Digital Campus</title>
    <meta name="theme-color" content="#4f46e5">
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
</svelte:head>

<div class="min-h-screen bg-gray-50">
    <Header 
        title="Monitoring des Salles"
        subtitle="Surveillance en temps réel des capteurs"
        showView3D={true}
    />

    <main class="pt-24 sm:pt-32 pb-8 px-3 sm:px-6 lg:px-8">
        <div class="max-w-7xl mx-auto">
            <!-- Filtres et recherche -->
            <div class="sticky top-16 sm:top-20 z-10 bg-gray-50 pb-4 space-y-4 sm:space-y-6">
                <!-- Barre de recherche responsive -->
                <div class="relative max-w-2xl mx-auto">
                    <input
                        type="text"
                        bind:value={searchQuery}
                        placeholder="Rechercher une salle..."
                        class="w-full px-4 py-2 sm:py-3 pl-10 text-sm sm:text-base rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent shadow-sm"
                    />
                    <svg 
                        class="absolute left-3 top-2.5 sm:top-3.5 h-4 w-4 sm:h-5 sm:w-5 text-gray-400" 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                    >
                        <path 
                            stroke-linecap="round" 
                            stroke-linejoin="round" 
                            stroke-width="2" 
                            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                        />
                    </svg>
                </div>

                <!-- Filtres d'étage responsive -->
                <div class="relative -left-3 sm:-left-6 lg:-left-8 w-screen">
                    <div class="px-3 sm:px-6 lg:px-8">
                        <div class="flex gap-1.5 sm:gap-2 overflow-x-auto scrollbar-hide py-1.5 sm:py-2">
                            <button
                                class="px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap
                                    {selectedFloor === null ? 
                                        'bg-indigo-600 text-white' : 
                                        'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'}"
                                on:click={() => selectedFloor = null}
                            >
                                Tous les étages
                            </button>
                            {#each floors as floor}
                                <button
                                    class="px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap
                                        {selectedFloor === floor.number ? 
                                            'bg-indigo-600 text-white' : 
                                            'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'}"
                                    on:click={() => selectedFloor = floor.number}
                                >
                                    {floor.name}
                                </button>
                            {/each}
                        </div>
                    </div>
                </div>
            </div>

            <!-- Grille de salles responsive -->
            <div class="mt-4 sm:mt-6">
                {#if loading}
                    <div class="flex flex-col items-center justify-center py-8 sm:py-12">
                        <div class="inline-block animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-3 sm:border-4 border-indigo-500 border-t-transparent"></div>
                        <p class="mt-3 sm:mt-4 text-sm sm:text-base text-gray-600">Chargement des salles...</p>
                    </div>
                {:else if filteredRooms.length === 0}
                    <div class="text-center py-8 sm:py-12">
                        <svg class="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p class="mt-3 sm:mt-4 text-sm sm:text-base text-gray-600">Aucune salle ne correspond à votre recherche</p>
                        <button
                            class="mt-3 sm:mt-4 text-sm sm:text-base text-indigo-600 hover:text-indigo-500"
                            on:click={() => { searchQuery = ''; selectedFloor = null; }}
                        >
                            Réinitialiser les filtres
                        </button>
                    </div>
                {:else}
                    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
                        {#each filteredRooms as room (room.id)}
                            <div
                                class="group bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden border border-gray-100"
                                class:cursor-pointer={!room.isEditing}
                                on:click={() => !room.isEditing && navigateToRoom(room.id)}
                            >
                                <div class="p-3 sm:p-4 lg:p-6">
                                    <!-- En-tête de carte responsive -->
                                    <div class="flex items-start justify-between mb-3 sm:mb-4">
                                        <div class="flex-1 min-w-0">
                                            {#if room.isEditing}
                                                <div class="flex items-center gap-1.5 sm:gap-2">
                                                    <input
                                                        type="text"
                                                        class="flex-1 px-2 sm:px-3 py-1.5 sm:py-2 text-sm sm:text-base border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                                        value={room.name}
                                                        on:click={(e) => e.stopPropagation()}
                                                        on:keydown={(e) => {
                                                            if (e.key === 'Enter') saveRoomName(room, e.target.value);
                                                            else if (e.key === 'Escape') cancelEditing(room);
                                                        }}
                                                    />
                                                    <!-- Boutons d'édition responsifs -->
                                                    <div class="flex gap-1">
                                                        <button
                                                            class="p-1.5 sm:p-2 text-green-600 hover:text-green-800 rounded-full hover:bg-green-50"
                                                            on:click={(e) => {
                                                                e.stopPropagation();
                                                                const input = e.target.closest('div').previousElementSibling;
                                                                saveRoomName(room, input.value);
                                                            }}
                                                        >
                                                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 sm:h-5 sm:w-5" viewBox="0 0 20 20" fill="currentColor">
                                                                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                                                            </svg>
                                                        </button>
                                                        <button
                                                            class="p-1.5 sm:p-2 text-red-600 hover:text-red-800 rounded-full hover:bg-red-50"
                                                            on:click={(e) => {
                                                                e.stopPropagation();
                                                                cancelEditing(room);
                                                            }}
                                                        >
                                                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 sm:h-5 sm:w-5" viewBox="0 0 20 20" fill="currentColor">
                                                                <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                </div>
                                            {:else}
                                                <div class="flex items-start gap-1.5 sm:gap-2">
                                                    <h3 class="text-base sm:text-lg font-semibold text-gray-900 truncate">
                                                        {room.name}
                                                    </h3>
                                                    <button
                                                        class="p-0.5 sm:p-1 text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                                        on:click={(e) => {
                                                            e.stopPropagation();
                                                            startEditing(room);
                                                        }}
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 sm:h-4 sm:w-4" viewBox="0 0 20 20" fill="currentColor">
                                                            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            {/if}
                                        </div>

                                        <!-- Statut responsive -->
                                        <div class="flex items-center ml-3 sm:ml-4">
                                            <span class={`h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full ${getStatusColor(room.status)}`}></span>
                                            <span class="ml-1.5 sm:ml-2 text-xs sm:text-sm text-gray-500 whitespace-nowrap">
                                                {getStatusText(room.status)}
                                            </span>
                                        </div>
                                    </div>

                                    <!-- Informations de la salle responsives -->
                                    <div class="space-y-1.5 sm:space-y-2">
                                        <div class="flex items-center text-xs sm:text-sm text-gray-600">
                                            <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                            </svg>
                                            <span>{formatFloorName(room.floor)} - {room.location}</span>
                                        </div>

                                        <div class="flex items-center text-xs sm:text-sm text-gray-500">
                                            <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            <span>Dernière mise à jour: {formatLastUpdate(room.timestamp)}</span>
                                        </div>

                                        <!-- Indicateurs de capteurs -->
                                        <div class="grid grid-cols-3 gap-2 mt-2">
                                            <div class="flex items-center gap-1">
                                                <span class={`h-2 w-2 rounded-full ${room.temperature ? getMetricStatus(room.temperature, thresholds.temperature) : 'bg-gray-300'}`}></span>
                                                <span class="text-xs">{room.temperature?.toFixed(1)}°C</span>
                                            </div>
                                            <div class="flex items-center gap-1">
                                                <span class={`h-2 w-2 rounded-full ${room.humidity ? getMetricStatus(room.humidity, thresholds.humidity) : 'bg-gray-300'}`}></span>
                                                <span class="text-xs">{room.humidity?.toFixed(1)}%</span>
                                            </div>
                                            <div class="flex items-center gap-1">
                                                <span class={`h-2 w-2 rounded-full ${room.co2 ? getMetricStatus(room.co2, thresholds.co2) : 'bg-gray-300'}`}></span>
                                                <span class="text-xs">{room.co2?.toFixed(0)} ppm</span>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Bouton détails responsive -->
                                    <div class="mt-3 sm:mt-4 flex justify-end">
                                        <button
    class="px-3 sm:px-4 py-1.5 sm:py-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-medium"
    on:click={(e) => {
        e.stopPropagation();
        navigateToRoom(room.id);
    }}
>
    <span>Voir les détails</span>
    <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 sm:h-4 sm:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
    </svg>
</button>
                                    </div>
                                </div>
                            </div>
                        {/each}
                    </div>
                {/if}
            </div>
        </div>
    </main>
</div>

<style>
    /* Cache la barre de défilement tout en préservant la fonctionnalité */
    .scrollbar-hide {
        -ms-overflow-style: none;
        scrollbar-width: none;
    }
    .scrollbar-hide::-webkit-scrollbar {
        display: none;
    }

    /* Animation de transition pour les cartes */
    .grid > div {
        animation: fadeIn 0.3s ease-in-out;
    }

    @keyframes fadeIn {
        from {
            opacity: 0;
            transform: translateY(10px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
</style>