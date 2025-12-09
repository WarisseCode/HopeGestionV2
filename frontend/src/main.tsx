// frontend/src/main.tsx

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css'; // Gardez vos styles CSS globaux
import CustomThemeProvider from './theme/Theme.tsx'; // <-- Importez le thème

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <CustomThemeProvider> {/* <-- Appliquez le thème ici */}
      <App />
    </CustomThemeProvider>
  </React.StrictMode>,
);