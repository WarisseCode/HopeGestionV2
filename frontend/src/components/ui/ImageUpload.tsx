// frontend/src/components/ui/ImageUpload.tsx

import React, { useState, useRef } from 'react';
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react';
import { API_URL, API_BASE } from '../../config';

interface ImageUploadProps {
    value?: string;           // URL de l'image existante
    onChange: (url: string) => void;
    label?: string;
    folder?: 'property' | 'avatar' | 'document';
    className?: string;
}

const ImageUpload: React.FC<ImageUploadProps> = ({ 
    value, 
    onChange, 
    label = "Choisir une image", 
    folder = 'others',
    className = ""
}) => {
    const [uploading, setUploading] = useState(false);
    const [preview, setPreview] = useState<string | null>(value || null);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validation taille (5MB)
        if (file.size > 5 * 1024 * 1024) {
            setError("L'image ne doit pas dépasser 5MB");
            return;
        }

        // Validation type
        if (!file.type.startsWith('image/')) {
            setError("Seules les images sont acceptées");
            return;
        }

        setError(null);
        setUploading(true);

        // Preview immédiat
        const objectUrl = URL.createObjectURL(file);
        setPreview(objectUrl);

        const formData = new FormData();
        formData.append('type', folder); // Important: Append 'type' BEFORE 'file' for Multer to read it first
        formData.append('file', file);

        try {
            const response = await fetch(`${API_URL}/upload`, {
                method: 'POST',
                body: formData,
                // Pas de Content-Type header, le navigateur le met automatiquement avec boundary
            });

            const data = await response.json();

            if (response.ok) {
                const fileUrl = `${API_BASE}${data.files[0].path}`;
                onChange(fileUrl);
                setPreview(fileUrl);
            } else {
                throw new Error(data.message || 'Erreur upload');
            }
        } catch (err: any) {
            console.error(err);
            setError("Échec de l'envoi. Réessayez.");
            // Revert preview
            setPreview(value || null);
        } finally {
            setUploading(false);
        }
    };

    const handleRemove = (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        onChange('');
        setPreview(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    return (
        <div className={`form-control ${className}`}>
            {label && (
                <label className="label">
                    <span className="label-text font-medium">{label}</span>
                </label>
            )}

            <div 
                className={`
                    relative border-2 border-dashed rounded-xl p-4 transition-all
                    ${error ? 'border-error bg-error/5' : 'border-base-300 hover:border-primary/50 hover:bg-base-200/50'}
                    ${preview ? 'h-48' : 'h-32'}
                `}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    disabled={uploading}
                />

                {preview ? (
                    <div className="relative w-full h-full group">
                        <img 
                            src={preview} 
                            alt="Preview" 
                            className="w-full h-full object-cover rounded-lg"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg z-20 pointer-events-none">
                            <p className="text-white font-medium flex items-center gap-2">
                                <Upload size={16} /> Changer
                            </p>
                        </div>
                        <button
                            onClick={handleRemove}
                            className="absolute -top-2 -right-2 btn btn-circle btn-xs btn-error z-30"
                            title="Supprimer"
                        >
                            <X size={14} />
                        </button>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-base-content/50">
                        {uploading ? (
                            <>
                                <Loader2 className="animate-spin mb-2 text-primary" size={24} />
                                <span className="text-sm">Envoi en cours...</span>
                            </>
                        ) : (
                            <>
                                <div className="bg-base-200 p-3 rounded-full mb-2">
                                    <ImageIcon size={24} />
                                </div>
                                <span className="text-sm font-medium">Cliquez pour ajouter</span>
                                <span className="text-xs mt-1">JPG, PNG (max 5MB)</span>
                            </>
                        )}
                    </div>
                )}
            </div>
            
            {error && (
                <label className="label">
                    <span className="label-text-alt text-error">{error}</span>
                </label>
            )}
        </div>
    );
};

export default ImageUpload;
