import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { Calendar, UserCheck, AlertTriangle, ArrowRight, ClipboardList, Users } from 'lucide-react';

const formatDisplayDate = (dateInput) => {
  if (!dateInput) return 'N/A';
  let date;
  if (dateInput instanceof Date) date = dateInput;
  else {
    date = new Date(dateInput);
    if (isNaN(date)) {
      date = new Date(String(dateInput).replace(' ', 'T'));
    }
    if (isNaN(date) && /^\d{4}-\d{2}-\d{2}$/.test(String(dateInput))) {
      date = new Date(String(dateInput) + 'T00:00:00');
    }
  }
  if (isNaN(date)) return 'Invalid date';
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const DoctorDashboard = () => {
  const { user, api } = useContext(AuthContext);
  const [stats, setStats] = useState({ todaysAppointments: 0, upcomingAppointments: 0, totalSlots: 0 });
  const [recentAppointments, setRecentAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const response = await api.get('/doctors/dashboard');
        setStats(response.data.stats);
        setRecentAppointments(response.data.recentAppointments);
      } catch (err) {
        console.error('Error fetching doctor dashboard:', err);
        setError('Could not retrieve dashboard statistics.');
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="w-12 h-12 border-4 border-accent-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Verification Alert Banner */}
      {!user?.isVerified && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 text-amber-800 p-5 rounded-2xl">
          <AlertTriangle className="h-5 w-5 flex-shrink-0 text-amber-500 animate-bounce" />
          <div className="space-y-1">
            <h4 className="font-extrabold text-sm text-amber-900">Account Pending Verification</h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Your profile is currently under review by the administrator. Once verified, patients will be able to discover you in search results and schedule appointments with you.
            </p>
          </div>
        </div>
      )}

      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-white border border-slate-200 shadow-sm p-8 sm:p-12">
        <div className="absolute inset-y-0 right-0 w-1/3 bg-gradient-to-l from-indigo-50 via-sky-50 to-transparent"></div>
        <div className="relative z-10 space-y-4 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold border border-indigo-100">
            <UserCheck size={14} /> Medical Portal
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900">
            Welcome, {user?.name}!
          </h1>
          <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
            Review your patient schedules, manage available calendar slots, and update your doctor profile credentials.
          </p>
          <div className="pt-2 flex flex-col sm:flex-row gap-3">
            <Link to="/doctor/slots" className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 text-white px-5 py-3 text-sm font-semibold shadow-sm hover:bg-indigo-500 transition-colors">
              Manage Time Slots <ArrowRight size={16} />
            </Link>
            <Link to="/doctor/profile" className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 px-5 py-3 text-sm font-semibold hover:border-slate-300 hover:bg-slate-50 transition-colors">
              Update Profile Info
            </Link>
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl text-sm">
          <span>{error}</span>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Appointments Today</span>
            <span className="block text-3xl font-extrabold text-slate-900">{stats.todaysAppointments}</span>
          </div>
          <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl text-indigo-600">
            <ClipboardList size={24} />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Upcoming Bookings</span>
            <span className="block text-3xl font-extrabold text-slate-900">{stats.upcomingAppointments}</span>
          </div>
          <div className="p-4 bg-sky-50 border border-sky-100 rounded-2xl text-sky-600">
            <Calendar size={24} />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Total Slots Created</span>
            <span className="block text-3xl font-extrabold text-slate-900">{stats.totalSlots}</span>
          </div>
          <div className="p-4 bg-slate-100 border border-slate-200 rounded-2xl text-slate-700">
            <Users size={24} />
          </div>
        </div>
      </div>

      {/* Upcoming Consultations */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            Upcoming Booked Appointments
          </h2>
          <Link to="/doctor/appointments" className="text-sm font-semibold text-indigo-600 hover:text-indigo-500 transition-colors flex items-center gap-1">
            View All <ArrowRight size={14} />
          </Link>
        </div>

        {recentAppointments.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 rounded-2xl border border-slate-200">
            <p className="text-slate-600 text-sm">No upcoming appointments booked.</p>
            <Link to="/doctor/slots" className="mt-4 text-xs font-bold text-indigo-600 hover:text-indigo-500 underline block">
              Ensure you have added available slots for patients to book
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {recentAppointments.map((app) => (
              <div
                key={app.appointment_id}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-5 bg-slate-50 hover:bg-white rounded-2xl border border-slate-200 transition-all gap-4"
              >
                <div className="space-y-1">
                  <h3 className="font-extrabold text-slate-900">{app.patient_name}</h3>
                  <p className="text-xs text-slate-600 flex items-center gap-1">
                    <span>Contact: {app.patient_phone}</span>
                  </p>
                  <div className="text-xs text-slate-500 pt-1">
                    <span>Date: {formatDisplayDate(app.date)}</span>
                    <span className="mx-2">|</span>
                    <span>Time: {app.start_time.substring(0, 5)} - {app.end_time.substring(0, 5)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold px-3 py-1 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-full uppercase tracking-wider">
                    {app.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DoctorDashboard;


