import { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MapPin, Globe, Building } from "lucide-react";
import Image from "next/image";

export function LocationInfo({cuit }) {
    const [address, setAddress] = useState("");
    const [mapUrl, setMapUrl] = useState("");
    const [web, setWeb] = useState("www.empresa.com");
    const [sucursales, setSucursales] = useState("0");
    const [loading, setLoading] = useState(false);


    const saveDraftField = (field, value) => {
        const key = `draft-${cuit}`;
        const draft = JSON.parse(localStorage.getItem(key) || "{}");

        const updated = {
            ...draft,
            ubicacion: {
                ...draft.ubicacion,
                [field]: value
            }
        };

        localStorage.setItem(key, JSON.stringify(updated));
    };


    return (
        <Card>
            <CardHeader>
                <CardTitle>Ubicación</CardTitle>
                <CardDescription>Información de la ubicación y sucursales</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Búsqueda de dirección */}
                <div className="flex gap-2">
                    <Input
                        placeholder="Ingrese la dirección"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                    />

                </div>

                {/* Mapa */}
                {mapUrl && (
                    <>
                        <div className="text-right pt-2">
                            <a
                                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline text-sm"
                            >
                                Abrir en Google Maps
                            </a>
                        </div>
                    </>
                )}

                {/* Información editable */}
                <div className="grid grid-cols-3 gap-4 pt-4">
                    {/* Dirección */}
                    <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <Input
                            type="text"
                            className="..."
                            placeholder="Ingrese la dirección"
                            onChange={(e) => saveDraftField("direccion", e.target.value)}
                        />
                    </div>

                    {/* Web */}
                    <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-muted-foreground" />
                        <Input
                            type="text"
                            className="..."
                            placeholder="www.empresa.com"
                            onChange={(e) => saveDraftField("web", e.target.value)}
                        />                    </div>

                    {/* Sucursales */}
                    <div className="flex items-center gap-2"><a>Sucursales</a>
                        <Building className="h-4 w-4 text-muted-foreground" />
                        <Input
                            type="number"
                            className="..."
                            onChange={(e) => saveDraftField("sucursales", e.target.value)}
                        />

                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
