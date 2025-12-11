export function createRouterMatcher(routes: any) {
  const machers: any = [];
  function addRoute(route: any, parent?: any) {
        if(parent){
            route.path=parent.path+route.path
        }
        machers.push(createRouteRecordMacher(route,parent))
  }

  function createRouteRecordMacher(route:any,parent?:any){
    let macher = {
      path: route.path,
      component: route.component,
      name: route.name,
      children: [],
      parent,
    };
    if(parent){
        parent.children.push(macher)
    }
    if(route.children){
        route.children.forEach((child:any)=>{
            addRoute(child,macher)
        })
    }
    return macher
  }

  routes.forEach((route: any) => {
    addRoute(route);
  });

  function resolve(location:any){
      let matched:any=[];
      machers.forEach((macher:any)=>{
        if(macher.path===location){
          while(macher){
            matched.unshift(macher)
            macher=macher.parent
          }
        }
      })
      return {
        matched,
        path:location
      }
  }
  return {
    addRoute,
    resolve,
  };
}
