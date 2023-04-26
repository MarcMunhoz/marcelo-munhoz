<template>
  <div class="q-pa-md">
    <q-layout view="lHh lpr lFf">
      <q-header elevated class="bg-grey-5">
        <q-toolbar>
          <q-avatar>
            <img src="~/assets/rebellion-rebel-alliance-logo.png" class="opacity-[.1]" />
          </q-avatar>

          <q-toolbar-title>
            <span @click="$router.push('/')" class="cursor-pointer">Marcelo Munhoz</span>
            <span v-if="$route.name"> | {{ $route.name }}</span>
          </q-toolbar-title>

          <q-btn outline icon="badge" label="About" to="/about" size="sm" class="mr-4" color="blue-grey-5" />
          <q-btn outline icon="newspaper" label="Blog" size="sm" color="blue-grey-5" />
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
