import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';

// eslint-disable-next-line fsd/no-global-store-imports -- bootstrap mounts the Redux Provider, so a direct store import is required here.
import { store } from './app/store';
import App from './App';

import './index.css';

import './app/globalUtils';
import './shared/config/i18n/config';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement,
);
root.render(
  <React.StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </React.StrictMode>,
);
