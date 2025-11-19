// src/context/AuthContext.jsx
import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import axios from "axios";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:4000";
const AUTH_ME_EP = "/api/auth/me";
const LOGIN_EP = "/api/auth/login";
const STORAGE_KEY = "ms_token";

const AuthContext = createContext(null);

// decode JWT payload best-effort
function parseJwt(token) {
    if (!token) return null;
    try {
        const parts = token.split(".");
        if (parts.length !== 3) return null;
        const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
        if (payload && payload.user) return payload.user;
        return payload;
    } catch (e) {
        return null;
    }
}

function authHeader(token) {
    if (!token) return {};
    return { Authorization: `Bearer ${token}` };
}

export const AuthProvider = ({ children }) => {
    // token state (hydrate from localStorage)
    const [token, setTokenState] = useState(() => {
        try {
            return localStorage.getItem(STORAGE_KEY) || null;
        } catch {
            return null;
        }
    });

    const tokenRef = useRef(token); // for interceptor stable reference
    tokenRef.current = token;

    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // helper: set axios defaults & localStorage consistently
    const persistToken = useCallback((t) => {
        try {
            if (t) localStorage.setItem(STORAGE_KEY, t);
            else localStorage.removeItem(STORAGE_KEY);
        } catch (e) {
            // ignore storage errors
        }

        // keep in state + ref
        setTokenState(t || null);
        tokenRef.current = t || null;

        // set axios defaults so existing axios calls pick it up
        if (t) {
            axios.defaults.headers = axios.defaults.headers || {};
            axios.defaults.headers.common = axios.defaults.headers.common || {};
            axios.defaults.headers.common["Authorization"] = `Bearer ${t}`;
            axios.defaults.headers.common["x-auth-token"] = t;
        } else {
            if (axios.defaults && axios.defaults.headers && axios.defaults.headers.common) {
                delete axios.defaults.headers.common["Authorization"];
                delete axios.defaults.headers.common["x-auth-token"];
            }
        }
    }, []);

    // debugging helper (set token from console)
    const setTokenManual = useCallback((t) => {
        persistToken(t);
        const inferred = parseJwt(t);
        if (inferred) setUser(inferred);
    }, [persistToken]);

    const clear = useCallback(() => {
        persistToken(null);
        setUser(null);
    }, [persistToken]);

    // axios interceptor: attach token to ALL axios requests if present
    useEffect(() => {
        const id = axios.interceptors.request.use(
            (config) => {
                const t = tokenRef.current || (typeof window !== "undefined" && localStorage.getItem(STORAGE_KEY));
                if (t) {
                    config.headers = config.headers || {};
                    if (!config.headers.Authorization) config.headers.Authorization = `Bearer ${t}`;
                    if (!config.headers["x-auth-token"]) config.headers["x-auth-token"] = t;
                }
                return config;
            },
            (err) => Promise.reject(err)
        );
        return () => axios.interceptors.request.eject(id);
    }, []);

    // fetch /api/auth/me to hydrate user
    const fetchMe = useCallback(
        async (tok) => {
            if (!tok) {
                setUser(null);
                setLoading(false);
                return;
            }
            setLoading(true);
            try {
                console.debug("[Auth] fetching /me with token");
                const res = await fetch(`${API_BASE}${AUTH_ME_EP}`, {
                    headers: { "Content-Type": "application/json", ...authHeader(tok) },
                });

                if (res.ok) {
                    const data = await res.json();
                    if (data && data.user) {
                        setUser(data.user);
                        setLoading(false);
                        return;
                    }
                    if (data && data.id) {
                        setUser(data);
                        setLoading(false);
                        return;
                    }
                } else if (res.status === 401 || res.status === 403) {
                    console.warn("[Auth] token invalid according to /me", res.status);
                    clear();
                    setLoading(false);
                    return;
                } else if (res.status === 404) {
                    // older backend - fallback to token parse
                    const inferred = parseJwt(tok);
                    if (inferred) setUser(inferred);
                    setLoading(false);
                    return;
                } else {
                    // other server error -> fallback to parse token
                    const inferred = parseJwt(tok);
                    if (inferred) setUser(inferred);
                    setLoading(false);
                    return;
                }
            } catch (err) {
                // network error -> fallback but keep token
                console.warn("[Auth] fetchMe network error, falling back to token payload", err);
                const inferred = parseJwt(tok);
                if (inferred) setUser(inferred);
                setLoading(false);
                return;
            }
        },
        [clear]
    );

    // login function used by LoginPage
    const loginUser = useCallback(
        async (email, password) => {
            try {
                const res = await fetch(`${API_BASE}${LOGIN_EP}`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email, password }),
                    credentials: "include",
                });

                const data = await (res.headers.get("Content-Type")?.includes("application/json") ? res.json() : {});

                if (!res.ok) {
                    const msg = (data && (data.msg || data.error)) || `Login failed (${res.status})`;
                    return { ok: false, msg, raw: data };
                }

                const newToken = data.token || data.accessToken || null;
                const userObj = data.user || (newToken ? parseJwt(newToken) : null);

                if (newToken) {
                    persistToken(newToken);
                    setUser(userObj || null);

                    // debug exports
                    window.__ms_auth_last_response = { success: true, token: newToken, user: userObj, raw: data };
                    window.__ms_auth = {
                        token: newToken,
                        user: userObj,
                        lastResponse: window.__ms_auth_last_response,
                        setTokenManual,
                        clear,
                    };

                    return { ok: true, token: newToken, user: userObj, raw: data };
                }

                return { ok: false, msg: "No token returned from server", raw: data };
            } catch (err) {
                console.error("[Auth] login error", err);
                return { ok: false, msg: "Network error", error: String(err) };
            }
        },
        [persistToken, setTokenManual, clear]
    );

    const logout = useCallback(() => {
        clear();
    }, [clear]);

    // when token changes, fetch /me
    useEffect(() => {
        if (!token) {
            setUser(null);
            setLoading(false);
            return;
        }
        fetchMe(token);
    }, [token, fetchMe]);

    // expose debug global for console use
    useEffect(() => {
        window.__ms_auth = {
            token,
            user,
            setTokenManual,
            clear,
            lastResponse: window.__ms_auth_last_response || null,
        };
    }, [token, user, setTokenManual, clear]);

    // derived convenience
    const isAuthenticated = !!token && !!user;

    return (
        <AuthContext.Provider
            value={{
                token,
                user,
                loading,
                isAuthenticated,
                loginUser,
                logout,
                setTokenManual,
                clear,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
export default AuthContext;