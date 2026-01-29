// frontend/src/components/ui/DocumentUpload.tsx

import React, { useState, useRef } from 'react';
import { Upload, X, FileText, Loader2, FileCheck } from 'lucide-react';
import { API_URL, API_BASE } from '../../config';

interface DocumentUploadProps {
    value?: string;           // URL du document existant
    onChange: (url: string) => void;
    label?: string;
    description?: string;
    className?: string;
}

const DocumentUpload: React.FC<DocumentUploadProps> = ({ 
    value, 
    onChange, 
    label = "Ajouter un document", 
    description = "PDF uniquement (max 10MB)",
    className = ""
}) => {
    const [uploading, setUploading] = useState(false);
    const [fileName, setFileName] = useState<string | null>(value ? value.split('/').pop() || 'Document' : null);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validation taille (10MB)
        if (file.size > 10 * 1024 * 1024) {
            setError("Le document ne doit pas dépasser 10MB");
            return;
        }

        // Validation type
        if (file.type !== 'application/pdf') {
            setError("Seuls les fichiers PDF sont acceptés");
            return;
        }

        setError(null);
        setUploading(true);
        setFileName(file.name);

        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', 'document');

        try {
            const response = await fetch(`${API_URL}/upload`, {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (response.ok) {
                const fileUrl = `${API_BASE}${data.files[0].path}`;
                onChange(fileUrl);
            } else {
                throw new Error(data.message || 'Erreur upload');
            }
        } catch (err: any) {
            console.error(err);
            setError("Échec de l'envoi. Réessayez.");
            setFileName(null);
        } finally {
            setUploading(false);
        }
    };

    const handleRemove = (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        onChange('');
        setFileName(null);
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
                    ${fileName ? 'bg-primary/5 border-primary/30' : ''}
                `}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/pdf"
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    disabled={uploading}
                />

                <div className="flex items-center gap-4">
                    <div className={`
                        w-12 h-12 rounded-full flex items-center justify-center shrink-0
                        ${fileName ? 'bg-primary/10 text-primary' : 'bg-base-200 text-base-content/50'}
                    `}>
                        {uploading ? (
                            <Loader2 className="animate-spin" size={24} />
                        ) : fileName ? (
                            <FileCheck size={24} />
                        ) : (
                            <Upload size={24} />
                        )}
                    </div>

                    <div className="flex-1 min-w-0">
                        {uploading ? (
                            <div className="text-sm font-medium">Envoi en cours...</div>
                        ) : fileName ? (
                            <div className="flex flex-col">
                                <span className="text-sm font-medium truncate text-primary">{fileName}</span>
                                <span className="text-xs text-base-content/60">Cliquez pour modifier</span>
                            </div>
                        ) : (
                            <div className="flex flex-col">
                                <span className="text-sm font-medium">Choisir un fichier</span>
                                <span className="text-xs text-base-content/50">{description}</span>
                            </div>
                        )}
                    </div>

                    {fileName && !uploading && (
                        <button
                            onClick={handleRemove}
                            className="btn btn-circle btn-xs btn-ghost z-20 hover:bg-error/20 hover:text-error"
                            title="Supprimer"
                        >
                            <X size={16} />
                        </button>
                    )}
                </div>
            </div>
            
            {error && (
                <label className="label">
                    <span className="label-text-alt text-error">{error}</span>
                </label>
            )}
        </div>
    );
};

export default DocumentUpload;
