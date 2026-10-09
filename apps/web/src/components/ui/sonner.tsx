"use client";

import * as React from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type ToastType = "success" | "error" | "info";

interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
}

type ToastListener = (toasts: ToastItem[]) => void;

let toasts: ToastItem[] = [];
const listeners = new Set<ToastListener>();

function notify() {
  listeners.forEach((listener) => listener([...toasts]));
}

function addToast(type: ToastType, message: string) {
  const id = Math.random().toString(36).substring(2, 9);
  const newToast: ToastItem = { id, type, message };
  toasts = [...toasts, newToast];
  notify();

  setTimeout(() => {
    removeToast(id);
  }, 4000);
}

function removeToast(id: string) {
  toasts = toasts.filter((t) => t.id !== id);
  notify();
}

export const toast = {
  success: (msg: string) => addToast("success", msg),
  error: (msg: string) => addToast("error", msg),
  info: (msg: string) => addToast("info", msg),
};

export function Toaster(): React.JSX.Element | null {
  const [items, setItems] = React.useState<ToastItem[]>([]);

  React.useEffect(() => {
    listeners.add(setItems);
    return () => {
      listeners.delete(setItems);
    };
  }, []);

  if (items.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {items.map((item) => (
        <div
          key={item.id}
          className={cn(
            "pointer-events-auto flex items-center justify-between gap-3 rounded-lg border p-4 shadow-lg text-sm transition-all duration-300 animate-in slide-in-from-bottom-5",
            item.type === "success" && "border-emerald-500/30 bg-background text-foreground",
            item.type === "error" && "border-destructive/30 bg-background text-destructive",
            item.type === "info" && "border-border bg-background text-foreground"
          )}
        >
          <div className="flex items-center gap-2">
            {item.type === "success" && <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />}
            {item.type === "error" && <AlertCircle className="h-4 w-4 text-destructive shrink-0" />}
            {item.type === "info" && <Info className="h-4 w-4 text-primary shrink-0" />}
            <span>{item.message}</span>
          </div>
          <button
            type="button"
            onClick={() => removeToast(item.id)}
            className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer"
          >
            <X className="h-3.5 w-3.5" />
            <span className="sr-only">Close</span>
          </button>
        </div>
      ))}
    </div>
  );
}

