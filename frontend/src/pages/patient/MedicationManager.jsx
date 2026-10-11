import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { Pill, Calendar, Clock, AlertCircle, CheckCircle2 } from 'lucide-react';

const formatDisplayDate = (dateInput) => {
  if (!dateInput) return 'N/A';
  let date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (isNaN(date)) date = new Date(String(dateInput).replace(' ', 'T'));
  if (isNaN(date)) return 'N/A';
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const MedicationManager = () => {
  const { api } = useContext(AuthContext);
  const [activeMeds, setActiveMeds] = useState([]);
  const [completedMeds, setCompletedMeds] = useState([]);
  const [missedMeds, setMissedMeds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('active');

  const fetchMedications = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get('/medications');
      setActiveMeds(response.data.active || []);
      setCompletedMeds(response.data.completed || []);
      setMissedMeds(response.data.missed || []);
    } catch (err) {
      console.error('Error fetching medications:', err);
      setError('Could not retrieve medications list.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMedications();
  }, []);

  const currentList = activeTab === 'active' ? activeMeds : activeTab === 'missed' ? missedMeds : completedMeds;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900">Medication Manager</h1>
          <p className="text-sm text-slate-600 mt-1">Doctor-prescribed medicines and treatment schedules</p>
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

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-6">
        <button
          onClick={() => setActiveTab('active')}
          className={`pb-3 text-sm font-extrabold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'active' ? 'border-violet-600 text-violet-700' : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Pill size={16} /> Active Medications ({activeMeds.length})
        </button>
        <button
          onClick={() => setActiveTab('completed')}
          className={`pb-3 text-sm font-extrabold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'completed' ? 'border-violet-600 text-violet-700' : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <CheckCircle2 size={16} /> Completed Courses ({completedMeds.length})
        </button>
        <button
          onClick={() => setActiveTab('missed')}
          className={`pb-3 text-sm font-extrabold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'missed' ? 'border-rose-600 text-rose-700' : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <AlertCircle size={16} /> Missed ({missedMeds.length})
        </button>
      </div>

      {/* Medication Cards List */}
      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="w-12 h-12 border-4 border-violet-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : currentList.length === 0 ? (
        <div className="text-center py-16 bg-slate-50 border border-slate-200 rounded-3xl space-y-3">
          <Pill className="mx-auto h-12 w-12 text-slate-400" />
          <p className="text-slate-600 text-sm font-semibold">No {activeTab} prescribed medicines recorded.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {currentList.map((med) => (
            <div key={med.id} className="glass-card p-6 flex flex-col justify-between space-y-4 border border-slate-200 hover:shadow-md transition-all">
              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                      <Pill size={18} className="text-violet-600" /> {med.name}
                    </h3>
                    <span className="inline-block mt-1 bg-violet-100 text-violet-800 text-xs font-bold px-2.5 py-0.5 rounded-full">
                      Dosage: {med.dosage}
                    </span>
                  </div>
                  <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${med.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-300'}`}>
                    {med.status}
                  </span>
                </div>

                <div className="space-y-2 text-xs text-slate-600 pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-500">Frequency:</span>
                    <span className="font-bold text-slate-800">{med.frequency}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-500">Scheduled Times:</span>
                    <span className="font-bold text-slate-800">{med.times}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-500">Prescribed by:</span>
                    <span className="font-bold text-slate-800">{med.doctor_name ? `Dr. ${med.doctor_name}` : 'Doctor'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-500">Duration:</span>
                    <span className="font-bold text-slate-800">{formatDisplayDate(med.start_date)} - {formatDisplayDate(med.end_date)}</span>
                  </div>
                  {med.instructions && (
                    <div className="pt-1 text-slate-700 italic bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      💡 {med.instructions}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200/60 text-xs font-semibold text-slate-500">
                Dose status is updated in the Daily Tracker
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
};

export default MedicationManager;
