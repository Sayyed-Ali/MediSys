import axios from 'axios';
import { jwtDecode } from 'jwt-decode';

// Use environment variable for backend URL
// In production: VITE_API_BASE = https://medisys-backend-lzk3.onrender.com
// In development: defaults to http://localhost:5000
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000';

const API = axios.create({
    baseURL: `${API_BASE}/api`,
});

export const setAuthToken = token => {
    if (token) {
        // Apply for all subsequent requests
        API.defaults.headers.common['x-auth-token'] = token;
        localStorage.setItem('token', token);
    } else {
        // Delete auth header and clear storage
        delete API.defaults.headers.common['x-auth-token'];
        localStorage.removeItem('token');
    }
};

// Check for existing token on load
const token = localStorage.getItem('token');
if (token) {
    setAuthToken(token);
}

// --- Auth Endpoints ---
// Requests will automatically go to: http://localhost:5173/api/auth/login 
// and Vite will proxy them to: http://localhost:5000/api/auth/login
export const login = (email, password) => API.post('/auth/login', { email, password });

// --- Patient/Doctor/User Endpoints ---
export const getPatients = () => API.get('/patients');
export const getDoctors = () => API.get('/doctors');
export const registerUser = (userData) => API.post('/users', userData);
export const getAllUsers = () => API.get('/users');

// --- Inventory/Medicine Endpoints ---
export const getInventory = () => API.get('/inventory');
export const getMedicines = () => API.get('/medicines');
export const addMedicineBatchOCR = (formData) => API.post('/inventory/ocr-intake', formData);

// --- Analytics Endpoints ---
export const predictDemand = (month) => API.post('/analytics/demand', { month });
export const predictRisk = (patientData) => API.post('/analytics/risk', patientData);

// --- Admission/Bed Endpoints ---
export const getBeds = (status) => API.get(`/beds${status ? `?status=${status}` : ''}`);
export const admitPatient = (data) => API.post('/admissions/admit', data);

// --- Donor Endpoints ---
export const getCompatibleDonors = (bloodGroup) => API.get(`/donors/compatible/${bloodGroup}`);

export default API;