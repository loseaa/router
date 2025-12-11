import { computed, h, inject, provide } from "vue";

export default {
    name:"RouterView",
    setup(_:never,{slots}:{slots:any}){
        const slot = slots.default?.();

        // 拿到当前的组件的深度，
        // 因为匹配到的是一个路由记录的路径，也可以理解为组件的路径，从第一层到最后一层
        // 因此需要维护一个depth，全局使用通过injecti 和provide
        let depth=inject("depth",0);

        // 拿到当前的路由记录
        const route = inject("route location");
        
        // 拿到当前depth匹配的组件
        let matched=computed(()=>(route as any).matched[depth])
        
        provide("depth",depth+1)

        return ()=>{
            if(matched&&matched.value){
                return h(matched.value.component)
            }
            // slot里面装的就是h()虚拟节点
            return slot
        }
    }
}