// frontend/src/components/ui/AvatarUpload.tsx
// Composant d'upload de photo de profil — interface circulaire avec badge caméra
import React, { useState, useEffect, useRef } from 'react';
import { User, Camera, Loader2, X } from 'lucide-react';
import { API_URL, API_BASE } from '../../config';

interface AvatarUploadProps {
  value?: string;
  onChange: (url: string) => void;
  size?: number; // diamètre en px, défaut 112
}

const AvatarUpload: React.FC<AvatarUploadProps> = ({ value, onChange, size = 112 }) => {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview]     = useState<string | null>(value || null);
  const [error, setError]         = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setPreview(value || null); }, [value]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setError('Max 5 MB'); return; }
    if (!file.type.startsWith('image/')) { setError('Image uniquement'); return; }

    setError(null);
    setUploading(true);
    setPreview(URL.createObjectURL(file));

    const fd = new FormData();
    fd.append('type', 'avatar');
    fd.append('file', file);

    try {
      const res  = await fetch(`${API_URL}/upload`, { method: 'POST', body: fd });
      const data = await res.json();
      if (res.ok) {
        const url = `${API_BASE}${data.files[0].path}`;
        onChange(url);
        setPreview(url);
      } else {
        throw new Error(data.message || 'Erreur upload');
      }
    } catch {
      setError("Échec de l'envoi");
      setPreview(value || null);
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const iconSize = Math.round(size * 0.38);
  const badgeSize = Math.round(size * 0.28);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative group">
        {/* Cercle principal */}
        <div
          style={{ width: size, height: size }}
          className="rounded-full bg-base-200 border-4 border-white shadow-md ring-1 ring-base-300 overflow-hidden cursor-pointer flex-shrink-0"
          onClick={() => !uploading && fileInputRef.current?.click()}
          title="Modifier la photo de profil"
        >
          {uploading ? (
            <div className="w-full h-full flex items-center justify-center bg-base-200">
              <Loader2 size={iconSize} className="animate-spin text-primary" />
            </div>
          ) : preview ? (
            <img src={preview} alt="Photo de profil" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-base-content/25">
              <User size={iconSize} />
            </div>
          )}

          {/* Overlay hover */}
          {!uploading && (
            <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
              <Camera size={Math.round(size * 0.2)} className="text-white" />
            </div>
          )}
        </div>

        {/* Badge caméra */}
        {!uploading && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            style={{ width: badgeSize, height: badgeSize }}
            className="absolute bottom-0.5 right-0.5 rounded-full bg-primary text-primary-content shadow-lg flex items-center justify-center hover:bg-primary/80 transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
            title="Modifier la photo"
          >
            <Camera size={Math.round(badgeSize * 0.5)} />
          </button>
        )}

        {/* Bouton supprimer */}
        {preview && !uploading && (
          <button
            type="button"
            onClick={handleRemove}
            className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-error text-white shadow-md flex items-center justify-center hover:bg-error/80 transition-colors"
            title="Supprimer la photo"
          >
            <X size={11} />
          </button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      <p className="text-xs text-base-content/40 text-center leading-tight">
        Photo de profil
        <span className="block text-[10px] mt-0.5">JPG, PNG · max 5 MB</span>
      </p>

      {error && <p className="text-xs text-error text-center">{error}</p>}
    </div>
  );
};

export default AvatarUpload;
