import React from 'react';
import { createRoot } from 'react-dom/client';
import SSSEquityDashboard from './investor.jsx';

const rootEl = document.getElementById('root') || (() => { const d = document.createElement('div'); d.id='root'; document.body.appendChild(d); return d; })();
createRoot(rootEl).render(React.createElement(SSSEquityDashboard));
