import React, { useState, useEffect, useMemo } from 'react';
import { 
  User, 
  Mail, 
  BadgeCheck, 
  Camera, 
  Edit3, 
  Lock, 
  X, 
  ShieldCheck,
  GraduationCap, 
  School, 
  UserCheck
} from 'lucide-react';

const normalizeSkills = (val) => {
  if (Array.isArray(val)) return val.map((s) => String(s).trim()).filter(Boolean);
  if (typeof val === 'string' && val.trim()) {
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) return parsed;
    } catch {}
    return val.split(',').map((s) => s.trim()).filter(Boolean);
  }
  return ['C / C++', 'Software Architecture', 'Data Structures', 'Git & DevOps'];
};

export default function ProfileView({ user = {}, onUpdateUser }) {
  const [profileState, setProfileState] = useState(() => {
    return {
      name: user.name || 'Student',
      email: user.email || '',
      studentId: user.studentId || '262-35-000',
      department: user.department || 'Software Engineering',
      university: user.university || 'Daffodil International University',
      program: user.program || 'B.Sc. in Software Engineering',
      semester: user.semester || '1st Semester',
      section: user.section || 'F1',
      academicSession: user.academicSession || 'Fall 2026',
      phone: user.phone || '+880 1700-000000',
      bloodGroup: user.bloodGroup || 'B+',
      bio: user.bio || 'Organizing study resources and tracking academic milestones via StudentOS.',
      skills: normalizeSkills(user.skills),
      avatar: user.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
      role: user.role || 'Undergraduate Student',
      advisor: {
        name: 'Dr. Sheikh Mohammad Mostafa',
        designation: 'Associate Professor & Batch Advisor',
        email: 'advisor.swe@diu.edu.bd',
        room: 'Room 604, Academic Building 02'
      },
      clearances: {
        library: 'Cleared',
        accounts: 'Tuition Paid',
        examHall: 'Admit Card Verified'
      }
    };
  });

  useEffect(() => {
    if (user && user.id) {
      setProfileState(prev => ({
        ...prev,
        ...user,
        skills: normalizeSkills(user.skills)
      }));
    }
  }, [user]);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [activeModalTab, setActiveModalTab] = useState('personal');
  const [isSaving, setIsSaving] = useState(false);

  // Modal Form Inputs
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formBloodGroup, setFormBloodGroup] = useState('B+');
  const [formAvatar, setFormAvatar] = useState('');
  const [formDepartment, setFormDepartment] = useState('');
  const [formProgram, setFormProgram] = useState('');
  const [formSemester, setFormSemester] = useState('1st Semester');
  const [formSection, setFormSection] = useState('F1');
  const [formBio, setFormBio] = useState('');
  const [formSkillsText, setFormSkillsText] = useState('');

  const handleOpenEditModal = () => {
    setFormName(profileState.name || '');
    setFormEmail(profileState.email || '');
    setFormPhone(profileState.phone || '');
    setFormBloodGroup(profileState.bloodGroup || 'B+');
    setFormAvatar(profileState.avatar || '');
    setFormDepartment(profileState.department || 'Software Engineering');
    setFormProgram(profileState.program || 'B.Sc. in Software Engineering');
    setFormSemester(profileState.semester || '1st Semester');
    setFormSection(profileState.section || 'F1');
    setFormBio(profileState.bio || '');
    setFormSkillsText(normalizeSkills(profileState.skills).join(', '));
    setActiveModalTab('personal');
    setIsEditModalOpen(true);
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setIsSaving(true);

    const parsedSkills = formSkillsText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const updatedPayload = {
      name: formName.trim(),
      phone: formPhone.trim(),
      bloodGroup: formBloodGroup,
      avatar: formAvatar,
      department: formDepartment,
      program: formProgram,
      semester: formSemester,
      section: formSection.trim(),
      bio: formBio.trim(),
      skills: parsedSkills
    };

    const token = localStorage.getItem('studentos_token');

    try {
      if (token) {
        const res = await fetch('http://localhost:5001/api/auth/profile', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(updatedPayload)
        });

        const result = await res.json();
        if (result.success && result.data) {
          const finalUser = { ...profileState, ...result.data };
          setProfileState(finalUser);
          localStorage.setItem('studentos_user', JSON.stringify(finalUser));
          window.dispatchEvent(new CustomEvent('studentos_user_updated', { detail: finalUser }));
          if (onUpdateUser) onUpdateUser(finalUser);
          setIsEditModalOpen(false);
          setIsSaving(false);
          return;
        }
      }

      // Local fallback if offline
      const localUpdated = { ...profileState, ...updatedPayload };
      setProfileState(localUpdated);
      localStorage.setItem('studentos_user', JSON.stringify(localUpdated));
      window.dispatchEvent(new CustomEvent('studentos_user_updated', { detail: localUpdated }));
      if (onUpdateUser) onUpdateUser(localUpdated);
      setIsEditModalOpen(false);
    } catch (err) {
      console.warn('Profile save note:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const safeSkillsList = useMemo(() => {
    return normalizeSkills(profileState.skills);
  }, [profileState.skills]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <School className="w-6 h-6 text-blue-600" />
            <span>Academic Identity & Profile</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">Your official institutional record and verification pass</p>
        </div>

        <button
          type="button"
          onClick={handleOpenEditModal}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-xs"
        >
          <Edit3 className="w-4 h-4" />
          <span>Edit Profile</span>
        </button>
      </div>

      {/* Identity Card */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-2xs relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <div className="relative group shrink-0">
              <img
                src={profileState.avatar}
                alt={profileState.name}
                className="w-24 h-24 rounded-2xl object-cover border-2 border-slate-100 shadow-xs"
              />
              <button
                type="button"
                onClick={handleOpenEditModal}
                className="absolute bottom-1 right-1 p-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition shadow-xs cursor-pointer"
                title="Change Photo"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-slate-900 tracking-tight">{profileState.name}</h2>
                <BadgeCheck className="w-5 h-5 text-blue-600 fill-blue-50" />
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Active
                </span>
              </div>
              <p className="text-xs font-bold text-blue-600">{profileState.department}</p>
              <span className="text-xs text-slate-400 font-semibold block">
                Official Student ID: <strong className="text-slate-900 font-mono">{profileState.studentId}</strong>
              </span>

              <div className="flex flex-wrap items-center gap-1.5 pt-2">
                <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                  {profileState.program}
                </span>
                <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                  {profileState.semester}
                </span>
                <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                  Section {profileState.section}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/90 space-y-2 min-w-[240px]">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 border-b border-slate-200/60 pb-1.5">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                Institutional Standing
              </span>
              <span className="text-[10px] font-black text-emerald-700 uppercase">Clear</span>
            </div>
            <div className="space-y-1 text-[10px] text-slate-500 font-medium">
              <div className="flex justify-between">
                <span>Library Account:</span>
                <strong className="text-slate-800">{profileState.clearances?.library || 'Cleared'}</strong>
              </div>
              <div className="flex justify-between">
                <span>Tuition & Ledger:</span>
                <strong className="text-slate-800">{profileState.clearances?.accounts || 'Tuition Paid'}</strong>
              </div>
              <div className="flex justify-between">
                <span>Admit Card Verification:</span>
                <strong className="text-emerald-600 font-bold">{profileState.clearances?.examHall || 'Verified'}</strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Information Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <User className="w-4 h-4 text-emerald-600" />
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">PERSONAL INFORMATION</h3>
          </div>
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Full Name</span>
              <strong className="text-slate-900 block mt-0.5">{profileState.name}</strong>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Email Address</span>
              <strong className="text-slate-900 block mt-0.5 font-mono text-[11px] truncate">{profileState.email}</strong>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Phone Number</span>
              <strong className="text-slate-900 block mt-0.5">{profileState.phone}</strong>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Blood Group</span>
              <strong className="text-rose-600 block mt-0.5 font-black">{profileState.bloodGroup}</strong>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-blue-600" />
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">ACADEMIC RECORDS</h3>
            </div>
            <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
              <Lock className="w-3 h-3" /> Registrar Verified
            </span>
          </div>
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Student ID</span>
              <strong className="text-slate-900 block mt-0.5 font-mono">{profileState.studentId}</strong>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">University</span>
              <strong className="text-slate-900 block mt-0.5 truncate">{profileState.university}</strong>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Department</span>
              <strong className="text-slate-900 block mt-0.5">{profileState.department}</strong>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Semester</span>
              <strong className="text-blue-600 block mt-0.5">{profileState.semester}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Advisor & Bio */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <UserCheck className="w-4 h-4 text-blue-600" />
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Assigned Faculty Advisor</h3>
          </div>
          <div className="space-y-1 text-xs">
            <strong className="text-slate-900 block text-sm font-black">{profileState.advisor?.name}</strong>
            <span className="text-[11px] text-slate-500 block">{profileState.advisor?.designation}</span>
            <span className="text-[11px] text-slate-500 block">{profileState.advisor?.room}</span>
            <a 
              href={`mailto:${profileState.advisor?.email}`}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:underline pt-1"
            >
              <Mail className="w-3 h-3" />
              <span>{profileState.advisor?.email}</span>
            </a>
          </div>
        </div>

        <div className="md:col-span-2 bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">BIO & ACADEMIC INTERESTS</span>
              <span className="text-[10px] font-bold text-blue-600">StudentOS Profile</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed pt-2">{profileState.bio}</p>
          </div>

          <div className="pt-2 border-t border-slate-100">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">TECHNICAL & ACADEMIC TOPICS:</span>
            <div className="flex flex-wrap gap-1.5">
              {safeSkillsList.map((skill, i) => (
                <span
                  key={i}
                  className="px-2.5 py-0.5 text-[11px] font-bold rounded-lg bg-blue-50 text-blue-700 border border-blue-200"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">Edit Academic Profile</h3>
                <p className="text-[11px] text-slate-400">Updates persist to database and sync across modules</p>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex bg-slate-100 p-1 rounded-xl my-4 text-xs font-bold">
              {[
                { id: 'personal', label: 'Personal' },
                { id: 'academic', label: 'Academic' },
                { id: 'about', label: 'About & Skills' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveModalTab(tab.id)}
                  className={`flex-1 py-1.5 rounded-lg transition cursor-pointer text-center ${
                    activeModalTab === tab.id ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              {activeModalTab === 'personal' && (
                <div className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-2">Profile Photo</label>
                    <div className="flex items-center gap-3">
                      <img 
                        src={formAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80'} 
                        alt="preview" 
                        className="w-14 h-14 rounded-2xl object-cover border-2 border-slate-200 shadow-2xs" 
                      />
                      <div>
                        <label className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl cursor-pointer transition shadow-2xs">
                          <Camera className="w-3.5 h-3.5" />
                          <span>Upload Photo</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onload = (event) => {
                                  if (event.target?.result) setFormAvatar(event.target.result);
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                          />
                        </label>
                        <span className="block text-[10px] text-slate-400 mt-1">PNG, JPG or WEBP up to 5MB</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Full Name *</label>
                    <input
                      type="text"
                      required
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Official Email</label>
                    <input
                      type="email"
                      disabled
                      value={formEmail}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 font-mono text-slate-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number</label>
                      <input
                        type="text"
                        value={formPhone}
                        onChange={(e) => setFormPhone(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Blood Group</label>
                      <select
                        value={formBloodGroup}
                        onChange={(e) => setFormBloodGroup(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      >
                        {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map((bg) => (
                          <option key={bg} value={bg}>{bg}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {activeModalTab === 'academic' && (
                <div className="space-y-3.5">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Student ID 🔒</label>
                      <input
                        type="text"
                        disabled
                        value={profileState.studentId}
                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 text-slate-500 font-mono font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">University 🔒</label>
                      <input
                        type="text"
                        disabled
                        value={profileState.university}
                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 text-slate-500 truncate font-medium"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Department</label>
                      <select
                        value={formDepartment}
                        onChange={(e) => setFormDepartment(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      >
                        <option value="Software Engineering">Software Engineering</option>
                        <option value="Computer Science">Computer Science</option>
                        <option value="Electrical Engineering">Electrical Engineering</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Program</label>
                      <input
                        type="text"
                        value={formProgram}
                        onChange={(e) => setFormProgram(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Current Semester *</label>
                      <select
                        value={formSemester}
                        onChange={(e) => setFormSemester(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-bold"
                      >
                        {['1st Semester', '2nd Semester', '3rd Semester', '4th Semester', '5th Semester'].map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Section</label>
                      <input
                        type="text"
                        value={formSection}
                        onChange={(e) => setFormSection(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-bold"
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeModalTab === 'about' && (
                <div className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Bio / About</label>
                    <textarea
                      rows={4}
                      value={formBio}
                      onChange={(e) => setFormBio(e.target.value)}
                      className="w-full p-3 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Skills & Academic Focus (comma-separated)
                    </label>
                    <input
                      type="text"
                      value={formSkillsText}
                      onChange={(e) => setFormSkillsText(e.target.value)}
                      placeholder="e.g. C / C++, Software Architecture, Algorithms"
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}