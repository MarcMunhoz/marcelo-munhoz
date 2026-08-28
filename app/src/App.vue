<template>
  <router-view :key="$route.path" />

  <q-dialog v-if="showCookieNotice" v-model="alert" persistent full-width position="bottom" transition-hide="fade" class="text-lg">
    <q-card class="cookie-card">
      <q-card-section class="cookie-card-body">Olá! O site utiliza o Google Analytics para coletar informações sobre as visitas e interações dos usuáriosm tais como: endereço IP, localização geográfica, fonte de referência, tipo de navegador, duração da visita e páginas visitadas. Esses dados nos ajudam a entender o desempenho do site, aprimorar sua funcionalidade e fornecer uma melhor experiência para você. Ao continuar navegando, você está consentindo com a associação desses dados coletados pelo Google Analytics às informações que coletamos. </q-card-section>

      <q-card-actions align="center">
        <q-btn flat label="OK" color="grey-5" v-close-popup />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { useMeta } from "quasar";
import { computed, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { appDocumentTitle, appMetadata, shouldShowCookieNotice } from "./utils/cookieNotice.js";

const route = useRoute();
const alert = ref(true);
const showCookieNotice = computed(() => shouldShowCookieNotice(route, alert.value));
const metadata = computed(() => appMetadata(route));

useMeta(() => metadata.value);

watch(
  () => route.fullPath,
  () => {
    document.title = appDocumentTitle(route);
  },
  { immediate: true }
);
</script>

<style lang="scss">
.cookie-card {
  max-height: calc(100vh - 24px);
  max-width: min(100%, 960px);
}

.cookie-card-body {
  max-height: calc(100vh - 136px);
  overflow-wrap: anywhere;
  overflow-y: auto;
}
</style>
