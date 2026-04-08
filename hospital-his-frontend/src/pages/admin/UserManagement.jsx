import React, { useState, useEffect } from 'react';
import {
    getUsers,
    deactivateUser,
    reactivateUser,
    resetPassword,
    unlockUser
} from '../../services/admin.service';
import './AdminPages.css';

/**
 * User Management Page
 * Admin-only user CRUD and lifecycle management
 * 
 * Features:
 * - View all users
 * - Create new users
 * - Change roles
 * - Deactivate/Reactivate
 * - Reset passwords
 * - Unlock accounts
 */

const UserManagement = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filter, setFilter] = useState({ role: '', status: '' });

    useEffect(() => {
        loadUsers();
    }, [filter]);

    const loadUsers = async () => {
        try {
            setLoading(true);
            const response = await getUsers(filter);
            setUsers(response.data || []);
            setError(null);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to load users');
        } finally {
            setLoading(false);
        }
    };

    const handleDeactivate = async (userId) => {
        if (!window.confirm('Are you sure you want to deactivate this user?')) return;
        try {
            await deactivateUser(userId, 'Admin action');
            loadUsers();
        } catch (err) {
            alert(err.response?.data?.error || 'Failed to deactivate user');
        }
    };

    const handleReactivate = async (userId) => {
        try {
            await reactivateUser(userId);
            loadUsers();
        } catch (err) {
            alert(err.response?.data?.error || 'Failed to reactivate user');
        }
    };

    const handleResetPassword = async (userId) => {
        if (!window.confirm('Reset password for this user?')) return;
        try {
            const response = await resetPassword(userId);
            alert(`Temporary password: ${response.data?.temporaryPassword}`);
        } catch (err) {
            alert(err.response?.data?.error || 'Failed to reset password');
        }
    };

    const handleUnlock = async (userId) => {
        try {
            await unlockUser(userId);
            loadUsers();
        } catch (err) {
            alert(err.response?.data?.error || 'Failed to unlock user');
        }
    };

    const getRoleBadgeClass = (role) => {
        const classes = {
            admin: 'badge-purple',
            doctor: 'badge-blue',
            nurse: 'badge-green',
            receptionist: 'badge-yellow',
            pharmacist: 'badge-pink',
            lab_tech: 'badge-cyan',
            billing: 'badge-orange',
        };
        return classes[role] || 'badge-gray';
    };

    return (
        <div className="admin-page">
            <div className="page-header">
                <h1>👤 User Management</h1>
                <button className="btn-primary">+ Create User</button>
            </div>

            <div className="filters-bar">
                <select
                    value={filter.role}
                    onChange={(e) => setFilter({ ...filter, role: e.target.value })}
                >
                    <option value="">All Roles</option>
                    <option value="admin">Admin</option>
                    <option value="doctor">Doctor</option>
                    <option value="nurse">Nurse</option>
                    <option value="receptionist">Receptionist</option>
                    <option value="pharmacist">Pharmacist</option>
                    <option value="lab_tech">Lab Tech</option>
                    <option value="billing">Billing</option>
                </select>
                <select
                    value={filter.status}
                    onChange={(e) => setFilter({ ...filter, status: e.target.value })}
                >
                    <option value="">All Status</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="locked">Locked</option>
                </select>
                <button className="btn-secondary" onClick={loadUsers}>
                    🔄 Refresh
                </button>
            </div>

            {error && <div className="error-banner">{error}</div>}

            <div className="data-table-container">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Username</th>
                            <th>Name</th>
                            <th>Role</th>
                            <th>Department</th>
                            <th>Status</th>
                            <th>Last Login</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan="7" className="loading-cell">Loading...</td>
                            </tr>
                        ) : users.length === 0 ? (
                            <tr>
                                <td colSpan="7" className="empty-cell">No users found</td>
                            </tr>
                        ) : (
                            users.map((user) => (
                                <tr key={user._id}>
                                    <td className="user-cell">
                                        <span className="user-avatar">
                                            {user.profile?.firstName?.[0] || user.username[0]}
                                        </span>
                                        <span>{user.username}</span>
                                    </td>
                                    <td>
                                        {user.profile?.firstName} {user.profile?.lastName}
                                    </td>
                                    <td>
                                        <span className={`badge ${getRoleBadgeClass(user.role)}`}>
                                            {user.role}
                                        </span>
                                    </td>
                                    <td>{user.department?.name || '-'}</td>
                                    <td>
                                        <span className={`status-dot ${user.isActive ? 'active' : 'inactive'}`}></span>
                                        {user.accountStatus || (user.isActive ? 'Active' : 'Inactive')}
                                    </td>
                                    <td>
                                        {user.lastLogin
                                            ? new Date(user.lastLogin).toLocaleDateString()
                                            : 'Never'
                                        }
                                    </td>
                                    <td className="actions-cell">
                                        <button
                                            className="btn-icon"
                                            title="View Details"
                                        >
                                            👁️
                                        </button>
                                        {user.isActive ? (
                                            <button
                                                className="btn-icon danger"
                                                title="Deactivate"
                                                onClick={() => handleDeactivate(user._id)}
                                            >
                                                🚫
                                            </button>
                                        ) : (
                                            <button
                                                className="btn-icon success"
                                                title="Reactivate"
                                                onClick={() => handleReactivate(user._id)}
                                            >
                                                ✓
                                            </button>
                                        )}
                                        <button
                                            className="btn-icon"
                                            title="Reset Password"
                                            onClick={() => handleResetPassword(user._id)}
                                        >
                                            🔑
                                        </button>
                                        {user.accountStatus === 'locked' && (
                                            <button
                                                className="btn-icon"
                                                title="Unlock"
                                                onClick={() => handleUnlock(user._id)}
                                            >
                                                🔓
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default UserManagement;
