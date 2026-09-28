import * as React from "react";

export function Tabs({ className, ...props }: React.HTMLAttributes<HTMLDivElement> & { defaultValue?: string; value?: string; onValueChange?: (val: string) => void }) {
  return <div className={className} {...props} />;
}
export function TabsList({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={className} {...props} />;
}
export function TabsTrigger({ className, value, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { value: string }) {
  return <button className={className} data-value={value} {...props} />;
}
export function TabsContent({ className, value, ...props }: React.HTMLAttributes<HTMLDivElement> & { value: string }) {
  return <div className={className} data-value={value} {...props} />;
}
