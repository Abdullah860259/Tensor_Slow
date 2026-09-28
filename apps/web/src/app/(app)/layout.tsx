// STUB for Agent E (manifest item 40)
import React from "react";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b p-4">App Shell</header>
      <main className="p-4">{children}</main>
    </div>
  );
}
