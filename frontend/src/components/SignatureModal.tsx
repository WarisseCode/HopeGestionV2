import React, { useRef } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { Modal, Box, Typography, Button, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckIcon from '@mui/icons-material/Check';

interface SignatureModalProps {
    open: boolean;
    onClose: () => void;
    onSave: (signatureImage: string) => void;
    title?: string;
}

const SignatureModal: React.FC<SignatureModalProps> = ({ open, onClose, onSave, title = "Signature du contrat" }) => {
    const sigPad = useRef<SignatureCanvas>(null);

    const clear = () => {
        sigPad.current?.clear();
    };

    const save = () => {
        const dataUrl = sigPad.current?.getCanvas().toDataURL('image/png');
        if (dataUrl) {
            onSave(dataUrl);
            onClose();
        }
    };

    return (
        <Modal open={open} onClose={onClose}>
            <Box sx={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: { xs: '90%', sm: 500 },
                bgcolor: 'white',
                boxShadow: 24,
                p: { xs: 2, sm: 4 },
                borderRadius: 4,
                display: 'flex',
                flexDirection: 'column',
                gap: 2
            }}>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography variant="h6" fontWeight="bold">
                        {title}
                    </Typography>
                    <IconButton onClick={onClose} size="small">
                        <CloseIcon />
                    </IconButton>
                </Box>

                <Typography variant="body2" color="text.secondary">
                    Veuillez signer à l'aide de votre souris ou de votre doigt dans le cadre ci-dessous.
                </Typography>

                <Box sx={{ 
                    border: '2px dashed #e2e8f0', 
                    borderRadius: 2, 
                    overflow: 'hidden', 
                    bgcolor: '#f8fafc',
                    height: 200,
                    width: '100%',
                    cursor: 'crosshair'
                }}>
                    <SignatureCanvas 
                        ref={sigPad}
                        canvasProps={{ 
                            style: { width: '100%', height: '100%' }
                        }} 
                    />
                </Box>

                <Box display="flex" justifyContent="flex-end" gap={2} mt={1}>
                    <Button 
                        startIcon={<DeleteIcon />} 
                        onClick={clear} 
                        color="inherit"
                        variant="text"
                        sx={{ textTransform: 'none' }}
                    >
                        Effacer
                    </Button>
                    <Button 
                        startIcon={<CheckIcon />} 
                        onClick={save} 
                        variant="contained" 
                        color="primary"
                        sx={{ 
                            textTransform: 'none',
                            borderRadius: 2,
                            px: 3,
                            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                        }}
                    >
                        Valider la signature
                    </Button>
                </Box>
            </Box>
        </Modal>
    );
};

export default SignatureModal;
