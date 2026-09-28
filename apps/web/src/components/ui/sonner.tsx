import * as React from "react";

export function Toaster() {
  return null;
}

export const toast = {
  success: (msg: string) => console.log("[toast:success]", msg),
  error: (msg: string) => console.error("[toast:error]", msg),
  info: (msg: string) => console.info("[toast:info]", msg),
};
