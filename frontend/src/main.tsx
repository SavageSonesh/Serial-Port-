import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Dark mode is the default; the stored preference wins.
const stored = localStorage.getItem('trendradar-theme');
document.documentElement.classList.toggle('dark', stored ? stored === 'dark' : true);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
