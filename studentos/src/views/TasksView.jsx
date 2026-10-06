import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Plus, 
  CheckCircle2, 
  Circle, 
  Clock, 
  Trash2, 
  X, 
  AlertCircle, 
  Calendar as CalendarIcon, 
  List, 
  Columns, 
  BarChart3, 
  Search, 
  CheckSquare, 
  BookOpen, 
  Play, 
  Pause, 
  RotateCcw, 
  CalendarCheck2, 
  RefreshCw, 
  ExternalLink, 
  MoveRight, 
  MoveLeft, 
  GripVertical 
} from 'lucide-react';

const CURRENT_DATE_STR = new Date().toISOString().split('T')[0];

export default function TasksView({ courses = [], isDemoMode = false, onRestrictedAction }) {
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // View state
  const [currentView, setCurrentView] = useState('list'); // 'list' | 'board' | 'calendar' | 'workload'
  const [typeFilter, setTypeFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [courseFilter, setCourseFilter] = useState('All Courses');
  const [priorityFilter, setPriorityFilter] = useState('All Priorities');
  const [sortBy, setSortBy] = useState('Deadline');

  // Drag and Drop State
  const [draggingItemId, setDraggingItemId] = useState(null);
  const [dragOverCol, setDragOverCol] = useState(null);

  // Modals & Panels
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [copiedFeed, setCopiedFeed] = useState(false);
  const [modalWorkType, setModalWorkType] = useState('Assignment');
  const [activeDrawerItem, setActiveDrawerItem] = useState(null);
  const [calendarSelectedDate, setCalendarSelectedDate] = useState(CURRENT_DATE_STR);

  // Focus Timer
  const [timerSeconds, setTimerSeconds] = useState(25 * 60);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const timerRef = useRef(null);

  // 1. Fetch authenticated tasks from server
  const fetchTasks = async () => {
    const token = localStorage.getItem('studentos_token');
    if (!token && !isDemoMode) {
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch('http://localhost:5001/api/tasks', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const result = await res.json();
      if (result.success && Array.isArray(result.data)) {
        const mapped = result.data.map((t) => {
          let parsedSubs = [];
          if (t.subtasks) {
            try {
              parsedSubs = typeof t.subtasks === 'string' ? JSON.parse(t.subtasks) : t.subtasks;
            } catch {
              parsedSubs = [];
            }
          }
          return {
            ...t,
            deadlineDate: t.deadline || CURRENT_DATE_STR,
            courseCode: t.courseName || t.courseId || 'General',
            type: t.type || 'Assignment',
            subtasks: parsedSubs
          };
        });
        setItems(mapped);
        localStorage.setItem('studentos_tasks', JSON.stringify(mapped));
      }
    } catch (err) {
      console.warn('Backend unavailable, using cached tasks:', err);
      const cached = localStorage.getItem('studentos_tasks') || localStorage.getItem('studentos_work_items');
      if (cached) {
        try {
          setItems(JSON.parse(cached));
        } catch {}
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [isDemoMode]);

  useEffect(() => {
    if (items.length > 0) {
      localStorage.setItem('studentos_work_items', JSON.stringify(items));
      localStorage.setItem('studentos_tasks', JSON.stringify(items));
      window.dispatchEvent(new CustomEvent('studentos_tasks_updated', { detail: items }));
    }
  }, [items]);

  // Pomodoro Focus Timer
  useEffect(() => {
    if (isTimerRunning) {
      timerRef.current = setInterval(() => {
        setTimerSeconds((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            setIsTimerRunning(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [isTimerRunning]);

  const resetTimer = () => {
    setIsTimerRunning(false);
    setTimerSeconds(25 * 60);
  };

  const formatTimer = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Google Calendar URL Generator
  const createGoogleCalendarUrl = (item) => {
    const cleanDate = (item.deadlineDate || item.deadline || CURRENT_DATE_STR).replace(/-/g, '');
    const gcalUrl = new URL('https://calendar.google.com/calendar/render');
    gcalUrl.searchParams.append('action', 'TEMPLATE');
    gcalUrl.searchParams.append('text', `${item.type === 'Assignment' ? 'Due' : 'Task'}: ${item.title}`);
    gcalUrl.searchParams.append('dates', `${cleanDate}/${cleanDate}`);
    gcalUrl.searchParams.append(
      'details',
      `Course: ${item.courseCode || 'General'}\nPriority: ${item.priority || 'Normal'}\n\nSynced live with StudentOS.`
    );
    return gcalUrl.toString();
  };

  const openInGoogleCalendar = (item) => {
    window.open(createGoogleCalendarUrl(item), '_blank', 'noopener,noreferrer');
  };

  const handleSyncAllTasks = () => {
    const pending = items.filter((i) => i.status !== 'Completed');
    if (pending.length === 0) {
      alert('No pending tasks to sync.');
      return;
    }
    if (pending.length > 5 && !window.confirm(`Open ${pending.length} Google Calendar event tabs?`)) return;

    pending.forEach((item, idx) => {
      setTimeout(() => openInGoogleCalendar(item), idx * 400);
    });
  };

  const feedUrl = `${window.location.origin.replace('5173', '5001')}/api/calendar/feed.ics`;

  const handleCopyFeed = () => {
    navigator.clipboard.writeText(feedUrl);
    setCopiedFeed(true);
    setTimeout(() => setCopiedFeed(false), 2500);
  };

  // Add Item Form State
  const [formTitle, setFormTitle] = useState('');
  const [formCourse, setFormCourse] = useState('CSE 101');
  const [formCategory, setFormCategory] = useState('Lab Assignment');
  const [formDueDate, setFormDueDate] = useState(CURRENT_DATE_STR);
  const [formDueTime, setFormDueTime] = useState('23:59');
  const [formPriority, setFormPriority] = useState('High');
  const [formEstimatedHours, setFormEstimatedHours] = useState(3);
  const [formDescription, setFormDescription] = useState('');
  const [formSubtasksText, setFormSubtasksText] = useState('');
  const [newSubtaskInput, setNewSubtaskInput] = useState('');

  const availableCourses = useMemo(() => {
    const list = ['CSE 101', 'MATH 101', 'SE 101', 'PHY 101', 'General / Personal'];
    courses.forEach((c) => {
      if (c.code && !list.includes(c.code)) list.push(c.code);
    });
    return list;
  }, [courses]);

  const metrics = useMemo(() => {
    const total = items.length;
    const pending = items.filter((i) => i.status !== 'Completed').length;
    const completed = items.filter((i) => i.status === 'Completed').length;

    const dueSoon = items.filter((i) => {
      if (i.status === 'Completed') return false;
      const today = new Date(CURRENT_DATE_STR);
      const target = new Date(i.deadlineDate);
      const diffDays = Math.ceil((target - today) / (1000 * 60 * 60 * 24));
      return diffDays >= 0 && diffDays <= 3;
    }).length;

    const assignmentCount = items.filter((i) => i.type === 'Assignment').length;
    const personalCount = items.filter((i) => i.type === 'Personal Task').length;

    return { total, pending, completed, dueSoon, assignmentCount, personalCount };
  }, [items]);

  const getDeadlineInfo = (dateStr) => {
    const today = new Date(`${CURRENT_DATE_STR}T00:00:00`);
    const target = new Date(`${dateStr}T00:00:00`);
    const diffDays = Math.round((target - today) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return { badge: 'Overdue', color: 'bg-rose-50 text-rose-700 border-rose-200', dot: 'bg-rose-500' };
    if (diffDays === 0) return { badge: 'Due Today', color: 'bg-rose-50 text-rose-700 border-rose-200', dot: 'bg-rose-500' };
    if (diffDays === 1) return { badge: 'Due Tomorrow', color: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500' };
    if (diffDays <= 4) return { badge: `Due in ${diffDays} Days`, color: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500' };
    return { badge: `Due ${dateStr}`, color: 'bg-slate-50 text-slate-600 border-slate-200', dot: 'bg-slate-400' };
  };

  const getPriorityBadge = (lvl) => {
    switch (lvl) {
      case 'Urgent':
        return { label: 'Urgent', color: 'bg-rose-50 text-rose-600 border border-rose-200', dot: 'bg-rose-500' };
      case 'High':
        return { label: 'High Priority', color: 'bg-amber-50 text-amber-700 border border-amber-200', dot: 'bg-amber-500' };
      case 'Medium':
        return { label: 'Medium Priority', color: 'bg-amber-50 text-amber-700 border border-amber-200', dot: 'bg-amber-500' };
      case 'Low':
        return { label: 'Low Priority', color: 'bg-emerald-50 text-emerald-700 border border-emerald-200', dot: 'bg-emerald-500' };
      default:
        return { label: lvl, color: 'bg-slate-50 text-slate-600 border border-slate-200', dot: 'bg-slate-400' };
    }
  };

  // Status transitions with Backend Sync
  const updateItemStatus = async (id, nextStatus) => {
    if (isDemoMode && onRestrictedAction && onRestrictedAction()) return;

    // Optimistic UI update
    setItems((prev) =>
      prev.map((i) => {
        if (i.id !== id) return i;
        const updatedSubtasks = (i.subtasks || []).map((st) => ({
          ...st,
          done: nextStatus === 'Completed' ? true : nextStatus === 'To Do' ? false : st.done
        }));
        return { ...i, status: nextStatus, subtasks: updatedSubtasks };
      })
    );

    if (activeDrawerItem && activeDrawerItem.id === id) {
      setActiveDrawerItem((prev) => ({ ...prev, status: nextStatus }));
    }

    const token = localStorage.getItem('studentos_token');
    if (token) {
      try {
        await fetch(`http://localhost:5001/api/tasks/${id}/toggle`, {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${token}` }
        });
      } catch (err) {
        console.warn('Backend sync failed:', err);
      }
    }
  };

  const handleToggleItem = (id) => {
    const item = items.find((i) => i.id === id);
    if (!item) return;
    const nextStatus = item.status === 'Completed' ? 'To Do' : 'Completed';
    updateItemStatus(id, nextStatus);
  };

  const handleDeleteItem = async (id) => {
    if (isDemoMode && onRestrictedAction && onRestrictedAction()) return;

    setItems((prev) => prev.filter((i) => i.id !== id));
    if (activeDrawerItem && activeDrawerItem.id === id) {
      setActiveDrawerItem(null);
    }

    const token = localStorage.getItem('studentos_token');
    if (token) {
      try {
        await fetch(`http://localhost:5001/api/tasks/${id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` }
        });
      } catch (err) {
        console.warn('Delete task failed:', err);
      }
    }
  };

  const handleToggleSubtask = (itemId, subtaskId) => {
    setItems((prev) =>
      prev.map((i) => {
        if (i.id !== itemId) return i;
        const newSubtasks = (i.subtasks || []).map((st) =>
          st.id === subtaskId ? { ...st, done: !st.done } : st
        );
        const allDone = newSubtasks.length > 0 && newSubtasks.every((st) => st.done);
        const hasSomeDone = newSubtasks.some((st) => st.done);
        const nextStatus = allDone ? 'Completed' : hasSomeDone ? 'In Progress' : 'To Do';

        return { ...i, subtasks: newSubtasks, status: nextStatus };
      })
    );

    if (activeDrawerItem && activeDrawerItem.id === itemId) {
      setActiveDrawerItem((prev) => {
        const newSubtasks = (prev.subtasks || []).map((st) =>
          st.id === subtaskId ? { ...st, done: !st.done } : st
        );
        return { ...prev, subtasks: newSubtasks };
      });
    }
  };

  // Drag and drop handlers
  const handleDragStart = (e, id) => {
    e.dataTransfer.setData('text/plain', id);
    setDraggingItemId(id);
  };

  const handleDragOver = (e, colKey) => {
    e.preventDefault();
    if (dragOverCol !== colKey) setDragOverCol(colKey);
  };

  const handleDrop = (e, targetStatus) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain') || draggingItemId;
    if (id) {
      updateItemStatus(id, targetStatus);
    }
    setDraggingItemId(null);
    setDragOverCol(null);
  };

  const handleAddDrawerSubtask = (e) => {
    e.preventDefault();
    if (!newSubtaskInput.trim() || !activeDrawerItem) return;
    const newSt = {
      id: `st_${Date.now()}`,
      title: newSubtaskInput.trim(),
      done: false
    };

    setItems((prev) =>
      prev.map((i) => {
        if (i.id !== activeDrawerItem.id) return i;
        return { ...i, subtasks: [...(i.subtasks || []), newSt] };
      })
    );

    setActiveDrawerItem((prev) => ({
      ...prev,
      subtasks: [...(prev.subtasks || []), newSt]
    }));
    setNewSubtaskInput('');
  };

  const handleCreateWorkItem = async (e) => {
    e.preventDefault();
    if (!formTitle.trim()) return;
    if (isDemoMode && onRestrictedAction && onRestrictedAction()) return;

    const subtasksParsed = formSubtasksText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((title, idx) => ({ id: `st_${Date.now()}_${idx}`, title, done: false }));

    const newItem = {
      id: `t_${Date.now()}`,
      title: formTitle.trim(),
      courseId: formCourse,
      courseName: formCourse,
      courseCode: formCourse,
      category: formCategory,
      deadline: formDueDate,
      deadlineDate: formDueDate,
      deadlineTime: formDueTime,
      priority: formPriority,
      status: 'Pending',
      type: modalWorkType,
      estimatedHours: Number(formEstimatedHours) || 2,
      description: formDescription.trim(),
      subtasks: subtasksParsed
    };

    setItems((prev) => [newItem, ...prev]);
    setShowAddModal(false);

    setFormTitle('');
    setFormDescription('');
    setFormSubtasksText('');

    const token = localStorage.getItem('studentos_token');
    if (token) {
      try {
        await fetch('http://localhost:5001/api/tasks', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(newItem)
        });
      } catch (err) {
        console.warn('Backend task creation sync failed:', err);
      }
    }
  };

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (typeFilter === 'Assignments' && item.type !== 'Assignment') return false;
      if (typeFilter === 'Personal Tasks' && item.type !== 'Personal Task') return false;

      if (statusFilter === 'Pending' && item.status === 'Completed') return false;
      if (statusFilter === 'Completed' && item.status !== 'Completed') return false;
      if (statusFilter === 'Due Soon') {
        const today = new Date(CURRENT_DATE_STR);
        const target = new Date(item.deadlineDate);
        const diffDays = Math.ceil((target - today) / (1000 * 60 * 60 * 24));
        if (item.status === 'Completed' || diffDays < 0 || diffDays > 3) return false;
      }

      if (courseFilter !== 'All Courses' && (item.courseCode !== courseFilter && item.courseName !== courseFilter)) return false;

      if (priorityFilter !== 'All Priorities') {
        if (!item.priority?.toLowerCase().includes(priorityFilter.toLowerCase())) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const inTitle = (item.title || '').toLowerCase().includes(q);
        const inCourse = (item.courseCode || item.courseName || '').toLowerCase().includes(q);
        const inDesc = (item.description || '').toLowerCase().includes(q);
        if (!inTitle && !inCourse && !inDesc) return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'Deadline') return new Date(a.deadlineDate) - new Date(b.deadlineDate);
      if (sortBy === 'Priority') {
        const ranks = { Urgent: 4, High: 3, Medium: 2, Low: 1 };
        return (ranks[b.priority] || 0) - (ranks[a.priority] || 0);
      }
      return a.title.localeCompare(b.title);
    });
  }, [items, typeFilter, statusFilter, courseFilter, priorityFilter, searchQuery, sortBy]);

  const groupedSections = useMemo(() => {
    const overdue = [];
    const today = [];
    const tomorrow = [];
    const upcoming = [];
    const completed = [];

    const todayDate = new Date(`${CURRENT_DATE_STR}T00:00:00`);

    filteredItems.forEach((item) => {
      if (item.status === 'Completed') {
        completed.push(item);
        return;
      }

      const itemDate = new Date(`${item.deadlineDate}T00:00:00`);
      const diffDays = Math.round((itemDate - todayDate) / (1000 * 60 * 60 * 24));

      if (diffDays < 0) overdue.push(item);
      else if (diffDays === 0) today.push(item);
      else if (diffDays === 1) tomorrow.push(item);
      else upcoming.push(item);
    });

    return [
      { key: 'OVERDUE', title: 'OVERDUE', count: overdue.length, items: overdue, color: 'text-rose-600 bg-rose-50' },
      { key: 'TODAY', title: 'TODAY', count: today.length, items: today, color: 'text-blue-600 bg-blue-50' },
      { key: 'TOMORROW', title: 'TOMORROW', count: tomorrow.length, items: tomorrow, color: 'text-slate-600 bg-slate-100' },
      { key: 'UPCOMING', title: 'UPCOMING', count: upcoming.length, items: upcoming, color: 'text-slate-600 bg-slate-100' },
      { key: 'COMPLETED', title: 'COMPLETED', count: completed.length, items: completed, color: 'text-emerald-600 bg-emerald-50' }
    ].filter((s) => s.items.length > 0);
  }, [filteredItems]);

  const calendarDayDeliverables = useMemo(() => {
    return items.filter((i) => i.deadlineDate === calendarSelectedDate);
  }, [items, calendarSelectedDate]);

  return (
    <div className="space-y-4 text-slate-800">
      {/* 1. Header & Primary Action Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">Assignments & Tasks</h1>
          <p className="text-xs text-slate-500 mt-0.5">Manage your academic coursework and personal study tasks.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowSyncModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold rounded-lg shadow-2xs transition cursor-pointer"
          >
            <CalendarCheck2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Sync to Google Calendar</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setModalWorkType('Personal Task');
              setFormCategory('Personal Study');
              setShowAddModal(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-lg shadow-2xs transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-slate-600" />
            <span>+ Add Task</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setModalWorkType('Assignment');
              setFormCategory('Lab Assignment');
              setShowAddModal(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-2xs transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Add Assignment</span>
          </button>
        </div>
      </div>

      {/* 2. Compact 4 Metrics Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'TOTAL', count: metrics.total, icon: BookOpen, color: 'text-slate-700', bg: 'bg-white', border: 'border-slate-200/90' },
          { label: 'PENDING', count: metrics.pending, icon: Clock, color: 'text-amber-600', bg: 'bg-white', border: 'border-slate-200/90' },
          { label: 'DUE SOON', count: metrics.dueSoon, icon: AlertCircle, color: 'text-rose-600', bg: 'bg-white', border: 'border-slate-200/90' },
          { label: 'COMPLETED', count: metrics.completed, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-white', border: 'border-slate-200/90' }
        ].map((m) => {
          const Icon = m.icon;
          return (
            <div key={m.label} className={`p-3 rounded-xl border ${m.border} ${m.bg} shadow-2xs flex items-center justify-between`}>
              <div>
                <span className="text-[10px] font-bold text-slate-400 block tracking-wider uppercase">{m.label}</span>
                <span className={`text-xl font-black ${m.color} block mt-0.5`}>{m.count}</span>
              </div>
              <div className="w-7 h-7 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400">
                <Icon className="w-4 h-4" />
              </div>
            </div>
          );
        })}
      </div>

      {/* 3. Filters & Multi-View Switcher Bar */}
      <div className="bg-white border border-slate-200/90 rounded-xl p-2.5 shadow-2xs space-y-2.5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-1.5 text-xs font-bold">
            <button
              onClick={() => { setTypeFilter('All'); setStatusFilter('All'); }}
              className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                typeFilter === 'All' && statusFilter === 'All'
                  ? 'bg-[#2563EB] text-white shadow-2xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              All ({metrics.total})
            </button>

            <button
              onClick={() => setTypeFilter('Assignments')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition cursor-pointer ${
                typeFilter === 'Assignments'
                  ? 'bg-[#2563EB] text-white shadow-2xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              <span>📘 Assignments</span>
              <span className="text-[10px] opacity-75">({metrics.assignmentCount})</span>
            </button>

            <button
              onClick={() => setTypeFilter('Personal Tasks')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition cursor-pointer ${
                typeFilter === 'Personal Tasks'
                  ? 'bg-[#2563EB] text-white shadow-2xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              <span>✅ Personal Tasks</span>
              <span className="text-[10px] opacity-75">({metrics.personalCount})</span>
            </button>

            <div className="h-4 w-px bg-slate-200 mx-1 hidden sm:block" />

            <button
              onClick={() => setStatusFilter(statusFilter === 'Pending' ? 'All' : 'Pending')}
              className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                statusFilter === 'Pending'
                  ? 'bg-amber-100 text-amber-800 border border-amber-300 font-bold'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-600'
              }`}
            >
              Pending ({metrics.pending})
            </button>

            <button
              onClick={() => setStatusFilter(statusFilter === 'Completed' ? 'All' : 'Completed')}
              className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                statusFilter === 'Completed'
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-600'
              }`}
            >
              Completed ({metrics.completed})
            </button>
          </div>

          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200/80 self-start lg:self-auto">
            {[
              { id: 'list', label: 'List', icon: List },
              { id: 'board', label: 'Board', icon: Columns },
              { id: 'calendar', label: 'Calendar', icon: CalendarIcon },
              { id: 'workload', label: 'Workload', icon: BarChart3 }
            ].map((v) => {
              const Icon = v.icon;
              const isActive = currentView === v.id;
              return (
                <button
                  key={v.id}
                  onClick={() => setCurrentView(v.id)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold transition cursor-pointer ${
                    isActive
                      ? 'bg-white text-blue-600 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{v.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-2 pt-2 border-t border-slate-100 text-xs">
          <div className="relative flex-1 w-full">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filter by title or course..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={courseFilter}
              onChange={(e) => setCourseFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
            >
              <option value="All Courses">All Courses</option>
              {availableCourses.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
            >
              <option value="All Priorities">All Priorities</option>
              <option value="Urgent">Urgent</option>
              <option value="High">High Priority</option>
              <option value="Medium">Medium Priority</option>
              <option value="Low">Low Priority</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
            >
              <option value="Deadline">Sort: Deadline</option>
              <option value="Priority">Sort: Priority</option>
              <option value="Title">Sort: Title</option>
            </select>
          </div>
        </div>
      </div>

      {/* 4. VIEW A: LIST VIEW */}
      {currentView === 'list' && (
        <div className="space-y-4">
          {groupedSections.length === 0 ? (
            <div className="bg-white border border-slate-200/80 rounded-xl p-10 text-center text-slate-400">
              <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-emerald-400" />
              <p className="text-sm font-bold text-slate-700">No items match your active filters</p>
              <p className="text-xs text-slate-400 mt-0.5">Try resetting search or filters to see all academic tasks.</p>
            </div>
          ) : (
            groupedSections.map((sec) => (
              <div key={sec.key} className="space-y-2">
                <div className="flex items-center gap-2 px-1">
                  <span className="text-[11px] font-black text-slate-500 tracking-wider">{sec.title}</span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${sec.color}`}>
                    {sec.count}
                  </span>
                </div>

                <div className="space-y-2">
                  {sec.items.map((item) => {
                    const isDone = item.status === 'Completed';
                    const deadline = getDeadlineInfo(item.deadlineDate);
                    const prio = getPriorityBadge(item.priority);

                    const subtasks = item.subtasks || [];
                    const completedSubs = subtasks.filter((s) => s.done).length;
                    const subtaskRatio = subtasks.length > 0 ? (completedSubs / subtasks.length) * 100 : isDone ? 100 : 0;

                    return (
                      <div
                        key={item.id}
                        className={`bg-white border rounded-xl p-3.5 transition-all flex items-center justify-between gap-3 shadow-2xs hover:shadow-sm ${
                          isDone ? 'border-slate-200 bg-slate-50/50 opacity-70' : 'border-slate-200/90 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          <button
                            type="button"
                            onClick={() => handleToggleItem(item.id)}
                            className="mt-0.5 text-slate-300 hover:text-blue-600 transition shrink-0 cursor-pointer"
                          >
                            {isDone ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 fill-emerald-50" />
                            ) : (
                              <Circle className="w-4 h-4" />
                            )}
                          </button>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <h3
                                onClick={() => setActiveDrawerItem(item)}
                                className={`text-xs font-bold cursor-pointer hover:text-blue-600 transition truncate ${
                                  isDone ? 'line-through text-slate-400' : 'text-slate-900'
                                }`}
                              >
                                {item.title}
                              </h3>
                              {item.type === 'Assignment' ? (
                                <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-blue-50 text-blue-600 border border-blue-200 shrink-0">
                                  ASSIGNMENT
                                </span>
                              ) : (
                                <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                                  PERSONAL
                                </span>
                              )}
                            </div>

                            {item.description && (
                              <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                                {item.description}
                              </p>
                            )}

                            <div className="flex flex-wrap items-center gap-2 mt-2 text-[10px]">
                              <span className="font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-100">
                                {item.courseCode || item.courseName}
                              </span>

                              <span className={`font-bold px-2 py-0.5 rounded-md flex items-center gap-1 ${prio.color}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${prio.dot}`} />
                                {prio.label}
                              </span>

                              <span className={`font-semibold px-2 py-0.5 rounded-md border flex items-center gap-1 ${deadline.color}`}>
                                <CalendarIcon className="w-3 h-3 text-slate-400" />
                                {deadline.badge}
                              </span>

                              {subtasks.length > 0 && (
                                <div className="flex items-center gap-1.5 pl-1 text-slate-400 font-medium">
                                  <div className="w-12 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                    <div
                                      className="bg-blue-600 h-full rounded-full transition-all"
                                      style={{ width: `${subtaskRatio}%` }}
                                    />
                                  </div>
                                  <span>{completedSubs}/{subtasks.length}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => openInGoogleCalendar(item)}
                            className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                            title="Add task to Google Calendar"
                          >
                            <CalendarCheck2 className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => setActiveDrawerItem(item)}
                            className="px-2.5 py-1 text-xs font-bold text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                          >
                            Open
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteItem(item.id)}
                            className="p-1 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* 4. VIEW B: KANBAN BOARD */}
      {currentView === 'board' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { 
              key: 'To Do', 
              title: 'To Do', 
              headerColor: 'bg-slate-100 text-slate-700 border-slate-200', 
              items: filteredItems.filter((i) => i.status === 'To Do' || (i.status === 'Pending' && !i.subtasks?.some((s) => s.done))) 
            },
            { 
              key: 'In Progress', 
              title: 'In Progress', 
              headerColor: 'bg-blue-50 text-blue-700 border-blue-200', 
              items: filteredItems.filter((i) => i.status === 'In Progress' || (i.status === 'Pending' && i.subtasks?.some((s) => s.done))) 
            },
            { 
              key: 'Completed', 
              title: 'Completed', 
              headerColor: 'bg-emerald-50 text-emerald-700 border-emerald-200', 
              items: filteredItems.filter((i) => i.status === 'Completed') 
            }
          ].map((col) => {
            const isTargetCol = dragOverCol === col.key;

            return (
              <div 
                key={col.key} 
                onDragOver={(e) => handleDragOver(e, col.key)}
                onDrop={(e) => handleDrop(e, col.key)}
                className={`bg-slate-50/80 border rounded-2xl p-3.5 flex flex-col transition-all min-h-[500px] ${
                  isTargetCol ? 'border-blue-500 bg-blue-50/30 ring-2 ring-blue-500/20 shadow-sm' : 'border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-slate-800 uppercase tracking-wider">{col.title}</span>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${col.headerColor}`}>
                      {col.items.length}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setModalWorkType('Assignment');
                      setShowAddModal(true);
                    }}
                    className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200/60 transition cursor-pointer"
                    title="Add to column"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-3 flex-1 overflow-y-auto">
                  {col.items.length === 0 ? (
                    <div className="h-32 border-2 border-dashed border-slate-200/80 rounded-xl flex items-center justify-center text-[11px] font-semibold text-slate-400">
                      Drop items here
                    </div>
                  ) : (
                    col.items.map((item) => {
                      const prio = getPriorityBadge(item.priority);
                      const deadline = getDeadlineInfo(item.deadlineDate);
                      const subtasks = item.subtasks || [];
                      const completedCount = subtasks.filter((s) => s.done).length;
                      const progressPct = subtasks.length > 0 ? Math.round((completedCount / subtasks.length) * 100) : item.status === 'Completed' ? 100 : 0;

                      return (
                        <div
                          key={item.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, item.id)}
                          className={`bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs hover:shadow-md transition-all space-y-2.5 group cursor-grab active:cursor-grabbing ${
                            draggingItemId === item.id ? 'opacity-40 scale-98' : ''
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1 text-[10px]">
                            <div className="flex items-center gap-1.5">
                              <GripVertical className="w-3 h-3 text-slate-300 group-hover:text-slate-500 transition shrink-0" />
                              <span className="font-extrabold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100">
                                {item.courseCode || item.courseName}
                              </span>
                            </div>
                            <span className={`font-bold px-1.5 py-0.5 rounded ${prio.color}`}>
                              {item.priority}
                            </span>
                          </div>

                          <h4 
                            onClick={() => setActiveDrawerItem(item)}
                            className="text-xs font-bold text-slate-900 leading-snug hover:text-blue-600 transition cursor-pointer"
                          >
                            {item.title}
                          </h4>

                          {subtasks.length > 0 && (
                            <div className="pt-1.5 border-t border-slate-100 space-y-1">
                              <div className="flex items-center justify-between text-[10px] text-slate-400 font-semibold mb-1">
                                <span>Checklist</span>
                                <span>{completedCount}/{subtasks.length} ({progressPct}%)</span>
                              </div>
                              <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden mb-1.5">
                                <div 
                                  className="h-full bg-blue-600 rounded-full transition-all"
                                  style={{ width: `${progressPct}%` }}
                                />
                              </div>

                              <div className="space-y-1 max-h-24 overflow-y-auto">
                                {subtasks.slice(0, 3).map((st) => (
                                  <label 
                                    key={st.id} 
                                    className="flex items-center gap-1.5 text-[11px] text-slate-700 hover:text-slate-900 cursor-pointer"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={st.done}
                                      onChange={() => handleToggleSubtask(item.id, st.id)}
                                      className="w-3 h-3 text-blue-600 rounded border-slate-300 focus:ring-0"
                                    />
                                    <span className={`truncate ${st.done ? 'line-through text-slate-400' : ''}`}>
                                      {st.title}
                                    </span>
                                  </label>
                                ))}
                              </div>
                            </div>
                          )}

                          <div className="flex items-center justify-between text-[10px] text-slate-500 pt-2 border-t border-slate-100">
                            <span className="flex items-center gap-1 font-semibold text-slate-400">
                              <CalendarIcon className="w-3 h-3" />
                              {deadline.badge}
                            </span>

                            <div className="flex items-center gap-1">
                              {col.key !== 'To Do' && (
                                <button
                                  type="button"
                                  onClick={() => updateItemStatus(item.id, col.key === 'Completed' ? 'In Progress' : 'To Do')}
                                  className="p-1 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded transition"
                                  title="Move Left"
                                >
                                  <MoveLeft className="w-3 h-3" />
                                </button>
                              )}
                              {col.key !== 'Completed' && (
                                <button
                                  type="button"
                                  onClick={() => updateItemStatus(item.id, col.key === 'To Do' ? 'In Progress' : 'Completed')}
                                  className="p-1 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded transition"
                                  title="Move Right"
                                >
                                  <MoveRight className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 4. VIEW C: CALENDAR */}
      {currentView === 'calendar' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Academic Deadlines</h3>
                <p className="text-[11px] text-slate-400">Click any date to inspect due coursework</p>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center">
              {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map((d) => (
                <div key={d} className="text-[10px] font-bold text-slate-400 py-1">{d}</div>
              ))}

              {Array.from({ length: 30 }, (_, idx) => idx + 1).map((dayNum) => {
                const dayStr = dayNum < 10 ? `0${dayNum}` : `${dayNum}`;
                const dateKey = `${CURRENT_DATE_STR.substring(0, 8)}${dayStr}`;
                const dayItems = items.filter((i) => i.deadlineDate === dateKey);
                const isSelected = calendarSelectedDate === dateKey;

                return (
                  <button
                    key={dayNum}
                    type="button"
                    onClick={() => setCalendarSelectedDate(dateKey)}
                    className={`h-14 p-1 rounded-lg border text-left flex flex-col justify-between transition cursor-pointer ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/60 ring-2 ring-blue-500/20 shadow-2xs'
                        : 'border-slate-100 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <span className={`text-[10px] font-black ${isSelected ? 'text-blue-600' : 'text-slate-700'}`}>
                      {dayNum}
                    </span>

                    {dayItems.length > 0 && (
                      <div className="space-y-0.5">
                        <span className="block text-[8px] font-bold truncate px-1 rounded bg-rose-50 text-rose-700 border border-rose-200">
                          {dayItems[0].title}
                        </span>
                        {dayItems.length > 1 && (
                          <span className="text-[8px] text-slate-400 font-extrabold">+{dayItems.length - 1} more</span>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-3">
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Agenda for Date</h4>
                  <span className="text-[10px] text-slate-400 font-mono">{calendarSelectedDate}</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setFormDueDate(calendarSelectedDate);
                    setShowAddModal(true);
                  }}
                  className="px-2 py-1 text-[10px] font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-md transition"
                >
                  + Add
                </button>
              </div>

              {calendarDayDeliverables.length === 0 ? (
                <div className="text-center py-10 text-xs text-slate-400">
                  No deliverables scheduled for {calendarSelectedDate}.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {calendarDayDeliverables.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => setActiveDrawerItem(item)}
                      className="p-2.5 rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition cursor-pointer space-y-1"
                    >
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="font-mono text-slate-400">{item.deadlineTime || '23:59'}</span>
                        <span className={`font-bold px-1.5 py-0.2 rounded ${getPriorityBadge(item.priority).color}`}>
                          {item.priority}
                        </span>
                      </div>
                      <h5 className="text-xs font-bold text-slate-900">{item.title}</h5>
                      <div className="flex items-center justify-between text-[10px] text-slate-500">
                        <span>{item.courseCode || item.courseName}</span>
                        <span>{item.subtasks?.filter((s) => s.done).length || 0}/{item.subtasks?.length || 0} subtasks</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 4. VIEW D: WORKLOAD */}
      {currentView === 'workload' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">Weekly Workload Distribution</h3>
              <span className="text-[10px] font-semibold text-emerald-600">Active distribution</span>
            </div>

            <div className="space-y-3 pt-1">
              {[
                { day: 'Mon', hours: 3.5, pct: 70, active: true },
                { day: 'Tue', hours: 2.5, pct: 50 },
                { day: 'Wed', hours: 4.5, pct: 90, bar: 'bg-rose-500' },
                { day: 'Thu', hours: 2.0, pct: 40 },
                { day: 'Fri', hours: 3.0, pct: 60 }
              ].map((w) => (
                <div key={w.day} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className={`font-semibold ${w.active ? 'text-blue-600 font-bold' : 'text-slate-600'}`}>{w.day}</span>
                    <span className="font-bold text-slate-700">{w.hours} hrs</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${w.bar || 'bg-blue-600'}`}
                      style={{ width: `${w.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs space-y-3">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide border-b border-slate-100 pb-2">
              Course Distribution
            </h4>
            <div className="space-y-2 text-xs">
              {availableCourses.slice(0, 4).map((c) => (
                <div key={c} className="flex justify-between py-1 border-b border-slate-50 font-semibold text-slate-700">
                  <span>{c}</span>
                  <span className="text-blue-600 font-bold">Active</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 5. SLIDE-OUT ITEM DETAIL DRAWER */}
      {activeDrawerItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-2xs flex justify-end">
          <div className="bg-white w-full max-w-md h-full shadow-2xl border-l border-slate-200 flex flex-col justify-between overflow-y-auto p-5 animate-in slide-in-from-right duration-150">
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <button
                  type="button"
                  onClick={() => setActiveDrawerItem(null)}
                  className="flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  ← Back
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openInGoogleCalendar(activeDrawerItem)}
                    className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                    title="Add to Google Calendar"
                  >
                    <CalendarCheck2 className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleToggleItem(activeDrawerItem.id)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                      activeDrawerItem.status === 'Completed'
                        ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    }`}
                  >
                    {activeDrawerItem.status === 'Completed' ? 'Mark Incomplete' : 'Mark Complete'}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteItem(activeDrawerItem.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                    title="Delete item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                    {activeDrawerItem.type}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                    {activeDrawerItem.courseCode || activeDrawerItem.courseName}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${getPriorityBadge(activeDrawerItem.priority).color}`}>
                    {activeDrawerItem.priority}
                  </span>
                </div>

                <h2 className="text-base font-black text-slate-900">{activeDrawerItem.title}</h2>
              </div>

              <div className="grid grid-cols-3 gap-2 p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-[11px]">
                <div>
                  <span className="text-slate-400 block text-[9px] uppercase font-bold">Deadline</span>
                  <strong className="text-slate-800">{activeDrawerItem.deadlineDate}</strong>
                  <span className="text-[9px] text-rose-600 block">{getDeadlineInfo(activeDrawerItem.deadlineDate).badge}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[9px] uppercase font-bold">Status</span>
                  <strong className="text-slate-800">{activeDrawerItem.status}</strong>
                  <span className="text-[9px] text-slate-400 block">{activeDrawerItem.estimatedHours} hrs</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[9px] uppercase font-bold">Progress</span>
                  <strong className="text-blue-600">
                    {activeDrawerItem.subtasks?.length > 0
                      ? `${Math.round((activeDrawerItem.subtasks.filter((s) => s.done).length / activeDrawerItem.subtasks.length) * 100)}%`
                      : activeDrawerItem.status === 'Completed' ? '100%' : '0%'}
                  </strong>
                  <span className="text-[9px] text-slate-400 block">
                    {activeDrawerItem.subtasks?.filter((s) => s.done).length || 0} / {activeDrawerItem.subtasks?.length || 0} Done
                  </span>
                </div>
              </div>

              {activeDrawerItem.description && (
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Description
                  </span>
                  <p className="text-xs text-slate-600 leading-relaxed bg-slate-50/50 p-2.5 rounded-lg border border-slate-100">
                    {activeDrawerItem.description}
                  </p>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Subtasks & Milestones
                  </span>
                  <span className="text-[10px] font-semibold text-slate-400">
                    {activeDrawerItem.subtasks?.filter((s) => s.done).length || 0} of {activeDrawerItem.subtasks?.length || 0} completed
                  </span>
                </div>

                <div className="space-y-1.5">
                  {(activeDrawerItem.subtasks || []).map((st) => (
                    <label
                      key={st.id}
                      className="flex items-center gap-2.5 p-2 rounded-lg border border-slate-100 hover:bg-slate-50 transition cursor-pointer text-xs"
                    >
                      <input
                        type="checkbox"
                        checked={st.done}
                        onChange={() => handleToggleSubtask(activeDrawerItem.id, st.id)}
                        className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                      />
                      <span className={st.done ? 'line-through text-slate-400' : 'text-slate-800'}>
                        {st.title}
                      </span>
                    </label>
                  ))}
                </div>

                <form onSubmit={handleAddDrawerSubtask} className="flex gap-1.5 mt-2">
                  <input
                    type="text"
                    placeholder="Add a step..."
                    value={newSubtaskInput}
                    onChange={(e) => setNewSubtaskInput(e.target.value)}
                    className="flex-1 px-2.5 py-1 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition cursor-pointer"
                  >
                    Add
                  </button>
                </form>
              </div>

              {/* Study Focus Timer */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-blue-600" />
                    Focus Session
                  </span>
                  <span className="text-[10px] text-slate-400 font-semibold">25m Pomodoro Interval</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-2xl font-black text-slate-900 tracking-tight font-mono">
                    {formatTimer(timerSeconds)}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setIsTimerRunning(!isTimerRunning)}
                      className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                    >
                      {isTimerRunning ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                      <span>{isTimerRunning ? 'Pause' : 'Start'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={resetTimer}
                      className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                      title="Reset Timer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setActiveDrawerItem(null)}
                className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition cursor-pointer"
              >
                Close Drawer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. GOOGLE CALENDAR SYNC MODAL */}
      {showSyncModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <CalendarCheck2 className="w-5 h-5 text-emerald-600" />
                <div>
                  <h3 className="text-base font-bold text-slate-900">Sync Tasks with Google Calendar</h3>
                  <p className="text-[11px] text-slate-500">{metrics.pending} pending tasks ready</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSyncModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="my-4 space-y-4">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-900 block">Instant Batch Upload</span>
                  <span className="text-[11px] text-slate-500">Upload all pending coursework & tasks.</span>
                </div>
                <button
                  type="button"
                  onClick={handleSyncAllTasks}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Sync All Tasks</span>
                </button>
              </div>

              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs space-y-2">
                <div className="flex items-center gap-1.5 font-bold">
                  <RefreshCw className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Auto-Update Subscription</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  Subscribe so whenever deadlines change or new deliverables are scheduled, Google Calendar automatically synchronizes.
                </p>
                <div className="flex gap-2 pt-1">
                  <input
                    type="text"
                    readOnly
                    value={feedUrl}
                    className="flex-1 px-2.5 py-1 text-[11px] font-mono bg-white border border-emerald-300 rounded-lg select-all"
                  />
                  <button
                    type="button"
                    onClick={handleCopyFeed}
                    className="px-3 py-1 bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-bold transition cursor-pointer"
                  >
                    {copiedFeed ? 'Copied!' : 'Copy Feed'}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowSyncModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. CREATE ACADEMIC WORK MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-5 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Create Academic Work</h3>
                  <p className="text-[10px] text-slate-400">Record an official assignment or personal goal</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateWorkItem} className="space-y-3 mt-3">
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-bold">
                <button
                  type="button"
                  onClick={() => {
                    setModalWorkType('Assignment');
                    setFormCategory('Lab Assignment');
                  }}
                  className={`py-1.5 rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    modalWorkType === 'Assignment'
                      ? 'bg-white text-blue-600 shadow-2xs font-extrabold'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <span>📘 Teacher Assignment</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setModalWorkType('Personal Task');
                    setFormCategory('Personal Study');
                  }}
                  className={`py-1.5 rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    modalWorkType === 'Personal Task'
                      ? 'bg-white text-emerald-600 shadow-2xs font-extrabold'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <span>✅ Personal Study Task</span>
                </button>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Title *</label>
                <input
                  type="text"
                  required
                  placeholder={modalWorkType === 'Assignment' ? 'e.g. C Programming Assignment 02' : 'e.g. Solve 5 problems on LeetCode'}
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Course</label>
                  <select
                    value={formCourse}
                    onChange={(e) => setFormCourse(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                  >
                    {availableCourses.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Category</label>
                  <input
                    type="text"
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    placeholder="e.g. Lab, Revision, Exam"
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Due Date</label>
                  <input
                    type="date"
                    required
                    value={formDueDate}
                    onChange={(e) => setFormDueDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Due Time</label>
                  <input
                    type="time"
                    value={formDueTime}
                    onChange={(e) => setFormDueTime(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Priority</label>
                  <select
                    value={formPriority}
                    onChange={(e) => setFormPriority(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                  >
                    <option value="Urgent">🔴 Urgent</option>
                    <option value="High">🟠 High Priority</option>
                    <option value="Medium">🟡 Medium Priority</option>
                    <option value="Low">⚪ Low Priority</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Estimated Hours</label>
                  <input
                    type="number"
                    min="0.5"
                    step="0.5"
                    value={formEstimatedHours}
                    onChange={(e) => setFormEstimatedHours(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Instructions / Description</label>
                <textarea
                  rows={2}
                  placeholder="Paste prompt specifications..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Subtasks Checklist <span className="font-normal text-slate-400">(One item per line)</span>
                </label>
                <textarea
                  rows={2}
                  placeholder={'Review requirements\nImplement core logic\nRun test cases'}
                  value={formSubtasksText}
                  onChange={(e) => setFormSubtasksText(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs font-mono text-[11px] border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-2xs transition cursor-pointer"
                >
                  Create Deliverable
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}