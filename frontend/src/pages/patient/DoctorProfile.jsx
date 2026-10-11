import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { Stethoscope, Award, CircleDollarSign, CalendarDays, Phone, ArrowLeft, ArrowRight } from 'lucide-react';

const formatCurrencyINR = (amount) => {
  const value = Number(amount ?? 0);
  return `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(value)}`;
};

const DoctorProfile = () => {
  const { id } = useParams();
  const { api } = useContext(AuthContext);
  const navigate = useNavigate();

  const [doctor, setDoctor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/patients/doctors/${id}`);
        setDoctor(response.data.doctor);
      } catch (err) {
        console.error('Error fetching doctor profile:', err);
        setError('Doctor profile not found.');
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [id]);

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
        <Link to="/patient/search" className="btn-secondary inline-flex">
          <ArrowLeft size={16} /> Back to Search
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <Link to="/patient/search" className="text-sm font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1.5 transition-colors">
        <ArrowLeft size={16} /> Back to Search
      </Link>

      <div className="glass-card p-6 sm:p-8 space-y-8">
        {/* Profile Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-slate-200">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-primary-600 to-accent-600 flex items-center justify-center text-slate-900 font-black text-2xl shadow-lg shadow-primary-500/10">
              {doctor.name.split(' ').map(n => n[0]).join('').substring(0, 3)}
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">{doctor.name}</h1>
              <p className="text-primary-400 font-semibold text-sm capitalize">{doctor.specialization_name} Specialist</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <Phone size={14} className="text-slate-500" />
            <span>Contact: {doctor.phone}</span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 bg-violet-50 border border-slate-200 rounded-2xl space-y-1">
            <span className="text-slate-500 text-xs uppercase font-bold tracking-wider flex items-center gap-1">
              <Award size={14} /> Professional Experience
            </span>
            <span className="block text-lg font-bold text-slate-900">{doctor.experience} Years of Practice</span>
          </div>

          <div className="p-4 bg-violet-50 border border-slate-200 rounded-2xl space-y-1">
            <span className="text-slate-500 text-xs uppercase font-bold tracking-wider flex items-center gap-1">
              <CircleDollarSign size={14} /> Consultation Fee
            </span>
            <span className="block text-lg font-bold text-emerald-600">{formatCurrencyINR(doctor.consultation_fee)} (Per session)</span>
          </div>
        </div>

        {/* Bio */}
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Stethoscope size={18} className="text-primary-400" /> Professional Biography
          </h2>
          <p className="text-sm sm:text-base text-slate-700 leading-relaxed bg-white/80 p-5 rounded-2xl border border-slate-200/60">
            {doctor.bio || 'No medical bio has been updated by the doctor yet.'}
          </p>
        </div>

        {/* CTA to Booking */}
        <div className="pt-6 border-t border-slate-200 flex justify-end">
          <button
            onClick={() => navigate(`/patient/doctor/${doctor.id}/slots`)}
            className="btn-primary w-full sm:w-auto flex items-center justify-center gap-2"
          >
            <CalendarDays size={18} /> Select Date & Session <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default DoctorProfile;

