import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { Search, Stethoscope, Briefcase, DollarSign, ArrowRight } from 'lucide-react';
import axios from 'axios';

const formatCurrencyINR = (amount) => {
  const value = Number(amount ?? 0);
  return `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(value)}`;
};

const DoctorSearch = () => {
  const { api } = useContext(AuthContext);
  const navigate = useNavigate();

  const [doctors, setDoctors] = useState([]);
  const [specializations, setSpecializations] = useState([]);
  
  // Search parameters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSpec, setSelectedSpec] = useState('');
  const [loading, setLoading] = useState(true);

  // Load specializations on mount
  useEffect(() => {
    const fetchSpecs = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/specializations');
        setSpecializations(response.data);
      } catch (err) {
        console.error('Error fetching specializations:', err);
      }
    };
    fetchSpecs();
  }, []);

  // Fetch doctors based on filters
  const fetchDoctors = async () => {
    try {
      setLoading(true);
      const params = {};
      if (searchTerm) params.name = searchTerm;
      if (selectedSpec) params.specialization_id = selectedSpec;

      const response = await api.get('/patients/doctors', { params });
      setDoctors(response.data);
    } catch (err) {
      console.error('Error fetching doctors:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDoctors();
  }, [selectedSpec]); // Re-fetch when specialization changes

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchDoctors();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900">Find a Specialist</h1>
        <p className="text-sm text-slate-600 mt-1">Search verified doctors and book your slots</p>
      </div>

      {/* Filter and Search Form */}
      <form onSubmit={handleSearchSubmit} className="glass-card p-6 grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-700">Doctor Name</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
              <Search size={16} />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="custom-input w-full pl-10"
              placeholder="Search by name..."
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-700">Specialization</label>
          <select
            value={selectedSpec}
            onChange={(e) => setSelectedSpec(e.target.value)}
            className="custom-input w-full"
          >
            <option value="" className="bg-slate-50">All Specializations</option>
            {specializations.map(spec => (
              <option key={spec.id} value={spec.id} className="bg-slate-50">
                {spec.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <button type="submit" className="btn-primary w-full h-[46px] flex items-center justify-center gap-2">
            <Search size={18} /> Search Doctors
          </button>
        </div>
      </form>

      {/* Doctors Grid */}
      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : doctors.length === 0 ? (
        <div className="text-center py-16 bg-slate-50 rounded-3xl border border-slate-200/60">
          <Stethoscope className="mx-auto h-12 w-12 text-slate-500 mb-4" />
          <h3 className="text-lg font-bold text-slate-900">No Doctors Found</h3>
          <p className="text-slate-600 text-sm mt-1">Try expanding your search query or choosing another specialization.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {doctors.map(doctor => (
            <div key={doctor.id} className="glass-card p-6 flex flex-col justify-between h-full space-y-6">
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <h3 className="text-xl font-bold text-slate-900">{doctor.name}</h3>
                    <span className="inline-flex items-center gap-1 text-xs text-primary-400 font-semibold bg-primary-950/40 border border-primary-900/35 px-2.5 py-0.5 rounded-full">
                      {doctor.specialization_name}
                    </span>
                  </div>
                </div>

                <p className="text-sm text-slate-600 line-clamp-3">
                  {doctor.bio || 'No professional bio description provided.'}
                </p>

                <div className="grid grid-cols-2 gap-4 pt-2 text-xs text-slate-600">
                  <div className="flex items-center gap-1.5">
                    <Briefcase size={14} className="text-slate-500" />
                    <span>{doctor.experience} Yrs Experience</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <DollarSign size={14} className="text-slate-500" />
                    <span>{formatCurrencyINR(doctor.consultation_fee)} Fee</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200">
                <button
                  onClick={() => navigate(`/patient/doctor/${doctor.id}`)}
                  className="btn-secondary w-full text-xs font-bold py-3 flex items-center justify-center gap-1"
                >
                  View Profile & Slots <ArrowRight size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DoctorSearch;


