import React, { useState, useMemo, useEffect } from 'react';
import { 
  ArrowLeft, 
  BookOpen, 
  CheckSquare, 
  Award, 
  FolderArchive, 
  FileText, 
  Download, 
  BarChart3,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Save,
  Copy,
  Check,
  Trash2,
  Calculator,
  Printer,
  FileDown,
  ListChecks,
  ExternalLink
} from 'lucide-react';

export default function CourseWorkspaceView({
  courseCode,
  courses = [],
  workItems = [],
  exams = [],
  materials = [],
  onBack
}) {
  const [activeTab, setActiveTab] = useState('overview');
  const [notes, setNotes] = useState('');
  const [copied, setCopied] = useState(false);
  const [savedStatus, setSavedStatus] = useState(false);

  // Match the active course
  const matchedCourse = useMemo(() => {
    return courses.find((c) => c.code?.toUpperCase() === courseCode?.toUpperCase());
  }, [courses, courseCode]);

  const [courseState, setCourseState] = useState(() => {
    return matchedCourse || {
      id: 'c_' + (courseCode || 'course'),
      code: courseCode || 'CSE 101',
      name: 'Structured Programming',
      teacher: 'Faculty Advisor',
      credits: 3,
      room: 'Room TBA',
      attendance_present: 0,
      attendance_total: 0
    };
  });

  useEffect(() => {
    if (matchedCourse) {
      setCourseState(matchedCourse);
    }
  }, [matchedCourse]);

  // Syllabus Checklist State (Persisted per course)
  const [syllabusModules, setSyllabusModules] = useState(() => {
    const storageKey = `studentos_syllabus_${(courseCode || 'course').trim().toUpperCase()}`;
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.warn(e);
      }
    }
    return [
      { id: 'm1', title: 'Module 1: Foundations, Notations & Fundamentals', completed: true },
      { id: 'm2', title: 'Module 2: Theoretical Models & Algorithm Design', completed: true },
      { id: 'm3', title: 'Module 3: Intermediate Paradigms & Constraints', completed: false },
      { id: 'm4', title: 'Module 4: Advanced Architectures & Systems', completed: false },
      { id: 'm5', title: 'Module 5: Practical Applications & Final Project', completed: false }
    ];
  });

  useEffect(() => {
    if (courseState.code) {
      const storageKey = `studentos_syllabus_${courseState.code.trim().toUpperCase()}`;
      localStorage.setItem(storageKey, JSON.stringify(syllabusModules));
    }
  }, [syllabusModules, courseState.code]);

  const toggleSyllabusModule = (id) => {
    setSyllabusModules((prev) =>
      prev.map((m) => (m.id === id ? { ...m, completed: !m.completed } : m))
    );
  };

  const syllabusProgress = useMemo(() => {
    const completed = syllabusModules.filter((m) => m.completed).length;
    return syllabusModules.length > 0 ? Math.round((completed / syllabusModules.length) * 100) : 0;
  }, [syllabusModules]);

  // Mark Weightage & Grade Components State
  const [weightComponents, setWeightComponents] = useState([
    { id: 'w1', name: 'Quizzes (Best 2 of 3)', obtained: 18, total: 20, weight: 15 },
    { id: 'w2', name: 'Midterm Examination', obtained: 34, total: 40, weight: 25 },
    { id: 'w3', name: 'Assignments & Labs', obtained: 25, total: 30, weight: 20 },
    { id: 'w4', name: 'Final Examination', obtained: 0, total: 100, weight: 40 }
  ]);

  const [newCompName, setNewCompName] = useState('');
  const [newCompObtained, setNewCompObtained] = useState('');
  const [newCompTotal, setNewCompTotal] = useState('');
  const [newCompWeight, setNewCompWeight] = useState('');

  // Persistent Lecture Notes
  useEffect(() => {
    if (courseState.code) {
      const storageKey = `studentos_notes_${courseState.code.trim().toUpperCase()}`;
      const saved = localStorage.getItem(storageKey);
      setNotes(saved || '');
    }
  }, [courseState.code]);

  const handleSaveNotes = () => {
    if (courseState.code) {
      const storageKey = `studentos_notes_${courseState.code.trim().toUpperCase()}`;
      localStorage.setItem(storageKey, notes);
      setSavedStatus(true);
      setTimeout(() => setSavedStatus(false), 2000);
    }
  };

  const handleCopyNotes = () => {
    if (!notes) return;
    navigator.clipboard.writeText(notes);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClearNotes = () => {
    if (!window.confirm(`Clear all scratchpad notes for ${courseState.code}?`)) return;
    setNotes('');
    if (courseState.code) {
      localStorage.removeItem(`studentos_notes_${courseState.code.trim().toUpperCase()}`);
    }
  };

  const handleExportMarkdown = () => {
    const header = `# ${courseState.code} - ${courseState.name}\n`
      + `Faculty: ${courseState.teacher || 'Faculty Advisor'} | Room: ${courseState.room || 'TBA'}\n`
      + `Exported: ${new Date().toLocaleDateString('en-US')}\n`
      + `Syllabus Completion: ${syllabusProgress}%\n\n---\n\n`;

    const blob = new Blob([header + (notes || '_No notes recorded._')], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${courseState.code}_Lecture_Notes.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Quick Attendance Actions (Syncs to SQLite backend)
  const handleMarkCourseAttendance = async (isPresent) => {
    const curPresent = courseState.attendance_present ?? courseState.attendance?.present ?? 0;
    const curTotal = courseState.attendance_total ?? courseState.attendance?.total ?? 0;

    const nextPresent = isPresent ? curPresent + 1 : curPresent;
    const nextTotal = curTotal + 1;

    const updatedCourse = {
      ...courseState,
      attendance_present: nextPresent,
      attendance_total: nextTotal,
      attendance: { present: nextPresent, total: nextTotal }
    };

    setCourseState(updatedCourse);

    const token = localStorage.getItem('studentos_token');
    if (token) {
      try {
        await fetch(`http://localhost:5001/api/courses/${courseState.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(updatedCourse)
        });
      } catch (e) {
        console.warn('Attendance backend sync warning:', e);
      }
    }

    try {
      const savedCourses = JSON.parse(localStorage.getItem('studentos_courses') || '[]');
      const newCourses = savedCourses.map((c) =>
        c.code?.toUpperCase() === courseState.code?.toUpperCase() ? updatedCourse : c
      );
      localStorage.setItem('studentos_courses', JSON.stringify(newCourses));
      window.dispatchEvent(new CustomEvent('studentos_courses_updated', { detail: newCourses }));
    } catch (e) {
      console.warn(e);
    }
  };

  const handleAddWeightComponent = (e) => {
    e.preventDefault();
    if (!newCompName.trim()) return;

    const comp = {
      id: 'wc_' + Date.now(),
      name: newCompName.trim(),
      obtained: parseFloat(newCompObtained) || 0,
      total: parseFloat(newCompTotal) || 100,
      weight: parseFloat(newCompWeight) || 10
    };

    setWeightComponents([...weightComponents, comp]);
    setNewCompName('');
    setNewCompObtained('');
    setNewCompTotal('');
    setNewCompWeight('');
  };

  const handleDeleteWeightComponent = (id) => {
    setWeightComponents(weightComponents.filter((w) => w.id !== id));
  };

  const totalWeightAssigned = weightComponents.reduce((sum, w) => sum + (Number(w.weight) || 0), 0);
  
  const currentWeightedScore = weightComponents.reduce((sum, w) => {
    const t = Number(w.total) || 1;
    const o = Number(w.obtained) || 0;
    const wt = Number(w.weight) || 0;
    return sum + (o / t) * wt;
  }, 0);

  const projectedGradeLetter = (() => {
    const score = currentWeightedScore;
    if (score >= 80) return { letter: 'A+', gpa: '4.00' };
    if (score >= 75) return { letter: 'A', gpa: '3.75' };
    if (score >= 70) return { letter: 'A-', gpa: '3.50' };
    if (score >= 65) return { letter: 'B+', gpa: '3.25' };
    if (score >= 60) return { letter: 'B', gpa: '3.00' };
    if (score >= 50) return { letter: 'C+', gpa: '2.50' };
    if (score >= 40) return { letter: 'D', gpa: '2.00' };
    return { letter: 'F', gpa: '0.00' };
  })();

  const courseTasks = useMemo(() => {
    return (workItems || []).filter(
      (w) =>
        (w.courseCode && w.courseCode.toUpperCase() === courseState.code.toUpperCase()) ||
        (w.course && w.course.toUpperCase() === courseState.code.toUpperCase()) ||
        (w.courseName && w.courseName.toUpperCase().includes(courseState.code.toUpperCase()))
    );
  }, [workItems, courseState.code]);

  const courseExams = useMemo(() => {
    return (exams || []).filter(
      (e) => (e.courseCode || e.course)?.toUpperCase() === courseState.code.toUpperCase()
    );
  }, [exams, courseState.code]);

  const courseMaterials = useMemo(() => {
    return (materials || []).filter(
      (m) => (m.courseCode || '').toUpperCase() === courseState.code.toUpperCase()
    );
  }, [materials, courseState.code]);

  const totalHeld = courseState.attendance_total ?? courseState.attendance?.total ?? 0;
  const presentCount = courseState.attendance_present ?? courseState.attendance?.present ?? 0;
  const absentCount = Math.max(0, totalHeld - presentCount);
  const attendancePct = totalHeld > 0 ? Math.round((presentCount / totalHeld) * 100) : 100;
  const canMiss = Math.floor((presentCount - 0.75 * totalHeld) / 0.75);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-900 transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Course Directory</span>
        </button>

        <span className="text-xs font-bold text-slate-400">
          Faculty: <strong className="text-slate-800">{courseState.teacher || 'Faculty Advisor'}</strong>
        </span>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded text-[10px] font-extrabold bg-blue-50 text-blue-700 border border-blue-200">
                {courseState.credits || courseState.credit || 3} Credits
              </span>
              <span className="text-xs font-bold text-slate-400">{courseState.room || 'Room TBA'}</span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
              {courseState.code} — {courseState.name}
            </h1>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Syllabus</span>
              <span className="text-base font-black text-blue-600">{syllabusProgress}%</span>
            </div>
            <div className="text-right border-l border-slate-100 pl-4">
              <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Attendance</span>
              <span className={`text-xl font-black ${attendancePct >= 75 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {attendancePct}%
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
          {[
            { id: 'overview', label: 'Overview', icon: BookOpen },
            { id: 'syllabus', label: `Syllabus (${syllabusProgress}%)`, icon: ListChecks },
            { id: 'attendance', label: `Attendance (${attendancePct}%)`, icon: BarChart3 },
            { id: 'weightage', label: 'Grade & Weightage', icon: Calculator },
            { id: 'tasks', label: `Tasks (${courseTasks.length})`, icon: CheckSquare },
            { id: 'exams', label: `Exams (${courseExams.length})`, icon: Award },
            { id: 'materials', label: `Study Materials (${courseMaterials.length})`, icon: FolderArchive },
            { id: 'notes', label: 'Scratchpad', icon: FileText }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab 1: Overview */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Class Schedule & Room</span>
              <p className="text-xs font-bold text-slate-800 mt-1">{courseState.room || 'Room TBA'}</p>
              <span className="text-[11px] text-slate-500 block">Faculty: {courseState.teacher || 'TBA'}</span>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Next Assessment</span>
              <p className="text-xs font-bold text-slate-800 mt-1">
                {courseExams[0]?.title || 'No upcoming exam'}
              </p>
              <span className="text-[11px] text-rose-600 font-semibold block">
                {courseExams[0]?.date ? `Date: ${courseExams[0].date}` : 'Check Exam Center'}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Safe Skip Allowance</span>
              <p className={`text-xs font-bold mt-1 ${canMiss > 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
                {canMiss > 0 ? `Can miss ${canMiss} class${canMiss > 1 ? 'es' : ''}` : 'On the 75% threshold!'}
              </p>
              <span className="text-[11px] text-slate-500 block">{presentCount} of {totalHeld} attended</span>
            </div>
          </div>
        )}

        {/* Tab 2: Syllabus Mastery */}
        {activeTab === 'syllabus' && (
          <div className="space-y-4 pt-2">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Course Completion</span>
                <div className="text-2xl font-black text-blue-600 mt-0.5">{syllabusProgress}%</div>
                <span className="text-[11px] text-slate-500">
                  {syllabusModules.filter((m) => m.completed).length} of {syllabusModules.length} core modules completed
                </span>
              </div>
              <div className="w-48 bg-white border border-slate-200 h-2.5 rounded-full overflow-hidden">
                <div className="bg-blue-600 h-full rounded-full transition-all duration-500" style={{ width: `${syllabusProgress}%` }} />
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
              {syllabusModules.map((mod) => (
                <label 
                  key={mod.id} 
                  className="p-3.5 flex items-center justify-between hover:bg-slate-50/70 transition cursor-pointer text-xs"
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={mod.completed}
                      onChange={() => toggleSyllabusModule(mod.id)}
                      className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                    />
                    <span className={`font-bold ${mod.completed ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                      {mod.title}
                    </span>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    mod.completed ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {mod.completed ? 'Mastered' : 'Pending'}
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Tab 3: Attendance */}
        {activeTab === 'attendance' && (
          <div className="space-y-5 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Attendance Rate</span>
                <div className={`text-2xl font-black mt-1 ${attendancePct >= 75 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {attendancePct}%
                </div>
                <span className="text-[11px] text-slate-500">{attendancePct >= 75 ? 'Above 75% threshold' : 'Attendance Risk!'}</span>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Classes Attended</span>
                <div className="text-2xl font-black text-slate-900 mt-1">{presentCount}</div>
                <span className="text-[11px] text-emerald-600 font-semibold">Present Sessions</span>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Classes Missed</span>
                <div className="text-2xl font-black text-slate-900 mt-1">{absentCount}</div>
                <span className="text-[11px] text-rose-500 font-semibold">Absent Sessions</span>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Held</span>
                <div className="text-2xl font-black text-slate-900 mt-1">{totalHeld}</div>
                <span className="text-[11px] text-slate-500">Conducted Classes</span>
              </div>
            </div>

            <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-xs font-bold text-slate-900">Record Attendance</h4>
                <p className="text-[11px] text-slate-500">Increment attendance tallies directly in database.</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleMarkCourseAttendance(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-2xs"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Mark Present (+1)</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleMarkCourseAttendance(false)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-2xs"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Mark Absent (+1)</span>
                </button>
              </div>
            </div>

            <div className={`p-4 rounded-xl border flex items-center gap-3 ${
              attendancePct >= 75 
                ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900' 
                : 'bg-rose-50/60 border-rose-200 text-rose-900'
            }`}>
              {attendancePct >= 75 ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
              )}
              <div className="text-xs">
                <strong className="block font-bold">
                  {attendancePct >= 75 ? 'Attendance Status: Healthy Standing' : 'Attendance Status: Critical Warning'}
                </strong>
                <p className="text-[11px] opacity-90 mt-0.5">
                  {canMiss > 0
                    ? `Safe to miss up to ${canMiss} upcoming session(s) while remaining above 75%.`
                    : 'Attendance is under 75%. Prioritize attending the upcoming sessions.'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Weightage & Grade Calculator */}
        {activeTab === 'weightage' && (
          <div className="space-y-5 pt-2">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Current Weighted Score</span>
                <div className="text-2xl font-black text-blue-600 mt-1">{currentWeightedScore.toFixed(1)} / 100</div>
                <span className="text-[11px] text-slate-500">Based on entered components</span>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Projected Grade</span>
                <div className="text-2xl font-black text-emerald-600 mt-1">
                  {projectedGradeLetter.letter} <span className="text-sm font-bold text-slate-400">({projectedGradeLetter.gpa})</span>
                </div>
                <span className="text-[11px] text-slate-500">Estimated letter grade</span>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Weight Assigned</span>
                <div className={`text-2xl font-black mt-1 ${totalWeightAssigned === 100 ? 'text-slate-900' : 'text-amber-600'}`}>
                  {totalWeightAssigned}%
                </div>
                <span className="text-[11px] text-slate-500">{totalWeightAssigned === 100 ? 'Fully balanced (100%)' : 'Should total 100%'}</span>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-700 uppercase">
                Assessment Breakdown & Marks
              </div>
              <div className="divide-y divide-slate-100">
                {weightComponents.map((comp) => {
                  const compPct = comp.total > 0 ? ((comp.obtained / comp.total) * 100).toFixed(1) : 0;
                  const weightedContribution = ((comp.obtained / (comp.total || 1)) * comp.weight).toFixed(1);

                  return (
                    <div key={comp.id} className="p-3.5 flex items-center justify-between text-xs gap-4">
                      <div className="min-w-0 flex-1">
                        <strong className="text-slate-900 font-bold block truncate">{comp.name}</strong>
                        <span className="text-[10px] text-slate-400">Weight: {comp.weight}% of final grade</span>
                      </div>

                      <div className="flex items-center gap-4 text-right">
                        <div>
                          <span className="font-bold text-slate-800">{comp.obtained} / {comp.total}</span>
                          <span className="text-[10px] text-slate-400 block">{compPct}% ({weightedContribution} pts)</span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDeleteWeightComponent(comp.id)}
                          className="p-1 text-slate-300 hover:text-rose-600 rounded transition cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <form onSubmit={handleAddWeightComponent} className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
              <h4 className="text-xs font-bold text-slate-900">Add Custom Assessment Component</h4>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                <input
                  type="text"
                  placeholder="Component Name (e.g. Quiz 3)"
                  value={newCompName}
                  onChange={(e) => setNewCompName(e.target.value)}
                  className="px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg"
                />
                <input
                  type="number"
                  placeholder="Marks Obtained"
                  value={newCompObtained}
                  onChange={(e) => setNewCompObtained(e.target.value)}
                  className="px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg"
                />
                <input
                  type="number"
                  placeholder="Total Marks"
                  value={newCompTotal}
                  onChange={(e) => setNewCompTotal(e.target.value)}
                  className="px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg"
                />
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="Weight (%)"
                    value={newCompWeight}
                    onChange={(e) => setNewCompWeight(e.target.value)}
                    className="flex-1 px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition cursor-pointer"
                  >
                    Add
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}

        {/* Tab 5: Tasks */}
        {activeTab === 'tasks' && (
          <div className="space-y-2 pt-2">
            {courseTasks.length === 0 ? (
              <p className="text-xs text-slate-400 py-8 text-center font-medium">No tasks currently assigned to this course.</p>
            ) : (
              courseTasks.map((t) => (
                <div key={t.id} className="p-3 rounded-xl border border-slate-200 flex items-center justify-between hover:bg-slate-50/60 transition">
                  <div>
                    <h5 className="text-xs font-bold text-slate-900">{t.title}</h5>
                    <span className="text-[10px] text-slate-400">Due: {t.deadline || t.deadlineDate || 'Pending'}</span>
                  </div>
                  <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded ${
                    t.status === 'Completed'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}>
                    {t.status || 'Pending'}
                  </span>
                </div>
              ))
            )}
          </div>
        )}

        {/* Tab 6: Exams */}
        {activeTab === 'exams' && (
          <div className="space-y-3 pt-2">
            {courseExams.length === 0 ? (
              <p className="text-xs text-slate-400 py-8 text-center font-medium">No exams scheduled for this course yet.</p>
            ) : (
              courseExams.map((ex) => (
                <div key={ex.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black text-slate-900">{ex.title}</h4>
                    <span className="text-xs font-bold text-rose-600">{ex.date}</span>
                  </div>
                  <div className="text-[11px] text-slate-600">
                    Syllabus: {Array.isArray(ex.syllabus) ? ex.syllabus.join(', ') : ex.syllabus || 'General course topics'}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Tab 7: Materials */}
        {activeTab === 'materials' && (
          <div className="space-y-2 pt-2">
            {courseMaterials.length === 0 ? (
              <p className="text-xs text-slate-400 py-8 text-center font-medium">No study materials found for this course.</p>
            ) : (
              courseMaterials.map((file) => (
                <div key={file.id} className="p-3 rounded-xl border border-slate-200 flex items-center justify-between hover:bg-slate-50 transition">
                  <div className="flex items-center gap-3">
                    <FileText className="w-4 h-4 text-blue-600" />
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">{file.title}</span>
                      <span className="text-[10px] text-slate-400">{file.format || file.type || 'PDF'} • {file.size || file.fileSize || '2.4 MB'}</span>
                    </div>
                  </div>
                  <a
                    href={file.url || file.link || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 text-slate-400 hover:text-blue-600 transition"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                </div>
              ))
            )}
          </div>
        )}

        {/* Tab 8: Lecture Notes Scratchpad */}
        {activeTab === 'notes' && (
          <div className="space-y-4 pt-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-xs font-black text-slate-900 flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5 text-blue-600" />
                  Course Scratchpad & Notes
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Autosaves to local storage. Export directly to Markdown or printable PDF notes.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportMarkdown}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
                  title="Download Markdown (.md)"
                >
                  <FileDown className="w-3.5 h-3.5 text-blue-600" />
                  <span>Export .md</span>
                </button>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
                  title="Print / Save PDF"
                >
                  <Printer className="w-3.5 h-3.5 text-emerald-600" />
                  <span>PDF / Print</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyNotes}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied!' : 'Copy'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleClearNotes}
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer"
                  title="Clear Notes"
                >
                  <Trash2 className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={handleSaveNotes}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-2xs"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{savedStatus ? 'Saved!' : 'Save'}</span>
                </button>
              </div>
            </div>

            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={`Jot down lecture notes for ${courseState.code} here...\n\n- Key definitions\n- Formulas to memorize\n- Instructions given in class`}
              rows={12}
              className="w-full p-4 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 leading-relaxed resize-y"
            />
          </div>
        )}
      </div>
    </div>
  );
}