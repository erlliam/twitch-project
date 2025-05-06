<template>
  <main>
    <h1>Data Harvester Config</h1>

    <div v-if="trackingChannelsLoading">Loading...</div>
    <template v-else>
      <div v-for="channel in trackingChannels" :key="channel.name" style="display: flex; gap: 1rem">
        <div>{{ channel.name }}</div>
        <div>{{ channel.active }}</div>
        <button @click="toggleTracking(channel.name)">
          {{ channel.active ? "Disable" : "Enable" }}
        </button>
      </div>
    </template>
  </main>
</template>

<script setup lang="ts">
import axios from "axios";
import { ref } from "vue";

const trackingChannels = ref<TrackingChannel[]>([]);
const trackingChannelsLoading = ref(false);

type TrackingChannel = {
  name: string;
  active: boolean;
};

async function getTrackingChannels() {
  trackingChannelsLoading.value = true;

  const { data } = await axios.get<TrackingChannel[]>("/api/tracking");
  trackingChannels.value = data;

  trackingChannelsLoading.value = false;
}

async function toggleTracking(name: string) {
  console.log(name);
}

getTrackingChannels();
</script>
