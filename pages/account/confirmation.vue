<script setup>
import { useRoute, useRouter } from 'vue-router';
import axios from 'axios';

const route = useRoute();
const router = useRouter();
const baseUrl = computed(() => apiBaseUrl.replace(/\/api\/?$/, ''));

const activate = async () => {
  try {
    await axios.post(`${baseUrl.value}/auth/users/activation/`, {
      uid: route.query.uid,
      token: route.query.token,
    });
    alert('Account activated !');
    router.push('/account/login');
  } catch (err) {
    alert('Activation error.');
  }
};

activate();
</script>
