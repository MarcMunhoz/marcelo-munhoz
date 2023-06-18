<template>
  <router-view :key="$route.fullPath" />

  <q-dialog v-model="alert" persistent full-width position="bottom" transition-hide="fade" class="text-lg">
    <q-card class="">
      <q-card-section class="">Olá! O site utiliza o Google Analytics para coletar informações sobre as visitas e interações dos usuáriosm tais como: endereço IP, localização geográfica, fonte de referência, tipo de navegador, duração da visita e páginas visitadas. Esses dados nos ajudam a entender o desempenho do site, aprimorar sua funcionalidade e fornecer uma melhor experiência para você. Ao continuar navegando, você está consentindo com a associação desses dados coletados pelo Google Analytics às informações que coletamos. </q-card-section>

      <q-card-actions align="center">
        <q-btn flat label="OK" color="grey-5" v-close-popup />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script>
import { defineComponent, ref } from "vue";
import { createMetaMixin } from "quasar";

export default defineComponent({
  name: "App",
  setup() {
    return {
      alert: ref(true),
      address: ref(""),
    };
  },
  mixins: [
    createMetaMixin(function () {
      return {
        meta: {
          description: {
            name: "description",
            content: "Some brief histories of my past-present development experience. The life, the universe and everything about a tech life",
          },
        },
      };
    }),
  ],
  watch: {
    $route: {
      immediate: true,
      handler(to, from) {
        document.title = `Marcelo Munhoz - ${to.meta.title}` || "Marcelo Munhoz";
      },
    },
  },
});
</script>
