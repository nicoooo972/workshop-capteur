<script lang="ts">
    import { goto } from '$app/navigation';
    import { fade, slide } from 'svelte/transition';
    import NotificationBell from '$lib/components/NotificationBell.svelte';
    import NotificationPanel from '$lib/components/NotificationPanel.svelte';
    import { auth } from '$lib/stores/auth';
    import AuthModal from '$lib/components/AuthModal.svelte';
    import { authService } from '$lib/services/auth';
    
    export let title: string;
    export let subtitle: string = '';
    export let showBack: boolean = false;
    export let showView3D: boolean = false;
    
    let showNotifications = false;
    let showProfileMenu = false;
    let showAuthModal = false;
    let showMobileMenu = false;
    
    function goBack() {
        history.back();
    }
    
    function goHome() {
        goto('/');
    }
    
    function navigateTo3DView() {
        goto('/3d-view');
    }

    function navigateToEnergy() {
        goto('/energy');
    }

    function handleClickOutside() {
        showNotifications = false;
    }

    function handleProfileClickOutside() {
        showProfileMenu = false;
    }

    async function handleLogout() {
        showMobileMenu = false;
        await authService.logout();
    }

    function openAuthModal() {
        showAuthModal = true;
    }

    function closeAuthModal() {
        showAuthModal = false;
    }

    function toggleMobileMenu() {
        showMobileMenu = !showMobileMenu;
    }
</script>

<div class="fixed inset-x-0 top-0 z-50 flex flex-col">
    <header class="bg-white shadow-sm">
        <div class="max-w-7xl mx-auto px-4">
            <div class="py-3 flex items-center justify-between">
                <!-- Partie gauche : Menu burger mobile + Titre -->
                <div class="flex items-center gap-3">
                    <button
                        class="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
                        on:click={toggleMobileMenu}
                        aria-label="Menu"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    </button>

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
                
                <!-- Partie droite -->
                <div class="flex items-center gap-4">
                    {#if $auth.isAuthenticated}
                        <!-- Notifications -->
                        <div class="relative" use:clickOutside on:click_outside={handleClickOutside}>
                            <NotificationBell on:click={() => showNotifications = !showNotifications} />
                            <NotificationPanel 
                                show={showNotifications} 
                                on:close={() => showNotifications = false}
                            />
                        </div>
                        
                        <!-- Navigation buttons - desktop only -->
                        <div class="hidden md:flex items-center gap-4">
                            {#if showView3D}
                                <button
                                    on:click={navigateTo3DView}
                                    class="flex items-center p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path d="M12 1.586l-4 4v12.828l4-4V1.586zM3.707 3.293A1 1 0 002 4v10a1 1 0 00.293.707L6 18.414V5.586L3.707 3.293zM17.707 5.293L14 1.586v12.828l4 4V6a1 1 0 00-.293-.707z" />
                                    </svg>
                                    <span class="ml-2">Vue 3D</span>
                                </button>
                            {/if}
                            
                            <button
                                on:click={navigateToEnergy}
                                class="flex items-center p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" />
                                </svg>
                                <span class="ml-2">Gestion énergétique</span>
                            </button>
                        </div>

                        <!-- Menu Profil - desktop only -->
                        <div class="relative hidden md:block" use:clickOutside on:click_outside={handleProfileClickOutside}>
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
                                        <p class="text-sm font-medium text-gray-900">{$auth.user?.email}</p>
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
                                        on:click={handleLogout}
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
                    {:else}
                        <button
                            on:click={openAuthModal}
                            class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                            Se connecter
                        </button>
                    {/if}
                </div>
            </div>
        </div>
    </header>

    <!-- Menu mobile slide-in -->
    {#if showMobileMenu}
        <div
            class="fixed inset-0 bg-gray-600 bg-opacity-75 z-40"
            on:click={toggleMobileMenu}
            transition:fade
        ></div>
        
        <div
            class="fixed inset-y-0 left-0 max-w-xs w-full bg-white shadow-xl z-50"
            transition:slide={{ axis: 'x' }}
        >
            <div class="flex flex-col h-full">
                <div class="p-4 border-b border-gray-200 flex justify-between items-center">
                    <h2 class="text-lg font-medium text-gray-900">Menu</h2>
                    <button
                        class="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                        on:click={toggleMobileMenu}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <nav class="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
                    {#if $auth.isAuthenticated}
                        <div class="px-3 py-2 border-b border-gray-200 mb-2">
                            <p class="text-sm font-medium text-gray-900">{$auth.user?.email}</p>
                        </div>
                    {/if}
                    <a
                    
                        href="/"
                        class="flex items-center px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
                        on:click={() => showMobileMenu = false}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-3" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                        </svg>
                        Accueil
                    </a>
                
                    {#if showView3D}
                    <a
                            href="/3d-view"
                            class="flex items-center px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
                            on:click={() => showMobileMenu = false}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-3" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M12 1.586l-4 4v12.828l4-4V1.586zM3.707 3.293A1 1 0 002 4v10a1 1 0 00.293.707L6 18.414V5.586L3.707 3.293zM17.707 5.293L14 1.586v12.828l4 4V6a1 1 0 00-.293-.707z" />
                            </svg>
                            Vue 3D
                        </a>
                    {/if}
                
                    <a
                        href="/energy"
                        class="flex items-center px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
                        on:click={() => showMobileMenu = false}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-3" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" />
                        </svg>
                        Gestion énergétique
                    </a>
                
                    {#if $auth.isAuthenticated}
                        
                    <a
                            href="/admin"
                            class="flex items-center px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
                            on:click={() => showMobileMenu = false}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-3" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M5 4a1 1 0 00-2 0v7.268a2 2 0 000 3.464V16a1 1 0 102 0v-1.268a2 2 0 000-3.464V4zM11 4a1 1 0 10-2 0v1.268a2 2 0 000 3.464V16a1 1 0 102 0V8.732a2 2 0 000-3.464V4zM16 3a1 1 0 011 1v7.268a2 2 0 010 3.464V16a1 1 0 11-2 0v-1.268a2 2 0 010-3.464V4a1 1 0 011-1z" />
                            </svg>
                            Administration
                        </a>
                
                        <a
                            href="/settings"
                            class="flex items-center px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
                            on:click={() => showMobileMenu = false}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-3" viewBox="0 0 20 20" fill="currentColor">
                                <path fill-rule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd" />
                            </svg>
                            Paramètres
                        </a>
                
                        <button
                            on:click={handleLogout}
                            class="w-full flex items-center px-3 py-2 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-3" viewBox="0 0 20 20" fill="currentColor">
                                <path fill-rule="evenodd" d="M3 3a1 1 0 011 1v12a1 1 0 11-2 0V4a1 1 0 011-1zm7.707 3.293a1 1 0 010 1.414L9.414 9H17a1 1 0 110 2H9.414l1.293 1.293a1 1 0 01-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0z" clip-rule="evenodd" />
                            </svg>
                            Déconnexion
                        </button>
                    {/if}
                </nav>
            </div>
        </div>
    {/if}
      <!-- Navigation mobile bottom -->
      <nav class="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 md:hidden">
        <div class="flex justify-around px-6 py-2">
            {#if showView3D}
                <button 
                    on:click={navigateTo3DView}
                    class="flex flex-col items-center p-2"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-indigo-600" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M12 1.586l-4 4v12.828l4-4V1.586zM3.707 3.293A1 1 0 002 4v10a1 1 0 00.293.707L6 18.414V5.586L3.707 3.293zM17.707 5.293L14 1.586v12.828l4 4V6a1 1 0 00-.293-.707z" />
                    </svg>
                    <span class="text-xs text-gray-600 mt-1">Vue 3D</span>
                </button>
            {/if}
            <button 
                on:click={goHome}
                class="flex flex-col items-center p-2"
            >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-indigo-600" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                </svg>
                <span class="text-xs text-gray-600 mt-1">Accueil</span>
            </button>
            <button 
                on:click={navigateToEnergy}
                class="flex flex-col items-center p-2"
            >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-indigo-600" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" />
                </svg>
                <span class="text-xs text-gray-600 mt-1">Énergie</span>
            </button>
        </div>
    </nav>
</div>
{#if showAuthModal}
    <AuthModal on:close={closeAuthModal} />
{/if}

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