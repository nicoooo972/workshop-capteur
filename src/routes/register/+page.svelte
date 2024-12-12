<script lang="ts">
	import { goto } from '$app/navigation';
  import { authService } from '$lib/services/auth';
  
  let email = '';
  let password = '';
  let error = '';

  async function handleRegister() {
    try {
      const { token, user } = await authService.register(email, password, {
      });
      
      localStorage.setItem('token', token);
      
      goto('/');
    } catch (err: any) {
      error = err.message;
    }
  }
</script>