<template>
  <form class="flex items-stretch" @submit.prevent="search">
    <!-- z-0 is for making the focus outline go over the button to the right -->
    <input
      placeholder="Search"
      class="border-gray-700 border rounded-tr-none rounded-br-none rounded-sm px-3 py-1.5 focus-visible:outline-2 focus-visible:outline-gray-500 z-0"
      v-model="searchText"
    />
    <!-- todo: Extreme bike shedding, look for alternative to outline because the button's outline doesn't go on top of the borders -->
    <button
      class="bg-gray-800 px-2 border-gray-700 border rounded-sm rounded-tl-none rounded-bl-none focus-visible:outline-2 focus-visible:outline-gray-500 hover:bg-gray-900 active:bg-gray-950 cursor-pointer border-l-0"
    >
      <MagnifyingGlass />
    </button>
  </form>
</template>

<script setup lang="ts">
import MagnifyingGlass from "@/components/icons/MagnifyingGlass.vue";
import { ref } from "vue";

const searchText = ref("");

function search() {
  alert("todo");
}
</script>
