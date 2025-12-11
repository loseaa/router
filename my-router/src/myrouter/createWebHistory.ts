export function createWebHistory(base: string = "/"): any {
  base = normalizeBase(base);
  const historyNavigation = useHistoryStateNavigation(base);
  const historyListeners = useHistoryListeners(
    base,
    historyNavigation.state,
    historyNavigation.location
  );

  const routerHistory = Object.assign(
    {
      location: "",
      base,
      //   go,
    },
    historyNavigation,
    historyListeners
  );
  // 拦截routerHistory.location，使routerHistory.location返回当前路由地址
  Object.defineProperty(routerHistory, "location", {
    enumerable: true,
    get: () => historyNavigation.location.value,
  });
  // 拦截routerHistory.state，使routerHistory.state返回当前的的history.state
  Object.defineProperty(routerHistory, "state", {
    enumerable: true,
    get: () => historyNavigation.state.value,
  });
  return routerHistory;
}

/**
 * 标准化基础路径
 * 给开头加上 / 结尾去掉 /
 */
function normalizeBase(base: string) {
  if (base[0] !== "/") {
    base = "/" + base;
  }
  if (base[base.length - 1] === "/") {
    base = base.slice(0, -1);
  }
  return base;
}

function useHistoryStateNavigation(base: string) {
  const { history, location } = window;
  const currentLocation = {
    value: createCurrentLocation(base, location),
  };
  const historyState: any = { value: undefined };

  //   初始化historyState
  if (!historyState.value) {
    changeLocation(
      currentLocation.value,
      {
        back: null,
        current: currentLocation.value,
        forward: null,
        position: history.length - 1,
        replaced: true,
        scroll: null,
      },
      true
    );
  }

  function changeLocation(to: string | any, state: any, replace: boolean) {
    const hashIndex = base.indexOf("#");
    if (typeof to !== "string") {
      to = to.path;
    }
    const url = hashIndex > -1 ? to.slice(0, hashIndex) : to;
    history[replace ? "replaceState" : "pushState"](state, "", url);
    historyState.value = state;
    currentLocation.value = to;

  }
  function buildState(back: any, to: any, forward: any, replace: any) {
    return {
      back,
      to,
      forward,
      replace,
    };
  }
  function push(to: any, data?: any) {

    const currentState = Object.assign({}, historyState.value, history.state, {
      forward: to.path,
    });
    // 第一次changeLocation，使用replace刷新当前历史，目的是记录当前页面的滚动位置
    changeLocation(currentState.forward, currentState, true);

    const state: any = Object.assign(
      {},
      buildState((currentLocation.value as any).path, to.path, null, false),
      { position: currentState.position + 1 },
      data
    );

    // 第二次跳转，跳转到需要跳转的位置
    changeLocation(to, state, false);
    currentLocation.value = to;
  }

  function replace(to: any, data?: any) {
    const state = Object.assign(
      {},
      history.state,
      buildState(
        historyState.value.back,
        to.path,
        historyState.value.forward,
        true
      ),
      data,
      // 因为是replace操作，所以position不变
      { position: historyState.value.position }
    );
    changeLocation(to, state, true);
    // 修改当前历史为to
    currentLocation.value = to;
  }
  return {
    location: currentLocation,
    state: historyState,
    push,
    replace,
  };
}

function useHistoryListeners(
  base: string,
  historyState: any,
  currentLocation: any
) {
  let navigationCallbacks: any = [];
  function listen(fn: any) {
    navigationCallbacks.push(fn);
  }

  function popStateHandler({ state }: any) {
    let from = currentLocation.value;
    let to = createCurrentLocation(base, location);
    if(to===from.path){
        return
    }
    let fromstate = historyState.value;
    let isBack = state.position < fromstate.position;
    debugger
    navigationCallbacks.forEach((fn: any) => fn(to, from, { isBack }));
  }
  window.addEventListener("popstate", popStateHandler);

  return { listen };
}

/**
 * 创建当前位置
 * 就是返回location相对于base的路径
 * 比如base为 /base，location为 /base/home，返回 /home
 */
function createCurrentLocation(base: string, location: Location) {
  const { pathname, search, hash } = location;
  const hashPos = base.indexOf("#");
  if (hashPos > -1) {
    let slicePos = hash.includes(base.slice(hashPos))
      ? base.slice(hashPos).length
      : 1;
    let pathFromHash = hash.slice(slicePos);
    if (pathFromHash[0] !== "/") pathFromHash = "/" + pathFromHash;
    return stripBase(pathFromHash, "");
  }
  // 如果base中不包含#，把pathname中的base部分删除
  const path = stripBase(pathname, base);
  return path + search + hash;
}

function stripBase(pathname: string, base: string) {
  if (pathname.indexOf(base) === 0) {
    return pathname.slice(base.length);
  }
  return pathname;
}
