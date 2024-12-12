<script lang="ts">
    import { authService } from '$lib/services/auth';
    import { goto } from '$app/navigation';
  
    let email = '';
    let password = '';
    let error = '';
    let loading = false;
  
    async function handleLogin() {
      loading = true;
      error = '';
      
      try {
        const { token, user } = await authService.login(email, password);
        
        // Stocker le token
        localStorage.setItem('token', token);
        // Stocker les infos utilisateur si nécessaire
        localStorage.setItem('user', JSON.stringify(user));
        
        // Rediriger
        goto('/dashboard');
      } catch (err: any) {
        error = err.message;
      } finally {
        loading = false;
      }
    }
  </script>
  
  <form on:submit|preventDefault={handleLogin} class="space-y-4">
    <div>
      <label for="email" class="block text-sm font-medium text-gray-700">Email</label>
      <input
        type="email"
        id="email"
        bind:value={email}
        class="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
        required
      />
    </div>
  
    <div>
      <label for="password" class="block text-sm font-medium text-gray-700">Mot de passe</label>
      <input
        type="password"
        id="password"
        bind:value={password}
        class="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
        required
      />
    </div>
  
    {#if error}
      <div class="text-red-600 text-sm">{error}</div>
    {/if}
  
    <button
      type="submit"
      disabled={loading}
      class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
    >
      {loading ? 'Connexion...' : 'Se connecter'}
    </button>
  </form>