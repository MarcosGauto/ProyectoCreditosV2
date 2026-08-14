"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { loginUser, loginWithGoogle } from "@/service/firebase";
import { useAuth } from "@/app/context/AuthContext";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);
    const router = useRouter();
    const { user } = useAuth();

    useEffect(() => {
        if (user) {
            router.push("/dashboard");
        }
    }, [user, router]);

    const handleLogin = async (e) => {
        e.preventDefault();
        if (loading) return;
        setLoading(true);
        try {
            await loginUser(email, password);
            router.push("/dashboard");
        } catch (err) {
            console.error("Error al iniciar sesión:", err);
            alert("Usuario o contraseña incorrectos");
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        if (googleLoading) return;
        setGoogleLoading(true);
        try {
            await loginWithGoogle();
            router.push("/dashboard");
        } catch (err) {
            if (err.code !== "auth/cancelled-popup-request") {
                console.error("Error al iniciar sesión con Google:", err);
                alert("Hubo un error con Google");
            } else {
                console.warn("Popup cancelado por otro intento de login.");
            }
        } finally {
            setGoogleLoading(false);
        }
    };

    return (
        <div className="relative flex min-h-screen flex-col items-center justify-center bg-background px-4">
            <div className="absolute right-4 top-4 sm:right-6 sm:top-6">
                <ThemeToggle />
            </div>
            <form
                onSubmit={handleLogin}
                className="w-full max-w-sm rounded-2xl border border-border bg-card p-8 shadow-xl"
            >
                <h2 className="text-2xl font-bold mb-6 text-foreground">Iniciar Sesión</h2>

                <input
                    type="email"
                    placeholder="Correo"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full p-3 border border-border bg-muted text-foreground rounded-xl mb-3 placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-red-500/40"
                />
                <input
                    type="password"
                    placeholder="Contraseña"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full p-3 border border-border bg-muted text-foreground rounded-xl mb-6 placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-red-500/40"
                />

                <Button
                    type="submit"
                    variant="primary"
                    className="w-full"
                    disabled={loading}
                >
                    {loading ? "Ingresando..." : "Ingresar"}
                </Button>
            </form>

            <Button
                type="button"
                variant="secondary"
                className="mt-4 w-full max-w-sm"
                onClick={handleGoogleLogin}
                disabled={googleLoading}
            >
                {googleLoading ? "Conectando..." : "Ingresar con Google"}
            </Button>
        </div>
    );
}
