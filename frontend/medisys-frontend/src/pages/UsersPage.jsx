// src/pages/UsersPage.jsx
import React, { useEffect, useState, useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import {
    Loader,
    UserPlus,
    User,
    Trash2,
    Edit,
    RefreshCw,
    Check,
    Search
} from "lucide-react";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:4000";

/**
 * Robust authHeader: check both token keys (token and ms_token).
 * Returns an object suitable for spreading into fetch headers.
 */
function authHeader() {
    const t = localStorage.getItem('ms_token') || localStorage.getItem('token') || null;
    return t ? { Authorization: `Bearer ${t}` } : {};
}

// include PathLab role in tabs
const ROLE_TABS = ["All", "Admin", "Doctor", "Staff", "Nurse", "PathLab", "Patient"];

const UsersPage = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [users, setUsers] = useState([]);
    const [filterRole, setFilterRole] = useState("All");
    const [message, setMessage] = useState(null);
    const [form, setForm] = useState({
        firstName: "",
        lastName: "",
        email: "",
        password: "",
        role: "Staff",
    });
    const [creating, setCreating] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [editRole, setEditRole] = useState("");

    // Search state + debounce helpers
    const [searchText, setSearchText] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");

    useEffect(() => {
        if (!user) return;
        fetchUsers();
    }, [user]);

    // debounce searchText -> debouncedSearch
    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(searchText.trim().toLowerCase()), 300);
        return () => clearTimeout(t);
    }, [searchText]);

    // Safety: only Admin should use this page UI
    if (!user || user.role !== "Admin") {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="bg-white p-8 rounded shadow text-center">
                    <h2 className="text-xl font-semibold">Access Denied</h2>
                    <p className="mt-2 text-sm text-gray-600">This area is for Admins only.</p>
                </div>
            </div>
        );
    }

    async function fetchUsers() {
        setLoading(true);
        setMessage(null);
        try {
            const res = await fetch(`${API_BASE}/api/users`, {
                headers: { "Content-Type": "application/json", ...authHeader() },
            });
            if (!res.ok) throw new Error(`Failed to fetch users (${res.status})`);
            const data = await res.json();
            setUsers(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("fetchUsers error:", err);
            setMessage({ type: "error", text: "Failed to load users." });
        } finally {
            setLoading(false);
        }
    }

    // Combined role + search filtering (memoized)
    const filtered = useMemo(() => {
        const text = debouncedSearch;
        return users.filter(u => {
            if (filterRole !== "All" && u.role !== filterRole) return false;
            if (!text) return true;
            const name = `${u.firstName || ""} ${u.lastName || ""}`.toLowerCase();
            const email = (u.email || "").toLowerCase();
            return name.includes(text) || email.includes(text);
        });
    }, [users, filterRole, debouncedSearch]);

    function updateForm(field, val) {
        setForm(f => ({ ...f, [field]: val }));
    }

    async function createUser(e) {
        e.preventDefault();
        setCreating(true);
        setMessage(null);

        if (!form.firstName.trim() || !form.email.trim() || !form.password.trim()) {
            setMessage({ type: "error", text: "First name, email and password are required." });
            setCreating(false);
            return;
        }

        try {
            const payload = {
                firstName: form.firstName.trim(),
                lastName: form.lastName.trim(),
                email: form.email.trim(),
                password: form.password,
                role: form.role,
            };
            const res = await fetch(`${API_BASE}/api/users`, {
                method: "POST",
                headers: { "Content-Type": "application/json", ...authHeader() },
                body: JSON.stringify(payload),
            });
            const json = await res.json();
            if (!res.ok) {
                const errMsg = json && json.msg ? json.msg : (json.error || JSON.stringify(json));
                setMessage({ type: "error", text: `Create user failed: ${errMsg}` });
                setCreating(false);
                return;
            }
            setMessage({ type: "success", text: `User ${json.firstName || json.email} created.` });
            setForm({ firstName: "", lastName: "", email: "", password: "", role: "Staff" });
            await fetchUsers();
        } catch (err) {
            console.error("createUser error:", err);
            setMessage({ type: "error", text: "Network error creating user." });
        } finally {
            setCreating(false);
        }
    }

    async function deleteUser(id) {
        if (!window.confirm("Delete user? This cannot be undone.")) return;
        setMessage(null);
        try {
            const res = await fetch(`${API_BASE}/api/users/${id}`, {
                method: "DELETE",
                headers: { "Content-Type": "application/json", ...authHeader() },
            });
            if (!res.ok) {
                const json = await res.json().catch(() => ({}));
                throw new Error(json && json.msg ? json.msg : `Status ${res.status}`);
            }
            setMessage({ type: "success", text: "User deleted." });
            fetchUsers();
        } catch (err) {
            console.error("deleteUser error:", err);
            setMessage({ type: "error", text: `Failed to delete user: ${err.message || err}` });
        }
    }

    function startEdit(u) {
        setEditingId(u._id);
        setEditRole(u.role || "Staff");
    }

    async function saveEdit(id) {
        setMessage(null);
        try {
            const res = await fetch(`${API_BASE}/api/users/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json", ...authHeader() },
                body: JSON.stringify({ role: editRole }),
            });
            const json = await res.json();
            if (!res.ok) {
                throw new Error(json && json.msg ? json.msg : `Status ${res.status}`);
            }
            setMessage({ type: "success", text: "User updated." });
            setEditingId(null);
            setEditRole("");
            fetchUsers();
        } catch (err) {
            console.error("saveEdit error:", err);
            setMessage({ type: "error", text: `Failed to update user: ${err.message || err}` });
        }
    }

    // helper to get current user id (some contexts provide id or _id)
    const currentUserId = user?.id || user?._id || null;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold text-gray-800">User Management</h1>
                <div className="flex items-center gap-3">
                    <button onClick={fetchUsers} className="flex items-center gap-2 text-indigo-600">
                        <RefreshCw className="w-4 h-4" /> Refresh
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-12 gap-6">
                {/* Left: Create/Hire user */}
                <div className="col-span-4 bg-white p-5 rounded shadow">
                    <h2 className="font-semibold mb-3 flex items-center gap-2"><UserPlus className="w-5 h-5" /> Hire / Create User</h2>

                    {message && message.type === "error" && <div className="text-red-600 mb-3">{message.text}</div>}
                    {message && message.type === "success" && <div className="text-green-600 mb-3">{message.text}</div>}

                    <form onSubmit={createUser} className="space-y-3">
                        <div>
                            <input className="w-full border rounded px-3 py-2" placeholder="First name" value={form.firstName} onChange={e => updateForm('firstName', e.target.value)} />
                        </div>
                        <div>
                            <input className="w-full border rounded px-3 py-2" placeholder="Last name" value={form.lastName} onChange={e => updateForm('lastName', e.target.value)} />
                        </div>
                        <div>
                            <input className="w-full border rounded px-3 py-2" placeholder="Email" type="email" value={form.email} onChange={e => updateForm('email', e.target.value)} />
                        </div>
                        <div>
                            <input className="w-full border rounded px-3 py-2" placeholder="Temporary password" type="password" value={form.password} onChange={e => updateForm('password', e.target.value)} />
                        </div>
                        <div>
                            <select className="w-full border rounded px-3 py-2" value={form.role} onChange={e => updateForm('role', e.target.value)}>
                                <option>Staff</option>
                                <option>Doctor</option>
                                <option>Nurse</option>
                                <option>Admin</option>
                                <option>PathLab</option>
                                <option>Patient</option>
                            </select>
                        </div>

                        <div className="flex items-center gap-3">
                            <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded flex items-center gap-2">
                                {creating ? <Loader className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />} Create
                            </button>
                            <button type="button" className="text-sm text-gray-600" onClick={() => setForm({ firstName: "", lastName: "", email: "", password: "", role: "Staff" })}>Reset</button>
                        </div>
                    </form>
                </div>

                {/* Right: Users list */}
                <div className="col-span-8">
                    <div className="bg-white p-4 rounded shadow">
                        <div className="flex items-center gap-3 mb-4 justify-between">
                            <div className="flex items-center gap-3">
                                {ROLE_TABS.map(r => (
                                    <button
                                        key={r}
                                        onClick={() => setFilterRole(r)}
                                        className={`px-3 py-1 rounded ${filterRole === r ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700'}`}
                                    >
                                        {r}
                                    </button>
                                ))}
                            </div>

                            <div className="flex items-center gap-2">
                                <div className="relative">
                                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                                    <input
                                        value={searchText}
                                        onChange={e => setSearchText(e.target.value)}
                                        placeholder="Search name or email..."
                                        className="pl-10 pr-3 py-2 border rounded-md w-72"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="min-w-full">
                                <thead className="text-left text-sm text-gray-600 border-b">
                                    <tr>
                                        <th className="py-3">Name</th>
                                        <th className="py-3">Email</th>
                                        <th className="py-3">Role</th>
                                        <th className="py-3">Created</th>
                                        <th className="py-3">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading && (
                                        <tr><td colSpan="5" className="py-6 text-center text-indigo-600"><Loader className="w-6 h-6 animate-spin inline-block" /></td></tr>
                                    )}

                                    {!loading && filtered.length === 0 && (
                                        <tr><td colSpan="5" className="py-6 text-center text-gray-400">No users found for this role / search.</td></tr>
                                    )}

                                    {!loading && filtered.map(u => (
                                        <tr key={u._id} className="border-t">
                                            <td className="py-3">{u.firstName} {u.lastName || ''}</td>
                                            <td className="py-3">{u.email}</td>
                                            <td className="py-3">
                                                {editingId === u._id ? (
                                                    <select value={editRole} onChange={e => setEditRole(e.target.value)} className="border rounded px-2 py-1">
                                                        <option>Admin</option>
                                                        <option>Doctor</option>
                                                        <option>Staff</option>
                                                        <option>Nurse</option>
                                                        <option>PathLab</option>
                                                        <option>Patient</option>
                                                    </select>
                                                ) : (
                                                    <span className="inline-block px-2 py-1 bg-gray-100 rounded text-sm">{u.role}</span>
                                                )}
                                            </td>
                                            <td className="py-3">{u.createdAt ? new Date(u.createdAt).toLocaleString() : "—"}</td>
                                            <td className="py-3">
                                                {editingId === u._id ? (
                                                    <div className="flex items-center gap-2">
                                                        <button onClick={() => saveEdit(u._id)} className="text-green-600 flex items-center gap-1"><Check className="w-4 h-4" /> Save</button>
                                                        <button onClick={() => { setEditingId(null); setEditRole(""); }} className="text-gray-600">Cancel</button>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-3">
                                                        <button onClick={() => startEdit(u)} className="text-indigo-600 flex items-center gap-1"><Edit className="w-4 h-4" /> Edit</button>

                                                        {String(u._id) !== String(currentUserId) && (
                                                            <button onClick={() => deleteUser(u._id)} className="text-red-600 flex items-center gap-1"><Trash2 className="w-4 h-4" /> Delete</button>
                                                        )}
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
};

export default UsersPage;