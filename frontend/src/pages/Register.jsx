import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { UserCheck, Mail, Lock, Phone, User, Calendar, Award, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import axios from 'axios';

const Register = () => {
  const { register, user } = useContext(AuthContext);
  const navigate = useNavigate();

  // Common Form Fields
  const [role, setRole] = useState('patient');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  // Patient Fields
  const [gender, setGender] = useState('Male');
  const [dob, setDob] = useState('');

  // Doctor Fields
  const [specializations, setSpecializations] = useState([]);
  const [specializationId, setSpecializationId] = useState('');
  const [experience, setExperience] = useState('');
  const [consultationFee, setConsultationFee] = useState('');
  const [bio, setBio] = useState('');

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // If already logged in, redirect
  useEffect(() => {
    if (user) {
      navigate(`/${user.role}/dashboard`);
    }
  }, [user, navigate]);

  // Fetch specializations on load
  useEffect(() => {
    const fetchSpecializations = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/specializations');
        setSpecializations(response.data);
        if (response.data.length > 0) {
          setSpecializationId(response.data[0].id.toString());
        }
      } catch (err) {
        console.error('Error fetching specializations:', err);
      }
    };
    fetchSpecializations();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!email || !password || !name || !phone) {
      setErrorMsg('Please fill in all common fields.');
      return;
    }

    const payload = {
      email,
      password,
      role,
      name,
      phone
    };

    if (role === 'patient') {
      payload.gender = gender;
      payload.dob = dob || null;
    } else {
      if (!specializationId) {
        setErrorMsg('Please select a specialization.');
        return;
      }
      payload.specialization_id = parseInt(specializationId, 10);
      payload.experience = parseInt(experience, 10) || 0;
      payload.consultation_fee = parseFloat(consultationFee) || 0.00;
      payload.bio = bio;
    }

    setSubmitting(true);
    const result = await register(payload);
    setSubmitting(false);

    if (result.success) {
      setSuccessMsg('Account registered successfully! Redirecting...');
      setTimeout(() => {
        navigate(`/${role}/dashboard`);
      }, 1500);
    } else {
      setErrorMsg(result.message);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl w-full space-y-8 glass-card p-8">
        <div>
          <h2 className="text-center text-3xl font-extrabold text-slate-900">
            Create Account
          </h2>
          <p className="mt-2 text-center text-sm text-slate-600">
            Join DocBook as a Patient or Doctor
          </p>
        </div>

        {/* Role Selection Toggle */}
        <div className="flex border border-slate-200 rounded-xl p-1 bg-slate-50 max-w-xs mx-auto">
          <button
            type="button"
            onClick={() => setRole('patient')}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
              role === 'patient'
                ? 'bg-violet-600 text-slate-900 shadow-md'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Patient
          </button>
          <button
            type="button"
            onClick={() => setRole('doctor')}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
              role === 'doctor'
                ? 'bg-cyan-600 text-slate-900 shadow-md'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Doctor
          </button>
        </div>

        {errorMsg && (
          <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl text-sm">
            <AlertCircle size={18} className="flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl text-sm">
            <CheckCircle size={18} className="flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <form className="mt-6 space-y-6" onSubmit={handleSubmit}>
          {/* Common Section */}
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
                  placeholder="e.g. John Doe"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-700">Email Address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Mail size={16} />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="custom-input w-full pl-10"
                  placeholder="e.g. john@example.com"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-700">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Lock size={16} />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="custom-input w-full pl-10"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-700">Phone Number</label>
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
          </div>

          {/* Conditional Role Section */}
          {role === 'patient' ? (
            <div className="border-t border-slate-200 pt-6 space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-600">
                Patient Profile Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-700">Gender</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="custom-input w-full"
                  >
                    <option value="Male" className="bg-slate-50">Male</option>
                    <option value="Female" className="bg-slate-50">Female</option>
                    <option value="Other" className="bg-slate-50">Other</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-700">Date of Birth</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                      <Calendar size={16} />
                    </div>
                    <input
                      type="date"
                      required
                      value={dob}
                      onChange={(e) => setDob(e.target.value)}
                      className="custom-input w-full pl-10"
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="border-t border-slate-200 pt-6 space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-600">
                Doctor Professional Details
              </h3>
              <p className="text-xs text-amber-400">
                * Note: Doctor accounts require Admin approval before slots can be booked by patients.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-700">Specialization</label>
                  <select
                    value={specializationId}
                    onChange={(e) => setSpecializationId(e.target.value)}
                    className="custom-input w-full"
                  >
                    {specializations.map(spec => (
                      <option key={spec.id} value={spec.id} className="bg-slate-50">
                        {spec.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-700">Years of Experience</label>
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
                      placeholder="e.g. 5"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-700">Consultation Fee (INR)</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500 font-semibold">
                      ₹
                    </div>
                    <input
                      type="number"
                      required
                      min="0"
                      value={consultationFee}
                      onChange={(e) => setConsultationFee(e.target.value)}
                      className="custom-input w-full pl-8"
                      placeholder="e.g. 500"
                    />
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
                    rows="3"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    className="custom-input w-full pl-10"
                    placeholder="Describe your qualifications, medical approaches, and clinical focus..."
                  />
                </div>
              </div>
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary w-full disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Creating Account...</span>
                </div>
              ) : (
                <>
                  <UserCheck size={18} /> Register Account
                </>
              )}
            </button>
          </div>
        </form>

        <div className="text-center text-sm text-slate-600">
          Already have an account?{' '}
          <Link to="/login" className="text-primary-400 hover:text-primary-300 font-semibold transition-colors">
            Sign In here
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Register;


