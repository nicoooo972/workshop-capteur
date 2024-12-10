<script lang="ts">
    import { goto } from '$app/navigation';
    
    export let title: string;
    export let subtitle: string = '';
    export let showBack: boolean = false;
    export let showView3D: boolean = false;
    
    function goBack() {
        history.back();
    }
    
    function navigateTo3DView() {
        goto('/3d-view');
    }
</script>

<header class="fixed top-0 left-0 right-0 bg-white z-50 shadow-sm">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="py-4 flex items-center justify-between">
            <div class="flex items-center gap-4">
                {#if showBack}
                    <button
                        on:click={goBack}
                        class="p-2 rounded-full hover:bg-gray-100 transition-colors"
                        aria-label="Retour"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                {/if}
                <div>
                    <h1 class="text-xl font-bold text-gray-900 sm:text-2xl">{title}</h1>
                    {#if subtitle}
                        <p class="mt-1 text-sm text-gray-600">{subtitle}</p>
                    {/if}
                </div>
            </div>
            
            {#if showView3D}
                <button
                    on:click={navigateTo3DView}
                    class="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm sm:px-6"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clip-rule="evenodd" />
                    </svg>
                    <span class="hidden sm:inline">Vue 3D</span>
                </button>
            {/if}
        </div>
    </div>
</header>