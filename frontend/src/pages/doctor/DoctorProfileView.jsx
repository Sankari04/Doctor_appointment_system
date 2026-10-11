import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { User, Phone, Award, DollarSign, FileText, AlertCircle, CheckCircle, Stethoscope } from 'lucide-react';
import axios from 'axios';

const DoctorProfileView = () => {
  const { api, updateUserData } = useContext(AuthContext);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [bio, setBio] = useState('');
  const [experience, setExperience] = useState('');
  const [consultationFee, setConsultationFee] = useState('');
  const [specializationId, setSpecializationId] = useState('');
  
  const [specializations, setSpecializations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Fetch initial profile and specializations
  useEffect(() => {
    const loadProfileData = async () => {
      try {
        setLoading(true);
        // Load specializations
        const specResponse = await axios.get('http://localhost:5000/api/specializations');
        setSpecializations(specResponse.data);

        // Load profile details
        const profileResponse = await api.get('/doctors/profile');
        const doc = profileResponse.data;

        setName(doc.name);
        setPhone(doc.phone);
        setBio(doc.bio || '');
        setExperience(doc.experience.toString());
        setConsultationFee(doc.consultation_fee.toString());
        setSpecializationId(doc.specialization_id.toString());
      } catch (err) {
        console.error('Error fetching doctor profile details:', err);
        setErrorMsg('Failed to load profile details.');
      } finally {
        setLoading(false);
      }
    };
    loadProfileData();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!name || !phone || !specializationId) {
      setErrorMsg('Name, phone and specialization are required fields.');
      return;
    }

    setUpdating(true);
    try {
      await api.put('/doctors/profile', {
        name,
        phone,
        bio,
        experience: parseInt(experience, 10) || 0,
        consultation_fee: parseFloat(consultationFee) || 0.00,
        specialization_id: parseInt(specializationId, 10)
      });
      setSuccessMsg('Profile updated successfully.');
      updateUserData({ name }); // Update state globally in AuthContext
    } catch (err) {
      console.error('Error updating doctor profile:', err);
      setErrorMsg(err.response?.data?.message || 'Failed to update profile.');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="w-12 h-12 border-4 border-accent-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900">Profile Settings</h1>
        <p className="text-sm text-slate-600 mt-1">Manage your professional listing details</p>
      </div>

      <div className="glass-card p-6 sm:p-8">
        {errorMsg && (
          <div className="flex items-center gap-2 bg-rose-950/40 border border-rose-900/30 text-rose-300 px-4 py-3 rounded-xl text-sm mb-6">
            <AlertCircle size={18} className="flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="flex items-center gap-2 bg-emerald-950/40 border border-emerald-900/30 text-emerald-300 px-4 py-3 rounded-xl text-sm mb-6">
            <CheckCircle size={18} className="flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-700">Full Name</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <User size={16} />
                </div>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="custom-input w-full pl-10"
                  placeholder="e.g. Dr. Sarah Smith"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-700">Contact Phone</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Phone size={16} />
                </div>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="custom-input w-full pl-10"
                  placeholder="e.g. 9876543210"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-700">Specialization</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Stethoscope size={16} />
                </div>
                <select
                  value={specializationId}
                  onChange={(e) => setSpecializationId(e.target.value)}
                  className="custom-input w-full pl-10"
                >
                  {specializations.map(spec => (
                    <option key={spec.id} value={spec.id} className="bg-slate-50">
                      {spec.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-700">Experience (Yrs)</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <Award size={16} />
                  </div>
                  <input
                    type="number"
                    required
                    min="0"
                    value={experience}
                    onChange={(e) => setExperience(e.target.value)}
                    className="custom-input w-full pl-10"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-700">Fee (INR)</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    ?
                  </div>
                  <input
                    type="number"
                    required
                    min="0"
                    value={consultationFee}
                    onChange={(e) => setConsultationFee(e.target.value)}
                    className="custom-input w-full pl-8"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-700">Professional Bio</label>
            <div className="relative">
              <div className="absolute top-3 left-3 text-slate-500">
                <FileText size={16} />
              </div>
              <textarea
                rows="4"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="custom-input w-full pl-10"
                placeholder="Describe your qualifications, specialties, and professional background..."
              />
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <button
              type="submit"
              disabled={updating}
              className="btn-accent w-full sm:w-auto"
            >
              {updating ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DoctorProfileView;


