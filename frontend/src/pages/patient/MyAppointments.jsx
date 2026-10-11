import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { Calendar, Clock, Phone, AlertCircle, RefreshCw, XCircle, FileText, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';

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

const getAppointmentDate = (app) => {
  const date = app.date instanceof Date ? app.date.toISOString().slice(0, 10) : String(app.date || '').slice(0, 10);
  const appointmentDate = new Date(`${date}T00:00:00`);
  return Number.isNaN(appointmentDate.getTime()) ? null : appointmentDate;
};

const MyAppointments = () => {
  const { api } = useContext(AuthContext);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Prescription Modal State
  const [viewingApp, setViewingApp] = useState(null);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get('/patients/appointments');
      setAppointments(response.data);
    } catch (err) {
      console.error('Error fetching appointments:', err);
      setError('Could not retrieve your appointments schedule.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  const handleCancel = async (appId) => {
    if (!window.confirm('Are you sure you want to cancel this appointment? This cannot be undone.')) return;
    try {
      await api.post(`/patients/appointments/${appId}/cancel`);
      alert('Appointment cancelled successfully.');
      fetchAppointments();
    } catch (err) {
      console.error('Error cancelling appointment:', err);
      alert(err.response?.data?.message || 'Failed to cancel appointment.');
    }
  };

  const handleDeleteCompleted = async (appId) => {
    if (!window.confirm('Delete this completed appointment from your history?')) return;
    try {
      await api.delete(`/patients/appointments/${appId}`);
      setAppointments(current => current.filter(app => app.appointment_id !== appId));
    } catch (err) {
      console.error('Error deleting completed appointment:', err);
      alert(err.response?.data?.message || 'Failed to delete appointment.');
    }
  };

  const getStatusBadgeClass = (status) => {
    if (status === 'booked') return 'bg-indigo-50 border border-indigo-200 text-indigo-700';
    if (status === 'confirmed') return 'bg-emerald-50 border border-emerald-200 text-emerald-700';
    if (status === 'cancelled') return 'bg-rose-50 border border-rose-200 text-rose-700';
    return 'bg-emerald-50 border border-emerald-200 text-emerald-700';
  };

  const upcoming = appointments.filter(app => {
    const appointmentDate = getAppointmentDate(app);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return ['booked', 'confirmed'].includes(app.status) && appointmentDate && appointmentDate >= today;
  });

  const past = appointments.filter(app => {
    const appointmentDate = getAppointmentDate(app);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return !['booked', 'confirmed'].includes(app.status) || !appointmentDate || appointmentDate < today;
  });

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900">My Appointments</h1>
          <p className="text-sm text-slate-600 mt-1">Review your current and historical bookings</p>
        </div>
        <button
          onClick={fetchAppointments}
          className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-700 transition-colors shadow-sm"
          title="Refresh List"
        >
          <RefreshCw size={16} />
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl text-sm">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : appointments.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 shadow-sm">
          <Calendar className="mx-auto h-12 w-12 text-slate-500 mb-4 animate-bounce" />
          <h3 className="text-lg font-bold text-slate-900">No Appointments Booked</h3>
          <p className="text-slate-600 text-sm mt-1">You haven't scheduled any medical consultations yet.</p>
          <div className="pt-4">
            <Link to="/patient/search" className="btn-primary inline-flex text-xs">
              Search Doctors & Book Now
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-10">
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-slate-900 border-b border-slate-200 pb-2">Upcoming Consultations</h2>
            {upcoming.length === 0 ? (
              <p className="text-sm text-slate-500 py-4 italic">No upcoming consultations scheduled.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {upcoming.map(app => (
                  <div key={app.appointment_id} className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col justify-between space-y-6 shadow-sm">
                    <div className="space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-lg font-extrabold text-slate-900">{app.doctor_name}</h3>
                          <span className="text-xs text-indigo-600 capitalize font-semibold">{app.specialization_name} Specialist</span>
                        </div>
                        <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${getStatusBadgeClass(app.status)}`}>
                          {app.status}
                        </span>
                      </div>

                      <div className="pt-2 text-xs text-slate-600 space-y-2">
                        <div className="flex items-center gap-2">
                          <Calendar size={14} className="text-slate-500" />
                          <span>{formatDisplayDate(app.date)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock size={14} className="text-slate-500" />
                          <span>{app.session_type} session · Token #{app.queue_number || '—'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone size={14} className="text-slate-500" />
                          <span>Doctor Contact: {app.doctor_phone}</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-slate-200 flex justify-end gap-2">
                      {(app.notes || app.prescription) && (
                        <button
                          onClick={() => setViewingApp(app)}
                          className="btn-secondary text-xs font-semibold flex items-center gap-1"
                        >
                          <FileText size={14} /> Prescription
                        </button>
                      )}
                      <button
                        onClick={() => handleCancel(app.appointment_id)}
                        className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 rounded-xl text-xs font-bold transition-all duration-200 flex items-center gap-1.5"
                      >
                        <XCircle size={14} /> Cancel
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-bold text-slate-900 border-b border-slate-200 pb-2">Past & Cancelled Bookings</h2>
            {past.length === 0 ? (
              <p className="text-sm text-slate-500 py-2 italic">No history records found.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {past.map(app => (
                  <div key={app.appointment_id} className="bg-slate-50 border border-slate-200 rounded-2xl p-5 flex flex-col justify-between opacity-90 shadow-sm space-y-4">
                    <div className="space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-bold text-slate-800">{app.doctor_name}</h4>
                          <span className="text-xs text-slate-500 capitalize">{app.specialization_name}</span>
                        </div>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider ${getStatusBadgeClass(app.status)}`}>
                          {app.status}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 space-y-1 pt-1">
                        <p>Date: {formatDisplayDate(app.date)}</p>
                        <p>{app.session_type} session · Token #{app.queue_number || '—'}</p>
                      </div>
                    </div>

                    {(app.notes || app.prescription || app.status === 'completed') && (
                      <div className="pt-2 border-t border-slate-200 flex justify-end gap-2">
                        <button
                          onClick={() => setViewingApp(app)}
                          className="btn-primary text-xs font-bold flex items-center gap-1.5"
                        >
                          <FileText size={14} /> View Prescription & Notes
                        </button>
                        {app.status === 'completed' && (
                          <button
                            onClick={() => handleDeleteCompleted(app.appointment_id)}
                            className="px-3 py-2 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 rounded-xl text-xs font-bold flex items-center gap-1.5"
                            title="Delete completed appointment"
                          >
                            <Trash2 size={14} /> Delete
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Viewing Prescription Modal */}
      {viewingApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-slate-200">
            <div className="flex justify-between items-center border-b border-slate-200 pb-4">
              <div>
                <h3 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                  <FileText className="text-indigo-600" /> Doctor Consultation Details
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Dr. {viewingApp.doctor_name} ({viewingApp.specialization_name})</p>
              </div>
              <button onClick={() => setViewingApp(null)} className="text-slate-400 hover:text-slate-700 font-bold">
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                <span className="font-bold text-slate-700 block uppercase tracking-wider text-[10px]">Clinical Notes & Advice</span>
                <p className="text-slate-800 leading-relaxed whitespace-pre-line">
                  {viewingApp.notes || 'No specific clinical notes recorded.'}
                </p>
              </div>

              <div className="bg-violet-50/70 p-4 rounded-2xl border border-violet-200 space-y-2">
                <span className="font-bold text-violet-800 block uppercase tracking-wider text-[10px]">Prescribed Medication</span>
                {viewingApp.medications?.length ? (
                  <div className="space-y-3">
                    {viewingApp.medications.map(medication => (
                      <div key={medication.id} className="bg-white/80 rounded-xl border border-violet-100 p-3 space-y-1">
                        <p className="text-violet-950 font-bold text-sm">{medication.name} · {medication.dosage}</p>
                        <p className="text-violet-900">{medication.frequency} · {medication.times}</p>
                        <p className="text-violet-900">{formatDisplayDate(medication.start_date)} to {formatDisplayDate(medication.end_date)}</p>
                        {medication.instructions && <p className="text-violet-900">{medication.instructions}</p>}
                      </div>
                    ))}
                    {viewingApp.prescription && <p className="text-violet-950 whitespace-pre-line">{viewingApp.prescription}</p>}
                  </div>
                ) : (
                  <p className="text-violet-950 font-bold leading-relaxed whitespace-pre-line text-sm">
                    {viewingApp.prescription || 'No medications prescribed.'}
                  </p>
                )}
              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-end gap-3 items-center">
                <button
                  type="button"
                  onClick={() => setViewingApp(null)}
                  className="btn-secondary w-full sm:w-auto"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyAppointments;

