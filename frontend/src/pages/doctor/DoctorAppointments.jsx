import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { Calendar, Clock, Phone, AlertCircle, RefreshCw } from 'lucide-react';

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

const DoctorAppointments = () => {
  const { api } = useContext(AuthContext);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Modal state for Prescription / Notes
  const [selectedApp, setSelectedApp] = useState(null);
  const [notes, setNotes] = useState('');
  const [prescription, setPrescription] = useState('');
  const [prescribedMedications, setPrescribedMedications] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get('/doctors/appointments');
      setAppointments(response.data);
    } catch (err) {
      console.error('Error fetching doctor appointments:', err);
      setError('Could not retrieve booked appointments list.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  const openPrescriptionModal = (app) => {
    setSelectedApp(app);
    setNotes(app.notes || '');
    setPrescription(app.prescription || '');
    setPrescribedMedications((app.medications || []).map(medication => ({
      ...medication,
      start_date: String(medication.start_date || '').slice(0, 10),
      end_date: String(medication.end_date || '').slice(0, 10)
    })));
  };

  const addMedicationRow = () => {
    setPrescribedMedications(current => [...current, {
      name: '', dosage: '', frequency: 'Once daily', times: '09:00 AM',
      start_date: new Date().toISOString().slice(0, 10),
      end_date: new Date(Date.now() + 6 * 86400000).toISOString().slice(0, 10),
      instructions: ''
    }]);
  };

  const handleSavePrescription = async (e) => {
    e.preventDefault();
    if (!selectedApp) return;
    try {
      setSubmitting(true);
      await api.put(`/doctors/appointments/${selectedApp.appointment_id}/complete`, {
        notes,
        prescription,
        medications: prescribedMedications
      });
      setSelectedApp(null);
      fetchAppointments();
    } catch (err) {
      console.error('Error updating prescription:', err);
      alert(err.response?.data?.message || 'Failed to update consultation record.');
    } finally {
      setSubmitting(false);
    }
  };

  const calculateAge = (dobString) => {
    if (!dobString) return 'N/A';
    const today = new Date();
    const birthDate = new Date(dobString);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const now = new Date();
  const upcoming = appointments.filter(app => {
    const appDate = new Date(`${app.date}T00:00:00`);
    return ['booked', 'confirmed'].includes(app.status) && appDate >= new Date(now.toDateString());
  });

  const past = appointments.filter(app => {
    const appDate = new Date(`${app.date}T00:00:00`);
    return !['booked', 'confirmed'].includes(app.status) || appDate < new Date(now.toDateString());
  });

  const getStatusBadgeClass = (status) => {
    if (status === 'booked') return 'bg-indigo-50 border border-indigo-200 text-indigo-700';
    if (status === 'confirmed') return 'bg-emerald-50 border border-emerald-200 text-emerald-700';
    if (status === 'cancelled') return 'bg-rose-50 border border-rose-200 text-rose-700';
    return 'bg-emerald-50 border border-emerald-200 text-emerald-700';
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900">Patient Bookings</h1>
          <p className="text-sm text-slate-600 mt-1">Review scheduled appointments and medical schedules</p>
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
          <Calendar className="mx-auto h-12 w-12 text-slate-500 mb-4" />
          <h3 className="text-lg font-bold text-slate-900">No Bookings Recorded</h3>
          <p className="text-slate-600 text-sm mt-1">No patient has booked an appointment with you yet.</p>
        </div>
      ) : (
        <div className="space-y-10">
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-slate-900 border-b border-slate-200 pb-2">Upcoming Schedule</h2>
            {upcoming.length === 0 ? (
              <p className="text-sm text-slate-500 py-4 italic">No upcoming consultations booked.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {upcoming.map(app => (
                  <div key={app.appointment_id} className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col justify-between space-y-6 shadow-sm">
                    <div className="space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-lg font-extrabold text-slate-900">{app.patient_name}</h3>
                          <span className="inline-block text-xs bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-full mt-1">
                            Gender: {app.patient_gender || 'Not specified'} | Age: {calculateAge(app.patient_dob)}
                          </span>
                        </div>
                        <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${getStatusBadgeClass(app.status)}`}>
                          {app.status}
                        </span>
                      </div>

                      <div className="pt-2 border-t border-slate-200 text-xs text-slate-600 space-y-2">
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
                          <span>Patient Contact: {app.patient_phone}</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-slate-200 flex justify-end gap-2">
                      {app.status === 'booked' && (
                        <button
                          onClick={async () => {
                            try {
                              await api.put(`/doctors/appointments/${app.appointment_id}/confirm`);
                              fetchAppointments();
                            } catch (err) {
                              alert(err.response?.data?.message || 'Failed to confirm appointment.');
                            }
                          }}
                          className="btn-secondary text-xs font-bold"
                        >
                          Confirm Appointment
                        </button>
                      )}
                      <button
                        onClick={() => openPrescriptionModal(app)}
                        className="btn-primary text-xs font-bold"
                      >
                        Add Medication / Complete Visit
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-bold text-slate-900 border-b border-slate-200 pb-2">Completed & Cancelled Records</h2>
            {past.length === 0 ? (
              <p className="text-sm text-slate-500 py-2 italic">No history records found.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {past.map(app => (
                  <div key={app.appointment_id} className="bg-slate-50 border border-slate-200 rounded-2xl p-5 flex flex-col justify-between opacity-90 shadow-sm space-y-4">
                    <div className="space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-bold text-slate-800">{app.patient_name}</h4>
                          <span className="text-xs text-slate-500">Gender: {app.patient_gender} | Age: {calculateAge(app.patient_dob)}</span>
                        </div>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider ${getStatusBadgeClass(app.status)}`}>
                          {app.status}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 space-y-1 pt-1">
                        <p>Date: {formatDisplayDate(app.date)}</p>
                        <p>{app.session_type} session · Token #{app.queue_number || '—'}</p>
                      </div>

                      {(app.notes || app.prescription) && (
                        <div className="pt-2 border-t border-slate-200 text-xs space-y-1.5 bg-white p-3 rounded-xl border border-slate-200">
                          {app.notes && (
                            <p className="text-slate-700"><strong>Notes:</strong> {app.notes}</p>
                          )}
                          {app.prescription && (
                            <p className="text-violet-700 font-semibold"><strong>Prescription:</strong> {app.prescription}</p>
                          )}
                        </div>
                      )}
                    </div>

                    {app.status === 'completed' && (
                      <div className="pt-2 flex justify-end">
                        <button
                          onClick={() => openPrescriptionModal(app)}
                          className="btn-secondary text-xs font-semibold"
                        >
                          Edit Prescription / Medicines
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Complete & Prescription Modal */}
      {selectedApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-slate-200">
            <div className="flex justify-between items-center border-b border-slate-200 pb-4">
              <div>
                <h3 className="text-xl font-extrabold text-slate-900">Consultation, Medication & Prescription</h3>
                <p className="text-xs text-slate-500 mt-0.5">Patient: {selectedApp.patient_name}</p>
              </div>
              <button onClick={() => setSelectedApp(null)} className="text-slate-400 hover:text-slate-700 font-bold">
                ✕
              </button>
            </div>

            <form onSubmit={handleSavePrescription} className="space-y-4 text-xs max-h-[75vh] overflow-y-auto pr-1">
              <div className="flex flex-col gap-1">
                <label className="font-bold text-slate-700">Doctor Clinical Notes</label>
                <textarea
                  rows="3"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="custom-input"
                  placeholder="Enter diagnosis, general instructions, or medical observation..."
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-700">Prescribed Medicines</label>
                  <button type="button" onClick={addMedicationRow} className="btn-secondary inline-flex items-center gap-1 text-xs">
                    Add Medication
                  </button>
                </div>
                {prescribedMedications.length === 0 && (
                  <p className="text-slate-500">No medications added.</p>
                )}
                {prescribedMedications.map((medication, index) => (
                  <div key={medication.id || `new-${index}`} className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-700">Medicine {index + 1}</span>
                      <button type="button" onClick={() => setPrescribedMedications(current => current.filter((_, row) => row !== index))} className="text-rose-600 font-semibold">
                        Remove
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <input required className="custom-input" placeholder="Medicine name" value={medication.name} onChange={e => setPrescribedMedications(current => current.map((item, row) => row === index ? { ...item, name: e.target.value } : item))} />
                      <input required className="custom-input" placeholder="Dosage (e.g. 500 mg)" value={medication.dosage} onChange={e => setPrescribedMedications(current => current.map((item, row) => row === index ? { ...item, dosage: e.target.value } : item))} />
                      <input required className="custom-input" placeholder="Frequency (e.g. twice daily)" value={medication.frequency} onChange={e => setPrescribedMedications(current => current.map((item, row) => row === index ? { ...item, frequency: e.target.value } : item))} />
                      <input required className="custom-input" placeholder="Dose times, comma separated" value={medication.times} onChange={e => setPrescribedMedications(current => current.map((item, row) => row === index ? { ...item, times: e.target.value } : item))} />
                      <label className="flex flex-col gap-1 font-semibold text-slate-600">Start date<input required type="date" className="custom-input" value={medication.start_date} onChange={e => setPrescribedMedications(current => current.map((item, row) => row === index ? { ...item, start_date: e.target.value } : item))} /></label>
                      <label className="flex flex-col gap-1 font-semibold text-slate-600">End date<input required type="date" className="custom-input" value={medication.end_date} onChange={e => setPrescribedMedications(current => current.map((item, row) => row === index ? { ...item, end_date: e.target.value } : item))} /></label>
                    </div>
                    <textarea rows="2" className="custom-input w-full" placeholder="Instructions (e.g. after food)" value={medication.instructions || ''} onChange={e => setPrescribedMedications(current => current.map((item, row) => row === index ? { ...item, instructions: e.target.value } : item))} />
                  </div>
                ))}
                <label className="flex flex-col gap-1">
                  <span className="font-bold text-slate-700">Prescription Summary (optional)</span>
                  <textarea rows="2" value={prescription} onChange={(e) => setPrescription(e.target.value)} className="custom-input" placeholder="Additional prescription summary or advice" />
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setSelectedApp(null)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="btn-primary">
                  {submitting ? 'Saving...' : 'Save & Complete Appointment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorAppointments;
