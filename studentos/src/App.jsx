import React, { useState, useEffect, useCallback } from 'react';
import LoginView from './views/LoginView';
import MaterialsView from './views/MaterialsView';
import AdminView from './views/AdminView';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import FocusTimerModal from './components/FocusTimerModal';

import DashboardView from './views/DashboardView';
import MyDayView from './views/MyDayView';
import CoursesView from './views/CoursesView';
import CalendarView from './views/CalendarView';
import CourseWorkspaceView from './views/CourseWorkSpaceView';
import RoutineView from './views/RoutineView';
import TasksView from './views/TasksView';
import AttendanceView from './views/AttendanceView';
import ExamCenterView from './views/ExamCenterView';
import GpaView from './views/GpaView';
import StudentOsAiView from './views/StudentOsAiView';
import ProfileView from './views/ProfileView';
import SettingsView from './views/SettingsView';

import { 
  INITIAL_USER, 
  INITIAL_COURSES, 
  INITIAL_TASKS, 
  INITIAL_ROUTINE, 
  INITIAL_MATERIALS, 
  INITIAL_EXAMS 
} from './data/initialData';

import { Search, X, Sparkles, ArrowRight } from 'lucide-react';

export default function App() {
  // Navigation & Role State
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [selectedCourseCode, setSelectedCourseCode] = useState(null);
  const [userRole, setUserRole] = useState('STUDENT'); // 'STUDENT' | 'TEACHER' | 'ADMIN'
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isTimerOpen, setIsTimerOpen] = useState(false);
  const [attendance, setAttendance] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [adminData, setAdminData] = useState({ stats: null, users: [] });

  // Demo Sandbox State
  const [isDemoMode, setIsDemoMode] = useState(() => {
    return localStorage.getItem('studentos_is_demo') === 'true';
  });

  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return !!localStorage.getItem('studentos_token') || localStorage.getItem('studentos_is_demo') === 'true';
  });

  // App-wide Persisted States
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('studentos_user');
    if (saved) return JSON.parse(saved);
    return isDemoMode ? INITIAL_USER : { name: 'Student', email: '', department: 'Software Engineering', semester: '1st Semester' };
  });

  const [courses, setCourses] = useState(() => {
    const saved = localStorage.getItem('studentos_courses');
    if (saved) return JSON.parse(saved);
    return isDemoMode ? INITIAL_COURSES : [];
  });

  const [tasks, setTasks] = useState(() => {
    const saved = localStorage.getItem('studentos_tasks') || localStorage.getItem('studentos_work_items');
    if (saved) return JSON.parse(saved);
    return isDemoMode ? INITIAL_TASKS : [];
  });

  const [routine, setRoutine] = useState(() => {
    const saved = localStorage.getItem('studentos_routine');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && (Array.isArray(parsed) || typeof parsed === 'object')) return parsed;
      } catch (e) {
        console.error(e);
      }
    }
    return isDemoMode ? INITIAL_ROUTINE : {};
  });

  const [exams, setExams] = useState(() => {
    const saved = localStorage.getItem('studentos_exams');
    if (saved) return JSON.parse(saved);
    return isDemoMode ? INITIAL_EXAMS : [];
  });

  // Centralized Authenticated Backend Synchronizer
  const fetchUserData = useCallback(async (token) => {
    if (!token) return;
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };

    try {
      const [coursesRes, tasksRes, routineRes, attendanceRes, materialsRes] = await Promise.all([
        fetch('http://localhost:5001/api/courses', { headers }).then(r => r.json()).catch(() => null),
        fetch('http://localhost:5001/api/tasks', { headers }).then(r => r.json()).catch(() => null),
        fetch('http://localhost:5001/api/routine', { headers }).then(r => r.json()).catch(() => null),
        fetch('http://localhost:5001/api/attendance', { headers }).then(r => r.json()).catch(() => null),
        fetch('http://localhost:5001/api/materials', { headers }).then(r => r.json()).catch(() => null)
      ]);

      if (coursesRes?.success && Array.isArray(coursesRes.data)) {
        setCourses(coursesRes.data);
        localStorage.setItem('studentos_courses', JSON.stringify(coursesRes.data));
      }

      if (tasksRes?.success && Array.isArray(tasksRes.data)) {
        setTasks(tasksRes.data);
        localStorage.setItem('studentos_tasks', JSON.stringify(tasksRes.data));
        localStorage.setItem('studentos_work_items', JSON.stringify(tasksRes.data));
      }

      if (routineRes?.success && routineRes.routine) {
        setRoutine(routineRes.routine);
        localStorage.setItem('studentos_routine', JSON.stringify(routineRes.routine));
      }

      if (attendanceRes?.success && Array.isArray(attendanceRes.data)) {
        setAttendance(attendanceRes.data);
      }

      if (materialsRes?.success && Array.isArray(materialsRes.data)) {
        setMaterials(materialsRes.data);
      }
    } catch (err) {
      console.warn('Backend sync encountering connection fallback:', err);
    }
  }, []);

  // Navigate directly into an isolated Course Workspace
  const handleOpenCourseWorkspace = (courseCode) => {
    setSelectedCourseCode(courseCode);
    setCurrentTab('course-workspace');
  };

  // --- Real-Time Instant Event Sync ---
  useEffect(() => {
    const handleCoursesSync = () => {
      const saved = localStorage.getItem('studentos_courses');
      if (saved) {
        try {
          setCourses(JSON.parse(saved));
        } catch (e) {
          console.error('Failed to sync courses in App state:', e);
        }
      }
    };

    window.addEventListener('studentos_courses_updated', handleCoursesSync);
    window.addEventListener('storage', handleCoursesSync);

    return () => {
      window.removeEventListener('studentos_courses_updated', handleCoursesSync);
      window.removeEventListener('storage', handleCoursesSync);
    };
  }, []);

  useEffect(() => {
    const handleTaskSync = () => {
      const saved = localStorage.getItem('studentos_tasks') || localStorage.getItem('studentos_work_items');
      if (saved) {
        try {
          setTasks(JSON.parse(saved));
        } catch (e) {
          console.error(e);
        }
      }
    };

    window.addEventListener('studentos_tasks_updated', handleTaskSync);
    return () => window.removeEventListener('studentos_tasks_updated', handleTaskSync);
  }, []);

  useEffect(() => {
    const handleRoutineSync = () => {
      const saved = localStorage.getItem('studentos_routine');
      if (saved) {
        try {
          setRoutine(JSON.parse(saved));
        } catch (e) {
          console.error(e);
        }
      }
    };

    window.addEventListener('studentos_routine_updated', handleRoutineSync);
    return () => window.removeEventListener('studentos_routine_updated', handleRoutineSync);
  }, []);

  useEffect(() => {
    const handleUserSync = (e) => {
      if (e.detail) {
        setUser(e.detail);
      } else {
        const saved = localStorage.getItem('studentos_user');
        if (saved) {
          try {
            setUser(JSON.parse(saved));
          } catch (err) {
            console.error(err);
          }
        }
      }
    };

    window.addEventListener('studentos_user_updated', handleUserSync);
    return () => window.removeEventListener('studentos_user_updated', handleUserSync);
  }, []);

  // Save to LocalStorage cache
  useEffect(() => {
    localStorage.setItem('studentos_user', JSON.stringify(user));
  }, [user]);

  useEffect(() => {
    localStorage.setItem('studentos_courses', JSON.stringify(courses));
  }, [courses]);

  useEffect(() => {
    localStorage.setItem('studentos_tasks', JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem('studentos_exams', JSON.stringify(exams));
  }, [exams]);

  useEffect(() => {
    if (routine && (Array.isArray(routine) ? routine.length > 0 : Object.values(routine).some((arr) => Array.isArray(arr) && arr.length > 0))) {
      localStorage.setItem('studentos_routine', JSON.stringify(routine));
    }
  }, [routine]);

  // Authenticate & initial backend load on mount
  useEffect(() => {
    const token = localStorage.getItem('studentos_token');
    const isDemo = localStorage.getItem('studentos_is_demo') === 'true';

    if (isDemo) {
      setIsDemoMode(true);
      setIsAuthenticated(true);
      return;
    }

    if (token) {
      fetch('http://localhost:5001/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then((res) => res.json())
        .then((result) => {
          if (result.success && result.data) {
            setUser(result.data);
            setUserRole(result.data.role);
            setIsAuthenticated(true);
            fetchUserData(token);
          } else {
            localStorage.removeItem('studentos_token');
            setIsAuthenticated(false);
          }
        })
        .catch(() => setIsAuthenticated(false));
    }
  }, [fetchUserData]);

  // Fetch admin insights if user has permissions
  useEffect(() => {
    if (userRole === 'ADMIN' || userRole === 'Admin') {
      const token = localStorage.getItem('studentos_token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      Promise.all([
        fetch('http://localhost:5001/api/admin/stats', { headers }).then((res) => res.json()).catch(() => null),
        fetch('http://localhost:5001/api/admin/users', { headers }).then((res) => res.json()).catch(() => null),
      ])
        .then(([statsRes, usersRes]) => {
          setAdminData({
            stats: statsRes?.success ? statsRes.data : null,
            users: usersRes?.success ? usersRes.data : [],
          });
        })
        .catch((err) => console.warn('Admin endpoints offline:', err));
    }
  }, [userRole]);

  // Demo Restriction Guard Action
  const handleRestrictedAction = () => {
    if (isDemoMode) {
      alert("🔒 Demo Mode Preview:\n\nYou are exploring the live sandbox. To add courses, log attendance, or customize your workspace, please exit demo mode and create your free account!");
      return true;
    }
    return false;
  };

  const handleLoginSuccess = async (userData) => {
    setUser(userData);
    setUserRole(userData.role || 'STUDENT');
    setIsDemoMode(false);
    setIsAuthenticated(true);
    localStorage.removeItem('studentos_is_demo');

    const token = localStorage.getItem('studentos_token');
    if (token) {
      await fetchUserData(token);
    } else {
      setCourses([]);
      setTasks([]);
      setRoutine({});
      setExams([]);
    }

    const meta = {
      section: userData.section || 'F1',
      batch: userData.batch || '48',
      department: userData.department || 'Software Engineering',
      effectiveDate: '26 September 2026'
    };
    localStorage.setItem('studentos_routine_meta', JSON.stringify(meta));
    setCurrentTab('dashboard');
  };

  const handleStartDemo = (demoUserData) => {
    setUser(demoUserData);
    setUserRole('STUDENT');
    setIsDemoMode(true);
    setIsAuthenticated(true);
    localStorage.setItem('studentos_is_demo', 'true');

    // Populate rich sandbox preview template
    setCourses(INITIAL_COURSES);
    setTasks(INITIAL_TASKS);
    setRoutine(INITIAL_ROUTINE);
    setExams(INITIAL_EXAMS);
    setMaterials(INITIAL_MATERIALS);

    localStorage.setItem('studentos_courses', JSON.stringify(INITIAL_COURSES));
    localStorage.setItem('studentos_tasks', JSON.stringify(INITIAL_TASKS));
    localStorage.setItem('studentos_routine', JSON.stringify(INITIAL_ROUTINE));
    localStorage.setItem('studentos_exams', JSON.stringify(INITIAL_EXAMS));

    const meta = {
      section: demoUserData.section || 'F1',
      batch: '48',
      department: demoUserData.department || 'Software Engineering',
      effectiveDate: '26 September 2026'
    };
    localStorage.setItem('studentos_routine_meta', JSON.stringify(meta));
    setCurrentTab('dashboard');
  };

  const handleLogout = () => {
    if (isDemoMode) {
      localStorage.removeItem('studentos_is_demo');
      setIsDemoMode(false);
      setIsAuthenticated(false);
      return;
    }
    if (window.confirm('Log out from StudentOS?')) {
      localStorage.removeItem('studentos_token');
      localStorage.removeItem('studentos_is_demo');
      setIsAuthenticated(false);
      setIsDemoMode(false);
    }
  };

  const handleMarkAttendance = async ({ courseId, isPresent }) => {
    if (handleRestrictedAction()) return;

    const updatedCourses = courses.map((c) => {
      if (c.id === courseId) {
        const prevAtt = c.attendance || { present: 0, total: 0 };
        return {
          ...c,
          attendance: {
            present: isPresent ? prevAtt.present + 1 : prevAtt.present,
            total: prevAtt.total + 1,
          },
        };
      }
      return c;
    });

    setCourses(updatedCourses);
    localStorage.setItem('studentos_courses', JSON.stringify(updatedCourses));
    window.dispatchEvent(new CustomEvent('studentos_courses_updated', { detail: updatedCourses }));

    try {
      const token = localStorage.getItem('studentos_token');
      const targetCourse = courses.find(c => c.id === courseId);
      
      await fetch('http://localhost:5001/api/attendance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          courseId,
          courseCode: targetCourse?.code || 'CSE 101',
          date: new Date().toISOString().split('T')[0],
          status: isPresent ? 'Present' : 'Absent',
        }),
      });
    } catch (err) {
      console.warn('Backend attendance logging failed:', err);
    }
  };

  const handleAddMaterial = async (materialData) => {
    if (handleRestrictedAction()) return;

    try {
      const token = localStorage.getItem('studentos_token');
      const res = await fetch('http://localhost:5001/api/materials', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(materialData),
      });
      const result = await res.json();
      if (result.success && result.data) {
        setMaterials((prev) => [result.data, ...(prev || [])]);
      }
    } catch (err) {
      console.warn('Backend unavailable, saving locally:', err);
      setMaterials((prev) => [{ id: 'mat_' + Date.now(), ...materialData }, ...(prev || [])]);
    }
  };

  const handleDeleteMaterial = async (id) => {
    if (handleRestrictedAction()) return;

    try {
      const token = localStorage.getItem('studentos_token');
      await fetch(`http://localhost:5001/api/materials/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setMaterials((prev) => (prev || []).filter((m) => m.id !== id));
    } catch (err) {
      console.warn('Backend offline, deleting locally:', err);
      setMaterials((prev) => (prev || []).filter((m) => m.id !== id));
    }
  };

  const handleRoleChange = async (newRole) => {
    try {
      const res = await fetch(`http://localhost:5001/api/auth/profile/${newRole.toLowerCase()}`);
      const result = await res.json();
      if (result.success && result.data) {
        setUser(result.data);
        setUserRole(result.data.role);
        setCurrentTab(result.data.role === 'Admin' ? 'admin' : 'dashboard');
      }
    } catch (err) {
      console.warn('Backend unavailable, switching role locally:', err);
      setUserRole(newRole);
      setCurrentTab(newRole === 'Admin' ? 'admin' : 'dashboard');
    }
  };

  // Keyboard shortcut listener for Global Search (⌘ K)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const routineList = Array.isArray(routine)
    ? routine
    : Object.entries(routine || {}).flatMap(([day, items]) =>
        Array.isArray(items) ? items.map((item) => ({ ...item, day })) : []
      );

  const searchResults = searchQuery.trim()
    ? [
        ...courses.filter(c => (c.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || (c.code || '').toLowerCase().includes(searchQuery.toLowerCase())).map(c => ({ type: 'Course', title: `${c.code} – ${c.name}`, tab: 'courses' })),
        ...tasks.filter(t => (t.title || '').toLowerCase().includes(searchQuery.toLowerCase())).map(t => ({ type: 'Task', title: t.title, tab: 'tasks' })),
        ...exams.filter(e => (e.title || '').toLowerCase().includes(searchQuery.toLowerCase()) || (e.courseCode || '').toLowerCase().includes(searchQuery.toLowerCase())).map(e => ({ type: 'Exam', title: `${e.courseCode} – ${e.title}`, tab: 'exams' })),
        ...routineList.filter(r => (r.code || r.name || '').toLowerCase().includes(searchQuery.toLowerCase())).map(r => ({ type: 'Class', title: `${r.day}: ${r.code || r.course} - ${r.name || ''}`, tab: 'routine' })),
      ]
    : [];

  if (!isAuthenticated) {
    return (
      <LoginView 
        onLoginSuccess={handleLoginSuccess}
        onStartDemo={handleStartDemo}
      />
    );
  }

  return (
    <div className="flex h-screen bg-[#F8FAFC] text-slate-800 font-sans overflow-hidden flex-col">
      {isDemoMode && (
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white px-5 py-2 text-xs flex items-center justify-between shadow-md z-50 shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
            <span>
              <strong>StudentOS Interactive Demo:</strong> You are exploring a live sandbox preview workspace for <strong>{user.name}</strong>.
            </span>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-slate-100 text-blue-700 font-bold rounded-lg transition cursor-pointer shadow-2xs"
          >
            <span>Exit Demo & Create Account</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          currentTab={currentTab}
          setCurrentTab={setCurrentTab}
          userRole={userRole}
          user={user}
          onLogout={handleLogout}
        />

        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <Header
            user={user}
            userRole={userRole}
            setUserRole={handleRoleChange}
            onOpenSearch={() => setIsSearchOpen(true)}
            onOpenProfile={() => setCurrentTab('profile')}
            onLogout={handleLogout}
            onNavigate={(tab) => setCurrentTab(tab)}
            tasks={tasks}
            routine={routine}
            exams={exams}
            courses={courses}
            onOpenTimer={() => setIsTimerOpen(true)}
          />

          <main className="flex-1 overflow-y-auto p-6 md:p-8">
            <div className="max-w-7xl mx-auto pb-12">
              {currentTab === 'dashboard' && (
                <DashboardView
                  user={user}
                  courses={courses}
                  tasks={tasks}
                  routine={routine}
                  onNavigate={(tab) => setCurrentTab(tab)}
                  onOpenAddTask={() => setCurrentTab('tasks')}
                  onOpenTimer={() => setIsTimerOpen(true)}
                />
              )}

              {currentTab === 'my-day' && (
                <MyDayView
                  courses={courses}
                  setCourses={setCourses}
                  routine={routine}
                  tasks={tasks}
                  setTasks={setTasks}
                  exams={exams}
                  onOpenWorkspace={handleOpenCourseWorkspace}
                  onNavigate={(tab) => setCurrentTab(tab)}
                />
              )}

              {currentTab === 'courses' && (
                <CoursesView
                  courses={courses}
                  setCourses={setCourses}
                  userRole={userRole}
                  isDemoMode={isDemoMode}
                  onRestrictedAction={handleRestrictedAction}
                  onOpenWorkspace={handleOpenCourseWorkspace}
                />
              )}

              {currentTab === 'course-workspace' && (
                <CourseWorkspaceView
                  courseCode={selectedCourseCode}
                  courses={courses}
                  workItems={tasks}
                  exams={exams}
                  onBack={() => setCurrentTab('courses')}
                />
              )}

              {currentTab === 'routine' && (
                <RoutineView
                  routine={routine}
                  setRoutine={setRoutine}
                  courses={courses}
                  setCourses={setCourses}
                  userRole={userRole}
                  user={user}
                />
              )}

              {currentTab === 'calendar' && (
                <CalendarView
                  courses={courses}
                  routine={routine}
                  tasks={tasks}
                  setTasks={setTasks}
                  exams={exams}
                  setExams={setExams}
                  materials={materials}
                  setMaterials={setMaterials}
                />
              )}

              {currentTab === 'tasks' && (
                <TasksView
                  courses={courses}
                  isDemoMode={isDemoMode}
                  onRestrictedAction={handleRestrictedAction}
                />
              )}

              {currentTab === 'attendance' && (
                <AttendanceView
                  courses={courses}
                  setCourses={setCourses}
                  routine={routine}
                  onMarkAttendance={handleMarkAttendance}
                />
              )}

              {currentTab === 'exams' && (
                <ExamCenterView
                  exams={exams}
                  setExams={setExams}
                  courses={courses}
                />
              )}

              {currentTab === 'gpa' && (
                <GpaView
                  courses={courses}
                />
              )}

              {currentTab === 'ai-assistant' && (
                <StudentOsAiView
                  courses={courses}
                  routine={routine}
                  workItems={tasks}
                  exams={exams}
                  user={user}
                />
              )}

              {currentTab === 'materials' && (
                <MaterialsView
                  materials={materials}
                  courses={courses}  
                  onAddMaterial={handleAddMaterial}
                  onDeleteMaterial={handleDeleteMaterial}
                />
              )}

              {currentTab === 'admin' && (
                <AdminView
                  stats={adminData.stats}
                  users={adminData.users}
                />
              )}

              {currentTab === 'profile' && (
                <ProfileView
                  user={user}
                  onUpdateUser={(updated) => {
                    setUser(updated);
                    localStorage.setItem('studentos_user', JSON.stringify(updated));
                  }}
                />
              )}

              {currentTab === 'settings' && (
                <SettingsView
                  user={user}
                  onUpdateUser={(updated) => {
                    setUser(updated);
                    localStorage.setItem('studentos_user', JSON.stringify(updated));
                  }}
                />
              )}
            </div>
          </main>
        </div>
      </div>

      {/* Global Search Dialog Modal (⌘ K) */}
      {isSearchOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-start justify-center pt-20 p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-4 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-100">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <Search className="w-5 h-5 text-slate-400" />
              <input
                type="text"
                autoFocus
                placeholder="Search courses, tasks, exams, or classes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-sm outline-none text-slate-800 placeholder-slate-400"
              />
              <button 
                onClick={() => setIsSearchOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-3 max-h-60 overflow-y-auto space-y-1">
              {searchQuery && searchResults.length === 0 && (
                <p className="text-xs text-slate-400 py-4 text-center">No results found for "{searchQuery}"</p>
              )}
              {searchResults.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setCurrentTab(item.tab);
                    setIsSearchOpen(false);
                  }}
                  className="w-full text-left p-2.5 rounded-xl hover:bg-slate-50 flex items-center justify-between text-xs cursor-pointer"
                >
                  <span className="font-semibold text-slate-800">{item.title}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-500 uppercase">
                    {item.type}
                  </span>
                </button>
              ))}
              {!searchQuery && (
                <p className="text-xs text-slate-400 py-3 text-center">Type something to search across your system...</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Dedicated Pomodoro Study Focus Timer Modal */}
      <FocusTimerModal
        isOpen={isTimerOpen}
        onClose={() => setIsTimerOpen(false)}
        courses={courses}
      />
    </div>
  );
}