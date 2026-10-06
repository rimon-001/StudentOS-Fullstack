import React, { useState, useEffect, useCallback } from 'react';
import { Plus, User, MapPin, Award, Trash2, Edit3, X, FlaskConical, BookOpen, ArrowRight } from 'lucide-react';

const formatSemester = (val) => {
  if (!val) return '1st Semester';
  const clean = String(val).trim();
  if (/^\d+$/.test(clean)) {
    const num = parseInt(clean, 10);
    const suffixes = ['th', 'st', 'nd', 'rd'];
    const v = num % 100;
    const suffix = suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0];
    return `${num}${suffix} Semester`;
  }
  if (/^\d+(st|nd|rd|th)$/i.test(clean)) {
    return `${clean} Semester`;
  }
  return clean;
};

const extractSemesterNumber = (str) => {
  if (!str) return 999;
  const match = String(str).match(/\d+/);
  return match ? parseInt(match[0], 10) : 999;
};

export default function CoursesView({ 
  courses = [], 
  setCourses, 
  userRole, 
  onOpenWorkspace,
  isDemoMode = false,
  onRestrictedAction
}) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);

  // Form State
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [teacher, setTeacher] = useState('');
  const [credits, setCredits] = useState(3);
  const [room, setRoom] = useState('');
  const [color, setColor] = useState('#3B82F6');
  const [semester, setSemester] = useState('1st Semester');
  const [isLab, setIsLab] = useState(false);
  const [selectedSemester, setSelectedSemester] = useState('All');

  const syncCoursesState = useCallback(() => {
    try {
      const stored = localStorage.getItem('studentos_courses');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && typeof setCourses === 'function') {
          setCourses(parsed);
        }
      }
    } catch (err) {
      console.error('Error synchronizing courses from storage:', err);
    }
  }, [setCourses]);

  useEffect(() => {
    syncCoursesState();

    const handleCustomUpdate = (e) => {
      if (e?.detail && Array.isArray(e.detail) && typeof setCourses === 'function') {
        setCourses(e.detail);
      } else {
        syncCoursesState();
      }
    };

    window.addEventListener('storage', syncCoursesState);
    window.addEventListener('studentos_courses_updated', handleCustomUpdate);

    return () => {
      window.removeEventListener('storage', syncCoursesState);
      window.removeEventListener('studentos_courses_updated', handleCustomUpdate);
    };
  }, [syncCoursesState, setCourses]);

  const openAddModal = () => {
    if (isDemoMode && onRestrictedAction && onRestrictedAction()) return;
    setEditingCourse(null);
    setCode('');
    setName('');
    setTeacher('');
    setCredits(3);
    setRoom('');
    setColor('#3B82F6');
    setSemester(selectedSemester !== 'All' ? selectedSemester : '1st Semester');
    setIsLab(false);
    setShowAddModal(true);
  };

  const openEditModal = (course) => {
    if (isDemoMode && onRestrictedAction && onRestrictedAction()) return;
    setEditingCourse(course);
    setCode(course.code || '');
    setName(course.name || '');
    setTeacher(course.teacher || '');
    setCredits(course.credits || course.credit || 3);
    setRoom(course.room || '');
    setColor(course.color || '#3B82F6');
    setSemester(course.semester || '1st Semester');
    setIsLab(Boolean(course.isLab || (course.name && course.name.toUpperCase().includes('LAB'))));
    setShowAddModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!code || !name) return;
    if (isDemoMode && onRestrictedAction && onRestrictedAction()) return;

    const formattedSemester = formatSemester(semester);
    const labDetected = isLab || name.toUpperCase().includes('LAB') || code.toUpperCase().includes('LAB');
    let currentList = Array.isArray(courses) ? [...courses] : [];
    const token = localStorage.getItem('studentos_token');

    if (editingCourse) {
      const updated = {
        ...editingCourse,
        code: code.trim(),
        name: name.trim(),
        teacher: teacher.trim() || 'TBA',
        credits: Number(credits),
        room: room.trim() || 'TBA',
        color,
        semester: formattedSemester,
        isLab: labDetected ? 1 : 0,
        type: labDetected ? 'Lab' : 'Theory',
      };

      currentList = currentList.map((c) => (c.id === editingCourse.id ? updated : c));

      if (typeof setCourses === 'function') setCourses(currentList);
      localStorage.setItem('studentos_courses', JSON.stringify(currentList));
      window.dispatchEvent(new CustomEvent('studentos_courses_updated', { detail: currentList }));

      if (token) {
        try {
          await fetch(`http://localhost:5001/api/courses/${editingCourse.id}`, {
            method: 'PUT',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(updated),
          });
        } catch (err) {
          console.warn('Backend sync failed:', err);
        }
      }
    } else {
      const newCourse = {
        id: 'c_' + Date.now(),
        code: code.trim(),
        name: name.trim(),
        teacher: teacher.trim() || 'TBA',
        credits: Number(credits),
        room: room.trim() || 'TBA',
        color,
        semester: formattedSemester,
        isLab: labDetected ? 1 : 0,
        type: labDetected ? 'Lab' : 'Theory',
        attendance: { present: 0, total: 0 },
      };

      currentList.push(newCourse);

      if (typeof setCourses === 'function') setCourses(currentList);
      localStorage.setItem('studentos_courses', JSON.stringify(currentList));
      window.dispatchEvent(new CustomEvent('studentos_courses_updated', { detail: currentList }));

      if (token) {
        try {
          await fetch('http://localhost:5001/api/courses', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(newCourse),
          });
        } catch (err) {
          console.warn('Backend creation failed:', err);
        }
      }
    }

    setShowAddModal(false);
  };

  const handleDelete = async (id) => {
    if (isDemoMode && onRestrictedAction && onRestrictedAction()) return;
    if (!window.confirm('Are you sure you want to delete this course?')) return;

    const updatedList = (courses || []).filter((c) => c.id !== id);
    if (typeof setCourses === 'function') {
      setCourses(updatedList);
    }
    localStorage.setItem('studentos_courses', JSON.stringify(updatedList));

    window.dispatchEvent(new CustomEvent('studentos_courses_updated', { detail: updatedList }));

    const token = localStorage.getItem('studentos_token');
    if (token) {
      try {
        await fetch(`http://localhost:5001/api/courses/${id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
      } catch (err) {
        console.warn('Backend delete failed:', err);
      }
    }
  };

  const rawSemesters = Array.from(
    new Set(
      (courses || [])
        .map((c) => (c.semester ? c.semester.trim() : '1st Semester'))
        .filter(Boolean)
    )
  ).sort((a, b) => extractSemesterNumber(a) - extractSemesterNumber(b));

  const semesters = ['All', ...rawSemesters];

  const filteredCourses = selectedSemester === 'All'
    ? (courses || [])
    : (courses || []).filter(
        (c) => (c.semester ? c.semester.trim() : '1st Semester') === selectedSemester.trim()
      );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Courses</h2>
          <p className="text-sm text-slate-500 mt-0.5">Manage your enrolled courses, faculty, and schedules.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">Filter:</span>
            <select
              value={selectedSemester}
              onChange={(e) => setSelectedSemester(e.target.value)}
              className="px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-700 cursor-pointer"
            >
              {semesters.map((sem) => (
                <option key={sem} value={sem}>
                  {sem}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Add Course</span>
          </button>
        </div>
      </div>

      {filteredCourses.length === 0 ? (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-12 text-center shadow-xs">
          <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-slate-700">No courses found</h3>
          <p className="text-xs text-slate-400 mt-1">
            {selectedSemester === 'All'
              ? 'Add a course or import a routine to view courses here.'
              : `No courses registered for ${selectedSemester}.`}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredCourses.map((course) => {
            const isCourseLab = Boolean(
              course.isLab || 
              (course.name && course.name.toUpperCase().includes('LAB')) ||
              (course.code && course.code.toUpperCase().includes('LAB'))
            );

            return (
              <div
                key={course.id}
                className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between relative group"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="text-xs font-bold px-2.5 py-1 rounded-lg text-white"
                        style={{ backgroundColor: isCourseLab ? '#059669' : (course.color || '#3B82F6') }}
                      >
                        {course.code}
                      </span>
                      {isCourseLab && (
                        <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <FlaskConical className="w-3 h-3" />
                          LAB
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => openEditModal(course)}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                        title="Edit Course"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(course.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Delete Course"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 mb-2">{course.name}</h3>

                  <div className="space-y-1.5 text-xs text-slate-600">
                    <div className="flex items-center gap-2">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span>{course.teacher || 'TBA'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span>{course.room || 'Room TBA'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Award className="w-3.5 h-3.5 text-slate-400" />
                      <span>{course.credits || course.credit || (isCourseLab ? 1.5 : 3)} Credits</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span className="font-medium">{course.semester ? course.semester.trim() : '1st Semester'}</span>
                    <span className="font-semibold text-blue-600">
                      {course.attendance?.total
                        ? `${Math.round(((course.attendance.present || 0) / (course.attendance.total || 1)) * 100)}% Attend.`
                        : 'Active'}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => onOpenWorkspace && onOpenWorkspace(course.code)}
                    className="w-full py-2 px-3 rounded-xl bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-600 border border-slate-200/90 hover:border-blue-300 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <span>Open Workspace</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-slate-900">
                {editingCourse ? 'Edit Course' : 'Add New Course'}
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Course Code</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. CSE 101 or SE 122"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Course Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Structured Programming Lab"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Teacher</label>
                  <input
                    type="text"
                    placeholder="e.g. SCS"
                    value={teacher}
                    onChange={(e) => setTeacher(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Credits</label>
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    max="6"
                    value={credits}
                    onChange={(e) => setCredits(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Room</label>
                  <input
                    type="text"
                    placeholder="e.g. Room 711B"
                    value={room}
                    onChange={(e) => setRoom(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Semester</label>
                  <input
                    type="text"
                    placeholder="e.g. 1st Semester"
                    value={semester}
                    onChange={(e) => setSemester(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={isLab}
                    onChange={(e) => {
                      setIsLab(e.target.checked);
                      if (e.target.checked && credits === 3) setCredits(1.5);
                    }}
                    className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                  />
                  <span>Mark as Practical / Lab Class</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  {editingCourse ? 'Save Changes' : 'Create Course'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}