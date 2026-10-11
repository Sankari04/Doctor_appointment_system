import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { Calendar, CheckCircle2, History, AlertCircle, ArrowRight, User, Pill, Activity, Check, X } from 'lucide-react';

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

const PatientDashboard = () => {
  const { user, api } = useContext(AuthContext);
  const [stats, setStats] = useState({ upcomingAppointments: 0, totalAppointments: 0 });
  const [recentAppointments, setRecentAppointments] = useState([]);
  const [todayMeds, setTodayMeds] = useState([]);
  const [medStats, setMedStats] = useState({ total: 0, taken: 0, missed: 0, adherence: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [dashRes, medsRes] = await Promise.all([
        api.get('/patients/dashboard'),
        api.get('/medications/today').catch(() => ({ data: { logs: [], stats: { totalToday: 0, takenCount: 0, missedCount: 0, remainingCount: 0 } } }))
      ]);
      setStats(dashRes.data.stats);
      setRecentAppointments(dashRes.data.recentAppointments);
      
      const logs = medsRes.data.logs || [];
      const mStats = medsRes.data.stats || { totalToday: 0, takenCount: 0, missedCount: 0, remainingCount: 0 };
      const adhRate = mStats.totalToday > 0 ? Math.round((mStats.takenCount / mStats.totalToday) * 100) : 100;
      
      setMedStats({
        total: mStats.totalToday,
        taken: mStats.takenCount,
        missed: mStats.missedCount,
        adherence: adhRate
      });
      setTodayMeds(logs);
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
      setError('Could not retrieve dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleTrackMed = async (log_id, status) => {
    try {
      await api.post('/medications/track', { log_id, status });
      fetchDashboardData();
    } catch (err) {
      console.error('Error tracking medication:', err);
      alert('Could not update medication status.');
    }
  };

  const handleCancelAppointment = async (appId) => {
    if (!window.confirm('Are you sure you want to cancel this appointment?')) return;
    try {
      await api.post(`/patients/appointments/${appId}/cancel`);
      alert('Appointment cancelled successfully.');
      fetchDashboardData(); // Refresh stats and list
    } catch (err) {
      console.error('Error cancelling appointment:', err);
      alert(err.response?.data?.message || 'Failed to cancel appointment.');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-white border border-slate-200 shadow-sm p-8 sm:p-12">
        <div className="absolute inset-y-0 right-0 w-1/3 bg-gradient-to-l from-indigo-50 via-sky-50 to-transparent"></div>
        <div className="relative z-10 space-y-4 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold border border-indigo-100">
            <User size={14} /> Welcome back
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900">
            Hello, {user?.name}!
          </h1>
          <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
            Manage your schedule, track your daily medication doses, and stay on top of your health journey.
          </p>
          <div className="pt-2 flex flex-wrap gap-3">
            <Link to="/patient/search" className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 text-white px-5 py-3 text-sm font-semibold shadow-sm hover:bg-indigo-500 transition-colors">
              Book New Appointment <ArrowRight size={16} />
            </Link>
            <Link to="/patient/tracker" className="inline-flex items-center gap-2 rounded-xl bg-violet-50 text-violet-700 border border-violet-200 px-5 py-3 text-sm font-semibold hover:bg-violet-100 transition-colors">
              <Pill size={16} /> Medication Tracker
            </Link>
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl text-sm">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Stats Section */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Upcoming Bookings</span>
            <span className="block text-3xl font-extrabold text-slate-900">{stats.upcomingAppointments}</span>
          </div>
          <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl text-indigo-600">
            <Calendar size={24} />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Total Appointments</span>
            <span className="block text-3xl font-extrabold text-slate-900">{stats.totalAppointments}</span>
          </div>
          <div className="p-4 bg-sky-50 border border-sky-100 rounded-2xl text-sky-600">
            <History size={24} />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Today's Adherence</span>
            <span className="block text-3xl font-extrabold text-violet-700">{medStats.adherence}%</span>
          </div>
          <div className="p-4 bg-violet-50 border border-violet-100 rounded-2xl text-violet-600">
            <Activity size={24} />
          </div>
        </div>
      </div>

      {/* Today's Medications Checklist Widget */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Pill className="text-violet-600" /> Today's Medication Checklist
            </h2>
            <p className="text-xs text-slate-500 mt-1">Track doses taken today and log adherence</p>
          </div>
          <Link to="/patient/tracker" className="text-sm font-semibold text-violet-600 hover:text-violet-500 transition-colors flex items-center gap-1">
            Full Tracker <ArrowRight size={14} />
          </Link>
        </div>

        {/* Adherence Progress Bar */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
          <div className="flex justify-between text-xs font-bold">
            <span className="text-slate-700">Daily Progress ({medStats.taken} of {medStats.total} Doses Taken)</span>
            <span className="text-violet-700">{medStats.adherence}%</span>
          </div>
          <div className="w-full bg-slate-200 h-3 rounded-full overflow-hidden">
            <div
              className="bg-violet-600 h-full rounded-full transition-all duration-500"
              style={{ width: `${medStats.adherence}%` }}
            ></div>
          </div>
        </div>

        {todayMeds.length === 0 ? (
          <div className="text-center py-8 bg-slate-50 rounded-2xl border border-slate-200">
            <p className="text-slate-600 text-sm">No active medications scheduled for today.</p>
            <Link to="/patient/medications" className="mt-2 text-xs font-bold text-violet-600 hover:text-violet-500 underline block">
              Manage medication schedules
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {todayMeds.map((med) => (
              <div
                key={med.log_id}
                className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200 gap-4"
              >
                <div className="space-y-1">
                  <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
                    <Pill size={16} className="text-violet-600" /> {med.medicine_name}
                  </h4>
                  <p className="text-xs text-slate-500">Dosage: {med.dosage} | Time: {med.scheduled_time}</p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleTrackMed(med.log_id, med.tracking_status === 'taken' ? 'pending' : 'taken')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
                      med.tracking_status === 'taken'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-white border border-slate-300 text-slate-700 hover:bg-emerald-50 hover:text-emerald-700'
                    }`}
                  >
                    <Check size={14} /> {med.tracking_status === 'taken' ? 'Taken' : 'Mark Taken'}
                  </button>
                  <button
                    onClick={() => handleTrackMed(med.log_id, med.tracking_status === 'missed' ? 'pending' : 'missed')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
                      med.tracking_status === 'missed'
                        ? 'bg-rose-600 text-white shadow-sm'
                        : 'bg-white border border-slate-300 text-slate-700 hover:bg-rose-50 hover:text-rose-700'
                    }`}
                  >
                    <X size={14} /> {med.tracking_status === 'missed' ? 'Missed' : 'Mark Missed'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Appointments */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <CheckCircle2 className="text-indigo-600" /> Recent Appointments
          </h2>
          <Link to="/patient/appointments" className="text-sm font-semibold text-indigo-600 hover:text-indigo-500 transition-colors flex items-center gap-1">
            View All <ArrowRight size={14} />
          </Link>
        </div>

        {recentAppointments.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 rounded-2xl border border-slate-200">
            <p className="text-slate-600 text-sm">No recent appointments found.</p>
            <Link to="/patient/search" className="mt-4 text-xs font-bold text-indigo-600 hover:text-indigo-500 underline block">
              Search doctors to make your first booking
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {recentAppointments.map((app) => (
              <div
                key={app.id}
                className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-5 bg-slate-50 hover:bg-white rounded-2xl border border-slate-200 transition-colors gap-4"
              >
                <div className="space-y-1.5">
                  <h3 className="font-bold text-slate-900">{app.doctor_name}</h3>
                  <span className="inline-block text-xs bg-white text-slate-700 px-2.5 py-0.5 rounded-full border border-slate-200">
                    {app.specialization_name}
                  </span>
                  <div className="text-xs text-slate-600 pt-1">
                    <span>Date: {formatDisplayDate(app.date)}</span>
                    <span className="mx-2">|</span>
                    <span>{app.session_type} session · Token #{app.queue_number || '—'}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                  <span
                    className={`text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wider ${
                      app.status === 'booked' || app.status === 'confirmed'
                        ? 'bg-indigo-50 border border-indigo-200 text-indigo-700'
                        : app.status === 'cancelled'
                        ? 'bg-rose-50 border border-rose-200 text-rose-700'
                        : 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                    }`}
                  >
                    {app.status}
                  </span>

                  {['booked', 'confirmed'].includes(app.status) && (
                    <button
                      onClick={() => handleCancelAppointment(app.id)}
                      className="px-3 py-1.5 bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 rounded-lg text-xs font-bold transition-all duration-200"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PatientDashboard;

