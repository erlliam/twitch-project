<template>
  <TopBar />
  <div class="flex">
    <SideBar />

    <main class="p-4">
      <RouterView />
    </main>
  </div>
</template>

<script setup lang="ts">
import { RouterView } from "vue-router";
import TopBar from "@/components/TopBar.vue";
import SideBar from "@/components/SideBar.vue";
</script>
