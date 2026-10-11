import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { Play, CheckCircle2, Clock, XCircle, Users, RefreshCw, AlertCircle, Calendar, ArrowRight, UserCheck, Sun, Moon } from 'lucide-react';

const formatDisplayDate = (dateInput) => {
  if (!dateInput) return 'N/A';
  let date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (isNaN(date)) date = new Date(String(dateInput).replace(' ', 'T'));
  if (isNaN(date)) return 'N/A';
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const DoctorQueue = () => {
  const { api } = useContext(AuthContext);

  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [activeSessionTab, setActiveSessionTab] = useState('Morning');
  const [queueData, setQueueData] = useState({
    morningQueue: [],
    eveningQueue: [],
    stats: {
      morning: { currentlyConsulting: null, waitingCount: 0, completedCount: 0, cancelledCount: 0, totalCount: 0 },
      evening: { currentlyConsulting: null, waitingCount: 0, completedCount: 0, cancelledCount: 0, totalCount: 0 },
      totalCount: 0
    }
  });
  const [loading, setLoading] = useState(true);
  const [callingNext, setCallingNext] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchDoctorQueue = async (selectedDate = date) => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get(`/queue/doctor?date=${selectedDate}`);
      setQueueData(response.data);
    } catch (err) {
      console.error('Error fetching doctor queue:', err);
      setError('Could not load queue schedule.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDoctorQueue(date);
    const interval = setInterval(() => {
      fetchDoctorQueue(date);
    }, 15000);
    return () => clearInterval(interval);
  }, [date]);

  const handleCallNext = async (sessionType) => {
    setCallingNext(true);
    setError('');
    setSuccess('');
    try {
      const response = await api.post('/queue/doctor/call-next', { date, session_type: sessionType });
      setSuccess(response.data.message);
      fetchDoctorQueue(date);
    } catch (err) {
      console.error('Error calling next patient:', err);
      setError(err.response?.data?.message || 'Failed to call next patient.');
    } finally {
      setCallingNext(false);
    }
  };

  const handleUpdateStatus = async (queueId, newStatus) => {
    setError('');
    setSuccess('');
    try {
      await api.put(`/queue/doctor/status/${queueId}`, { status: newStatus });
      setSuccess(`Status updated to ${newStatus}`);
      fetchDoctorQueue(date);
    } catch (err) {
      console.error('Error updating queue status:', err);
      setError(err.response?.data?.message || 'Failed to update queue status.');
    }
  };

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

  const currentSessionList = activeSessionTab === 'Morning' ? queueData.morningQueue : queueData.eveningQueue;
  const currentSessionStats = activeSessionTab === 'Morning' ? queueData.stats.morning : queueData.stats.evening;
  const currentlyConsulting = currentSessionStats?.currentlyConsulting || null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900">Session Queue Dashboard</h1>
          <p className="text-sm text-slate-600 mt-1">Manage separate Morning & Evening session queues</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm">
            <Calendar size={14} className="text-slate-500" />
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="bg-transparent outline-none font-bold text-slate-900"
            />
          </div>

          <button
            onClick={() => fetchDoctorQueue(date)}
            className="p-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl font-semibold text-xs flex items-center gap-2 transition-all shadow-sm"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl text-sm">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl text-sm">
          <CheckCircle2 size={18} />
          <span>{success}</span>
        </div>
      )}

      {/* Session Selection Tabs */}
      <div className="flex border-b border-slate-200 gap-4">
        <button
          onClick={() => setActiveSessionTab('Morning')}
          className={`pb-3 text-sm font-extrabold flex items-center gap-2 border-b-2 transition-all ${
            activeSessionTab === 'Morning'
              ? 'border-amber-500 text-amber-800'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Sun size={18} className="text-amber-500" />
          <span>Morning Session ({queueData.morningQueue?.length || 0} Patients)</span>
        </button>

        <button
          onClick={() => setActiveSessionTab('Evening')}
          className={`pb-3 text-sm font-extrabold flex items-center gap-2 border-b-2 transition-all ${
            activeSessionTab === 'Evening'
              ? 'border-indigo-500 text-indigo-800'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Moon size={18} className="text-indigo-500" />
          <span>Evening Session ({queueData.eveningQueue?.length || 0} Patients)</span>
        </button>
      </div>

      {/* Currently Consulting Banner & Actions */}
      <div className="glass-card p-6 sm:p-8 bg-gradient-to-r from-violet-500/10 via-white to-emerald-500/10 border-2 border-violet-200 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-2 text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start gap-2">
            <span className="text-xs font-bold uppercase tracking-widest text-violet-700 flex items-center gap-1">
              <UserCheck size={14} /> Active {activeSessionTab} Session Patient
            </span>
            <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${activeSessionTab === 'Morning' ? 'bg-amber-100 text-amber-800' : 'bg-indigo-100 text-indigo-800'}`}>
              {activeSessionTab === 'Morning' ? <Sun size={10} /> : <Moon size={10} />} {activeSessionTab} Queue
            </span>
          </div>

          {currentlyConsulting ? (
            <div>
              <div className="flex items-center justify-center md:justify-start gap-3">
                <span className="text-3xl font-black text-violet-700">{currentlyConsulting.queue_number}</span>
                <h2 className="text-2xl font-extrabold text-slate-900">{currentlyConsulting.patient_name}</h2>
              </div>
              <p className="text-xs text-slate-600 mt-1">
                Gender: {currentlyConsulting.patient_gender || 'N/A'} | Phone: {currentlyConsulting.patient_phone} | Session: {currentlyConsulting.session_type}
              </p>
            </div>
          ) : (
            <div>
              <h2 className="text-xl font-extrabold text-slate-700">No Patient Currently Consulting in {activeSessionTab} Session</h2>
              <p className="text-xs text-slate-500 mt-0.5">Click "Call Next {activeSessionTab} Patient" to advance token.</p>
            </div>
          )}
        </div>

        <div>
          <button
            onClick={() => handleCallNext(activeSessionTab)}
            disabled={callingNext || (currentSessionStats?.waitingCount || 0) === 0}
            className="btn-primary text-sm font-bold px-6 py-3.5 shadow-lg shadow-violet-500/20 disabled:opacity-50 flex items-center gap-2"
          >
            {callingNext ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <Play size={18} /> Call Next {activeSessionTab} Patient ({currentSessionStats?.waitingCount || 0} Waiting) <ArrowRight size={16} />
              </>
            )}
          </button>
        </div>
      </div>

      {/* Queue Stats Cards for Active Session */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
        <div className="glass-card p-5 flex items-center justify-between border-l-4 border-l-violet-500">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{activeSessionTab} Patients</span>
            <span className="block text-3xl font-black text-slate-900 mt-1">{currentSessionStats?.totalCount || 0}</span>
          </div>
          <div className="p-3 bg-violet-50 border border-violet-100 rounded-xl text-violet-600">
            <Users size={22} />
          </div>
        </div>

        <div className="glass-card p-5 flex items-center justify-between border-l-4 border-l-amber-500">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Waiting</span>
            <span className="block text-3xl font-black text-amber-600 mt-1">{currentSessionStats?.waitingCount || 0}</span>
          </div>
          <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl text-amber-600">
            <Clock size={22} />
          </div>
        </div>

        <div className="glass-card p-5 flex items-center justify-between border-l-4 border-l-emerald-500">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Consulting</span>
            <span className="block text-3xl font-black text-emerald-600 mt-1">{currentlyConsulting ? 1 : 0}</span>
          </div>
          <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-600">
            <Play size={22} />
          </div>
        </div>

        <div className="glass-card p-5 flex items-center justify-between border-l-4 border-l-blue-500">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Completed</span>
            <span className="block text-3xl font-black text-blue-600 mt-1">{currentSessionStats?.completedCount || 0}</span>
          </div>
          <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-blue-600">
            <CheckCircle2 size={22} />
          </div>
        </div>
      </div>

      {/* Queue List Table */}
      <div className="glass-card overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
          <h3 className="font-extrabold text-slate-900 text-sm">{activeSessionTab} Session Queue for {formatDisplayDate(date)}</h3>
          <span className="text-xs text-slate-500 font-semibold">{currentSessionList?.length || 0} Session Tickets</span>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="w-12 h-12 border-4 border-violet-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : !currentSessionList || currentSessionList.length === 0 ? (
          <div className="text-center py-16 text-slate-500 text-sm">
            No appointments scheduled for the {activeSessionTab} session on this date.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-white border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-xs">
                  <th className="p-4">Session Token</th>
                  <th className="p-4">Patient Name</th>
                  <th className="p-4">Contact Phone</th>
                  <th className="p-4">Session</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-center">Manage Token</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {currentSessionList.map(item => (
                  <tr key={item.queue_id} className={item.queue_status === 'Consulting' ? 'bg-emerald-50/60 font-semibold' : 'hover:bg-slate-50/50 transition-colors'}>
                    <td className="p-4 font-black text-violet-600 text-base">{item.queue_number}</td>
                    <td className="p-4">
                      <div className="font-bold text-slate-900">{item.patient_name}</div>
                      <div className="text-xs text-slate-500">Gender: {item.patient_gender || 'N/A'}</div>
                    </td>
                    <td className="p-4 text-slate-700">{item.patient_phone}</td>
                    <td className="p-4 text-slate-700">{item.session_type}</td>
                    <td className="p-4">{getStatusBadge(item.queue_status)}</td>
                    <td className="p-4 text-center">
                      <div className="flex justify-center items-center gap-2">
                        {item.queue_status === 'Consulting' && (
                          <button
                            onClick={() => handleUpdateStatus(item.queue_id, 'Waiting')}
                            className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1"
                            title="Return patient to waiting"
                          >
                            <Clock size={11} /> Waiting
                          </button>
                        )}
                        {item.queue_status === 'Waiting' && (
                          <button
                            onClick={() => handleUpdateStatus(item.queue_id, 'In Consultation')}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1"
                            title="Call this patient into consultation"
                          >
                            <Play size={11} /> Call
                          </button>
                        )}
                        {['Waiting', 'Consulting'].includes(item.queue_status) && (
                          <button
                            onClick={() => handleUpdateStatus(item.queue_id, 'Completed')}
                            className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1"
                            title="Mark consultation completed"
                          >
                            <CheckCircle2 size={11} /> Complete
                          </button>
                        )}
                        {['Waiting', 'Consulting'].includes(item.queue_status) && (
                          <button
                            onClick={() => handleUpdateStatus(item.queue_id, 'Cancelled')}
                            className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1"
                            title="Cancel queue ticket"
                          >
                            <XCircle size={11} /> Cancel
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default DoctorQueue;
