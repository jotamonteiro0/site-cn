import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseConfig } from "./config";

export function createClient() {
  const { url, key } = getSupabaseConfig();
  const isHttps = typeof window !== "undefined" && window.location.protocol === "https:";
  return createBrowserClient(url, key, {
    cookieOptions: {
      path: "/",
      sameSite: "lax",
      secure: isHttps,
    },
  });
}
