import React, { useEffect, useState } from 'react';
import PublicLayout from '../../layout/PublicLayout';
import LegalDocument from '../../components/legal/LegalDocument';
import CguArticles from '../../components/legal/CguArticles';
import { API_URL } from '../../config';

const CguPage: React.FC = () => {
    const [version, setVersion] = useState<string | null>(null);

    useEffect(() => {
        fetch(`${API_URL}/cgu/version`)
            .then(r => r.json())
            .then(d => setVersion(d.version))
            .catch(() => {});
    }, []);

    return (
        <PublicLayout>
            <LegalDocument
                title="Conditions Générales d'Utilisation"
                subtitle={version ? `Version en vigueur depuis le ${version}` : undefined}
            >
                <CguArticles />
            </LegalDocument>
        </PublicLayout>
    );
};

export default CguPage;
