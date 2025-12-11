import type { RouterOptions } from "vue-router";
import { createRouterMatcher } from "./routeMacher";
import { computed, reactive, shallowRef } from "vue";
import routerLink from "./RouterLink";
import routerView from "./routerView";

export function createRouter(options: RouterOptions) {
  const routerHistory = options.history;
  const routes = options.routes;
  const routerMatcher = createRouterMatcher(routes);
  const beforeGuards = useCallbacks();
  const afterGuards = useCallbacks();
  const resolveGuards = useCallbacks();

  function extractRecords(from: any, to: any) {
    // 分类出哪些组件要离开，哪些组件要更新，哪些组件要进入
    let leavingRecords: any = [];
    let updatingRecords: any = [];
    let enteringRecords: any = [];

    let maxLen = Math.max(from.matched.length, to.matched.length);
    for (let i = 0; i < maxLen; i++) {
      let fromRecord = from.matched[i];
      if (fromRecord) {
        if (to.matched.find((record: any) => record.path === fromRecord.path)) {
          updatingRecords.push(fromRecord);
        } else {
          leavingRecords.push(fromRecord);
        }
      }
      let toRecord = to.matched[i];
      if (toRecord) {
        if (
          !from.matched.find((record: any) => record.path === toRecord.path)
        ) {
          enteringRecords.push(toRecord);
        }
      }
    }
    return [leavingRecords, updatingRecords, enteringRecords];
  }

  function guardToPromise(guard: any, to: any, from: any, record?: any) {
    if (!guard) {
      return Promise.resolve();
    }
    return new Promise<void>((resolve) => {
      let next = () => {
        resolve();
      };
      let guardReturn = guard.call(record, to, from, next);
      return Promise.resolve(guardReturn).then(next);
    });
  }

  function extractComponentsGuards(
    records: any,
    guardName: any,
    to: any,
    from: any
  ) {
    let guards: any = [];
    records.forEach((record: any) => {
      let comp = record.components;
      if (comp&&comp[guardName]) {
        guards.push(guardToPromise(comp[guardName], to, from, record));
      }
    });
    return guards;
  }

  function navigate(from: any, to: any) {
    const [leavingRecords, updatingRecords, enteringRecords] = extractRecords(
      from,
      to
    );
    // 组件内守卫  定义在组件上的
    let guards = extractComponentsGuards(
      leavingRecords,
      "beforeRouteLeave",
      to,
      from
    );

    // 某个路由独享的守卫
    for (let record of leavingRecords) {
      record.leaveGuards?.forEach((gs: any) => {
        guards.push(guardToPromise(gs, to, from, record));
      });
    }

    // 顺序执行所有路由守卫
    // 导航被触发
    // 调用失活组件中的beforeRouteLeave钩子
    // 调用全局beforeEach钩子
    // 调用重用组件内的beforeRouteUpdate钩子
    // 调用路由配置中的beforeEnter钩子
    // 解析异步路由组件
    // 调用激活组件中的beforeRouteEnter钩子
    // 调用全局的beforeResolve钩子
    return (runGuards(guards) as any)
      .then(() => {
        guards = [];
        // 全局前置守卫
        for (let guard in beforeGuards.list()) {
          guards.push(guardToPromise(beforeGuards.list()[guard], to, from));
        }
        return runGuards(guards);
      })
      .then(() => {
        guards = extractComponentsGuards(
          updatingRecords,
          "beforeRouteUpdate",
          to,
          from
        );
        for (let record of updatingRecords) {
          record.leaveGuards?.forEach((gs: any) => {
            guards.push(guardToPromise(gs, to, from, record));
          });
        }
        return runGuards(guards);
      })
      .then(() => {
        guards = [];
        // 全局前置守卫
        for (let guard in resolveGuards.list()) {
          guards.push(guardToPromise(resolveGuards.list()[guard], to, from));
        }
        return runGuards(guards);
      })
      .then(() => {
        guards = extractComponentsGuards(
          enteringRecords,
          "beforeRouteEnter",
          to,
          from
        );
        for (let record of enteringRecords) {
          record.enterGuards?.forEach((gs: any) => {
            guards.push(guardToPromise(gs, to, from, record));
          });
        }
        return runGuards(guards);
      })
      .then(() => {
        finalizeNavigation(to, from);
      })
      .then(() => {
        guards = [];
        // 全局前置守卫
        for (let guard in afterGuards.list()) {
          guards.push(guardToPromise(afterGuards.list()[guard], to, from));
        }
        return runGuards(guards);
      });
  }

  function finalizeNavigation(to: any, from: any, replace?: any) {
    if (from === START_LOCATION_NORMALIZED || replace) {
      routerHistory.replace(to);
    } else {
      routerHistory.push(to);
    }
    currentRoute.value = to;
    markAsReady();
  }
  let isReady = false;
  function markAsReady() {
    if (isReady) return;
    isReady = true;
    routerHistory.listen((to: any) => {
      finalizeNavigation(resolve(to), currentRoute.value, true);
    });
  }

  function runGuards(guards: any) {
    return guards.reduce(
      (promise: any, guard: any) => promise.then(() => guard),
      Promise.resolve()
    );
  }
  function pushWithRedirect(to: any) {
    // 要到哪去
    const targetlocation = resolve(to);
    const from = currentRoute.value;
    navigate(from, targetlocation);
  }

  function resolve(location: any) {
    return routerMatcher.resolve(location);
  }
  function push(to: any) {
    return pushWithRedirect(to);
  }

  const currentRoute = shallowRef(START_LOCATION_NORMALIZED);
  return {
    beforeEach: beforeGuards.add,
    afterEach: afterGuards.add,
    resolve: resolveGuards.add,
    push,
    install(app: any) {
      let router = this;
      app.config.globalProperties.$router = router;
      Object.defineProperty(app.config.globalProperties, "$route", {
        enumerable: true,
        get() {
          return currentRoute.value;
        },
      });
      let reactiveRoute: any = {};
      for (let key in START_LOCATION_NORMALIZED) {
        reactiveRoute[key] = computed(() => (currentRoute.value as any)[key]);
      }
      app.component('RouterLink',routerLink)
      app.component('RouterView',routerView)
      
      app.provide("router", router);
      app.provide("route location", reactive(reactiveRoute));

      if (currentRoute.value == START_LOCATION_NORMALIZED) {
        push(routerHistory.location);
      }
    },
  };
}

function useCallbacks() {
  let callbacks: any = [];
  function add(callback: any) {
    callbacks.push(callback);
  }
  return {
    add,
    list: () => callbacks,
  };
}

const START_LOCATION_NORMALIZED = {
  path: "/",
  matched: [],
};
