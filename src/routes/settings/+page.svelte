<!-- src/routes/settings/+page.svelte -->
<script lang="ts">
    import { auth } from '$lib/stores/auth';
    import { db } from '$lib/firebase';
    import { get, ref, update } from 'firebase/database';
    import { Dialog, DialogContent } from '$lib/components/ui/dialog';
	import { comparePassword, hashPassword } from '$lib/utils/password';
	import Header from '../Header.svelte';

    let loading = false;
    let errorMessage = '';
    let successMessage = '';

    // États pour le changement d'email
    let newEmail = '';
    let passwordForEmail = '';
    let showEmailDialog = false;

    // États pour le changement de mot de passe
    let currentPassword = '';
    let newPassword = '';
    let confirmPassword = '';
    let showPasswordDialog = false;

    // Réactif à l'utilisateur courant
    $: if ($auth.user) {
        newEmail = $auth.user.email;
    }

    // Changement d'email
    async function handleEmailChange() {
        try {
            loading = true;
            errorMessage = '';

            if (!$auth.user) {
                throw new Error("Utilisateur non connecté");
            }

            // Vérifier que l'email est différent
            if (newEmail === $auth.user.email) {
                throw new Error("La nouvelle adresse email est identique à l'actuelle");
            }

            // Mettre à jour dans la base de données
            const userRef = ref(db, `users/${$auth.user.id}`);
            await update(userRef, {
                email: newEmail
            });

            // Mettre à jour le store local
            auth.login({
                ...$auth.user,
                email: newEmail
            });

            successMessage = "Votre adresse email a été mise à jour avec succès";
            showEmailDialog = false;
            passwordForEmail = '';

        } catch (err: any) {
            console.error('Erreur lors du changement d\'email:', err);
            errorMessage = err.message || "Une erreur est survenue lors du changement d'email";
        } finally {
            loading = false;
        }
    }

    // Changement de mot de passe
    async function handlePasswordChange() {
        try {
            loading = true;
            errorMessage = '';

            if (!$auth.user) {
                throw new Error("Utilisateur non connecté");
            }

            if (newPassword !== confirmPassword) {
                throw new Error("Les nouveaux mots de passe ne correspondent pas");
            }

            if (newPassword.length < 6) {
                throw new Error("Le nouveau mot de passe doit contenir au moins 6 caractères");
            }

            // Vérifier l'ancien mot de passe
            const userRef = ref(db, `users/${$auth.user.id}`);
            const snapshot = await get(userRef);
            const userData = snapshot.val();
            
            const isValidPassword = await comparePassword(currentPassword, userData.passwordHash);
            if (!isValidPassword) {
                throw new Error("Mot de passe actuel incorrect");
            }

            // Hasher et sauvegarder le nouveau mot de passe
            const hashedPassword = await hashPassword(newPassword);
            await update(userRef, {
                passwordHash: hashedPassword
            });

            successMessage = "Votre mot de passe a été mis à jour avec succès";
            showPasswordDialog = false;
            currentPassword = '';
            newPassword = '';
            confirmPassword = '';

        } catch (err: any) {
            console.error('Erreur lors du changement de mot de passe:', err);
            errorMessage = err.message || "Une erreur est survenue lors du changement de mot de passe";
        } finally {
            loading = false;
        }
    }
    function resetMessages() {
        successMessage = '';
        errorMessage = '';
    }
</script>

<Header 
    title="Paramètres"
    subtitle="Gérer votre compte"
    showBack={true}
/>

<div class="min-h-screen bg-gray-50 py-6 mt-16">
    <div class="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="mb-8">
            <h1 class="text-2xl font-bold text-gray-900">Paramètres du compte</h1>
            <p class="mt-1 text-sm text-gray-600">Gérez vos informations personnelles</p>
        </div>

        {#if $auth.isAuthenticated}
            {#if successMessage}
                <div class="mb-4 p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg">
                    {successMessage}
                </div>
            {/if}

            {#if errorMessage}
                <div class="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
                    {errorMessage}
                </div>
            {/if}

            <div class="bg-white shadow overflow-hidden sm:rounded-lg">
                <!-- Email section -->
                <div class="px-4 py-5 sm:p-6 border-b border-gray-200">
                    <div class="flex items-center justify-between">
                        <div>
                            <h3 class="text-lg font-medium text-gray-900">Adresse email</h3>
                            <p class="mt-1 text-sm text-gray-500">{$auth.user?.email}</p>
                        </div>
                        <button
                            class="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                            on:click={() => {
                                resetMessages();
                                showEmailDialog = true;
                            }}
                        >
                            Modifier
                        </button>
                    </div>
                </div>

                <!-- Password section -->
                <div class="px-4 py-5 sm:p-6">
                    <div class="flex items-center justify-between">
                        <div>
                            <h3 class="text-lg font-medium text-gray-900">Mot de passe</h3>
                            <p class="mt-1 text-sm text-gray-500">●●●●●●●●</p>
                        </div>
                        <button
                            class="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                            on:click={() => {
                                resetMessages();
                                showPasswordDialog = true;
                            }}
                        >
                            Modifier
                        </button>
                    </div>
                </div>
            </div>
        {:else}
            <div class="text-center p-6 bg-white rounded-lg shadow">
                <p class="text-gray-500">Vous devez être connecté pour accéder à ces paramètres.</p>
            </div>
        {/if}
    </div>
</div>

<!-- Email Dialog -->
{#if showEmailDialog}
<Dialog bind:open={showEmailDialog}>
    <DialogContent>
        <div class="p-6">
            <h2 class="text-xl font-semibold mb-6">Modifier l'adresse email</h2>
            <form on:submit|preventDefault={handleEmailChange} class="space-y-4">
                <div>
                    <label for="newEmail" class="block text-sm font-medium text-gray-700">
                        Nouvelle adresse email
                    </label>
                    <input
                        type="email"
                        id="newEmail"
                        bind:value={newEmail}
                        class="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                        required
                    />
                </div>

                <div class="pt-4 flex justify-end gap-3">
                    <button
                        type="button"
                        class="px-4 py-2 text-gray-700 hover:bg-gray-50 rounded-md"
                        on:click={() => showEmailDialog = false}
                        disabled={loading}
                    >
                        Annuler
                    </button>
                    <button
                        type="submit"
                        class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                        disabled={loading}
                    >
                        {loading ? 'Modification...' : 'Modifier'}
                    </button>
                </div>
            </form>
        </div>
    </DialogContent>
</Dialog>
{/if}

<!-- Password Dialog -->
{#if showPasswordDialog}
<Dialog bind:open={showPasswordDialog}>
    <DialogContent>
        <div class="p-6">
            <h2 class="text-xl font-semibold mb-6">Modifier le mot de passe</h2>
            <form on:submit|preventDefault={handlePasswordChange} class="space-y-4">
                <div>
                    <label for="currentPassword" class="block text-sm font-medium text-gray-700">
                        Mot de passe actuel
                    </label>
                    <input
                        type="password"
                        id="currentPassword"
                        bind:value={currentPassword}
                        class="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                        required
                    />
                </div>

                <div>
                    <label for="newPassword" class="block text-sm font-medium text-gray-700">
                        Nouveau mot de passe
                    </label>
                    <input
                        type="password"
                        id="newPassword"
                        bind:value={newPassword}
                        class="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                        required
                        minlength="6"
                    />
                </div>

                <div>
                    <label for="confirmPassword" class="block text-sm font-medium text-gray-700">
                        Confirmer le nouveau mot de passe
                    </label>
                    <input
                        type="password"
                        id="confirmPassword"
                        bind:value={confirmPassword}
                        class="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                        required
                        minlength="6"
                    />
                </div>

                <div class="pt-4 flex justify-end gap-3">
                    <button
                        type="button"
                        class="px-4 py-2 text-gray-700 hover:bg-gray-50 rounded-md"
                        on:click={() => showPasswordDialog = false}
                        disabled={loading}
                    >
                        Annuler
                    </button>
                    <button
                        type="submit"
                        class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                        disabled={loading}
                    >
                        {loading ? 'Modification...' : 'Modifier'}
                    </button>
                </div>
            </form>
        </div>
    </DialogContent>
</Dialog>
{/if}