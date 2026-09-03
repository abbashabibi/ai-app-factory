"use client";

import { useEffect } from "react";

export default function AuthBootstrap() {
  useEffect(() => {
    const original = window.fetch.bind(window);
    const authRequired = process.env.NEXT_PUBLIC_AUTH_REQUIRED !== "false";
    window.fetch = (input: RequestInfo | URL, init: RequestInit = {}) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      if (!url.includes("/api/v1/")) return original(input, init);
      const token = window.localStorage.getItem("aif_session");
      const headers = new Headers(init.headers || (input instanceof Request ? input.headers : undefined));
      if (token && !headers.has("authorization")) headers.set("authorization", `Bearer ${token}`);
      return original(input, { ...init, headers }).then((response) => {
        if (authRequired && response.status === 401 && !window.location.pathname.startsWith("/login")) window.location.assign("/login");
        return response;
      });
    };
    if (authRequired && !window.location.pathname.startsWith("/login") && !window.localStorage.getItem("aif_session")) window.location.assign("/login");
    return () => { window.fetch = original; };
  }, []);
  return null;
}
