import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { api, unwrap } from "@/lib/api/server";

/** Platforma kontaktlari va so'rov formasi holati — admin sozlamalarni saqlaganda "settings" tegi yangilanadi */
export async function getPublicSettings() {
  "use cache";
  cacheLife("hours");
  cacheTag("settings");
  return unwrap(api.GET("/settings"));
}
