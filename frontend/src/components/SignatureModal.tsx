import React, { useRef } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { X, Trash2, Check } from 'lucide-react';

interface SignatureModalProps {
    open: boolean;
    onClose: () => void;
    onSave: (signatureImage: string) => void;
    title?: string;
}

const SignatureModal: React.FC<SignatureModalProps> = ({
    open,
    onClose,
    onSave,
    title = 'Signature du contrat',
}) => {
    const sigPad = useRef<SignatureCanvas>(null);

    const clear = () => sigPad.current?.clear();

    const save = () => {
        const dataUrl = sigPad.current?.getCanvas().toDataURL('image/png');
        if (dataUrl) {
            onSave(dataUrl);
            onClose();
        }
    };

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col gap-4 p-6">

                {/* En-tête */}
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold text-slate-800">{title}</h2>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                        aria-label="Fermer"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Instructions */}
                <p className="text-sm text-slate-500">
                    Veuillez signer à l'aide de votre souris ou de votre doigt dans le cadre ci-dessous.
                </p>

                {/* Zone de signature */}
                <div className="border-2 border-dashed border-slate-200 rounded-xl overflow-hidden bg-slate-50 h-48 w-full cursor-crosshair">
                    <SignatureCanvas
                        ref={sigPad}
                        canvasProps={{ style: { width: '100%', height: '100%' } }}
                    />
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 mt-1">
                    <button
                        onClick={clear}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
                    >
                        <Trash2 size={16} />
                        Effacer
                    </button>
                    <button
                        onClick={save}
                        className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 shadow-md shadow-indigo-200 transition-colors"
                    >
                        <Check size={16} />
                        Valider la signature
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SignatureModal;
