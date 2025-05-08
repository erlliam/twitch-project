<template>
  <main>
    <h1>Data Harvester Config</h1>

    <div>
      <h2>Track a Channel</h2>
      <form @submit.prevent="trackChannel">
        <label>
          Name
          <input v-model="newChannelName" />
        </label>
        <button>Track</button>
      </form>
    </div>

    <div>
      <h2>Tracked Channels</h2>
      <div v-if="trackingChannelsLoading">Loading...</div>
      <div v-else-if="trackingChannels.length === 0">No channels are currently being tracked</div>
      <template v-else>
        <div
          v-for="channel in trackingChannels"
          :key="channel.name"
          style="display: flex; gap: 1rem"
        >
          <div>{{ channel.name }}</div>
          <div>{{ channel.active }}</div>
          <button @click="toggleTracking(channel)" :disabled="channel.toggleLoading">
            <!-- todo: Better loading styling -->
            <span v-if="channel.toggleLoading">⏳</span>
            <span v-else>{{ channel.active ? "Disable" : "Enable" }}</span>
          </button>

          <button @click="deleteTracking(channel)" :disabled="channel.deleteLoading">
            <!-- todo: Better loading styling -->
            <span v-if="channel.deleteLoading">⏳</span>
            <span v-else>Delete</span>
          </button>
        </div>
      </template>
    </div>
  </main>
</template>

<script setup lang="ts">
import axios from "axios";
import { ref } from "vue";

const trackingChannels = ref<TrackingChannel[]>([]);
const trackingChannelsLoading = ref(false);

const newChannelName = ref("");
const newChannelLoading = ref(false);

type TrackingChannelApi = {
  name: string;
  active: boolean;
};

type TrackingChannel = TrackingChannelApi & {
  toggleLoading: boolean;
  deleteLoading: boolean;
};

async function getTrackingChannels() {
  trackingChannelsLoading.value = true;

  try {
    const { data } = await axios.get<TrackingChannelApi[]>("/api/tracking");
    trackingChannels.value = data.map((x) => ({
      ...x,
      toggleLoading: false,
      deleteLoading: false,
    }));
  } catch {
    // todo: Toast error
  } finally {
    trackingChannelsLoading.value = false;
  }
}

async function toggleTracking(channel: TrackingChannel) {
  if (!channel.name) {
    // todo: Toast error
    console.error("invalid name");
    return;
  }

  channel.toggleLoading = true;

  try {
    const { data } = await axios.patch<boolean>(`/api/tracking/${channel.name}`);
    channel.active = data;
  } catch {
    // todo: Toast error
  } finally {
    channel.toggleLoading = false;
    // todo: Toast success
  }
}

async function deleteTracking(channel: TrackingChannel) {
  if (!channel.name) {
    // todo: Toast error
    console.error("invalid name");
    return;
  }

  channel.deleteLoading = true;

  try {
    await axios.delete(`/api/tracking/${channel.name}`);
    trackingChannels.value = trackingChannels.value.filter((x) => x.name !== channel.name);
  } catch {
    // todo: Toast error
  } finally {
    channel.deleteLoading = false;
    // todo: Toast success
  }
}

async function trackChannel() {
  if (!newChannelName.value) {
    // todo: Toast error
    console.error("invalid name");
    return;
  }

  newChannelLoading.value = true;

  try {
    await axios.post("/api/tracking", { name: newChannelName.value });
    trackingChannels.value.push({
      name: newChannelName.value,
      active: true,
      toggleLoading: false,
      deleteLoading: false,
    });
    newChannelName.value = "";
  } finally {
    newChannelLoading.value = false;
  }
}

getTrackingChannels();
</script>
