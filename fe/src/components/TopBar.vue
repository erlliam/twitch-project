<template>
  <nav class="bg-gray-900 flex items-center px-8 py-1">
    <div class="flex-1 text-left">
      <RouterLink :to="{ name: 'home' }" active-class="underline">Home</RouterLink>
    </div>

    <div class="flex-1 text-center flex justify-center">
      <TopBarSearch />
    </div>

    <div class="flex-1 text-right">
      <RouterLink :to="{ name: 'dataHarvesterConfig' }" active-class="underline">
        Data Harvester Config
      </RouterLink>
    </div>
  </nav>
</template>

<script setup lang="ts">
import TopBarSearch from "@/components/TopBarSearch.vue";
import { RouterLink } from "vue-router";
</script>
