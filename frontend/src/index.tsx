/* eslint-disable simple-import-sort/imports -- Entry order: globalUtils (tw/cn) and stores (API auth) before App’s module graph. */
import './app/globalUtils';
import './shared/stores/authStore';
import './shared/stores/settingsStore';

import React from 'react';
import ReactDOM from 'react-dom/client';

import App from './App';

import './index.css';

import './shared/config/i18n/config';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement,
);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
