import axios from '../api/axiosInstance'; // your shared axios setup
import authHeader from '../utils/authHeader';

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api/invoice';

export const getPendingReviews = () =>
    axios.get(`${API}/review/pending`, { headers: authHeader() });

export const approveReview = (id, data) =>
    axios.post(`${API}/review/approve/${id}`, data, { headers: authHeader() });

export const rejectReview = (id) =>
    axios.post(`${API}/review/reject/${id}`, {}, { headers: authHeader() });