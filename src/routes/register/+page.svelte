<script lang="ts">
	import { goto } from '$app/navigation';
  import { authService } from '$lib/services/auth';
  
  let email = '';
  let password = '';
  let error = '';

  async function handleRegister() {
    try {
      const { token, user } = await authService.register(email, password, {
        // autres données utilisateur
      });
      
      // Stocker le token dans localStorage ou autre
      localStorage.setItem('token', token);
      
      // Rediriger vers la page d'accueil
      goto('/');
    } catch (err: any) {
      error = err.message;
    }
  }
</script>