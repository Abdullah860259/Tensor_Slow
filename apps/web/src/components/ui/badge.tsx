import * as React from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "destructive" | "outline" | "success";
}

const badgeVariants: Record<NonNullable<BadgeProps["variant"]>, string> = {
  default: "border-primary/20 bg-primary/10 text-primary",
  secondary: "border-border bg-secondary text-foreground",
  destructive: "border-destructive/20 bg-destructive/10 text-destructive",
  success: "border-success/30 bg-success/15 text-success",
  outline: "border-border bg-transparent text-foreground",
};

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-1 focus:ring-ring",
        badgeVariants[variant],
        className
      )}
      {...props}
    />
  );
}

