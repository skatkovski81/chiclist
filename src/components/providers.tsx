"use client";

import { SessionProvider } from "next-auth/react";
import { Toaster } from "sonner";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      {children}
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: "#FFFFFF",
            border: "1px solid #E5E7EB",
            boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
          },
          className: "text-sm",
        }}
      />
    </SessionProvider>
  );
}
