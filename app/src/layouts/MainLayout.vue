<template>
  <q-layout view="hHh lpR fff">
    <q-header elevated reveal class="bg-grey-5">
      <q-toolbar>
        <q-avatar>
          <img :src="avatar" class="" />
        </q-avatar>

        <q-toolbar-title>
          <span v-if="$route.path !== '/'">
            <span @click="$router.push('/')" @mouseover="avatarOver" @mouseleave="avatarLeave" class="cursor-pointer uppercase">Marcelo Munhoz</span>
            | <i class="not-italic text-blue-grey-5 header-title">{{ $route.name }}</i>
          </span>
          <span v-else @mouseover="avatarOver" @mouseleave="avatarLeave" class="uppercase"> Marcelo Munhoz </span>
        </q-toolbar-title>

        <q-btn outline icon="badge" label="About" to="/about" size="sm" class="mr-4" color="blue-grey-5" />
        <q-btn outline icon="newspaper" label="Blog" to="/blog" size="sm" class="mr-4" color="blue-grey-5" />
        <q-btn-dropdown outline icon="edit_note" :label="adminNavLabel" size="sm" color="blue-grey-5">
          <q-list dense>
            <q-item clickable v-close-popup to="/admin">
              <q-item-section>
                <q-item-label>{{ adminNavTitle }}</q-item-label>
                <q-item-label caption>{{ adminNavCaption }}</q-item-label>
              </q-item-section>
            </q-item>
            <q-item v-if="adminDisplay.canSignOut" clickable v-close-popup @click="signOut">
              <q-item-section avatar>
                <q-icon name="logout" />
              </q-item-section>
              <q-item-section>Sign out</q-item-section>
            </q-item>
          </q-list>
        </q-btn-dropdown>
      </q-toolbar>
    </q-header>

    <q-page-container class="">
      <router-view />
    </q-page-container>

    <q-footer elevated class="bg-grey-5 text-center py-2">
      <q-toolbar>
        <q-toolbar-title class="text-base">
          © 2018-Today / Copyright Marcelo Munhoz. All rights reserved.
          <p class="text-sm">
            This site is built with
            <a href="https://quasar.dev" class="font-weight-bold text-blue-grey-5">Quasar</a>, and hosted on <a href="https://www.netlify.com" class="font-weight-bold text-blue-grey-5">Netlify</a>. The source code is hosted on <a href="https://github.com" class="font-weight-bold text-blue-grey-5">Github</a>.
          </p>
        </q-toolbar-title>
      </q-toolbar>
    </q-footer>

    <audio class="insivible-btn hidden" preload="auto"></audio>
  </q-layout>
</template>

<script>
import { defineComponent } from "vue";
import imageUrl from "../assets/rebellion-rebel-alliance-logo.png";
import audioFile from "../assets/r2d2.ogg";
import { adminSessionDisplay, getAdminSession, signOutAdmin } from "../utils/adminAuth.js";

export default defineComponent({
  name: "MainLayout",
  data() {
    return {
      avatar: "https://en.gravatar.com/userimage/6120444/f6673ca4647b547645d7384a96b8921c",
      adminSession: null,
    };
  },
  computed: {
    adminDisplay() {
      return adminSessionDisplay(this.adminSession);
    },
    adminNavLabel() {
      return this.adminSession ? this.adminDisplay.name : "Admin";
    },
    adminNavTitle() {
      return this.adminSession ? this.adminDisplay.name : "Admin";
    },
    adminNavCaption() {
      return this.adminSession ? `${this.adminDisplay.role} · ${this.adminDisplay.context}` : "Sign in required";
    },
  },
  async mounted() {
    this.adminSession = await getAdminSession();
  },
  methods: {
    async signOut() {
      const signedOut = await signOutAdmin();

      if (signedOut) {
        this.adminSession = null;
      }
    },
    avatarOver() {
      // Simulating the first document interaction and triggering the Easter egg
      const phantomAudio = document.querySelector(".insivible-btn");
      phantomAudio.setAttribute("src", audioFile);

      var phantomPromise = document.querySelector(".insivible-btn").play();

      if (phantomPromise !== undefined) {
        phantomPromise
          .then((_) => {
            return (this.avatar = imageUrl), phantomAudio.play();
          })
          .catch(() => {
            return console.warn("Interact with the page, mouse over my name and welcome to the Rebel Alliance!");
          });
      }
    },
    avatarLeave() {
      return (this.avatar = "https://en.gravatar.com/userimage/6120444/f6673ca4647b547645d7384a96b8921c");
    },
  },
});
</script>
