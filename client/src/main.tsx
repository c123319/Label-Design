import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles/variables.css';
import { initFabricCustomProps } from '@/utils/fabricCustomProps';
import App from './App';

initFabricCustomProps();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
