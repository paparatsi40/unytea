"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Loader2, CheckCircle } from "lucide-react";

export default function RefreshSessionPage() {
  const { status, update } = useSession();
  const router = useRouter();
  const [isRefreshing, setIsRefreshing] = useState(true);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const refreshSession = async () => {
      if (status === "loading") return;

      if (status === "unauthenticated") {
        router.push("/auth/signin");
        return;
      }

      try {
        // Force session update
        await update();
        setSuccess(true);

        // Wait 2 seconds and redirect to admin
        setTimeout(() => {
          router.push("/dashboard/admin");
        }, 2000);
      } catch (error) {
        console.error("Error refreshing session:", error);
        setIsRefreshing(false);
      }
    };

    refreshSession();
  }, [status, update, router]);

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center space-y-6">
        {isRefreshing && !success && (
          <>
            <div className="w-16 h-16 mx-auto">
              <Loader2 className="w-16 h-16 text-primary animate-spin" />
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-2">Actualizando Sesión</h2>
              <p className="text-muted-foreground">
                Cargando tus permisos de administrador...
              </p>
            </div>
          </>
        )}

        {success && (
          <>
            <div className="w-16 h-16 mx-auto">
              <CheckCircle className="w-16 h-16 text-green-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-2 text-green-600">
                ¡Sesión Actualizada!
              </h2>
              <p className="text-muted-foreground">
                Redirigiendo al Admin Panel...
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
