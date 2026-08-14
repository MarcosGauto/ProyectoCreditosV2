'use client';

import { useUser } from '@auth0/nextjs-auth0';
import { CuitForm } from "@/components/financialAnalysis/Cuit-form"
import Fondo from "@/components/image/fondo.jpg"
import Image from 'next/image';

export default function UserSession() {
    const { user, isLoading, error } = useUser();

    if (isLoading) {
        return <div>Loading...</div>;
    }

    if (error) {
        return <div>Error: {error.message}</div>;
    }

    return (
        <div>
            <Image src={Fondo} alt="Fondo" layout="fill" objectFit="cover" className="z-[-1] blur-sm opacity-50" />
            {user ? (
                <div className="min-h-screen p-6 bg-background">
                    <div className="text-center space-y-2">
                        <div className="text-center space-y-2">
                            <h1>Hola, {user.name}!</h1>
                            <h1 className="text-3xl font-bold tracking-tight">Análisis de Crédito</h1>
                        </div>
                        <CuitForm />
                    </div>
                </div>

            ) : (
                <p>You are not logged in.</p>  // Mensaje si el usuario no está logueado
            )}
        </div>
    );
}





