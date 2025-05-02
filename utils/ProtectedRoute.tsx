import React, { useEffect } from "react";
import { useRouter } from "expo-router";
import { getToken } from "./authService";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      const token = await getToken();
      if (!token) {
        router.replace("/AuthScreen");
      }
    };
    checkAuth();
  }, []);

  return <>{children}</>;
}
