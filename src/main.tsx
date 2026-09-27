import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Root } from './ui/Root';
import { SettingsProvider } from './ui/settings';
import './ui/styles.css';
import './ui/phone.css';
import './ui/site.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SettingsProvider>
      <Root />
    </SettingsProvider>
  </StrictMode>,
);
