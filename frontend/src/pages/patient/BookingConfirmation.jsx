import React, { useState, useEffect, useContext } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { CheckCircle2, ArrowLeft, Calendar, Clock, DollarSign, ShieldAlert } from 'lucide-react';

const formatCurrencyINR = (amount) => {
  const value = Number(amount ?? 0);
  return `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(value)}`;
};

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

const BookingConfirmation = () => {
  const [searchParams] = useSearchParams();
  const doctorId = searchParams.get('doctor_id');
  const selectedDate = searchParams.get('date');
  const sessionType = searchParams.get('session_type');

  const { api, user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [doctor, setDoctor] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [booking, setBooking] = useState(false);
  const [success, setSuccess] = useState(false);
  const [bookingResult, setBookingResult] = useState(null);

  useEffect(() => {
    const fetchConfirmDetails = async () => {
      if (!doctorId || !selectedDate || !sessionType) {
        setError('Missing booking details.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await api.get(`/patients/doctors/${doctorId}`);
        setDoctor(response.data.doctor);

        const selectedSession = response.data.slots.find(
          item => String(item.date).slice(0, 10) === selectedDate && item.session_type === sessionType
        );

        if (selectedSession) {
          setSession(selectedSession);
        } else {
          setError('The selected session is no longer available.');
        }
      } catch (err) {
        console.error('Error fetching confirmation details:', err);
        setError('Failed to retrieve appointment details.');
      } finally {
        setLoading(false);
      }
    };

    fetchConfirmDetails();
  }, [doctorId, selectedDate, sessionType]);

  const handleConfirm = async () => {
    setBooking(true);
    setError('');
    try {
      const response = await api.post('/patients/appointments', {
        doctor_id: parseInt(doctorId, 10),
        date: selectedDate,
        session_type: sessionType
      });
      setBookingResult(response.data);
      setSuccess(true);
    } catch (err) {
      console.error('Booking failed:', err);
      setError(err.response?.data?.message || 'Booking failed. The slot may have been taken.');
    } finally {
      setBooking(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error && !success) {
    return (
      <div className="max-w-md mx-auto py-12 px-4 text-center space-y-4 glass-card">
        <ShieldAlert size={48} className="mx-auto text-rose-500 animate-bounce" />
        <h3 className="text-xl font-bold text-slate-900">Booking Interrupted</h3>
        <p className="text-slate-600 text-sm leading-relaxed">{error}</p>
        <Link to="/patient/search" className="btn-secondary inline-flex w-full">
          <ArrowLeft size={16} /> Back to Search
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 glass-card p-8 text-center relative overflow-hidden">
        {success ? (
          <div className="space-y-6 py-6">
            <div className="w-20 h-20 bg-emerald-950/50 border border-emerald-800 text-emerald-400 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10">
              <CheckCircle2 size={44} className="animate-pulse" />
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900">Booking Confirmed!</h2>
            <div className="mx-auto max-w-xs space-y-2 text-sm text-slate-600">
              <p>Doctor: <strong className="text-slate-900">{bookingResult?.doctorName || doctor.name}</strong></p>
              <p>Date: <strong className="text-slate-900">{formatDisplayDate(bookingResult?.date || selectedDate)}</strong></p>
              <p>Session: <strong className="text-slate-900">{bookingResult?.sessionType || sessionType}</strong></p>
              <p>Token: <strong className="text-violet-700">#{bookingResult?.queueNumber}</strong></p>
              <p>Status: <strong className="text-slate-900">{bookingResult?.status}</strong></p>
            </div>
            <button onClick={() => navigate('/patient/appointments')} className="btn-primary w-full">
              View My Appointments
            </button>
          </div>
        ) : (
          <>
            <div>
              <h2 className="text-2xl font-extrabold text-slate-900">Confirm Booking</h2>
              <p className="mt-2 text-sm text-slate-600">
                Please review the consultation session before finalizing
              </p>
            </div>

            {/* Info Summary Cards */}
            <div className="space-y-4 text-left pt-4">
              <div className="p-4 bg-white/90 border border-slate-200 rounded-2xl space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-extrabold text-slate-900">{doctor.name}</h4>
                    <span className="text-xs text-primary-400 capitalize">{doctor.specialization_name} Specialist</span>
                  </div>
                </div>
                <div className="pt-2 border-t border-slate-200/60 text-xs text-slate-600 space-y-2">
                  <div className="flex items-center gap-2">
                    <Calendar size={14} className="text-slate-500" />
                    <span>{formatDisplayDate(session.date)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock size={14} className="text-slate-500" />
                    <span>{sessionType} session</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <DollarSign size={14} className="text-slate-500" />
                    <span className="font-semibold text-emerald-600">{formatCurrencyINR(doctor.consultation_fee)} (Per visit)</span>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-white/80 border border-slate-200 rounded-2xl space-y-1">
                <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Patient Name</span>
                <span className="block text-sm font-semibold text-slate-900">{user?.name}</span>
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-4">
              <button
                onClick={handleConfirm}
                disabled={booking}
                className="btn-primary w-full"
              >
                {booking ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  'Confirm & Book Appointment'
                )}
              </button>
              <button
                onClick={() => navigate(`/patient/doctor/${doctorId}/slots`)}
                disabled={booking}
                className="btn-secondary w-full text-xs"
              >
                Change Session
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default BookingConfirmation;
