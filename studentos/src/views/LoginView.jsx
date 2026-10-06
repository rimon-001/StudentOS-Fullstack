import React, { useState } from 'react';
import { 
  GraduationCap, 
  CheckCircle2, 
  ArrowRight, 
  Sparkles, 
  Eye, 
  EyeOff, 
  Mail, 
  Lock, 
  KeyRound, 
  RotateCcw, 
  ShieldCheck, 
  Check, 
  X,
  BookOpen,
  Calendar,
  Layers,
  Award,
  AlertCircle
} from 'lucide-react';

export default function LoginView({ onLoginSuccess, onStartDemo }) {
  // Modes: 'signin' | 'signup_step1' | 'signup_step2' | 'signup_success' | 'forgot_password'
  const [authMode, setAuthMode] = useState('signin');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Sign In State
  const [loginEmail, setLoginEmail] = useState('rimon@university.edu');
  const [loginPassword, setLoginPassword] = useState('password123');
  const [rememberMe, setRememberMe] = useState(true);

  // Sign Up Wizard State
  const [fullName, setFullName] = useState('Md Jahid Hasan Rimon');
  const [regEmail, setRegEmail] = useState('rimon@gmail.com');
  const [regPassword, setRegPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Step 2 Academic State
  const [studentId, setStudentId] = useState('262-35-658');
  const [university, setUniversity] = useState('Daffodil International University');
  const [department, setDepartment] = useState('Software Engineering');
  const [program, setProgram] = useState('Undergraduate (B.Sc.)');
  const [currentSemester, setCurrentSemester] = useState('1st Semester');
  const [section, setSection] = useState('F1');
  const [agreeTerms, setAgreeTerms] = useState(true);

  // Stored state of the newly created student profile
  const [registeredUser, setRegisteredUser] = useState(null);

  // Forgot Password & OTP State
  const [forgotEmail, setForgotEmail] = useState('');
  const [recoveryStep, setRecoveryStep] = useState(1);
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // Password Strength Evaluation
  const passwordStrength = (() => {
    if (!regPassword) return { score: 0, text: 'Too short', color: 'bg-slate-200' };
    if (regPassword.length < 6) return { score: 1, text: 'Weak', color: 'bg-rose-500' };
    if (regPassword.length < 10) return { score: 2, text: 'Medium', color: 'bg-amber-500' };
    return { score: 3, text: 'Strong', color: 'bg-emerald-500' };
  })();

  // 1. Handle Institutional Login (Using relative URL through Vite Proxy)
  const handleLoginSubmit = async (e) => {
    if (e) e.preventDefault();
    setErrorMessage('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword, rememberMe })
      });
      const data = await res.json();

      if (data.success && data.data) {
        localStorage.removeItem('studentos_is_demo');
        localStorage.setItem('studentos_token', data.data.token);
        localStorage.setItem('studentos_user', JSON.stringify(data.data.user));
        if (onLoginSuccess) onLoginSuccess(data.data.user);
      } else {
        setErrorMessage(data.message || 'Invalid institutional credentials');
      }
    } catch {
      setErrorMessage('Could not connect to authentication server');
    } finally {
      setLoading(false);
    }
  };

  // 2. Trigger One-Click Demo Mode
  const handleLaunchDemo = () => {
    const demoUser = {
      name: 'Md. Jahid Hasan Rimon',
      email: 'rimon.demo@studentos.univ',
      studentId: '262-35-658',
      role: 'STUDENT',
      department: 'Software Engineering',
      semester: '1st Semester',
      section: 'F1',
      university: 'Daffodil International University',
      isDemo: true
    };
    if (onStartDemo) {
      onStartDemo(demoUser);
    } else if (onLoginSuccess) {
      onLoginSuccess(demoUser);
    }
  };

  // 3. Trigger Instant Admin Login
  const handleAdminLogin = async () => {
    setErrorMessage('');
    setLoading(true);
    setLoginEmail('admin@student.os');
    setLoginPassword('admin123');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin@student.os', password: 'admin123', rememberMe: true })
      });
      const data = await res.json();

      if (data.success && data.data) {
        localStorage.removeItem('studentos_is_demo');
        localStorage.setItem('studentos_token', data.data.token);
        localStorage.setItem('studentos_user', JSON.stringify(data.data.user));
        if (onLoginSuccess) onLoginSuccess(data.data.user);
      } else {
        setErrorMessage(data.message || 'Could not verify admin account');
      }
    } catch {
      setErrorMessage('Could not connect to authentication server');
    } finally {
      setLoading(false);
    }
  };

  // 4. Step 1 -> Step 2 Registration Transition
  const handleContinueToStep2 = (e) => {
    e.preventDefault();
    setErrorMessage('');
    if (!fullName.trim() || !regEmail.trim() || !regPassword) {
      setErrorMessage('Please fill in all identity fields.');
      return;
    }
    if (regPassword !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }
    setAuthMode('signup_step2');
  };

  // 5. Complete Registration (Step 2 Submit)
  const handleCompleteRegistration = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    if (!agreeTerms) {
      setErrorMessage('You must accept the academic usage terms to continue.');
      return;
    }

    setLoading(true);
    const newStudentProfile = {
      name: fullName.trim(),
      email: regEmail.trim(),
      password: regPassword,
      studentId: studentId.trim(),
      university,
      department,
      program,
      semester: currentSemester,
      section: section.trim(),
      role: 'STUDENT',
      isDemo: false
    };

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newStudentProfile)
      });
      const data = await res.json();

      if (data.success && data.data) {
        localStorage.removeItem('studentos_is_demo');
        localStorage.setItem('studentos_token', data.data.token);
        localStorage.setItem('studentos_user', JSON.stringify(data.data.user));
        setRegisteredUser(data.data.user);
        setAuthMode('signup_success');
      } else {
        setErrorMessage(data.message || 'Registration failed');
      }
    } catch {
      setErrorMessage('Server connection error during registration');
    } finally {
      setLoading(false);
    }
  };

  // 6. Send Forgot Password OTP
  const handleSendRecoveryOTP = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    if (!forgotEmail.trim()) return;

    setLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail })
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMessage(data.message);
        setRecoveryStep(2);
      } else {
        setErrorMessage(data.message || 'User not found');
      }
    } catch {
      setErrorMessage('Failed to send recovery code. Check backend connection.');
    } finally {
      setLoading(false);
    }
  };

  // 7. Reset Password with OTP
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail, otp: otpCode, newPassword })
      });
      const data = await res.json();

      if (data.success) {
        alert('Password reset successful! Please log in with your new password.');
        setAuthMode('signin');
      } else {
        setErrorMessage(data.message || 'Invalid or expired OTP');
      }
    } catch {
      setErrorMessage('Failed to reset password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-[#0B132B] text-slate-800 font-sans">
      
      {/* LEFT BRAND PANEL */}
      <div className="lg:w-1/2 p-8 sm:p-14 lg:p-16 flex flex-col justify-between bg-gradient-to-br from-[#070D1E] via-[#0D1B3E] to-[#122252] text-white border-b lg:border-b-0 lg:border-r border-slate-800/80">
        <div>
          <div className="flex items-center gap-2.5 mb-10 lg:mb-14">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-black tracking-tight text-white">StudentOS</span>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-400/30">
                WORKSPACE
              </span>
            </div>
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-400/20 text-blue-300 text-xs font-bold mb-6">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
            <span>Fall 2026 Academic Release</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white leading-tight mb-4">
            Your university life, <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-sky-200">
              organized.
            </span>
          </h1>

          <p className="text-slate-400 text-sm sm:base max-w-md leading-relaxed mb-8 lg:mb-10">
            Everything you need to manage your academic life in one unified, high-performance workspace.
          </p>

          <div className="space-y-4 max-w-md">
            {[
              { title: 'Courses & Routine', desc: 'Smart timetable with lecture notifications' },
              { title: 'Assignments', desc: 'Kanban pipelines linked with course repositories' },
              { title: 'Attendance & GPA', desc: 'Real-time thresholds and semester projections' },
              { title: 'Study Materials', desc: 'Unified PDF previewer, slides, and personal notes' }
            ].map((feature, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mt-0.5 shrink-0 text-emerald-400">
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </div>
                <div className="text-xs">
                  <strong className="text-slate-200 font-bold">{feature.title}:</strong>{' '}
                  <span className="text-slate-400">{feature.desc}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="pt-8 flex items-center justify-between text-xs text-slate-500 border-t border-slate-800/60 mt-8">
          <span>Designed for students, researchers & engineers</span>
          <span className="flex items-center gap-1.5 text-slate-400">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" /> Local-first • StudentOS AI
          </span>
        </div>
      </div>

      {/* RIGHT AUTH PANEL */}
      <div className="lg:w-1/2 p-6 sm:p-14 lg:p-16 flex items-center justify-center bg-white">
        <div className="w-full max-w-md space-y-6">

          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {authMode === 'signin' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                  <span>Welcome back</span> 👋
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Please enter your institutional credentials to continue.
                </p>
              </div>

              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Email address</label>
                  <input
                    type="email"
                    required
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="student@university.edu"
                    className="w-full px-3.5 py-2.5 text-xs font-medium border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-900 bg-white"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700">Password</label>
                    <button
                      type="button"
                      onClick={() => {
                        setForgotEmail(loginEmail);
                        setAuthMode('forgot_password');
                      }}
                      className="text-xs font-bold text-blue-600 hover:underline cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-3.5 py-2.5 text-xs font-medium border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-900 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="rememberMe"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="rememberMe" className="text-xs text-slate-600 font-medium cursor-pointer">
                    Remember me for 30 days
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                >
                  <span>{loading ? 'Authenticating...' : 'Login to StudentOS'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>

              {/* ONE-CLICK DEMO BUTTON */}
              <button
                type="button"
                onClick={handleLaunchDemo}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer border border-slate-200"
              >
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>One-Click Demo (Md. Jahid Hasan Rimon)</span>
              </button>

              {/* FIXED INSTANT ADMIN BUTTON */}
              <button
                type="button"
                disabled={loading}
                onClick={handleAdminLogin}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-purple-700 bg-purple-50 border border-purple-200 hover:bg-purple-100 transition cursor-pointer flex items-center justify-center gap-2 shadow-2xs disabled:opacity-50"
              >
                <ShieldCheck className="w-4 h-4 text-purple-600" />
                <span>{loading ? 'Entering Console...' : 'Instant Admin Login (admin@student.os)'}</span>
              </button>

              <div className="text-center pt-2 border-t border-slate-100">
                <span className="text-xs text-slate-500">New to StudentOS? </span>
                <button
                  type="button"
                  onClick={() => {
                    setErrorMessage('');
                    setAuthMode('signup_step1');
                  }}
                  className="text-xs font-bold text-blue-600 hover:underline cursor-pointer"
                >
                  Create an account
                </button>
              </div>
            </div>
          )}

          {/* SIGN UP WIZARD - STEP 1 */}
          {authMode === 'signup_step1' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setAuthMode('signin')}
                  className="text-xs font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  ← Back to Login
                </button>
                <span className="text-xs font-extrabold text-blue-600">Step 1 of 2</span>
              </div>

              <div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Create your account</h2>
                <p className="text-xs text-slate-500 mt-1">Let's start with your account credentials</p>
              </div>

              <div className="flex items-center gap-3 text-xs font-bold">
                <div className="flex items-center gap-1.5 text-blue-600">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[11px]">1</span>
                  <span>Account</span>
                </div>
                <div className="h-px w-8 bg-slate-200" />
                <div className="flex items-center gap-1.5 text-slate-400">
                  <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center text-[11px]">2</span>
                  <span>Academic</span>
                </div>
              </div>

              <form onSubmit={handleContinueToStep2} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Md Jahid Hasan Rimon"
                    className="w-full px-3.5 py-2.5 text-xs font-medium border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Institutional Email *</label>
                  <input
                    type="email"
                    required
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="jahid.rimon@university.edu"
                    className="w-full px-3.5 py-2.5 text-xs font-medium border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Create Password *</label>
                  <input
                    type="password"
                    required
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Minimum 8 characters"
                    className="w-full px-3.5 py-2.5 text-xs font-medium border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Confirm Password *</label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    className="w-full px-3.5 py-2.5 text-xs font-medium border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-900"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="text-slate-400 font-medium">Password strength</span>
                    <span className="font-bold text-slate-600">{passwordStrength.text}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    <div className={`h-1.5 rounded-full ${passwordStrength.score >= 1 ? passwordStrength.color : 'bg-slate-200'}`} />
                    <div className={`h-1.5 rounded-full ${passwordStrength.score >= 2 ? passwordStrength.color : 'bg-slate-200'}`} />
                    <div className={`h-1.5 rounded-full ${passwordStrength.score >= 3 ? passwordStrength.color : 'bg-slate-200'}`} />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-xs mt-2"
                >
                  <span>Continue to Academic Identity</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            </div>
          )}

          {/* SIGN UP WIZARD - STEP 2 */}
          {authMode === 'signup_step2' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setAuthMode('signup_step1')}
                  className="text-xs font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  ← Back to Step 1
                </button>
                <span className="text-xs font-extrabold text-blue-600">Step 2 of 2</span>
              </div>

              <div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Tell us about your studies</h2>
                <p className="text-xs text-slate-500 mt-1">Essential academic information for your course workspace</p>
              </div>

              <div className="flex items-center gap-3 text-xs font-bold">
                <div className="flex items-center gap-1.5 text-emerald-600">
                  <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[11px]">✓</span>
                  <span>Account</span>
                </div>
                <div className="h-px w-8 bg-blue-600" />
                <div className="flex items-center gap-1.5 text-blue-600">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[11px]">2</span>
                  <span>Academic</span>
                </div>
              </div>

              <form onSubmit={handleCompleteRegistration} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Student ID *</label>
                  <input
                    type="text"
                    required
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    placeholder="262-35-658"
                    className="w-full px-3.5 py-2.5 text-xs font-medium border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">University / Institution *</label>
                  <input
                    type="text"
                    required
                    value={university}
                    onChange={(e) => setUniversity(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs font-medium border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-900"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Department *</label>
                    <select
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl font-medium bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    >
                      <option value="Software Engineering">Software Engineering</option>
                      <option value="Computer Science">Computer Science</option>
                      <option value="Electrical Engineering">Electrical Engineering</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Program *</label>
                    <select
                      value={program}
                      onChange={(e) => setProgram(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl font-medium bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    >
                      <option value="Undergraduate (B.Sc.)">Undergraduate (B.Sc.)</option>
                      <option value="Graduate (M.Sc.)">Graduate (M.Sc.)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Current Semester *</label>
                    <select
                      value={currentSemester}
                      onChange={(e) => setCurrentSemester(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl font-medium bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    >
                      <option value="1st Semester">1st Semester</option>
                      <option value="2nd Semester">2nd Semester</option>
                      <option value="3rd Semester">3rd Semester</option>
                      <option value="4th Semester">4th Semester</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Section *</label>
                    <input
                      type="text"
                      required
                      value={section}
                      onChange={(e) => setSection(e.target.value)}
                      placeholder="e.g. F1 or A"
                      className="w-full px-3 py-2 text-xs font-medium border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-900"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="agreeTerms"
                    checked={agreeTerms}
                    onChange={(e) => setAgreeTerms(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="agreeTerms" className="text-xs text-slate-600 cursor-pointer">
                    I agree to the StudentOS academic usage terms & personal privacy policy.
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-xs mt-2"
                >
                  <Check className="w-4 h-4" />
                  <span>{loading ? 'Configuring Workspace...' : 'Create StudentOS Account'}</span>
                </button>
              </form>
            </div>
          )}

          {/* SIGN UP SUCCESS */}
          {authMode === 'signup_success' && (
            <div className="space-y-6 text-center animate-in zoom-in-95 duration-200">
              <div className="w-14 h-14 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-full flex items-center justify-center mx-auto">
                <Check className="w-7 h-7 stroke-[3]" />
              </div>

              <div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">You're all set!</h2>
                <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                  Welcome to StudentOS, <strong className="text-slate-800">{registeredUser?.name || fullName}</strong>. Your personalized academic workspace is ready.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 text-left space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-slate-700 font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Account Identity Created
                  </span>
                  <span className="text-[10px] font-bold text-emerald-600">Ready</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-slate-700 font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Academic Profile Initialized
                  </span>
                  <span className="text-[10px] font-bold text-blue-600">Linked</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-slate-700 font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Course & Routine Enrollment
                  </span>
                  <span className="text-[10px] font-bold text-purple-600">Auto</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  const finalUser = registeredUser || JSON.parse(localStorage.getItem('studentos_user') || '{}');
                  localStorage.removeItem('studentos_is_demo');
                  if (onLoginSuccess) onLoginSuccess(finalUser);
                }}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                <span>Enter My Workspace</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* FORGOT PASSWORD */}
          {authMode === 'forgot_password' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setAuthMode('signin')}
                  className="text-xs font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  ← Back to Login
                </button>
                <span className="text-xs font-extrabold text-blue-600">Security Recovery</span>
              </div>

              <div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Reset Password</h2>
                <p className="text-xs text-slate-500 mt-1">
                  {recoveryStep === 1 
                    ? 'Enter your registered institutional email to receive a recovery code.' 
                    : 'Check your email (or terminal console) for the 6-digit OTP code.'}
                </p>
              </div>

              {successMessage && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold">
                  {successMessage}
                </div>
              )}

              {recoveryStep === 1 ? (
                <form onSubmit={handleSendRecoveryOTP} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Institutional Email</label>
                    <input
                      type="email"
                      required
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="student@university.edu"
                      className="w-full px-3.5 py-2.5 text-xs font-medium border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-900"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                  >
                    <span>{loading ? 'Dispatching OTP...' : 'Send Recovery Code'}</span>
                    <Mail className="w-4 h-4" />
                  </button>
                </form>
              ) : (
                <form onSubmit={handleResetPassword} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">6-Digit OTP Code</label>
                    <input
                      type="text"
                      required
                      maxLength={6}
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                      placeholder="123456"
                      className="w-full px-3.5 py-2.5 text-center tracking-widest text-lg font-black border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">New Password</label>
                    <input
                      type="password"
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new secure password"
                      className="w-full px-3.5 py-2.5 text-xs font-medium border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-900"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                  >
                    <span>{loading ? 'Resetting Password...' : 'Save New Password & Login'}</span>
                    <Check className="w-4 h-4" />
                  </button>
                </form>
              )}
            </div>
          )}

          <div className="text-center text-[10px] text-slate-400">
            StudentOS © 2026 • Academic Life & Workspace Platform
          </div>
        </div>
      </div>
    </div>
  );
}