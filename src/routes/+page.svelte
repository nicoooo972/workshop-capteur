<script lang="ts">
    import { onMount } from 'svelte';
    import { onValue, ref } from 'firebase/database';
    import { db } from '$lib/firebase';
    import { goto } from '$app/navigation';
  
    type RoomInfo = {
      id: string;
      name: string;
      lastUpdate?: number;
      status: 'online' | 'offline' | 'warning';
      location: string;
      floor: number;
    };
  
    let rooms: RoomInfo[] = [];
    let searchQuery = '';
    let loading = true;
    let selectedFloor: number | null = null;

    const floors = [
      { number: -1, name: 'Sous-sol' },
      { number: 0, name: 'Rez-de-chaussée' },
      { number: 1, name: '1er étage' },
      { number: 2, name: '2ème étage' },
      { number: 3, name: '3ème étage' },
      { number: 4, name: '4ème étage' },
      { number: 5, name: '5ème étage' }
    ];

    function getRoomStatus(lastUpdate: number): 'online' | 'offline' | 'warning' {
      const now = Date.now();
      const timeDiff = now - lastUpdate;
      
      if (timeDiff > 30 * 60 * 1000) return 'offline';
      if (timeDiff > 5 * 60 * 1000) return 'warning';
      return 'online';
    }

    function formatFloorName(floorNumber: number): string {
        switch (floorNumber) {
            case -1:
                return 'Sous-sol';
            case 0:
                return 'Rez-de-chaussée';
            default:
                return `${floorNumber}${floorNumber === 1 ? 'er' : 'ème'} étage`;
        }
    }
  
    $: filteredRooms = rooms.filter(room => {
      const matchesSearch = room.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          room.location.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFloor = selectedFloor === null || room.floor === selectedFloor;
      return matchesSearch && matchesFloor;
    });
  
    onMount(() => {
      const campusRef = ref(db, 'dcCampus');
      
      onValue(campusRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          rooms = Object.keys(data).map(key => {
            const latestData = Object.values(data[key])[0] as any;
            const floor = parseInt(key.split('_')[1]) || 0;
            return {
              id: key,
              name: `Salle ${key.split('_').pop()}`,
              lastUpdate: latestData?.timestamp,
              status: getRoomStatus(latestData?.timestamp),
              location: 'Digital Campus',
              floor
            };
          });
        }
        loading = false;
      });
    });
  
    function navigateToRoom(roomId: string) {
      goto(`/${roomId}`);
    }

    function navigateTo3DView() {
      goto('/3d-view');
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
</script>

<div class="min-h-screen bg-gray-50 py-8">
    <div class="container mx-auto px-4">
        <header class="mb-8">
            <div class="flex justify-between items-start mb-4">
                <div class="text-center flex-1">
                    <h1 class="text-3xl font-bold text-gray-900">Monitoring des Salles</h1>
                    <p class="mt-2 text-gray-600">Surveillance en temps réel des capteurs</p>
                </div>
                <button
                    on:click={navigateTo3DView}
                    class="flex items-center px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-md"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 mr-2" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clip-rule="evenodd" />
                    </svg>
                    Vue 3D du Bâtiment
                </button>
            </div>

            <div class="flex flex-col md:flex-row gap-4 mt-6">
                <div class="flex-1">
                    <div class="relative">
                        <input
                            type="text"
                            bind:value={searchQuery}
                            placeholder="Rechercher une salle..."
                            class="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />
                        <svg 
                            class="absolute right-3 top-3 h-6 w-6 text-gray-400" 
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
                </div>
                <div class="flex gap-2 overflow-x-auto py-1">
                    <button
                        class="px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap
                            {selectedFloor === null ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'}"
                        on:click={() => selectedFloor = null}
                    >
                        Tous les étages
                    </button>
                    {#each floors as floor}
                        <button
                            class="px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap
                                {selectedFloor === floor.number ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'}"
                            on:click={() => selectedFloor = floor.number}
                        >
                            {floor.name}
                        </button>
                    {/each}
                </div>
            </div>
        </header>

        {#if loading}
            <div class="text-center py-12">
                <div class="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-500 border-t-transparent"></div>
                <p class="mt-2 text-gray-600">Chargement des salles...</p>
            </div>
        {:else if filteredRooms.length === 0}
            <div class="text-center py-12">
                <p class="text-gray-600">Aucune salle ne correspond à votre recherche</p>
            </div>
        {:else}
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {#each filteredRooms as room}
                    <button
                        on:click={() => navigateToRoom(room.id)}
                        class="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden text-left"
                    >
                        <div class="p-6">
                            <div class="flex items-start justify-between mb-4">
                                <div>
                                    <h3 class="text-lg font-semibold text-gray-900">{room.name}</h3>
                                    <p class="text-sm text-gray-600">
                                        {formatFloorName(room.floor)} - {room.location}
                                    </p>
                                </div>
                                <div class="flex items-center space-x-2">
                                    <span class={`h-3 w-3 rounded-full ${getStatusColor(room.status)}`}></span>
                                    <span class="text-sm text-gray-500">
                                        {room.status === 'online' ? 'En ligne' : room.status === 'warning' ? 'Attention' : 'Hors ligne'}
                                    </span>
                                </div>
                            </div>
                            <div class="text-sm text-gray-500">
                                Dernière mise à jour: {formatLastUpdate(room.lastUpdate)}
                            </div>
                        </div>
                    </button>
                {/each}
            </div>
        {/if}
    </div>
</div>