// src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import axios from 'axios';

/**
 * Global axios setup (run once, before the app mounts)
 * - ensures every axios request has the latest token from localStorage
 * - sets window.axios so you can test from DevTools
 */

// src/main.jsx (top area)
function getStoredToken() {
  try {
    return localStorage.getItem('ms_token') || localStorage.getItem('token') || null;
  } catch (e) {
    return null;
  }
}

// copy legacy token -> canonical key once at app boot
(function syncTokenKeysOnBoot() {
  try {
    const t = localStorage.getItem('ms_token') || localStorage.getItem('token');
    if (t) {
      const bare = /^Bearer\s+/i.test(t) ? t.replace(/^Bearer\s+/i, '') : t;
      localStorage.setItem('ms_token', bare);
      localStorage.setItem('token', bare);
    }
  } catch (e) { }
})();

function getToken() {
  try {
    return localStorage.getItem('ms_token') || localStorage.getItem('token') || null;
  } catch (e) {
    return null;
  }
}

// Basic defaults (optional)
axios.defaults.baseURL = undefined; // leave as-is; individual modules use full URLs
axios.defaults.headers = axios.defaults.headers || {};
axios.defaults.headers.common = axios.defaults.headers.common || {};

// Apply current token (if present)
const initialToken = getToken();
if (initialToken) {
  axios.defaults.headers.common['Authorization'] = /^Bearer\s+/i.test(initialToken) ? initialToken : `Bearer ${initialToken}`;
  axios.defaults.headers.common['x-auth-token'] = /^Bearer\s+/i.test(initialToken) ? initialToken.replace(/^Bearer\s+/i, '') : initialToken;
}

// Add request interceptor to always use the most up-to-date token (handles token set later)
axios.interceptors.request.use(
  (config) => {
    const t = getToken();
    if (t) {
      config.headers = config.headers || {};
      config.headers['Authorization'] = /^Bearer\s+/i.test(t) ? t : `Bearer ${t}`;
      config.headers['x-auth-token'] = /^Bearer\s+/i.test(t) ? t.replace(/^Bearer\s+/i, '') : t;
    } else if (config.headers) {
      delete config.headers['Authorization'];
      delete config.headers['x-auth-token'];
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Expose axios for console testing
try {
  window.axios = axios;
} catch (e) {
  /* noop in environments where window isn't writable */
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);