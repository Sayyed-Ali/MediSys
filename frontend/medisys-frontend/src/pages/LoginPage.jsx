import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';  // ✅ Added for token persistence
import logo from '../assets/logo.png';

const LoginPage = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const { loginUser, token, user, loading: authLoading } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    // ✅ Helper to persist token after successful login
    const handleLoginSuccess = (token) => {
        try {
            // strip Bearer if present
            const rawToken = token?.startsWith?.('Bearer ') ? token.replace(/^Bearer\s+/i, '') : token;

            // store canonical and legacy keys
            localStorage.setItem('ms_token', rawToken);
            localStorage.setItem('token', rawToken);

            // update axios headers globally
            axios.defaults.headers = axios.defaults.headers || {};
            axios.defaults.headers.common = axios.defaults.headers.common || {};
            axios.defaults.headers.common['Authorization'] = `Bearer ${rawToken}`;
            axios.defaults.headers.common['x-auth-token'] = rawToken;

            console.log('✅ Token stored and axios defaults updated');
        } catch (e) {
            console.error('Failed to persist token', e);
        }
    };

    // ✅ Redirect logic (same as before)
    useEffect(() => {
        const onLoginPath = location.pathname === '/login' || location.pathname === '/';
        if (!authLoading && token && user && onLoginPath) {
            if (location.pathname !== '/dashboard') {
                navigate('/dashboard', { replace: true });
            }
        }
    }, [authLoading, token, user, navigate, location.pathname]);

    // ✅ Login submit handler
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        const result = await loginUser(email, password);
        setLoading(false);

        if (result?.ok) {
            // 🧩 extract token from result or context
            const loginToken =
                result?.token ||
                token ||
                (typeof result === 'string' ? result : null);

            if (loginToken) {
                try {
                    // normalize token (remove "Bearer ")
                    const raw = loginToken.startsWith('Bearer ')
                        ? loginToken.replace(/^Bearer\s+/i, '')
                        : loginToken;

                    // 🪄 ensure both keys exist BEFORE navigation
                    localStorage.setItem('ms_token', raw);
                    localStorage.setItem('token', raw);

                    // 🪄 immediately update axios headers
                    axios.defaults.headers = axios.defaults.headers || {};
                    axios.defaults.headers.common = axios.defaults.headers.common || {};
                    axios.defaults.headers.common['Authorization'] = `Bearer ${raw}`;
                    axios.defaults.headers.common['x-auth-token'] = raw;

                    console.log('✅ token synced to both keys:', raw.slice(0, 15) + '...');
                } catch (err) {
                    console.error('token sync failed', err);
                }
            }

            // ✅ only then navigate to dashboard
            if (location.pathname === '/login' || location.pathname === '/') {
                navigate('/dashboard', { replace: true });
            }
        } else {
            setError(result?.msg || 'Login failed. Please check your credentials.');
        }
    };

    return (
        <div className="flex min-h-screen flex-col justify-center items-center bg-gray-50 px-6 py-12">
            <div className="w-full max-w-lg bg-white shadow-xl rounded-2xl p-10">
                <div className="text-center mb-8">
                    <img alt="MediSys+ Logo" src={logo} className="mx-auto h-14 w-auto mb-4" />
                    <h2 className="text-2xl font-bold tracking-tight text-gray-900">Sign in to your account</h2>
                    <p className="mt-1 text-sm text-gray-500">Hospital Management System</p>
                </div>

                {error && (
                    <div className="mb-6 p-3 text-sm text-red-700 bg-red-100 rounded-lg text-center">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                                Email address
                            </label>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:ring-2 focus:ring-indigo-500"
                                placeholder="Enter your email"
                            />
                        </div>
                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                                Password
                            </label>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:ring-2 focus:ring-indigo-500"
                                placeholder="Enter your password"
                            />
                        </div>
                    </div>

                    <div className="pt-4">
                        <button
                            type="submit"
                            disabled={loading}
                            className={`flex justify-center items-center rounded-md bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 transition-all duration-200 ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
                        >
                            {loading ? 'Logging in...' : 'Sign in'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default LoginPage;