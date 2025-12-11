"use client";

import { SessionProvider } from "next-auth/react";
import { Toaster } from "react-hot-toast";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      {children}
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: 'hsl(224 71% 4%)',
            color: 'hsl(213 31% 91%)',
            border: '1px solid hsl(215 27.9% 16.9%)',
          },
          success: {
            iconTheme: {
              primary: 'hsl(263 70% 50%)',
              secondary: 'white',
            },
          },
        }}
      />
    </SessionProvider>
  );
}
