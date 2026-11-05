// pages/auth/callback.vue
<script setup>
import { useAuth } from '@/composables/useAuth';
import { useRouter } from 'vue-router';

const auth = useAuth();
const router = useRouter();

// The API puts the token in the URL fragment (#token=...): it never reaches server logs.
const token = new URLSearchParams(window.location.hash.slice(1)).get('token');
// Remove it from the address bar / history right away.
window.history.replaceState(null, '', window.location.pathname);

if (token) {
  try {
    await auth.loginWithToken(token);
    router.push('/account/details');
  } catch {
    // e.g. the API refused the token: go back to the login page instead of an error page
    router.replace('/account/login?error=no_token');
  }
} else {
  router.push('/account/login');
}
</script>
