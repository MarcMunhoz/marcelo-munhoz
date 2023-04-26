<template>
  <div class="q-pa-md">
    <q-layout view="lHh lpr lFf">
      <q-header elevated class="bg-grey-5">
        <q-toolbar>
          <q-avatar>
            <!-- <img src="~/assets/rebellion-rebel-alliance-logo.png" class="opacity-[.1]" /> -->
            <img src="https://0.gravatar.com/avatar/357cd42b0a2cc03c5c2ffb011aec5e8f" class="opacity-[.8]" />
          </q-avatar>

          <q-toolbar-title>
            <span v-if="$route.path !== '/'" @click="$router.push('/')" class="cursor-pointer">
              Marcelo Munhoz | <i class="not-italic text-blue-grey-5">{{ $route.name }}</i>
            </span>
            <span v-else>Marcelo Munhoz</span>
          </q-toolbar-title>

          <q-btn outline icon="badge" label="About" to="/about" size="sm" class="mr-4" color="blue-grey-5" />
          <q-btn outline icon="newspaper" label="Blog" to="/blog" size="sm" color="blue-grey-5" />
        </q-toolbar>
      </q-header>

      <q-footer elevated reveal class="bg-grey-5 text-center py-4">
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

      <q-page-container class="mb-7">
        <router-view />
      </q-page-container>
    </q-layout>
  </div>
</template>
