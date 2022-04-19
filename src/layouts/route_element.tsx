import loadable, { lazy } from "@loadable/component"
import React, { Suspense, useContext, useEffect } from "react"
import { Navigate } from "react-router-dom"
import { RouteItem } from "~/models/route"
import { Permission } from "~/models/permission"
import { UserContext } from "~/context/user_context"
import { useKeepControl } from "~/components/keep_outlets"

interface RouteProperty {
    route: RouteItem,
    children?: React.ReactNode
}

/**
 * 认证 权限 接入
 * 
 * 没有权限的 都走普通的逻辑 需要权限
 * 
 * 有权限限制的 都需要接入用户相关逻辑 route 切换的时候会触发路径上的所有节点的render
 */
const RouteToElement = ({ route, children }: RouteProperty) => {
    const { userStore } = useContext(UserContext)

    if (route.authority == null || route.authority == Permission.None) {
        return (<PureRouteElement route={route} >{children}</PureRouteElement>)
    }

    if (route.authority == Permission.OneOf && userStore.userList.size == 0) {
        return (<Navigate to={`/login?redirect=${route.absolutePath}`} replace />)
    }
    return (<PureRouteElement route={route}>{children}</PureRouteElement>)
}

const PureRouteElement = ({ route, children }: RouteProperty) => {
    const elementRef = React.useRef({})
    const router = useKeepControl()

    if (route.redirect != null) {
        return (<Navigate to={route.redirect} replace />)
    }
    if (children != null) {
        return (<div key={route.name}>{children}</div>)
    }
    const cc = import(`~/${route.component}`).then(({ default: Component }) => {
        return {
            default: React.forwardRef((props, ref) => {
                return (<Component {...Component.$$typeof != null && Component.$$typeof.description == "react.forward_ref" ? { ref: ref } : {}} {...props} route={route} />)
            })
        }
    })

    const Loadable = loadable(() => cc)
    if (router) {
        router.addPageRef(route, elementRef)
    }

    return (
        <Loadable ref={elementRef} key={route.absolutePath} />
    )
}
export default RouteToElement