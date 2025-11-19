import axios from 'axios';

function getToken() {
    try {
        return localStorage.getItem('ms_token') || localStorage.getItem('token') || null;
    } catch {
        return null;
    }
}

const instance = axios.create({
    withCredentials: false,
});

instance.interceptors.request.use(
    (config) => {
        const t = getToken();
        if (t) {
            config.headers = config.headers || {};
            config.headers['Authorization'] = `Bearer ${t}`;
            config.headers['x-auth-token'] = t;
        } else {
            delete config.headers['Authorization'];
            delete config.headers['x-auth-token'];
        }
        return config;
    },
    (error) => Promise.reject(error)
);

export default instance;