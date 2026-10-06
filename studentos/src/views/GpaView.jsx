import React, { useState, useMemo, useEffect } from 'react';
import { 
  Calculator, 
  Award, 
  TrendingUp, 
  Plus, 
  Trash2, 
  Sliders, 
  Target, 
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  BookOpen,
  Printer,
  ArrowUpRight,
  ArrowDownRight,
  Save,
  PlusCircle,
  X
} from 'lucide-react';

const GRADE_POINTS = {
  'A+ (4.00)': 4.00,
  'A (3.75)': 3.75,
  'A- (3.50)': 3.50,
  'B+ (3.25)': 3.25,
  'B (3.00)': 3.00,
  'B- (2.75)': 2.75,
  'C+ (2.50)': 2.50,
  'C (2.25)': 2.25,
  'D (2.00)': 2.00,
  'F (0.00)': 0.00,
};

const SIMULATOR_GRADE_POINTS = {
  'A+': 4.00,
  'A': 3.75,
  'A-': 3.50,
  'B+': 3.25,
  'B': 3.00,
  'C+': 2.50,
  'D': 2.00,
  'F': 0.00,
};

export default function GpaView({ courses = [] }) {
  const [activeSubTab, setActiveSubTab] = useState('records');
  const [isSaving, setIsSaving] = useState(false);
  const [savedSemestersData, setSavedSemestersData] = useState([]);
  const [showAddSemesterModal, setShowAddSemesterModal] = useState(false);
  const [newSemesterName, setNewSemesterName] = useState('');

  // 1. Fetch user info
  const currentUser = useMemo(() => {
    try {
      const saved = localStorage.getItem('studentos_user');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn(e);
    }
    return {
      name: 'Student',
      studentId: '262-35-658',
      university: 'Daffodil International University',
      department: 'Software Engineering',
      semester: '1st Semester'
    };
  }, []);

  // 2. Fetch authenticated GPA and semester records from SQLite
  const fetchGpaData = async () => {
    const token = localStorage.getItem('studentos_token');
    if (!token) return;

    try {
      const res = await fetch('http://localhost:5001/api/gpa', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const result = await res.json();
      if (result.success && result.data && Array.isArray(result.data.semesters)) {
        setSavedSemestersData(result.data.semesters);
      }
    } catch (err) {
      console.warn('Backend GPA fetch note:', err);
    }
  };

  useEffect(() => {
    fetchGpaData();
  }, []);

  // 3. Collect only the semesters that exist in the user's data
  const availableSemesters = useMemo(() => {
    const semSet = new Set();
    
    // Add user's default registered semester
    if (currentUser.semester) {
      semSet.add(currentUser.semester.trim());
    }

    // Add semesters from user's courses
    (courses || []).forEach((c) => {
      if (c.semester && c.semester.trim()) {
        semSet.add(c.semester.trim());
      }
    });

    // Add semesters saved in SQLite DB
    savedSemestersData.forEach((s) => {
      if (s.semester && s.semester.trim()) {
        semSet.add(s.semester.trim());
      }
    });

    const list = Array.from(semSet);
    return list.length > 0 ? list : ['1st Semester'];
  }, [courses, currentUser, savedSemestersData]);

  const [selectedSemester, setSelectedSemester] = useState(() => {
    return availableSemesters[0] || '1st Semester';
  });

  // Ensure selected semester is always valid
  useEffect(() => {
    if (!availableSemesters.includes(selectedSemester) && availableSemesters.length > 0) {
      setSelectedSemester(availableSemesters[0]);
    }
  }, [availableSemesters, selectedSemester]);

  // Course Grade and Credit states
  const [courseGrades, setCourseGrades] = useState({});
  const [courseCredits, setCourseCredits] = useState({});

  // 4. Current Semester Courses
  const currentSemesterCourses = useMemo(() => {
    return (courses || []).filter(
      (c) => (c.semester ? c.semester.trim() : '1st Semester').toLowerCase() === selectedSemester.toLowerCase()
    );
  }, [courses, selectedSemester]);

  // Current Semester Totals
  const currentTotalCredits = useMemo(() => {
    return currentSemesterCourses.reduce(
      (sum, c) => sum + (courseCredits[c.id] ?? Number(c.credits || c.credit) ?? 3),
      0
    );
  }, [currentSemesterCourses, courseCredits]);

  const currentTotalPoints = useMemo(() => {
    return currentSemesterCourses.reduce((sum, c) => {
      const grade = courseGrades[c.id] ?? 3.75;
      const credits = courseCredits[c.id] ?? Number(c.credits || c.credit) ?? 3;
      return sum + grade * credits;
    }, 0);
  }, [currentSemesterCourses, courseGrades, courseCredits]);

  const currentGpa = useMemo(() => {
    return currentTotalCredits > 0
      ? (currentTotalPoints / currentTotalCredits).toFixed(2)
      : '0.00';
  }, [currentTotalCredits, currentTotalPoints]);

  // 5. Semester Breakdown — Only Real Semesters Derived from User Data
  const semesterBreakdowns = useMemo(() => {
    return availableSemesters.map((semName) => {
      const isCurrentActive = semName.toLowerCase() === selectedSemester.toLowerCase();

      // Check if there are courses in this semester
      const semCourses = (courses || []).filter(
        (c) => (c.semester ? c.semester.trim() : '1st Semester').toLowerCase() === semName.toLowerCase()
      );

      // Check if there's saved DB data for this semester
      const savedSem = savedSemestersData.find(
        (s) => s.semester && s.semester.toLowerCase() === semName.toLowerCase()
      );

      let credits = 0;
      let gpa = '0.00';

      if (isCurrentActive) {
        credits = currentTotalCredits;
        gpa = currentGpa;
      } else if (savedSem) {
        credits = Number(savedSem.creditsCompleted) || 0;
        gpa = Number(savedSem.sgpa || 0).toFixed(2);
      } else if (semCourses.length > 0) {
        credits = semCourses.reduce((sum, c) => sum + Number(c.credits || c.credit || 3), 0);
        gpa = '3.75';
      }

      return {
        name: semName,
        gpa,
        credits,
        count: semCourses.length,
        active: isCurrentActive,
        courses: semCourses
      };
    });
  }, [availableSemesters, selectedSemester, courses, savedSemestersData, currentTotalCredits, currentGpa]);

  // Real Overall CGPA and Cumulative Credits
  const allCoursesCredits = useMemo(() => {
    return semesterBreakdowns.reduce((sum, s) => sum + s.credits, 0);
  }, [semesterBreakdowns]);

  const allCoursesPoints = useMemo(() => {
    return semesterBreakdowns.reduce(
      (sum, s) => sum + parseFloat(s.gpa) * s.credits,
      0
    );
  }, [semesterBreakdowns]);

  const overallCgpa = useMemo(() => {
    return allCoursesCredits > 0
      ? (allCoursesPoints / allCoursesCredits).toFixed(2)
      : currentGpa !== '0.00' ? currentGpa : '3.75';
  }, [allCoursesCredits, allCoursesPoints, currentGpa]);

  // ==========================================
  // STANDALONE CUSTOM CALCULATOR
  // ==========================================
  const [customRows, setCustomRows] = useState([
    { id: 1, name: 'Subject 1', credits: 3, grade: 3.75 },
    { id: 2, name: 'Subject 2', credits: 3, grade: 4.00 },
  ]);

  const addCustomRow = () => {
    setCustomRows([
      ...customRows,
      { id: Date.now(), name: `Subject ${customRows.length + 1}`, credits: 3, grade: 3.75 },
    ]);
  };

  const removeCustomRow = (id) => {
    setCustomRows(customRows.filter((r) => r.id !== id));
  };

  const updateCustomRow = (id, field, val) => {
    setCustomRows(
      customRows.map((r) => (r.id === id ? { ...r, [field]: val } : r))
    );
  };

  const customTotalCredits = customRows.reduce((sum, r) => sum + (Number(r.credits) || 0), 0);
  const customTotalPoints = customRows.reduce(
    (sum, r) => sum + (Number(r.credits) || 0) * (Number(r.grade) || 0),
    0
  );
  const customCalculatedGpa =
    customTotalCredits > 0
      ? (customTotalPoints / customTotalCredits).toFixed(2)
      : '3.88';

  // ==========================================
  // TARGET & WHAT-IF SIMULATOR
  // ==========================================
  const [simCompletedCredits, setSimCompletedCredits] = useState(allCoursesCredits || 3);
  const [simCurrentCgpa, setSimCurrentCgpa] = useState(parseFloat(overallCgpa) || 3.75);
  const [simTargetCgpa, setSimTargetCgpa] = useState(3.80);
  const [simRemainingCredits, setSimRemainingCredits] = useState(140 - (allCoursesCredits || 3));

  // Sync simulator defaults with real credits
  useEffect(() => {
    if (allCoursesCredits > 0) {
      setSimCompletedCredits(allCoursesCredits);
      setSimCurrentCgpa(parseFloat(overallCgpa));
    }
  }, [allCoursesCredits, overallCgpa]);

  const [simCourseGrades, setSimCourseGrades] = useState(() => {
    if (courses && courses.length > 0) {
      const initial = {};
      courses.forEach((c) => {
        initial[c.id || c.code] = {
          code: c.code,
          name: c.name,
          credits: Number(c.credits || c.credit) || 3,
          grade: 'A',
        };
      });
      return initial;
    }
    return {
      c1: { code: 'cse101', name: 'Data structure', credits: 3.0, grade: 'A' }
    };
  });

  // Re-sync sim courses if user adds courses
  useEffect(() => {
    if (courses && courses.length > 0) {
      const updated = {};
      courses.forEach((c) => {
        updated[c.id || c.code] = {
          code: c.code,
          name: c.name,
          credits: Number(c.credits || c.credit) || 3,
          grade: simCourseGrades[c.id || c.code]?.grade || 'A',
        };
      });
      setSimCourseGrades(updated);
    }
  }, [courses]);

  useEffect(() => {
    const payload = {
      currentCgpa: Number(simCurrentCgpa),
      targetCgpa: Number(simTargetCgpa),
      completedCredits: Number(simCompletedCredits),
      remainingCredits: Number(simRemainingCredits)
    };
    localStorage.setItem('studentos_cgpa_data', JSON.stringify(payload));
    window.dispatchEvent(new CustomEvent('studentos_cgpa_updated', { detail: payload }));
  }, [simCurrentCgpa, simTargetCgpa, simCompletedCredits, simRemainingCredits]);

  const applyGradePreset = (gradeKey) => {
    setSimCourseGrades((prev) => {
      const updated = { ...prev };
      Object.keys(updated).forEach((k) => {
        updated[k] = { ...updated[k], grade: gradeKey };
      });
      return updated;
    });
  };

  const simProjection = useMemo(() => {
    const currentPoints = simCompletedCredits * simCurrentCgpa;
    let semesterCredits = 0;
    let semesterPoints = 0;

    Object.values(simCourseGrades).forEach((item) => {
      const pts = (SIMULATOR_GRADE_POINTS[item.grade] ?? 0) * item.credits;
      semesterCredits += item.credits;
      semesterPoints += pts;
    });

    const semesterGpa = semesterCredits > 0 ? semesterPoints / semesterCredits : 0;
    const newTotalCredits = simCompletedCredits + semesterCredits;
    const projected = newTotalCredits > 0 ? (currentPoints + semesterPoints) / newTotalCredits : simCurrentCgpa;

    const totalDegreeCredits = simCompletedCredits + simRemainingCredits;
    const requiredTotalPoints = simTargetCgpa * totalDegreeCredits;
    const pointsNeeded = requiredTotalPoints - currentPoints;
    const neededAverageGpa = simRemainingCredits > 0 ? pointsNeeded / simRemainingCredits : 0;

    const maxPossiblePoints = currentPoints + 4.00 * simRemainingCredits;
    const maxPossibleCgpa = totalDegreeCredits > 0 ? maxPossiblePoints / totalDegreeCredits : 4.00;
    const isFeasible = neededAverageGpa <= 4.00;

    return {
      semesterCredits,
      semesterGpa: semesterGpa.toFixed(2),
      projectedCgpa: projected.toFixed(2),
      cgpaShift: (projected - simCurrentCgpa).toFixed(2),
      targetGap: (simTargetCgpa - projected).toFixed(2),
      neededAverageGpa: Math.min(4.00, Math.max(0, neededAverageGpa)).toFixed(2),
      rawNeededGpa: neededAverageGpa.toFixed(2),
      isFeasible,
      maxPossibleCgpa: maxPossibleCgpa.toFixed(2),
      totalDegreeCredits
    };
  }, [simCompletedCredits, simCurrentCgpa, simTargetCgpa, simRemainingCredits, simCourseGrades]);

  const getCourseCgpaImpact = (courseKey) => {
    const course = simCourseGrades[courseKey];
    if (!course) return '0.00';
    const gradePts = SIMULATOR_GRADE_POINTS[course.grade] ?? 0;
    const newTotalCredits = simCompletedCredits + simProjection.semesterCredits;
    if (newTotalCredits === 0) return '0.00';

    const diff = (gradePts - simCurrentCgpa) * (course.credits / newTotalCredits);
    return diff > 0 ? `+${diff.toFixed(2)}` : diff.toFixed(2);
  };

  const handleSaveToBackend = async () => {
    const token = localStorage.getItem('studentos_token');
    if (!token) return;

    setIsSaving(true);
    try {
      const res = await fetch('http://localhost:5001/api/gpa/save-semester', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          semester: selectedSemester,
          sgpa: currentGpa,
          creditsCompleted: currentTotalCredits,
          courses: currentSemesterCourses.map((c) => ({
            code: c.code,
            title: c.name,
            credits: courseCredits[c.id] ?? Number(c.credits || c.credit) ?? 3,
            gpa: courseGrades[c.id] ?? 3.75
          }))
        })
      });
      const data = await res.json();
      if (data.success) {
        alert(`Records for ${selectedSemester} saved successfully!`);
        fetchGpaData();
      }
    } catch (err) {
      console.warn('Backend save error:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddNewSemester = (e) => {
    e.preventDefault();
    if (!newSemesterName.trim()) return;
    const formatted = newSemesterName.trim();
    if (!availableSemesters.includes(formatted)) {
      setSelectedSemester(formatted);
    }
    setShowAddSemesterModal(false);
    setNewSemesterName('');
  };

  return (
    <div className="space-y-6">
      {/* Header and Sub-tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">GPA & CGPA Center</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Simulate course grades, back-solve graduation targets, and monitor semester transcripts.
          </p>
        </div>

        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 self-start sm:self-auto shadow-2xs">
          <button
            type="button"
            onClick={() => setActiveSubTab('records')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeSubTab === 'records'
                ? 'bg-white text-blue-600 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Academic Records
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('simulator')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeSubTab === 'simulator'
                ? 'bg-white text-blue-600 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Target & What-If Simulator
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('transcript')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeSubTab === 'transcript'
                ? 'bg-white text-blue-600 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Unofficial Transcript
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* SUB-TAB 1: ACADEMIC RECORDS & CUSTOM CALCULATOR          */}
      {/* ======================================================== */}
      {activeSubTab === 'records' && (
        <div className="space-y-6">
          {/* Top Metric Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
              <div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  SEMESTER GPA
                </div>
                <div className="text-3xl font-black text-slate-900">{currentGpa}</div>
                <div className="text-xs text-slate-400 mt-1 font-semibold">{currentTotalCredits} credits enrolled</div>
              </div>
              <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                <Calculator className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
              <div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  OVERALL CGPA
                </div>
                <div className="text-3xl font-black text-slate-900">{overallCgpa}</div>
                <div className="text-xs text-slate-400 mt-1 font-semibold">{allCoursesCredits} total credits</div>
              </div>
              <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-xl border border-emerald-100">
                <Award className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
              <div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  ACADEMIC STANDING
                </div>
                <div className="text-xl font-black text-slate-900">
                  {Number(overallCgpa) >= 3.75
                    ? 'High Distinction'
                    : Number(overallCgpa) >= 3.50
                    ? 'Distinction'
                    : 'Good Standing'}
                </div>
                <div className="text-xs text-slate-400 mt-1 font-semibold">Target: Maintain 3.75+</div>
              </div>
              <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Current Semester Courses */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-sm">Current Semester Courses</h3>
              
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <select
                    value={selectedSemester}
                    onChange={(e) => setSelectedSemester(e.target.value)}
                    className="px-3 py-1.5 text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 rounded-xl focus:outline-none cursor-pointer"
                  >
                    {availableSemesters.map((sem) => (
                      <option key={sem} value={sem}>{sem}</option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={() => setShowAddSemesterModal(true)}
                    className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition cursor-pointer"
                    title="Add Another Semester"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleSaveToBackend}
                  disabled={isSaving}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-2xs disabled:opacity-50 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSaving ? 'Saving...' : 'Save Records'}</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-12 px-6 py-3 bg-slate-50/80 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
              <div className="col-span-5">COURSE</div>
              <div className="col-span-3 text-center">CREDIT HOURS</div>
              <div className="col-span-2 text-center">EXPECTED GRADE</div>
              <div className="col-span-2 text-right">GRADE POINT</div>
            </div>

            <div className="divide-y divide-slate-100">
              {currentSemesterCourses.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400 font-medium">
                  No courses registered in {selectedSemester}. You can add courses in the Courses view or save grades above.
                </div>
              ) : (
                currentSemesterCourses.map((c) => {
                  const currentGrade = courseGrades[c.id] ?? 3.75;
                  const currentCredit = courseCredits[c.id] ?? Number(c.credits || c.credit) ?? 3;
                  const gradePointTotal = (currentGrade * currentCredit).toFixed(2);

                  return (
                    <div key={c.id} className="grid grid-cols-12 px-6 py-4 items-center hover:bg-slate-50/50 transition">
                      <div className="col-span-5">
                        <div className="font-bold text-xs text-slate-900">{c.code}</div>
                        <div className="text-[11px] text-slate-400">{c.name}</div>
                      </div>

                      <div className="col-span-3 flex justify-center">
                        <input
                          type="number"
                          step="0.5"
                          min="1"
                          max="6"
                          value={currentCredit}
                          onChange={(e) =>
                            setCourseCredits((prev) => ({
                              ...prev,
                              [c.id]: parseFloat(e.target.value) || 1,
                            }))
                          }
                          className="w-16 px-2 py-1 text-center text-xs font-bold border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                        />
                      </div>

                      <div className="col-span-2 flex justify-center">
                        <select
                          value={currentGrade}
                          onChange={(e) =>
                            setCourseGrades((prev) => ({
                              ...prev,
                              [c.id]: parseFloat(e.target.value),
                            }))
                          }
                          className="px-2.5 py-1 text-xs font-semibold bg-white border border-slate-200 rounded-lg focus:outline-none text-slate-700 cursor-pointer"
                        >
                          {Object.entries(GRADE_POINTS).map(([label, val]) => (
                            <option key={label} value={val}>{label}</option>
                          ))}
                        </select>
                      </div>

                      <div className="col-span-2 text-right font-black text-xs text-slate-800">
                        {gradePointTotal}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Previous Semester Breakdown Cards (Accurately rendered from User's real semesters) */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-sm">Previous Semester Breakdown</h3>
              <button
                type="button"
                onClick={() => setShowAddSemesterModal(true)}
                className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 cursor-pointer"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Add Semester</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {semesterBreakdowns.map((sem, idx) => (
                <div 
                  key={idx}
                  onClick={() => setSelectedSemester(sem.name)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                    sem.active 
                      ? 'border-blue-400 bg-blue-50/40 ring-2 ring-blue-500/20' 
                      : 'border-slate-200/80 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-700">{sem.name}</span>
                    {sem.active && (
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-blue-600 text-white uppercase tracking-wider">
                        Active
                      </span>
                    )}
                  </div>
                  <div>
                    <div className="text-2xl font-black text-slate-900">
                      {sem.gpa} <span className="text-xs font-bold text-slate-400">GPA</span>
                    </div>
                    <span className="text-[11px] text-slate-400 font-medium block mt-0.5">
                      {sem.credits} Credits Completed ({sem.count} Courses)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Standalone Custom Calculator */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Standalone Custom Calculator</h3>
                <p className="text-xs text-slate-400 mt-0.5">Calculate grades separately without affecting your main course records.</p>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-slate-600">
                  Custom GPA: <strong className="text-blue-600 text-sm font-black">{customCalculatedGpa}</strong>
                </span>

                <button
                  type="button"
                  onClick={addCustomRow}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Course</span>
                </button>
              </div>
            </div>

            <div className="space-y-3 pt-1">
              {customRows.map((row) => (
                <div key={row.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-slate-50/70 border border-slate-100 rounded-xl">
                  <input
                    type="text"
                    value={row.name}
                    onChange={(e) => updateCustomRow(row.id, 'name', e.target.value)}
                    className="flex-1 px-3 py-1.5 text-xs font-bold bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-400 font-semibold">Credits:</span>
                      <input
                        type="number"
                        min="1"
                        max="6"
                        step="0.5"
                        value={row.credits}
                        onChange={(e) => updateCustomRow(row.id, 'credits', parseFloat(e.target.value) || 1)}
                        className="w-16 px-2 py-1 text-center text-xs font-bold bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-400 font-semibold">Grade:</span>
                      <select
                        value={row.grade}
                        onChange={(e) => updateCustomRow(row.id, 'grade', parseFloat(e.target.value))}
                        className="px-2.5 py-1 text-xs font-bold bg-white border border-slate-200 rounded-lg cursor-pointer"
                      >
                        {Object.entries(GRADE_POINTS).map(([label, val]) => (
                          <option key={label} value={val}>{label}</option>
                        ))}
                      </select>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeCustomRow(row.id)}
                      className="p-1 text-slate-300 hover:text-rose-600 rounded transition cursor-pointer"
                      title="Remove row"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* SUB-TAB 2: TARGET & WHAT-IF SIMULATOR                     */}
      {/* ======================================================== */}
      {activeSubTab === 'simulator' && (
        <div className="space-y-6">
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-bold text-slate-700">Quick Target Goals:</span>
            </div>

            <div className="flex items-center gap-2">
              {[3.50, 3.65, 3.75, 3.80, 3.90].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setSimTargetCgpa(t)}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                    simTargetCgpa === t
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  {t.toFixed(2)} CGPA
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-4">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Sliders className="w-4 h-4 text-blue-600" />
                Degree Baseline & Goals
              </h3>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Current Cumulative GPA</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="4"
                  value={simCurrentCgpa}
                  onChange={(e) => setSimCurrentCgpa(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Completed Degree Credits</label>
                <input
                  type="number"
                  value={simCompletedCredits}
                  onChange={(e) => setSimCompletedCredits(parseInt(e.target.value, 10) || 0)}
                  className="w-full px-3 py-2 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                  <span>Target Graduation CGPA</span>
                  <span className="text-blue-600 font-extrabold">{simTargetCgpa.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="2.50"
                  max="4.00"
                  step="0.05"
                  value={simTargetCgpa}
                  onChange={(e) => setSimTargetCgpa(parseFloat(e.target.value) || 3.0)}
                  className="w-full accent-blue-600 cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Remaining Degree Credits</label>
                <input
                  type="number"
                  value={simRemainingCredits}
                  onChange={(e) => setSimRemainingCredits(parseInt(e.target.value, 10) || 0)}
                  className="w-full px-3 py-2 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <Award className="w-4 h-4 text-emerald-600" />
                    Course Grade Tester
                  </h3>
                  <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    SGPA: {simProjection.semesterGpa}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 pt-2 mb-3">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Presets:</span>
                  <button
                    type="button"
                    onClick={() => applyGradePreset('A+')}
                    className="px-2 py-0.5 text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition cursor-pointer"
                  >
                    All A+
                  </button>
                  <button
                    type="button"
                    onClick={() => applyGradePreset('A')}
                    className="px-2 py-0.5 text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition cursor-pointer"
                  >
                    All A
                  </button>
                  <button
                    type="button"
                    onClick={() => applyGradePreset('A-')}
                    className="px-2 py-0.5 text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition cursor-pointer"
                  >
                    All A-
                  </button>
                </div>

                <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                  {Object.entries(simCourseGrades).map(([key, item]) => {
                    const impact = getCourseCgpaImpact(key);
                    const isPositive = impact.startsWith('+');

                    return (
                      <div key={key} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-slate-900">{item.code}</span>
                            <span className={`text-[9px] font-black px-1.5 py-0.2 rounded flex items-center gap-0.5 ${
                              isPositive ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}>
                              {isPositive ? <ArrowUpRight className="w-2.5 h-2.5" /> : <ArrowDownRight className="w-2.5 h-2.5" />}
                              {impact} CGPA
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-semibold">{item.credits} Credits • {item.name}</span>
                        </div>

                        <select
                          value={item.grade}
                          onChange={(e) => {
                            const nextGrade = e.target.value;
                            setSimCourseGrades((prev) => ({
                              ...prev,
                              [key]: { ...prev[key], grade: nextGrade }
                            }));
                          }}
                          className="px-2 py-1 text-xs font-bold bg-white border border-slate-200 rounded-lg cursor-pointer"
                        >
                          {Object.keys(SIMULATOR_GRADE_POINTS).map((g) => (
                            <option key={g} value={g}>{g} ({SIMULATOR_GRADE_POINTS[g].toFixed(2)})</option>
                          ))}
                        </select>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between font-semibold">
                <span>Semester Credits: {simProjection.semesterCredits}</span>
                <span className="text-blue-600 font-bold">Shift: {simProjection.cgpaShift > 0 ? `+${simProjection.cgpaShift}` : simProjection.cgpaShift} pts</span>
              </div>
            </div>

            <div className="bg-gradient-to-br from-slate-900 to-blue-950 text-white p-6 rounded-2xl shadow-sm flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-black text-blue-400 uppercase tracking-wider block">
                  PROJECTION ENGINE
                </span>
                <div className="text-4xl font-black mt-2 tracking-tight">
                  {simProjection.projectedCgpa}
                </div>
                <p className="text-xs text-slate-300 mt-1">Projected Cumulative CGPA after this semester.</p>

                <div className="mt-5 pt-5 border-t border-slate-800 space-y-3.5 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Target Goal:</span>
                    <span className="font-extrabold text-white text-sm">{simTargetCgpa.toFixed(2)} CGPA</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Gap to Target:</span>
                    <span className={`font-bold ${parseFloat(simProjection.targetGap) <= 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {parseFloat(simProjection.targetGap) <= 0 ? 'Goal Attained! 🎉' : `${simProjection.targetGap} pts needed`}
                    </span>
                  </div>

                  {simProjection.isFeasible ? (
                    <div className="p-3.5 bg-emerald-500/10 rounded-xl border border-emerald-500/30 space-y-1">
                      <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Target Is Attainable</span>
                      </div>
                      <p className="text-[11px] text-slate-200 leading-relaxed">
                        Maintain an average of <strong className="text-emerald-300 font-bold">{simProjection.neededAverageGpa} GPA</strong> across remaining {simRemainingCredits} credits.
                      </p>
                    </div>
                  ) : (
                    <div className="p-3.5 bg-rose-500/15 rounded-xl border border-rose-500/30 space-y-1">
                      <div className="flex items-center gap-1.5 text-rose-400 font-bold">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Mathematically Impossible Target</span>
                      </div>
                      <p className="text-[11px] text-rose-200 leading-relaxed">
                        Required GPA is <strong className="text-white font-bold">{simProjection.rawNeededGpa}</strong>, exceeding 4.00. Ceiling is <strong className="text-white font-bold">{simProjection.maxPossibleCgpa} CGPA</strong>.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
                <span>Honors Standing:</span>
                <strong className="text-blue-300">
                  {Number(simProjection.projectedCgpa) >= 3.75 ? 'Summa Cum Laude' : Number(simProjection.projectedCgpa) >= 3.50 ? 'Magna Cum Laude' : 'Good Standing'}
                </strong>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* SUB-TAB 3: UNOFFICIAL TRANSCRIPT                         */}
      {/* ======================================================== */}
      {activeSubTab === 'transcript' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Unofficial Academic Transcript</h3>
              <p className="text-xs text-slate-500">Official institutional record summary for {currentUser.name}</p>
            </div>

            <button
              type="button"
              onClick={() => window.print()}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-xs"
            >
              <Printer className="w-4 h-4" />
              <span>Print / Download PDF</span>
            </button>
          </div>

          <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm max-w-4xl mx-auto space-y-6 print:shadow-none print:border-none print:p-0">
            <div className="text-center pb-6 border-b-2 border-slate-900 space-y-1">
              <h1 className="text-xl font-black text-slate-900 uppercase tracking-wider">{currentUser.university || 'Daffodil International University'}</h1>
              <h2 className="text-xs font-bold text-slate-600 uppercase tracking-widest">Department of {currentUser.department || 'Software Engineering'}</h2>
              <span className="text-[11px] font-semibold text-slate-400">UNOFFICIAL ACADEMIC TRANSCRIPT • FALL 2026 RELEASE</span>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-xl border border-slate-100">
              <div className="space-y-1">
                <div><strong className="text-slate-500">Student Name:</strong> <span className="text-slate-900 font-bold">{currentUser.name}</span></div>
                <div><strong className="text-slate-500">Student ID:</strong> <span className="text-slate-900 font-mono font-bold">{currentUser.studentId || '262-35-658'}</span></div>
              </div>
              <div className="space-y-1 text-right">
                <div><strong className="text-slate-500">Program:</strong> <span className="text-slate-900 font-bold">B.Sc. in Software Engineering</span></div>
                <div><strong className="text-slate-500">Cumulative CGPA:</strong> <span className="text-blue-600 font-black">{overallCgpa}</span></div>
              </div>
            </div>

            <div className="space-y-6">
              {semesterBreakdowns.map((sem) => (
                <div key={sem.name} className="space-y-2">
                  <div className="flex items-center justify-between bg-slate-900 text-white px-3 py-1.5 rounded-lg text-xs font-bold">
                    <span>{sem.name}</span>
                    <span>Semester GPA: {sem.gpa} ({sem.credits} Credits)</span>
                  </div>

                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase">
                          <th className="p-2.5">Course Code</th>
                          <th className="p-2.5">Course Title</th>
                          <th className="p-2.5 text-center">Credits</th>
                          <th className="p-2.5 text-center">Grade</th>
                          <th className="p-2.5 text-right">Grade Points</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {(!sem.courses || sem.courses.length === 0) ? (
                          <tr>
                            <td colSpan={5} className="p-4 text-center text-slate-400 italic">No courses recorded for this semester.</td>
                          </tr>
                        ) : (
                          sem.courses.map((c, i) => (
                            <tr key={i} className="hover:bg-slate-50/50">
                              <td className="p-2.5 font-bold text-slate-800">{c.code}</td>
                              <td className="p-2.5 text-slate-600">{c.name}</td>
                              <td className="p-2.5 text-center font-medium">{c.credits || c.credit || 3.0}</td>
                              <td className="p-2.5 text-center font-bold text-blue-600">{c.grade || 'A'}</td>
                              <td className="p-2.5 text-right font-mono font-bold text-slate-800">{(c.gpa || 3.75).toFixed(2)}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t-2 border-slate-900 flex items-center justify-between text-xs">
              <div>
                <span className="text-slate-500 block">Total Credits Earned: <strong className="text-slate-900">{allCoursesCredits}</strong></span>
                <span className="text-slate-500 block">Overall Cumulative CGPA: <strong className="text-blue-600 text-base">{overallCgpa}</strong></span>
              </div>
              <div className="text-right text-[10px] text-slate-400">
                Generated via StudentOS Workspace Engine<br />
                {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Semester Modal */}
      {showAddSemesterModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <h3 className="text-sm font-bold text-slate-900">Add Academic Semester</h3>
              <button
                type="button"
                onClick={() => setShowAddSemesterModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddNewSemester} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Semester Label</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 2nd Semester, Fall 2026"
                  value={newSemesterName}
                  onChange={(e) => setNewSemesterName(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 font-bold"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddSemesterModal(false)}
                  className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-2xs"
                >
                  Add Semester
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}