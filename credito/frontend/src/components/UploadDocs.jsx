"use client"

import { useState } from "react"
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"
import { collection, addDoc } from "firebase/firestore"
import { db, storage } from "@/service/firebase"
import { Button } from "@/components/ui/button"

export default function UploadDocs({ cuit }) {
    const [file, setFile] = useState(null)
    const [uploading, setUploading] = useState(false)
    const [url, setUrl] = useState(null)

    const handleUpload = async () => {
        if (!file) return
        setUploading(true)
        try {
            const storageRef = ref(storage, `docs/${cuit}/${file.name}`)
            await uploadBytes(storageRef, file)
            const downloadURL = await getDownloadURL(storageRef)

            await addDoc(collection(db, "clientes", cuit, "documentos"), {
                name: file.name,
                url: downloadURL,
                uploadedAt: new Date()
            })

            setUrl(downloadURL)
            alert("Archivo subido correctamente ✅")
        } catch (err) {
            console.error(err)
            alert("Error al subir el archivo ❌")
        } finally {
            setUploading(false)
        }
    }

    return (
        <div className="p-4 border border-border rounded-xl bg-card">
            <h2 className="font-bold mb-2 text-foreground">Subir Documentos</h2>
            <input
                type="file"
                onChange={(e) => setFile(e.target.files[0])}
                className="mb-3 text-muted-foreground"
            />
            <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleUpload}
                disabled={uploading || !file}
            >
                {uploading ? "Subiendo..." : "Subir"}
            </Button>

            {url && (
                <p className="mt-2 text-sm text-muted-foreground">
                    ✅ Archivo disponible:{" "}
                    <a href={url} target="_blank" className="text-sky-300 underline hover:text-sky-200">
                        {file.name}
                    </a>
                </p>
            )}
        </div>
    )
}
