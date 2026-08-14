"use client";

import { useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/service/firebase";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        // ✅ ya logueado -> al dashboard
        router.push("/dashboard");
      } else {
        // ❌ sin sesión -> al login
        router.push("/login");
      }
    });
    return () => unsubscribe();
  }, [router]);

  return (
    <main className="flex items-center justify-center min-h-screen bg-background">
      <div className="bg-card border border-border rounded-3xl px-10 py-8 shadow-2xl">
        <p className="text-muted-foreground text-lg font-medium animate-pulse">
          Cargando...
        </p>
      </div>
    </main>
  );
}
