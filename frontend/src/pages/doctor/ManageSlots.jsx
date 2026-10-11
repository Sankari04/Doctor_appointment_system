import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { Calendar, Clock, Plus, Trash2, AlertCircle, CheckCircle, Sun, Moon } from 'lucide-react';

const ManageSlots = () => {
  const { api } = useContext(AuthContext);

  const [existingSlots, setExistingSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Create Slot states
  const [slotDate, setSlotDate] = useState('');
  const [sessionType, setSessionType] = useState('Morning');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('12:00');
  const [submitting, setSubmitting] = useState(false);

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    setStartTime(sessionType === 'Morning' ? '09:00' : '18:00');
    setEndTime(sessionType === 'Morning' ? '12:00' : '21:00');
  }, [sessionType]);

  // Fetch slots on load
  const fetchSlots = async () => {
    try {
      setLoading(true);
      const response = await api.get('/doctors/slots');
      setExistingSlots(response.data);
    } catch (err) {
      console.error('Error fetching doctor slots:', err);
      setErrorMsg('Could not load existing slots schedule.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSlots();
  }, []);

  const handleAddSlot = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!slotDate || !startTime || !endTime) {
      setErrorMsg('Please select a date, start time, and end time.');
      return;
    }

    if (startTime >= endTime) {
      setErrorMsg('Session start time must be earlier than its end time.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        date: slotDate,
        session_type: sessionType,
        start_time: `${startTime}:00`,
        end_time: `${endTime}:00`
      };
      
      await api.post('/doctors/slots', payload);
      setSuccessMsg(`${sessionType} session added successfully.`);
      fetchSlots();
    } catch (err) {
      console.error('Error creating slot:', err);
      setErrorMsg(err.response?.data?.message || 'Failed to create slot.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSlot = async (slotId) => {
    if (!window.confirm('Are you sure you want to delete this available slot?')) return;
    setErrorMsg('');
    setSuccessMsg('');
    try {
      await api.delete(`/doctors/slots/${slotId}`);
      setSuccessMsg('Session availability deleted.');
      fetchSlots(); // Refresh slot list
    } catch (err) {
      console.error('Error deleting slot:', err);
      setErrorMsg(err.response?.data?.message || 'Failed to delete slot.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold text-white">Manage Availability</h1>
        <p className="text-sm text-slate-600 mt-1">Configure consultation windows. Patients receive tokens, not individual times.</p>
      </div>

      {errorMsg && (
        <div className="flex items-center gap-2 bg-rose-950/40 border border-rose-900/30 text-rose-300 px-4 py-3 rounded-xl text-sm">
          <AlertCircle size={18} className="flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="flex items-center gap-2 bg-emerald-950/40 border border-emerald-900/30 text-emerald-300 px-4 py-3 rounded-xl text-sm">
          <CheckCircle size={18} className="flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Slot Creation Form */}
        <div className="glass-card p-6 h-fit space-y-6">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            Create Session Availability
          </h2>

          <form onSubmit={handleAddSlot} className="space-y-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                <Calendar size={14} className="text-slate-500" /> Date
              </label>
              <input
                type="date"
                required
                min={new Date().toISOString().split('T')[0]} // Block historical dates
                value={slotDate}
                onChange={(e) => setSlotDate(e.target.value)}
                className="custom-input w-full"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-700">Consultation Session</label>
              <select
                value={sessionType}
                onChange={(e) => setSessionType(e.target.value)}
                className="custom-input w-full"
              >
                <option value="Morning">Morning</option>
                <option value="Evening">Evening</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                  <Clock size={14} className="text-slate-500" /> Start Time
                </label>
                <input
                  type="time"
                  required
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="custom-input w-full"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                  <Clock size={14} className="text-slate-500" /> End Time
                </label>
                <input
                  type="time"
                  required
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="custom-input w-full"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="btn-accent w-full flex items-center justify-center gap-1.5"
            >
              {submitting ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <Plus size={18} /> Add Session
                </>
              )}
            </button>
          </form>
        </div>

        {/* Existing Slots List */}
        <div className="glass-card p-6 lg:col-span-2 space-y-6">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            My Session Availability
          </h2>

          {loading ? (
            <div className="flex justify-center items-center py-20">
              <div className="w-10 h-10 border-4 border-accent-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : existingSlots.length === 0 ? (
            <div className="text-center py-16 bg-violet-50 rounded-2xl border border-slate-200/60">
              <Calendar className="mx-auto h-12 w-12 text-slate-505 mb-4" />
              <h3 className="text-sm font-bold text-white">No Slots Created</h3>
              <p className="text-slate-600 text-xs mt-1">Configure and add slots using the editor on the left.</p>
            </div>
          ) : (
            <div className="max-h-[500px] overflow-y-auto pr-2 space-y-3">
              {existingSlots.map((slot) => {
                const dateStr = new Date(slot.date).toLocaleDateString(undefined, {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                });
                const startStr = slot.start_time.substring(0, 5);
                const endStr = slot.end_time.substring(0, 5);

                return (
                  <div
                    key={slot.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white/80 border border-slate-200/80 rounded-xl hover:bg-white/90 transition-colors gap-3"
                  >
                    <div className="space-y-1">
                      <span className="text-sm font-extrabold text-white">{dateStr}</span>
                      <div className="text-xs text-slate-600 flex items-center gap-1.5">
                        {slot.session_type === 'Morning' ? <Sun size={12} /> : <Moon size={12} />}
                        <span>{slot.session_type} session: {startStr} - {endStr}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto">
                      <span
                        className="text-xs font-semibold px-2.5 py-0.5 rounded-full border bg-emerald-50 border-emerald-200 text-emerald-700"
                      >
                        Session open
                      </span>

                      <button
                        type="button"
                        onClick={() => handleDeleteSlot(slot.id)}
                        className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-950/20 rounded-lg transition-colors border border-transparent hover:border-rose-900/30"
                        title="Delete Session"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ManageSlots;
