import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { Users, ClipboardList, ShieldAlert, Award, ArrowRight } from 'lucide-react';

const AdminDashboard = () => {
  const { api } = useContext(AuthContext);
  const [stats, setStats] = useState({ totalUsers: 0, totalDoctors: 0, pendingDoctors: 0, totalAppointments: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchAdminStats = async () => {
      try {
        setLoading(true);
        const response = await api.get('/admin/dashboard');
        setStats(response.data.stats);
      } catch (err) {
        console.error('Error fetching admin stats:', err);
        setError('Could not retrieve admin statistics.');
      } finally {
        setLoading(false);
      }
    };
    fetchAdminStats();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900">Administrator Dashboard</h1>
        <p className="text-sm text-slate-600 mt-1">Global platform metrics and doctor onboarding control center</p>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl text-sm">
          <span>{error}</span>
        </div>
      )}

      {/* Stats Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="glass-card p-6 flex items-center justify-between border-l-4 border-l-primary-500">
          <div className="space-y-1">
            <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Total Users</span>
            <span className="block text-3xl font-extrabold text-slate-900">{stats.totalUsers}</span>
          </div>
          <div className="p-4 bg-primary-50 border border-primary-100 rounded-2xl text-primary-600">
            <Users size={24} />
          </div>
        </div>

        <div className="glass-card p-6 flex items-center justify-between border-l-4 border-l-emerald-500">
          <div className="space-y-1">
            <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Total Doctors</span>
            <span className="block text-3xl font-extrabold text-slate-900">{stats.totalDoctors}</span>
          </div>
          <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl text-emerald-600">
            <Award size={24} />
          </div>
        </div>

        <div className="glass-card p-6 flex items-center justify-between border-l-4 border-l-amber-500">
          <div className="space-y-1">
            <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Pending Approvals</span>
            <span className="block text-3xl font-extrabold text-amber-600">{stats.pendingDoctors}</span>
          </div>
          <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl text-amber-600">
            <ShieldAlert size={24} />
          </div>
        </div>

        <div className="glass-card p-6 flex items-center justify-between border-l-4 border-l-indigo-500">
          <div className="space-y-1">
            <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Total Appointments</span>
            <span className="block text-3xl font-extrabold text-slate-900">{stats.totalAppointments}</span>
          </div>
          <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl text-indigo-600">
            <ClipboardList size={24} />
          </div>
        </div>
      </div>

      {/* Onboarding Alert Panel */}
      {stats.pendingDoctors > 0 ? (
        <div className="glass-card p-6 sm:p-8 bg-amber-50 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="space-y-2">
            <h3 className="text-lg font-bold text-amber-800 flex items-center gap-2">
              <ShieldAlert size={20} /> Action Required: Pending Doctor Verifications
            </h3>
            <p className="text-sm text-slate-700 max-w-2xl">
              There are {stats.pendingDoctors} doctor profile registrations waiting for approval. Unapproved doctors cannot configure availabilities or receive patient bookings.
            </p>
          </div>
          <Link to="/admin/verify" className="btn-accent inline-flex text-xs font-bold">
            Verify Doctor Requests <ArrowRight size={14} />
          </Link>
        </div>
      ) : (
        <div className="glass-card p-6 sm:p-8 text-center text-slate-600 text-sm">
          All doctor credentials have been processed. No registrations are currently pending.
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;


