<template>
  <aside class="w-60">
    <nav>
      <RouterLink
        v-for="channel in channels"
        :key="channel.roomId"
        :to="{ name: 'channelHome', params: { name: channel.name } }"
        class="flex items-center gap-2 p-2 hover:bg-gray-800"
        active-class="bg-gray-700"
      >
        <img :src="channel.profilePicture" class="w-8 h-8 rounded-full" />
        <div class="truncate" :title="channel.name">
          {{ channel.name }}
        </div>
      </RouterLink>
    </nav>
  </aside>
</template>

<script setup lang="ts">
import axios from "axios";
import { ref } from "vue";

const channels = ref<ChannelApi[]>([]);
const channelsLoading = ref(false);

type ChannelApi = {
  name: string;
  roomId: number;
  profilePicture: string;
};

// todo: Definitely put this inside of a store or something because we want to use this data in ChannelHome without much hassle
async function getChannels() {
  channelsLoading.value = true;

  try {
    const { data } = await axios.get<ChannelApi[]>("/api/channels");
    channels.value = data;
  } catch {
    // todo: Toast error
  } finally {
    channelsLoading.value = false;
  }
}

getChannels();
</script>
