import { h, inject } from "vue"


function useLink(){

    let router=inject('router')
    return{
        navigate:(to:string)=>{
            (router as any).push(to)
        }
    }
}
export default{
    name:'RouterLink',
    props:{
        to:{
            type:String,
            required:true
        }
    },
    setup(props:any,{slots}:{slots:any}){
        let link=useLink()
        return()=>{
            return h('a',{
                href:props.to,
                onclick:(e:any)=>{
                    e.preventDefault()
                    link.navigate(props.to)
                }
            },slots.default?.())
        }
    }
}