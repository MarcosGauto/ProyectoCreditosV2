"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { auth } from "@/service/firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      router.push("/");
    } catch (err) {
      setError("Error al registrarse: " + err.message);
    }
  };

  return (
    <main className="flex items-center justify-center min-h-screen bg-background px-4">
      <form
        onSubmit={handleRegister}
        className="w-full max-w-md bg-card p-8 rounded-2xl shadow-xl space-y-6 border border-border"
      >
        <h1 className="text-3xl font-bold text-center text-foreground">
          Crear nueva cuenta
        </h1>
        <p className="text-center text-muted-foreground text-sm">
          Complete sus datos para registrarse
        </p>

        {error && (
          <p className="text-red-400 text-sm bg-red-500/10 p-3 rounded-xl text-center border border-red-500/30">
            {error}
          </p>
        )}

        <div className="space-y-2">
          <Label htmlFor="email" className="text-muted-foreground">Correo electrónico</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="bg-muted border-border text-foreground"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password" className="text-muted-foreground">Contraseña</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="bg-muted border-border text-foreground"
          />
        </div>

        <Button type="submit" variant="primary" className="w-full">
          Registrarse
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          ¿Ya tiene cuenta?{" "}
          <a href="/login" className="text-sky-300 hover:text-sky-200">
            Inicie sesión aquí
          </a>
        </p>
      </form>
    </main>
  );
}
