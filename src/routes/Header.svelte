<script lang="ts">
    import { goto } from '$app/navigation';
    
    export let title: string;
    export let subtitle: string = '';
    export let showBack: boolean = false;
    export let showView3D: boolean = false;
    
    function goBack() {
        history.back();
    }
    
    function goHome() {
        goto('/');
    }
    
    function navigateTo3DView() {
        goto('/3d-view');
    }
</script>

<div class="fixed inset-x-0 top-0 z-50 flex flex-col">
    <!-- Top header -->
    <header class="bg-white shadow-sm">
        <div class="max-w-7xl mx-auto px-4">
            <div class="py-3 flex items-center justify-between">
                <div class="flex items-center gap-3">
                    {#if showBack}
                        <button
                            on:click={goBack}
                            class="p-2 rounded-full hover:bg-gray-100 transition-colors"
                            aria-label="Retour"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" stroke="currentColor" fill="none">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>
                    {/if}
                    <div class="min-w-0">
                        <h1 class="text-lg font-bold text-gray-900 truncate">{title}</h1>
                        {#if subtitle}
                            <p class="mt-0.5 text-sm text-gray-600 truncate">{subtitle}</p>
                        {/if}
                    </div>
                </div>
                
                {#if showView3D}
                    <button
                        on:click={navigateTo3DView}
                        class="flex items-center p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                        <span class="hidden sm:inline">Vue 3D</span>
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 sm:ml-2" viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clip-rule="evenodd" />
                        </svg>
                    </button>
                {/if}
            </div>
        </div>
    </header>

    <!-- Bottom navigation bar - Visible only on mobile -->
    <nav class="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 md:hidden">
        <div class="flex justify-around px-6 py-2">
            <button 
                on:click={goHome}
                class="flex flex-col items-center p-2"
            >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-indigo-600" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                </svg>
                <span class="text-xs text-gray-600 mt-1">Accueil</span>
            </button>
        </div>
    </nav>
</div>

<style>
    /* Ajustement pour le contenu principal */
    :global(main) {
        padding-top: 3.5rem;
        padding-bottom: 4rem;
    }

    @media (min-width: 768px) {
        :global(main) {
            padding-bottom: 2rem;
        }
    }
</style>