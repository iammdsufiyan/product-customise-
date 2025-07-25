import { json } from "@remix-run/node";

export function loginErrorMessage(loginErrors: Record<string, string>) {
  return {
    ...loginErrors,
    shop:
      loginErrors.shop ??
      "Shop is required. Did you forget to pass it in the URL?",
  };
}

export function badRequest(data: Record<string, any>) {
  return json(data, { status: 400 });
}