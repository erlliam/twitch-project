<template>
  <main>
    <h1>Data Harvester Config</h1>

    <div v-if="trackingChannelsLoading">Loading...</div>
    <template v-else>
      <div v-for="channel in trackingChannels" :key="channel.name" style="display: flex; gap: 1rem">
        <div>{{ channel.name }}</div>
        <div>{{ channel.active }}</div>
        <button @click="toggleTracking(channel)" :disabled="channel.toggleLoading">
          <!-- todo: Better loading styling -->
          <span v-if="channel.toggleLoading">⏳</span>
          <span v-else>{{ channel.active ? "Disable" : "Enable" }}</span>
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

type TrackingChannelApi = {
  name: string;
  active: boolean;
};

type TrackingChannel = TrackingChannelApi & {
  toggleLoading: boolean;
};

async function getTrackingChannels() {
  trackingChannelsLoading.value = true;

  try {
    const { data } = await axios.get<TrackingChannelApi[]>("/api/tracking");
    trackingChannels.value = data.map((x) => ({
      ...x,
      toggleLoading: false,
    }));
  } catch {
    // todo: Toast
  } finally {
    trackingChannelsLoading.value = false;
  }
}

async function toggleTracking(channel: TrackingChannel) {
  const trackingChannel = trackingChannels.value.find((x) => x.name === channel.name);

  if (!trackingChannel) {
    console.error("BLOW UP");
    return;
  }

  trackingChannel.toggleLoading = true;

  try {
    const { data } = await axios.patch<boolean>(`/api/tracking/${channel.name}`);
    trackingChannel.active = data;
  } catch {
    // todo: Toast
  } finally {
    trackingChannel.toggleLoading = false;
  }
}

getTrackingChannels();
</script>
