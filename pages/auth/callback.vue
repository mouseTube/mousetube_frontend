// pages/auth/callback.vue
<script setup>
import { useAuth } from '@/composables/useAuth';
import { useRouter, useRoute } from 'vue-router';

const auth = useAuth();
const router = useRouter();
const route = useRoute();

const token = route.query.token;

if (token) {
  await auth.loginWithToken(token);
  router.push('/account/details');
} else {
  router.push('/account/login');
}
</script>
