import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { Clock, Users, Calendar, Stethoscope, RefreshCw, AlertCircle, CheckCircle2, UserCheck, Play, Sun, Moon } from 'lucide-react';
import { Link } from 'react-router-dom';

const formatDisplayDate = (dateInput) => {
  if (!dateInput) return 'N/A';
  let date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (isNaN(date)) date = new Date(String(dateInput).replace(' ', 'T'));
  if (isNaN(date)) return 'N/A';
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const PatientQueue = () => {
  const { api } = useContext(AuthContext);
  const [activeQueue, setActiveQueue] = useState(null);
  const [queueHistory, setQueueHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const fetchQueueData = async (isManual = false) => {
    try {
      if (isManual) setRefreshing(true);
      setError('');
      const response = await api.get('/queue/patient');
      setActiveQueue(response.data.activeQueue);
      setQueueHistory(response.data.queueHistory || []);
    } catch (err) {
      console.error('Error fetching queue status:', err);
      setError('Could not retrieve live queue status.');
    } finally {
      setLoading(false);
      if (isManual) setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchQueueData();
    const interval = setInterval(() => {
      fetchQueueData();
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Consulting':
        return <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider animate-pulse flex items-center gap-1"><Play size={12} /> In Consultation</span>;
      case 'Waiting':
        return <span className="bg-amber-100 text-amber-800 border border-amber-300 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1"><Clock size={12} /> Waiting</span>;
      case 'Completed':
        return <span className="bg-blue-100 text-blue-800 border border-blue-300 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1"><CheckCircle2 size={12} /> Completed</span>;
      case 'Cancelled':
        return <span className="bg-rose-100 text-rose-800 border border-rose-300 px-3 py-1 rounded-full text-xs font-bold uppercase">Cancelled</span>;
      default:
        return <span className="bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-xs font-bold uppercase">{status}</span>;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="w-12 h-12 border-4 border-violet-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900">Live Session Queue Status</h1>
          <p className="text-sm text-slate-600 mt-1">Real-time session token tracking (Morning vs Evening)</p>
        </div>
        <button
          onClick={() => fetchQueueData(true)}
          disabled={refreshing}
          className="p-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl font-semibold text-xs flex items-center gap-2 transition-all shadow-sm"
        >
          <RefreshCw size={16} className={refreshing ? 'animate-spin text-violet-600' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl text-sm">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Active Queue Ticket Card */}
      {activeQueue ? (
        <div className="glass-card p-6 sm:p-8 space-y-6 border-2 border-violet-200 shadow-xl bg-gradient-to-br from-white via-violet-50/20 to-slate-50">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-6">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-widest text-violet-600">Active Session Ticket</span>
                <span className={`inline-flex items-center gap-1 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full ${activeQueue.session_type === 'Morning' ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-indigo-100 text-indigo-800 border border-indigo-300'}`}>
                  {activeQueue.session_type === 'Morning' ? <Sun size={12} /> : <Moon size={12} />}
                  {activeQueue.session_type} Session
                </span>
              </div>
              <h2 className="text-2xl font-extrabold text-slate-900 mt-1">{activeQueue.doctor_name}</h2>
              <span className="text-xs text-slate-500 font-semibold">{activeQueue.specialization_name} Specialist</span>
            </div>
            <div>{getStatusBadge(activeQueue.queue_status)}</div>
          </div>

          {/* Queue Ticket Number Display */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-6 py-2">
            <div className="p-5 bg-white border border-slate-200 rounded-2xl text-center space-y-1 shadow-sm">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{activeQueue.session_type} Token #</span>
              <span className="block text-4xl font-black text-violet-600 tracking-tight">{activeQueue.queue_number}</span>
            </div>

            <div className="p-5 bg-white border border-slate-200 rounded-2xl text-center space-y-1 shadow-sm">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Now Consulting</span>
              <span className="block text-4xl font-black text-emerald-600 tracking-tight">
                {activeQueue.currentConsultingQueueNumber || 'None'}
              </span>
            </div>

            <div className="p-5 bg-white border border-slate-200 rounded-2xl text-center space-y-1 shadow-sm">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Patients Ahead ({activeQueue.session_type})</span>
              <span className="block text-4xl font-black text-amber-600 tracking-tight">{activeQueue.patientsAhead}</span>
            </div>

            <div className="p-5 bg-white border border-slate-200 rounded-2xl text-center space-y-1 shadow-sm">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Est. Wait Time</span>
              <span className="block text-3xl font-extrabold text-slate-900 pt-1">
                {activeQueue.estimatedWaitTimeMins > 0 ? `~${activeQueue.estimatedWaitTimeMins} mins` : (activeQueue.queue_status === 'Consulting' ? 'Your Turn!' : '0 mins')}
              </span>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center text-xs text-slate-600 gap-2">
            <div className="flex items-center gap-4">
              <span>Date: <strong className="text-slate-900">{formatDisplayDate(activeQueue.date)}</strong></span>
              <span>Session Time: <strong className="text-slate-900">{activeQueue.start_time?.substring(0, 5)} - {activeQueue.end_time?.substring(0, 5)}</strong></span>
            </div>
            <span className="text-violet-600 italic">Queue updates live automatically every 10s</span>
          </div>
        </div>
      ) : (
        <div className="text-center py-16 bg-slate-50 border border-slate-200 rounded-3xl space-y-4">
          <Stethoscope className="mx-auto h-12 w-12 text-slate-400" />
          <h3 className="text-lg font-bold text-slate-900">No Active Queue Ticket</h3>
          <p className="text-slate-600 text-sm max-w-sm mx-auto">
            You don't have any active session queue tickets. Book an appointment to get your session token.
          </p>
          <div>
            <Link to="/patient/search" className="btn-primary inline-flex text-xs">
              Book Appointment Now
            </Link>
          </div>
        </div>
      )}

      {/* Queue History */}
      {queueHistory.length > 0 && (
        <div className="space-y-4 pt-4">
          <h2 className="text-xl font-bold text-slate-900 border-b border-slate-200 pb-2">Session Ticket History</h2>
          <div className="glass-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-xs">
                    <th className="p-4">Session Token</th>
                    <th className="p-4">Session</th>
                    <th className="p-4">Doctor</th>
                    <th className="p-4">Date & Time</th>
                    <th className="p-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {queueHistory.map(item => (
                    <tr key={item.queue_id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4 font-black text-violet-600 text-base">{item.queue_number}</td>
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full ${item.session_type === 'Morning' ? 'bg-amber-100 text-amber-800' : 'bg-indigo-100 text-indigo-800'}`}>
                          {item.session_type === 'Morning' ? <Sun size={12} /> : <Moon size={12} />}
                          {item.session_type}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="font-bold text-slate-900">{item.doctor_name}</div>
                        <div className="text-xs text-slate-500">{item.specialization_name}</div>
                      </td>
                      <td className="p-4 text-slate-600">
                        <div>{formatDisplayDate(item.date)}</div>
                        <div className="text-xs text-slate-400">{item.start_time?.substring(0, 5)} - {item.end_time?.substring(0, 5)}</div>
                      </td>
                      <td className="p-4">{getStatusBadge(item.queue_status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientQueue;
