<!-- src/lib/components/AuthModal.svelte -->
<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    import { fade, slide } from 'svelte/transition';
    import { auth } from '$lib/stores/auth';
    import { authService } from '$lib/services/auth';
    
    const dispatch = createEventDispatcher();
    
    let isLogin = true;
    let email = '';
    let password = '';
    let confirmPassword = '';
    let error = '';
    let loading = false;

    // Fonction simple de hachage pour l'exemple (à remplacer par une meilleure solution)
    const hashPassword = async (pwd: string) => {
        const encoder = new TextEncoder();
        const data = encoder.encode(pwd);
        const hash = await crypto.subtle.digest('SHA-256', data);
        return Array.from(new Uint8Array(hash))
            .map(byte => byte.toString(16).padStart(2, '0'))
            .join('');
    };

    async function handleSubmit() {
        loading = true;
        error = '';

        try {
            const hashedPassword = await hashPassword(password);
            
            if (isLogin) {
                const { token, user } = await authService.login(email, hashedPassword);
                localStorage.setItem('token', token);
                auth.login(user);
            } else {
                if (password !== confirmPassword) {
                    throw new Error('Les mots de passe ne correspondent pas');
                }
                const { token, user } = await authService.register(email, hashedPassword, {});
                localStorage.setItem('token', token);
                auth.login(user);
            }
            dispatch('close');
        } catch (err) {
            error = err.message;
        } finally {
            loading = false;
        }
    }

    function toggleForm() {
        isLogin = !isLogin;
        error = '';
    }
</script>

<div
    class="fixed inset-0 bg-gray-500 bg-opacity-75 z-50 flex items-center justify-center p-4"
    transition:fade
    on:click|self={() => dispatch('close')}
>
    <div
        class="bg-white rounded-lg shadow-xl max-w-md w-full"
        transition:slide
    >
        <!-- En-tête -->
        <div class="flex justify-between items-center p-4 border-b">
            <h2 class="text-lg font-medium">{isLogin ? 'Connexion' : 'Inscription'}</h2>
            <button
                on:click={() => dispatch('close')}
                class="text-gray-400 hover:text-gray-500"
            >
                <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        </div>
        
        <!-- Formulaire -->
        <form on:submit|preventDefault={handleSubmit} class="p-4 space-y-4">
            <div>
                <label for="email" class="block text-sm font-medium text-gray-700">Email</label>
                <input
                    type="email"
                    id="email"
                    bind:value={email}
                    class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    required
                />
            </div>

            <div>
                <label for="password" class="block text-sm font-medium text-gray-700">Mot de passe</label>
                <input
                    type="password"
                    id="password"
                    bind:value={password}
                    class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    required
                />
            </div>

            {#if !isLogin}
                <div>
                    <label for="confirmPassword" class="block text-sm font-medium text-gray-700">
                        Confirmer le mot de passe
                    </label>
                    <input
                        type="password"
                        id="confirmPassword"
                        bind:value={confirmPassword}
                        class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                        required
                    />
                </div>
            {/if}

            {#if error}
                <div class="text-red-600 text-sm">{error}</div>
            {/if}

            <button
                type="submit"
                disabled={loading}
                class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
                {#if loading}
                    <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                {/if}
                {isLogin ? 'Se connecter' : 'S\'inscrire'}
            </button>

            <div class="text-center">
                <button
                    type="button"
                    on:click={toggleForm}
                    class="text-sm text-indigo-600 hover:text-indigo-500"
                >
                    {isLogin ? 'Créer un compte' : 'Déjà un compte ? Se connecter'}
                </button>
            </div>
        </form>
    </div>
</div>