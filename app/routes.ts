import {
  type RouteConfig,
  index,
  layout,
  prefix,
  route,
} from "@remix-run/route-config";

export default [
  index("routes/_index/route.tsx"),
  route("auth/login", "routes/auth.login/route.tsx"),
  route("auth/*", "routes/auth.$.tsx"),
  ...prefix("app", [
    layout("routes/app.tsx", [
      index("routes/app._index.tsx"),
      route("products", "routes/app.products.tsx"),
      route("templates", "routes/app.templates.tsx"),
      route("manage-templates", "routes/app.manage-templates.tsx"),
      route("analytics", "routes/app.analytics.tsx"),
      route("additional", "routes/app.additional.tsx"),
    ]),
  ]),
  route("api/product-options", "routes/api.product-options.tsx"),
  route("webhooks/app/uninstalled", "routes/webhooks.app.uninstalled.tsx"),
  route("webhooks/app/scopes_update", "routes/webhooks.app.scopes_update.tsx"),
] satisfies RouteConfig;