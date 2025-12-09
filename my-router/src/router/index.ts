import { createRouter, createWebHistory } from "../myrouter";
import Home from "../views/home.vue";
import Info from "../views/info.vue";
import A from "../views/A.vue";
import B from "../views/B.vue";
import C from "../views/C.vue";

const router = createRouter({
  history: createWebHistory("/base"),
  routes: [
    { path: "/home", component: Home },
    {
      path: "/info",
      component: Info,
      children: [
        { path: "a", component: A },
        { path: "b", component: B },
        { path: "c", component: C },
      ],
    },
  ],
});

export default router;
