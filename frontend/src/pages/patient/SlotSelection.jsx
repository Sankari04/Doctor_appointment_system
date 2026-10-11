import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { Calendar, Clock, ArrowLeft, ArrowRight, AlertCircle, Sparkles } from 'lucide-react';

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

const SlotSelection = () => {
  const { id } = useParams();
  const { api } = useContext(AuthContext);
  const navigate = useNavigate();

  const [doctor, setDoctor] = useState(null);
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // UI state
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedSlotId, setSelectedSlotId] = useState(null);

  useEffect(() => {
    const fetchSlotsData = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/patients/doctors/${id}`);
        setDoctor(response.data.doctor);
        // Normalize slot.date to YYYY-MM-DD (strip time portion) so the UI grouping works reliably
        const normalizedSlots = (response.data.slots || []).map(s => {
          let datePart = s.date;
          if (typeof datePart === 'string' && datePart.includes('T')) datePart = datePart.split('T')[0];
          else if (datePart instanceof Date) datePart = datePart.toISOString().split('T')[0];
          else datePart = String(datePart).split('T')[0];
          return { ...s, date: datePart };
        });
        setSlots(normalizedSlots);

        // Group dates and set first date as default if slots exist
        if (normalizedSlots.length > 0) {
          const uniqueDates = [...new Set(normalizedSlots.map(s => s.date))];
          setSelectedDate(uniqueDates[0]);
        }
      } catch (err) {
        console.error('Error fetching slots:', err);
        setError('Failed to retrieve slot availability.');
      } finally {
        setLoading(false);
      }
    };
    fetchSlotsData();
  }, [id]);

  // Group slots by date
  const uniqueDates = [...new Set(slots.map(s => s.date))].sort();

  // Get slots for the selected date
  const slotsForSelectedDate = slots.filter(s => s.date === selectedDate);

  const handleProceed = () => {
    if (!selectedSlotId) return;
    navigate(`/patient/booking-confirmation?doctor_id=${doctor.id}&slot_id=${selectedSlotId}`);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error || !doctor) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-center space-y-4">
        <p className="text-rose-400 font-bold">{error || 'Something went wrong.'}</p>
        <Link to={`/patient/doctor/${id}`} className="btn-secondary inline-flex">
          <ArrowLeft size={16} /> Back to Profile
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <Link to={`/patient/doctor/${id}`} className="text-sm font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1.5 transition-colors">
        <ArrowLeft size={16} /> Back to Doctor Profile
      </Link>

      <div className="glass-card p-6 sm:p-8 space-y-8">
        <div>
          <span className="text-xs font-extrabold text-primary-400 uppercase tracking-widest flex items-center gap-1">
            <Sparkles size={12} /> Appointment Booking
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">Select Date & Time Slot</h1>
          <p className="text-sm text-slate-600">Booking session with {doctor.name} ({doctor.specialization_name})</p>
        </div>

        {slots.length === 0 ? (
          <div className="text-center py-16 bg-violet-50 rounded-3xl border border-slate-200">
            <AlertCircle className="mx-auto h-12 w-12 text-amber-500 mb-4" />
            <h3 className="text-lg font-bold text-white">No Slots Available</h3>
            <p className="text-slate-600 text-sm mt-1 max-w-sm mx-auto">
              This doctor has not added any upcoming slots. Please check back later or contact support.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Date Selection tabs */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar size={14} /> 1. Select Date
              </label>
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
                {uniqueDates.map(date => {
                  const dateObj = new Date(`${date}T00:00:00`);
                  const isSelected = selectedDate === date;
                  return (
                    <button
                      key={date}
                      type="button"
                      onClick={() => {
                        setSelectedDate(date);
                        setSelectedSlotId(null); // Reset slot selection
                      }}
                      className={`flex-shrink-0 flex flex-col items-center px-5 py-3 rounded-2xl border text-center transition-all ${
                        isSelected
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-white'
                      }`}
                    >
                      <span className="text-xs font-bold uppercase tracking-wider">
                        {dateObj.toLocaleDateString('en-GB', { weekday: 'short' })}
                      </span>
                      <span className="text-lg font-extrabold mt-1">
                        {dateObj.getDate()}
                      </span>
                      <span className="text-[10px] font-medium text-current/80">
                        {dateObj.toLocaleDateString('en-GB', { month: 'short' })}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Time Slots grid */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                <Clock size={14} /> 2. Select Time
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {slotsForSelectedDate.map(slot => {
                  const isSelected = selectedSlotId === slot.id;
                  const startStr = slot.start_time.substring(0, 5);
                  const endStr = slot.end_time.substring(0, 5);
                  return (
                    <button
                      key={slot.id}
                      type="button"
                      onClick={() => setSelectedSlotId(slot.id)}
                      className={`px-4 py-3.5 rounded-xl border text-center font-semibold text-sm transition-all ${
                        isSelected
                          ? 'bg-accent-600/20 border-accent-500 text-white shadow-lg shadow-accent-500/10'
                          : 'bg-violet-50 border-slate-200 text-slate-700 hover:border-slate-200'
                      }`}
                    >
                      {startStr} - {endStr}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Proceed Actions */}
            <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-slate-600 text-xs text-center sm:text-left">
                {selectedSlotId ? (
                  <p>
                    Selected: <span className="text-slate-900 font-bold">{formatDisplayDate(selectedDate)}</span> at{' '}
                    <span className="text-slate-900 font-bold">
                      {slots.find(s => s.id === selectedSlotId)?.start_time.substring(0, 5)}
                    </span>
                  </p>
                ) : (
                  <p>Please select a date and time slot to proceed.</p>
                )}
              </div>

              <button
                type="button"
                onClick={handleProceed}
                disabled={!selectedSlotId}
                className="btn-primary w-full sm:w-auto flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:pointer-events-none"
              >
                Proceed to Booking <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SlotSelection;


