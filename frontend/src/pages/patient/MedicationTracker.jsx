import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { CheckCircle2, XCircle, Clock, Calendar, Pill, AlertCircle, RefreshCw, Activity, Check, ShieldCheck, History } from 'lucide-react';
import { Link } from 'react-router-dom';

const formatDisplayDate = (dateInput) => {
  if (!dateInput) return 'N/A';
  let date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (isNaN(date)) date = new Date(String(dateInput).replace(' ', 'T'));
  if (isNaN(date)) return 'N/A';
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const MedicationTracker = () => {
  const { api } = useContext(AuthContext);

  const [todayData, setTodayData] = useState({ today: '', logs: [], stats: { totalToday: 0, takenCount: 0, missedCount: 0, remainingCount: 0 } });
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('today');

  const fetchTrackerData = async () => {
    try {
      setLoading(true);
      setError('');
      const todayRes = await api.get('/medications/today');
      setTodayData(todayRes.data);

      const historyRes = await api.get('/medications/history');
      setHistory(historyRes.data || []);
    } catch (err) {
      console.error('Error fetching tracker data:', err);
      setError('Could not load medication tracking schedule.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrackerData();
  }, []);

  const handleTrackStatus = async (logId, status) => {
    setError('');
    setSuccess('');
    try {
      await api.post('/medications/track', { log_id: logId, status });
      setSuccess(`Marked as ${status}`);
      fetchTrackerData();
    } catch (err) {
      console.error('Error tracking status:', err);
      setError('Failed to update status.');
    }
  };

  const { totalToday, takenCount, missedCount, remainingCount } = todayData.stats;
  const adherenceRate = totalToday > 0 ? Math.round((takenCount / totalToday) * 100) : 100;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900">Medication Tracker</h1>
          <p className="text-sm text-slate-600 mt-1">Daily dose checklist, reminder logs, and treatment adherence stats</p>
        </div>

        <div className="flex items-center gap-3">
          <Link to="/patient/medications" className="btn-secondary text-xs">
            Manage Medicines
          </Link>
          <button onClick={fetchTrackerData} className="p-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold shadow-sm flex items-center gap-1">
            <RefreshCw size={15} /> Refresh
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

      {/* Daily Progress Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
        <div className="glass-card p-5 border-l-4 border-l-violet-500 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Medicines Today</span>
            <span className="block text-3xl font-black text-slate-900 mt-1">{totalToday}</span>
          </div>
          <div className="p-3 bg-violet-50 text-violet-600 rounded-xl">
            <Pill size={22} />
          </div>
        </div>

        <div className="glass-card p-5 border-l-4 border-l-emerald-500 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Taken</span>
            <span className="block text-3xl font-black text-emerald-600 mt-1">{takenCount}</span>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <CheckCircle2 size={22} />
          </div>
        </div>

        <div className="glass-card p-5 border-l-4 border-l-rose-500 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Missed</span>
            <span className="block text-3xl font-black text-rose-600 mt-1">{missedCount}</span>
          </div>
          <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
            <XCircle size={22} />
          </div>
        </div>

        <div className="glass-card p-5 border-l-4 border-l-amber-500 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Remaining</span>
            <span className="block text-3xl font-black text-amber-600 mt-1">{remainingCount}</span>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <Clock size={22} />
          </div>
        </div>
      </div>

      {/* Adherence Progress Bar */}
      {totalToday > 0 && (
        <div className="glass-card p-6 space-y-2 border border-slate-200">
          <div className="flex justify-between items-center text-xs font-extrabold text-slate-700">
            <span>Today's Adherence Rate</span>
            <span className="text-violet-700">{adherenceRate}% Completed</span>
          </div>
          <div className="w-full bg-slate-200 h-3 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-violet-600 to-emerald-500 h-3 rounded-full transition-all duration-500"
              style={{ width: `${adherenceRate}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-6">
        <button
          onClick={() => setActiveTab('today')}
          className={`pb-3 text-sm font-extrabold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'today' ? 'border-violet-600 text-violet-700' : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Calendar size={16} /> Today's Medicines Checklist ({totalToday})
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`pb-3 text-sm font-extrabold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'history' ? 'border-violet-600 text-violet-700' : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <History size={16} /> Tracking History ({history.length})
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="w-12 h-12 border-4 border-violet-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : activeTab === 'today' ? (
        todayData.logs.length === 0 ? (
          <div className="text-center py-16 bg-slate-50 border border-slate-200 rounded-3xl space-y-3">
            <ShieldCheck className="mx-auto h-12 w-12 text-slate-400" />
            <h3 className="text-base font-bold text-slate-900">No Scheduled Medicines Today</h3>
            <p className="text-slate-600 text-sm max-w-sm mx-auto">
              Add your active medicines in Medication Manager to track your daily doses here.
            </p>
            <Link to="/patient/medications" className="btn-primary inline-flex text-xs">
              Go to Medication Manager
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {todayData.logs.map((item) => (
              <div
                key={item.log_id}
                className={`glass-card p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border transition-all ${
                  item.tracking_status === 'taken'
                    ? 'border-emerald-200 bg-emerald-50/20'
                    : item.tracking_status === 'missed'
                    ? 'border-rose-200 bg-rose-50/20'
                    : 'border-slate-200'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-violet-100 text-violet-700 rounded-2xl flex-shrink-0 font-extrabold text-xs text-center min-w-[75px]">
                    <Clock size={14} className="mx-auto mb-0.5" />
                    <span>{item.scheduled_time}</span>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-black text-slate-900">{item.medicine_name}</h3>
                      <span className="text-xs bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-full font-bold">
                        {item.dosage}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 font-medium">Frequency: {item.frequency}</p>
                    <p className="text-xs text-slate-600">Course: {formatDisplayDate(item.start_date)} - {formatDisplayDate(item.end_date)}</p>
                    {item.doctor_name && <p className="text-xs text-slate-600">Prescribed by: Dr. {item.doctor_name}</p>}
                    {item.instructions && (
                      <p className="text-xs text-violet-700 italic">💡 {item.instructions}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto justify-end pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-200">
                  {item.tracking_status === 'taken' ? (
                    <div className="flex items-center gap-2 text-emerald-700 font-extrabold text-xs bg-emerald-100 px-4 py-2 rounded-xl border border-emerald-300">
                      <CheckCircle2 size={16} /> Taken
                    </div>
                  ) : item.tracking_status === 'missed' ? (
                    <div className="flex items-center gap-2 text-rose-700 font-extrabold text-xs bg-rose-100 px-4 py-2 rounded-xl border border-rose-300">
                      <XCircle size={16} /> Missed
                    </div>
                  ) : (
                    <div className="flex gap-2 w-full sm:w-auto">
                      <button
                        onClick={() => handleTrackStatus(item.log_id, 'taken')}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-emerald-500/10 flex items-center gap-1.5"
                      >
                        <Check size={14} /> Mark Taken
                      </button>
                      <button
                        onClick={() => handleTrackStatus(item.log_id, 'missed')}
                        className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-rose-500/10 flex items-center gap-1.5"
                      >
                        <XCircle size={14} /> Mark Missed
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        /* History View */
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-xs">
                  <th className="p-4">Date</th>
                  <th className="p-4">Time</th>
                  <th className="p-4">Medicine</th>
                  <th className="p-4">Dosage</th>
                  <th className="p-4">Tracking Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {history.map((log) => (
                  <tr key={log.log_id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4 font-bold text-slate-900">{formatDisplayDate(log.log_date)}</td>
                    <td className="p-4 text-slate-600 font-semibold">{log.scheduled_time}</td>
                    <td className="p-4 font-black text-slate-900">{log.medicine_name}</td>
                    <td className="p-4 text-slate-700">{log.dosage}</td>
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1 text-xs font-extrabold px-2.5 py-0.5 rounded-full ${
                        log.tracking_status === 'taken' ? 'bg-emerald-100 text-emerald-800' : (log.tracking_status === 'missed' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800')
                      }`}>
                        {log.tracking_status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default MedicationTracker;
