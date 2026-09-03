"use client";

import { useEffect } from "react";

export default function AuthBootstrap() {
  useEffect(() => {
    const original = window.fetch.bind(window);
    window.fetch = (input: RequestInfo | URL, init: RequestInit = {}) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      if (!url.includes("/api/v1/")) return original(input, init);
      const token = window.localStorage.getItem("aif_session");
      if (!token) return original(input, init);
      const headers = new Headers(init.headers || (input instanceof Request ? input.headers : undefined));
      if (!headers.has("authorization")) headers.set("authorization", `Bearer ${token}`);
      return original(input, { ...init, headers });
    };
    return () => { window.fetch = original; };
  }, []);
  return null;
}
