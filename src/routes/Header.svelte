<script lang="ts">
    import { goto } from '$app/navigation';
    import { slide } from 'svelte/transition';
    import NotificationBell from '$lib/components/NotificationBell.svelte';
    import NotificationPanel from '$lib/components/NotificationPanel.svelte';
    
    export let title: string;
    export let subtitle: string = '';
    export let showBack: boolean = false;
    export let showView3D: boolean = false;
    
    let showNotifications = false;
    let showProfileMenu = false;
    
    function goBack() {
        history.back();
    }
    
    function goHome() {
        goto('/');
    }
    
    function navigateTo3DView() {
        goto('/3d-view');
    }

    function handleClickOutside() {
        showNotifications = false;
    }

    function handleProfileClickOutside() {
        showProfileMenu = false;
    }
</script>

<div class="fixed inset-x-0 top-0 z-50 flex flex-col">
    <!-- Top header -->
    <header class="bg-white shadow-sm">
        <div class="max-w-7xl mx-auto px-4">
            <div class="py-3 flex items-center justify-between">
                <!-- Partie gauche : Titre et bouton retour -->
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
                
                <!-- Partie droite : Notifications, Vue 3D et Profil -->
                <div class="flex items-center gap-4">
                    <!-- Notifications -->
                    <div class="relative">
                        <NotificationBell on:click={() => showNotifications = !showNotifications} />
                        <NotificationPanel 
                            show={showNotifications} 
                            on:close={() => showNotifications = false}
                        />
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

                    <!-- Menu Profil -->
                    <div class="relative" use:clickOutside on:click_outside={handleProfileClickOutside}>
                        <button
                            class="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 transition-colors"
                            on:click={() => showProfileMenu = !showProfileMenu}
                        >
                            <div class="h-8 w-8 rounded-full bg-indigo-600 flex items-center justify-center text-white">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd" />
                                </svg>
                            </div>
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                                <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
                            </svg>
                        </button>

                        {#if showProfileMenu}
                            <div 
                                class="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-1 z-50"
                                transition:slide
                            >
                                <div class="px-4 py-2 border-b border-gray-100">
                                    <p class="text-sm font-medium text-gray-900">Admin User</p>
                                    <p class="text-sm text-gray-500">admin@example.com</p>
                                </div>
                                
                                <a 
                                    href="/admin"
                                    class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path d="M5 4a1 1 0 00-2 0v7.268a2 2 0 000 3.464V16a1 1 0 102 0v-1.268a2 2 0 000-3.464V4zM11 4a1 1 0 10-2 0v1.268a2 2 0 000 3.464V16a1 1 0 102 0V8.732a2 2 0 000-3.464V4zM16 3a1 1 0 011 1v7.268a2 2 0 010 3.464V16a1 1 0 11-2 0v-1.268a2 2 0 010-3.464V4a1 1 0 011-1z" />
                                    </svg>
                                    Administration
                                </a>
                                
                                <a 
                                    href="/settings"
                                    class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path fill-rule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd" />
                                    </svg>
                                    Paramètres
                                </a>
                                
                                <button 
                                    class="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100 flex items-center gap-2"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path fill-rule="evenodd" d="M3 3a1 1 0 011 1v12a1 1 0 11-2 0V4a1 1 0 011-1zm7.707 3.293a1 1 0 010 1.414L9.414 9H17a1 1 0 110 2H9.414l1.293 1.293a1 1 0 01-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0z" clip-rule="evenodd" />
                                    </svg>
                                    Déconnexion
                                </button>
                            </div>
                        {/if}
                    </div>
                </div>
            </div>
        </div>
    </header>

    <!-- Navigation mobile -->
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

<!-- Action clickOutside personnalisée -->
<script context="module">
export const clickOutside = (node: HTMLElement) => {
    const handleClick = (event: MouseEvent) => {
        if (!node.contains(event.target as Node)) {
            node.dispatchEvent(new CustomEvent('click_outside'));
        }
    };

    document.addEventListener('click', handleClick, true);

    return {
        destroy() {
            document.removeEventListener('click', handleClick, true);
        }
    };
};
</script>

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