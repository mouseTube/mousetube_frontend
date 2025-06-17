<script setup>
const username = ref('');
const password = ref('');
const router = useRouter();
const auth = useAuth();
const showPassword = ref(false);

const handleLogin = async () => {
  try {
    await auth.login(username.value, password.value);
    router.push('/account');
  } catch (error) {
    console.error('Login failed:', error);
    alert('Connexion échouée');
  }
};
</script>

<template>
  <v-main
    class="d-flex flex-column align-center justify-center"
    style="min-height: 100vh; background-color: white"
  >
    <!-- Logo -->
    <img
      src="/logo_mousetube_big.png"
      alt="mouseTube Logo"
      style="width: 300px; margin-bottom: 12px"
    />

    <!-- Title -->
    <h2 class="text-h5 font-weight-medium mb-1">Welcome back to mouseTube</h2>
    <p class="text-body-2 mb-6" style="color: #666">Please sign in to continue.</p>

    <!-- Card -->
    <v-card
      class="pa-6"
      style="border-radius: 20px; max-width: 360px; width: 100%; box-shadow: 0 4px 16px #00000015"
    >
      <v-form>
        <v-text-field
          v-model="username"
          label="Username"
          variant="outlined"
          density="comfortable"
          hide-details
          class="mb-4"
          required
        />
        <v-text-field
          v-model="password"
          :type="showPassword ? 'text' : 'password'"
          label="Password"
          variant="outlined"
          density="comfortable"
          hide-details
          class="mb-4"
          required
        >
          <template #append-inner>
            <v-icon @click="showPassword = !showPassword" class="cursor-pointer">
              {{ showPassword ? 'mdi-eye-off' : 'mdi-eye' }}
            </v-icon>
          </template>
        </v-text-field>

        <!-- Red button -->
        <v-btn
          color="primary"
          class="mt-2"
          style="width: 100%; border-radius: 12px"
          @click="handleLogin"
          size="large"
        >
          Log in
        </v-btn>

        <v-divider class="my-4" />
        <p class="text-center text-body-2 mb-4" style="color: #666">
          Don't have an account? <br />
          <span class="font-weight-bold">Create one now!</span>
        </p>
        <v-btn
          variant="outlined"
          color="primary"
          style="width: 100%; border-radius: 12px"
          @click="router.push('/register')"
          size="large"
        >
          Create an account
        </v-btn>
      </v-form>
    </v-card>
  </v-main>
</template>
