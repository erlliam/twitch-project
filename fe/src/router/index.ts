import { createRouter, createWebHistory } from "vue-router";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/",
      name: "home",
      component: () => import("@/views/HomeView.vue"),
    },

    {
      path: "/data-harvester-config",
      name: "dataHarvesterConfig",
      component: () => import("@/views/DataHarvesterConfigView.vue"),
    },
  ],
});

export default router;
