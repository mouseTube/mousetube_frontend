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
  await auth.loginWithToken(token);
  router.push('/account/details');
} else {
  router.push('/account/login');
}
</script>
