import React, { useState } from 'react';
import { 
  GraduationCap, 
  LayoutDashboard, 
  Sun, 
  BookOpen, 
  CalendarDays, 
  Calendar, 
  CheckSquare, 
  BarChart3, 
  Award, 
  Calculator, 
  FolderLock, 
  BrainCircuit, 
  ShieldCheck, 
  Settings, 
  LogOut,
  Menu,
  X
} from 'lucide-react';

export default function Sidebar({ 
  currentTab, 
  setCurrentTab, 
  userRole, 
  user,
  onLogout 
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'my-day', label: 'My Day', icon: Sun, badge: 'Today' },
    { id: 'courses', label: 'Courses', icon: BookOpen },
    { id: 'routine', label: 'Class Routine', icon: CalendarDays },
    { id: 'calendar', label: 'Calendar', icon: Calendar },
    { id: 'tasks', label: 'Assignments & Tasks', icon: CheckSquare },
    { id: 'attendance', label: 'Attendance', icon: BarChart3 },
    { id: 'exams', label: 'Exam Center', icon: Award },
    { id: 'gpa', label: 'GPA / CGPA', icon: Calculator },
    { id: 'materials', label: 'Study Materials', icon: FolderLock },
    { id: 'ai-assistant', label: 'StudentOS AI', icon: BrainCircuit, highlight: true },
  ];

  if (userRole === 'ADMIN') {
    menuItems.push({ id: 'admin', label: 'Admin Panel', icon: ShieldCheck, badge: 'ADMIN' });
  }

  const firstName = user?.name ? user.name.trim().split(/\s+/).slice(-1)[0] : 'Rimon';

  const handleSelectTab = (id) => {
    setCurrentTab(id);
    setMobileOpen(false); // Close sidebar on mobile once a tab is selected
  };

  return (
    <>
      {/* Floating Mobile Toggle Button (Visible ONLY on phones / mobile screens) */}
      <button
        type="button"
        onClick={() => setMobileOpen(!mobileOpen)}
        className="md:hidden fixed top-3 left-3 z-50 p-2.5 rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-500/30 flex items-center justify-center cursor-pointer"
        aria-label="Toggle Navigation"
      >
        {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Dimmed Backdrop for Mobile Drawer */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-xs z-40 animate-in fade-in"
        />
      )}

      {/* Responsive Sidebar (Permanent on Desktop, Drawer on Mobile) */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-40 w-64 bg-[#0F172A] text-slate-300 flex flex-col justify-between p-4 shrink-0 min-h-screen select-none border-r border-slate-800/80 transition-transform duration-300 ease-in-out ${
          mobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="overflow-y-auto">
          {/* Brand Logo */}
          <div 
            onClick={() => handleSelectTab('dashboard')}
            className="flex items-center gap-3 px-2 py-3 mb-4 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-transform">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight text-white flex items-center gap-1">
                Student<span className="text-blue-500">OS</span>
              </h1>
              <p className="text-xs text-slate-400 font-medium">Your University Assistant</p>
            </div>
          </div>

          {/* Navigation List */}
          <nav className="space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelectTab(item.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-blue-600 text-white font-extrabold shadow-md shadow-blue-600/25'
                      : item.highlight
                      ? 'bg-blue-950/40 text-blue-400 hover:bg-blue-900/40 border border-blue-800/40'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className={`text-[9px] uppercase font-black tracking-wider px-1.5 py-0.5 rounded ${
                      isActive ? 'bg-white text-blue-600' : 'bg-blue-900/60 text-blue-300 border border-blue-500/30'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer & User Profile */}
        <div className="pt-3 border-t border-slate-800/80 space-y-2 mt-auto">
          <button
            type="button"
            onClick={() => handleSelectTab('settings')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              currentTab === 'settings'
                ? 'bg-blue-600 text-white font-extrabold shadow-md shadow-blue-600/25'
                : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
            }`}
          >
            <Settings className="w-4 h-4 shrink-0" />
            <span>Settings</span>
          </button>

          {/* Motivational Card */}
          <div className="p-3 rounded-xl bg-gradient-to-br from-slate-900 to-slate-800/80 border border-slate-800 text-left relative overflow-hidden">
            <p className="text-xs text-slate-300 font-medium leading-relaxed z-10 relative">
              Small steps every day lead to big results.
            </p>
            <span className="block text-[11px] text-blue-400 mt-1 font-bold z-10 relative">
              — Keep going, {firstName}!
            </span>
          </div>

          {/* User Card */}
          <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
            <div 
              onClick={() => handleSelectTab('profile')}
              className="flex items-center gap-2 truncate pr-2 cursor-pointer hover:opacity-80 transition group"
              title="Open Profile"
            >
              {user?.avatar ? (
                <img src={user.avatar} alt="User" className="w-7 h-7 rounded-lg object-cover border border-slate-700" />
              ) : (
                <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center font-black text-[10px]">
                  {user?.name?.charAt(0) || 'U'}
                </div>
              )}
              <div className="flex flex-col truncate">
                <span className="text-xs font-bold text-slate-200 group-hover:text-blue-400 transition truncate">
                  {user?.name || 'User'}
                </span>
                <span className="text-[10px] text-slate-400 capitalize font-medium">
                  {userRole || 'Student'}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={onLogout}
              title="Sign Out"
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold text-rose-400 hover:text-white hover:bg-rose-600/30 border border-rose-500/40 rounded-lg transition-colors cursor-pointer shrink-0"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Exit</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}