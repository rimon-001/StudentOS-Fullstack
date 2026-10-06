import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  FolderLock, 
  FileText, 
  Download, 
  Star, 
  Trash2, 
  Plus, 
  Search, 
  ExternalLink, 
  X, 
  Link as LinkIcon,
  UploadCloud,
  Eye,
  StickyNote,
  Sparkles,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Save,
  BookmarkCheck,
  Globe,
  HardDrive
} from 'lucide-react';

export default function MaterialsView({
  courses = [],
  materials = [],
  onAddMaterial,
  onDeleteMaterial,
  isDemoMode = false,
  onRestrictedAction
}) {
  const [localMaterials, setLocalMaterials] = useState([]);

  // Fetch user materials from backend
  useEffect(() => {
    const token = localStorage.getItem('studentos_token');
    if (!token && !isDemoMode) return;

    fetch('http://localhost:5001/api/materials', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then((res) => res.json())
      .then((result) => {
        if (result.success && Array.isArray(result.data)) {
          setLocalMaterials(result.data);
          localStorage.setItem('studentos_materials', JSON.stringify(result.data));
        }
      })
      .catch((err) => {
        console.warn('Backend unavailable, using local cache:', err);
        const saved = localStorage.getItem('studentos_materials');
        if (saved) {
          try {
            setLocalMaterials(JSON.parse(saved));
          } catch {}
        }
      });
  }, [isDemoMode]);

  useEffect(() => {
    if (Array.isArray(materials) && materials.length > 0) {
      setLocalMaterials(materials);
    }
  }, [materials]);

  useEffect(() => {
    if (localMaterials.length > 0) {
      localStorage.setItem('studentos_materials', JSON.stringify(localMaterials));
    }
  }, [localMaterials]);

  // Filters State
  const [selectedCourse, setSelectedCourse] = useState('All');
  const [selectedType, setSelectedType] = useState('All');
  const [activeKpiFilter, setActiveKpiFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);

  // Modals & Panels
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isExamModeOpen, setIsExamModeOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [notesDoc, setNotesDoc] = useState(null);
  const [docNotesText, setDocNotesText] = useState('');
  const [notesSavedAlert, setNotesSavedAlert] = useState(false);

  // Command Palette State (⌘K)
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [paletteQuery, setPaletteQuery] = useState('');
  const paletteInputRef = useRef(null);

  // Previewer Sub-State
  const [previewPage, setPreviewPage] = useState(1);
  const [previewZoom, setPreviewZoom] = useState(100);

  // Upload Form State
  const [formTitle, setFormTitle] = useState('');
  const [formCourse, setFormCourse] = useState('CSE 101');
  const [formCategory, setFormCategory] = useState('Lectures');
  const [formFormat, setFormFormat] = useState('PDF');
  const [formLink, setFormLink] = useState('');
  const [formTags, setFormTags] = useState('');
  const [formFav, setFormFav] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState('');

  // Exam Prep Mode State
  const [examCourse, setExamCourse] = useState('CSE 101');
  const [examType, setExamType] = useState('Midterm Exam');

  // Keyboard shortcut (⌘K)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsPaletteOpen((prev) => !prev);
      }
      if (e.key === 'Escape') {
        setIsPaletteOpen(false);
        setPreviewDoc(null);
        setNotesDoc(null);
        setIsUploadModalOpen(false);
        setIsExamModeOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (isPaletteOpen && paletteInputRef.current) {
      setTimeout(() => paletteInputRef.current?.focus(), 50);
    }
  }, [isPaletteOpen]);

  const stats = useMemo(() => {
    const total = localMaterials.length;
    const pdfs = localMaterials.filter((m) => 
      (m.format || '').toUpperCase().includes('PDF') || (m.title || '').toLowerCase().includes('.pdf')
    ).length;
    const notes = localMaterials.filter((m) => 
      (m.type || '').toLowerCase().includes('note') || (m.tags || []).some(t => t.toLowerCase().includes('note'))
    ).length;
    const presentations = localMaterials.filter((m) => 
      (m.format || '').toUpperCase().includes('PPT') || 
      (m.type || '').toLowerCase().includes('lecture') || 
      (m.title || '').toLowerCase().includes('slide')
    ).length;
    const driveLinks = localMaterials.filter((m) => 
      (m.link && (m.link.includes('drive.google.com') || m.link.includes('docs.google.com'))) || 
      (m.format || '').toLowerCase().includes('drive')
    ).length;

    return { total, pdfs, notes, presentations, driveLinks };
  }, [localMaterials]);

  const allCoursesList = useMemo(() => {
    const set = new Set(['CSE 101', 'SE 101', 'MATH 101', 'PHY 101']);
    courses.forEach((c) => {
      if (c.code) set.add(c.code);
    });
    localMaterials.forEach((m) => {
      if (m.courseCode) set.add(m.courseCode);
    });
    return Array.from(set);
  }, [courses, localMaterials]);

  const toggleFavorite = (id) => {
    setLocalMaterials((prev) =>
      prev.map((m) => (m.id === id ? { ...m, favorite: !m.favorite } : m))
    );
  };

  const handleDelete = async (id) => {
    if (isDemoMode && onRestrictedAction && onRestrictedAction()) return;
    if (!window.confirm('Delete this study resource?')) return;

    if (onDeleteMaterial) onDeleteMaterial(id);
    setLocalMaterials((prev) => prev.filter((m) => m.id !== id));

    const token = localStorage.getItem('studentos_token');
    if (token) {
      try {
        await fetch(`http://localhost:5001/api/materials/${id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` }
        });
      } catch (err) {
        console.warn('Backend delete material failed:', err);
      }
    }
  };

  const handleOpenNotes = (doc) => {
    setNotesDoc(doc);
    const saved = localStorage.getItem(`studentos_mat_notes_${doc.id}`) || '';
    setDocNotesText(saved);
  };

  const handleSaveNotes = () => {
    if (!notesDoc) return;
    localStorage.setItem(`studentos_mat_notes_${notesDoc.id}`, docNotesText);
    setNotesSavedAlert(true);
    setTimeout(() => setNotesSavedAlert(false), 2000);
  };

  const handleDownload = (mat) => {
    if (mat.link && mat.link.startsWith('http')) {
      window.open(mat.link, '_blank', 'noopener,noreferrer');
      return;
    }
    const blob = new Blob([mat.contentPreview || mat.title], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${mat.title.replace(/[\s\W]+/g, '_')}.${(mat.format || 'pdf').toLowerCase()}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!formTitle.trim()) return;
    if (isDemoMode && onRestrictedAction && onRestrictedAction()) return;

    const tagsArray = formTags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)
      .map((t) => (t.startsWith('#') ? t : `#${t}`));

    const isLinkAttached = formLink.trim().length > 0;
    const isDrive = formLink.includes('drive.google.com') || formLink.includes('docs.google.com') || formFormat === 'Drive Link';

    const newResource = {
      id: 'mat_' + Date.now(),
      title: formTitle.trim(),
      courseCode: formCourse || 'CSE 101',
      type: formCategory || 'Lectures',
      format: isDrive ? 'Google Drive' : isLinkAttached && formFormat === 'PDF' ? 'Cloud Link' : formFormat,
      fileSize: isLinkAttached ? 'Cloud URL' : uploadedFileName ? '2.4 MB' : '2.4 MB',
      link: formLink.trim() || '#',
      url: formLink.trim() || '#',
      uploadDate: new Date().toISOString().split('T')[0],
      favorite: formFav,
      tags: tagsArray.length > 0 ? tagsArray : ['#general', '#resource'],
      contentPreview: isLinkAttached
        ? `Direct link: ${formLink.trim()}`
        : `Content preview for ${uploadedFileName || formTitle.trim()}`
    };

    const updated = [newResource, ...localMaterials];
    setLocalMaterials(updated);
    if (onAddMaterial) onAddMaterial(newResource);

    const token = localStorage.getItem('studentos_token');
    if (token) {
      try {
        await fetch('http://localhost:5001/api/materials', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(newResource)
        });
      } catch (err) {
        console.warn('Backend material sync failed:', err);
      }
    }

    setFormTitle('');
    setFormLink('');
    setFormTags('');
    setUploadedFileName('');
    setFormFav(false);
    setIsUploadModalOpen(false);
  };

  const filteredMaterials = useMemo(() => {
    return localMaterials.filter((item) => {
      if (selectedCourse !== 'All' && item.courseCode !== selectedCourse) return false;
      if (selectedType !== 'All' && item.type !== selectedType) return false;

      if (activeKpiFilter === 'PDFS') {
        const isPdf = (item.format || '').toUpperCase().includes('PDF') || (item.title || '').toLowerCase().includes('.pdf');
        if (!isPdf) return false;
      }
      if (activeKpiFilter === 'NOTES') {
        const isNote = (item.type || '').toLowerCase().includes('note') || (item.tags || []).some(t => t.toLowerCase().includes('note'));
        if (!isNote) return false;
      }
      if (activeKpiFilter === 'PRESENTATIONS') {
        const isPpt = (item.format || '').toUpperCase().includes('PPT') || 
                      (item.type || '').toLowerCase().includes('lecture') || 
                      (item.title || '').toLowerCase().includes('slide');
        if (!isPpt) return false;
      }
      if (activeKpiFilter === 'DRIVE') {
        const isDrive = (item.link && (item.link.includes('drive.google.com') || item.link.includes('docs.google.com'))) || 
                        (item.format || '').toLowerCase().includes('drive');
        if (!isDrive) return false;
      }

      if (showOnlyFavorites && !item.favorite) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const inTitle = (item.title || '').toLowerCase().includes(q);
        const inCourse = (item.courseCode || '').toLowerCase().includes(q);
        const inTags = (item.tags || []).some((t) => t.toLowerCase().includes(q));
        const inDesc = (item.contentPreview || '').toLowerCase().includes(q);
        if (!inTitle && !inCourse && !inTags && !inDesc) return false;
      }

      return true;
    });
  }, [localMaterials, selectedCourse, selectedType, activeKpiFilter, showOnlyFavorites, searchQuery]);

  const handleApplyExamFilter = () => {
    setSelectedCourse(examCourse);
    setSearchQuery('#exam');
    setIsExamModeOpen(false);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Study Materials & Notes</h1>
          <p className="text-xs text-slate-500 mt-0.5">Access lecture presentations, assignment PDFs, and embedded drive links.</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsExamModeOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer border border-slate-200 shadow-2xs"
          >
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>Exam Mode</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setFormCourse(selectedCourse === 'All' ? 'CSE 101' : selectedCourse);
              setIsUploadModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Upload Material</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div 
          onClick={() => {
            setActiveKpiFilter('ALL');
            setSelectedType('All');
          }}
          className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-2xs flex items-center justify-between hover:scale-[1.02] ${
            activeKpiFilter === 'ALL'
              ? 'bg-blue-50/70 border-blue-400 ring-2 ring-blue-500/20'
              : 'bg-white border-slate-200/90 hover:bg-slate-50'
          }`}
        >
          <div>
            <span className="text-[10px] font-bold text-slate-400 block tracking-wider uppercase">MATERIALS</span>
            <span className="text-2xl font-black text-slate-900 block mt-0.5">{stats.total}</span>
          </div>
          <div className="w-10 h-10 rounded-xl border border-blue-100 bg-blue-50 text-blue-600 flex items-center justify-center">
            <BookOpen className="w-4 h-4" />
          </div>
        </div>

        <div 
          onClick={() => setActiveKpiFilter(activeKpiFilter === 'PDFS' ? 'ALL' : 'PDFS')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-2xs flex items-center justify-between hover:scale-[1.02] ${
            activeKpiFilter === 'PDFS'
              ? 'bg-rose-50/70 border-rose-400 ring-2 ring-rose-500/20'
              : 'bg-white border-slate-200/90 hover:bg-slate-50'
          }`}
        >
          <div>
            <span className="text-[10px] font-bold text-slate-400 block tracking-wider uppercase">PDFS</span>
            <span className="text-2xl font-black text-slate-900 block mt-0.5">{stats.pdfs}</span>
          </div>
          <div className="w-10 h-10 rounded-xl border border-rose-100 bg-rose-50 text-rose-600 flex items-center justify-center">
            <FileText className="w-4 h-4" />
          </div>
        </div>

        <div 
          onClick={() => {
            setActiveKpiFilter(activeKpiFilter === 'NOTES' ? 'ALL' : 'NOTES');
            setSelectedType(activeKpiFilter === 'NOTES' ? 'All' : 'Notes');
          }}
          className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-2xs flex items-center justify-between hover:scale-[1.02] ${
            activeKpiFilter === 'NOTES'
              ? 'bg-amber-50/70 border-amber-400 ring-2 ring-amber-500/20'
              : 'bg-white border-slate-200/90 hover:bg-slate-50'
          }`}
        >
          <div>
            <span className="text-[10px] font-bold text-slate-400 block tracking-wider uppercase">NOTES</span>
            <span className="text-2xl font-black text-slate-900 block mt-0.5">{stats.notes}</span>
          </div>
          <div className="w-10 h-10 rounded-xl border border-amber-100 bg-amber-50 text-amber-600 flex items-center justify-center">
            <StickyNote className="w-4 h-4" />
          </div>
        </div>

        <div 
          onClick={() => {
            setActiveKpiFilter(activeKpiFilter === 'PRESENTATIONS' ? 'ALL' : 'PRESENTATIONS');
            setSelectedType(activeKpiFilter === 'PRESENTATIONS' ? 'All' : 'Lectures');
          }}
          className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-2xs flex items-center justify-between hover:scale-[1.02] ${
            activeKpiFilter === 'PRESENTATIONS'
              ? 'bg-purple-50/70 border-purple-400 ring-2 ring-purple-500/20'
              : 'bg-white border-slate-200/90 hover:bg-slate-50'
          }`}
        >
          <div>
            <span className="text-[10px] font-bold text-slate-400 block tracking-wider uppercase">PRESENTATIONS</span>
            <span className="text-2xl font-black text-slate-900 block mt-0.5">{stats.presentations}</span>
          </div>
          <div className="w-10 h-10 rounded-xl border border-purple-100 bg-purple-50 text-purple-600 flex items-center justify-center">
            <BookmarkCheck className="w-4 h-4" />
          </div>
        </div>

        <div 
          onClick={() => setActiveKpiFilter(activeKpiFilter === 'DRIVE' ? 'ALL' : 'DRIVE')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-2xs flex items-center justify-between hover:scale-[1.02] ${
            activeKpiFilter === 'DRIVE'
              ? 'bg-emerald-50/70 border-emerald-400 ring-2 ring-emerald-500/20'
              : 'bg-white border-slate-200/90 hover:bg-slate-50'
          }`}
        >
          <div>
            <span className="text-[10px] font-bold text-slate-400 block tracking-wider uppercase">DRIVE HUBS</span>
            <span className="text-2xl font-black text-slate-900 block mt-0.5">{stats.driveLinks}</span>
          </div>
          <div className="w-10 h-10 rounded-xl border border-emerald-100 bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <HardDrive className="w-4 h-4" />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1">COURSES:</span>
        <button
          type="button"
          onClick={() => setSelectedCourse('All')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
            selectedCourse === 'All'
              ? 'bg-slate-900 text-white shadow-2xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          All Courses
        </button>
        {allCoursesList.map((code) => {
          const count = localMaterials.filter((m) => m.courseCode === code).length;
          const isActive = selectedCourse === code;
          return (
            <button
              key={code}
              type="button"
              onClick={() => setSelectedCourse(code)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
                isActive
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <span>{code}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-md ${
                isActive ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-500'
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search resources by title, topic (#loops), or format..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-12 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition text-slate-800 font-medium"
            />
            <kbd 
              onClick={() => setIsPaletteOpen(true)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold bg-slate-50 hover:bg-slate-100 px-1.5 py-0.5 border border-slate-200 rounded text-slate-400 cursor-pointer"
            >
              ⌘K
            </kbd>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setShowOnlyFavorites((prev) => !prev)}
              className={`px-3 py-2 text-xs font-bold rounded-xl border transition cursor-pointer flex items-center gap-1.5 ${
                showOnlyFavorites
                  ? 'bg-amber-50 text-amber-700 border-amber-300'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Star className={`w-3.5 h-3.5 ${showOnlyFavorites ? 'fill-amber-500 text-amber-500' : ''}`} />
              <span>Favorites</span>
              <span className="text-[10px] text-slate-400 font-normal">
                ({localMaterials.filter((m) => m.favorite).length})
              </span>
            </button>

            <select
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              className="px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-700 font-bold cursor-pointer"
            >
              <option value="All">All Courses</option>
              {allCoursesList.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto text-[11px]">
          <span className="text-slate-400 font-bold uppercase text-[9px] shrink-0 mr-1">QUICK TAGS:</span>
          {['#exam', '#highyield', '#srs', '#lab', '#pointers', '#matrices'].map((tg) => (
            <button
              key={tg}
              type="button"
              onClick={() => setSearchQuery(searchQuery === tg ? '' : tg)}
              className={`px-2 py-0.5 rounded-md font-semibold transition cursor-pointer shrink-0 border ${
                searchQuery === tg
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {tg}
            </button>
          ))}
          {(searchQuery || activeKpiFilter !== 'ALL') && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setActiveKpiFilter('ALL');
                setSelectedType('All');
              }}
              className="text-[10px] text-rose-500 hover:underline font-bold ml-1 cursor-pointer shrink-0"
            >
              Reset Filters
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-bold pt-1">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider shrink-0 mr-1">TYPES:</span>
          {['All Formats', 'Lectures', 'Notes', 'Lab Practice', 'Question Papers', 'Assignments'].map((typeKey) => {
            const val = typeKey === 'All Formats' ? 'All' : typeKey;
            const isActive = selectedType === val;
            return (
              <button
                key={typeKey}
                type="button"
                onClick={() => {
                  setSelectedType(val);
                  if (activeKpiFilter !== 'ALL') setActiveKpiFilter('ALL');
                }}
                className={`px-3 py-1 rounded-lg transition cursor-pointer shrink-0 ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {typeKey}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredMaterials.length === 0 ? (
          <div className="col-span-full py-16 text-center bg-white border border-dashed border-slate-200 rounded-2xl">
            <FolderLock className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-bold text-slate-700">No study materials match this filter</p>
            <p className="text-xs text-slate-400 mt-1">Try resetting the top KPI card filters or category pills.</p>
            <button
              type="button"
              onClick={() => {
                setActiveKpiFilter('ALL');
                setSelectedType('All');
                setSelectedCourse('All');
                setSearchQuery('');
              }}
              className="mt-3 px-3 py-1.5 bg-blue-600 text-white rounded-xl text-xs font-bold cursor-pointer"
            >
              Reset to All Materials
            </button>
          </div>
        ) : (
          filteredMaterials.map((mat) => {
            const isExternal = Boolean((mat.link && mat.link.startsWith('http')) || (mat.url && mat.url.startsWith('http')));
            const rawUrl = mat.link || mat.url || '';
            const isDrive = Boolean(rawUrl.includes('drive.google.com') || rawUrl.includes('docs.google.com')) || (mat.format || '').includes('Drive');

            return (
              <div
                key={mat.id || mat.title}
                className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className={`p-2.5 rounded-xl ${
                      isDrive ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'
                    }`}>
                      {isDrive ? <HardDrive className="w-5 h-5" /> : isExternal ? <Globe className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleFavorite(mat.id)}
                      className="text-slate-300 hover:text-amber-400 transition-colors cursor-pointer"
                      title="Star as Favorite"
                    >
                      <Star className={`w-4 h-4 ${mat.favorite ? 'text-amber-400 fill-amber-400' : ''}`} />
                    </button>
                  </div>

                  <h3 
                    onClick={() => setPreviewDoc(mat)}
                    className="font-bold text-slate-900 mt-3 text-sm line-clamp-2 cursor-pointer hover:text-blue-600 transition"
                  >
                    {mat.title}
                  </h3>

                  <div className="flex items-center gap-2 mt-1.5 text-[11px] text-slate-500">
                    <span className="font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                      {mat.courseCode}
                    </span>
                    <span>•</span>
                    <span>{mat.format || mat.type || 'PDF'}</span>
                    <span>•</span>
                    <span>{mat.size || mat.fileSize || '2.4 MB'}</span>
                  </div>

                  {Array.isArray(mat.tags) && mat.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2.5">
                      {mat.tags.map((t, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setSearchQuery(t)}
                          className="text-[10px] font-bold text-slate-500 bg-slate-50 border border-slate-200 px-1.5 py-0.2 rounded hover:bg-blue-50 hover:text-blue-600 transition"
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between mt-5 pt-3 border-t border-slate-100 text-xs">
                  {isExternal ? (
                    <a
                      href={rawUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 font-bold text-blue-600 hover:text-blue-700 transition"
                    >
                      <span>{isDrive ? 'Open Drive' : 'Open Link'}</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setPreviewDoc(mat)}
                      className="inline-flex items-center gap-1.5 font-bold text-blue-600 hover:text-blue-700 transition cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Preview</span>
                    </button>
                  )}

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleDownload(mat)}
                      className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition cursor-pointer"
                      title="Download Resource"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setPreviewDoc(mat)}
                      className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                      title="Preview Document"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenNotes(mat)}
                      className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition cursor-pointer"
                      title="Document Scratchpad Notes"
                    >
                      <StickyNote className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(mat.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                      title="Delete Material"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {previewDoc && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-4xl h-[85vh] shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
            <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="w-5 h-5 text-blue-600 shrink-0" />
                <div>
                  <h3 className="text-xs font-black text-slate-900 truncate max-w-sm sm:max-w-md">
                    {previewDoc.title}
                  </h3>
                  <span className="text-[10px] text-slate-400 font-medium">
                    {previewDoc.courseCode} • {previewDoc.format || 'Document'} • In-Browser Reader
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleDownload(previewDoc)}
                  className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg text-xs font-bold flex items-center gap-1"
                  title="Download File"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => setPreviewDoc(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 p-6 overflow-y-auto bg-slate-100/60 flex flex-col items-center">
              <div className="bg-white border border-slate-200 rounded-xl p-8 shadow-xs max-w-2xl w-full min-h-[500px] space-y-4">
                <div className="border-b border-slate-100 pb-3">
                  <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                    {previewDoc.courseCode} ACADEMIC RESOURCE
                  </span>
                  <h2 className="text-xl font-black text-slate-900 mt-2">{previewDoc.title}</h2>
                  <span className="text-xs text-slate-400">Uploaded {previewDoc.uploadDate}</span>
                </div>
                <p className="text-xs text-slate-700 leading-relaxed font-mono whitespace-pre-wrap">
                  {previewDoc.contentPreview || 'Content available for viewing and study.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {isUploadModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">Upload Study Material</h3>
                <p className="text-[11px] text-slate-400">Add documents or external Google Drive links</p>
              </div>
              <button
                type="button"
                onClick={() => setIsUploadModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-3.5">
              <div className="border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-2xl p-5 text-center cursor-pointer transition bg-slate-50/50">
                <UploadCloud className="w-7 h-7 text-blue-500 mx-auto mb-1.5" />
                <label className="text-xs font-bold text-slate-700 cursor-pointer block">
                  Drag & Drop your files here
                  <span className="text-blue-600 hover:underline block text-[11px] font-semibold mt-0.5">
                    or browse files from your device
                  </span>
                  <input
                    type="file"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files[0];
                      if (f) {
                        setUploadedFileName(f.name);
                        if (!formTitle) setFormTitle(f.name.replace(/\.[^/.]+$/, ''));
                      }
                    }}
                  />
                </label>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  {uploadedFileName ? uploadedFileName : 'PDF • DOCX • PPTX • max 50MB'}
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dynamic Programming & Memoization Notes"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                  <span>Resource Link / Cloud URL (Optional)</span>
                  <span className="text-[10px] text-slate-400 font-normal">Google Drive, Notion, Web</span>
                </label>
                <div className="relative">
                  <LinkIcon className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="url"
                    placeholder="https://drive.google.com/file/d/..."
                    value={formLink}
                    onChange={(e) => setFormLink(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Course *</label>
                  <select
                    value={formCourse}
                    onChange={(e) => setFormCourse(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl font-medium bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    {allCoursesList.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Category *</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl font-medium bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="Lectures">Lecture</option>
                    <option value="Notes">Notes</option>
                    <option value="Lab Practice">Lab Practice</option>
                    <option value="Question Papers">Question Papers</option>
                    <option value="Assignments">Assignments</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs transition cursor-pointer"
                >
                  Upload Material
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isExamModeOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-blue-600" />
                <div>
                  <h3 className="text-base font-bold text-slate-900">Exam Preparation Mode</h3>
                  <p className="text-[11px] text-slate-400">Bundle high-yield materials automatically</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsExamModeOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 my-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Select Course:</label>
                <select
                  value={examCourse}
                  onChange={(e) => setExamCourse(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl font-medium bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  {allCoursesList.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={handleApplyExamFilter}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-xs"
              >
                Filter Exam-Yield Materials
              </button>
            </div>
          </div>
        </div>
      )}

      {notesDoc && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-2xs flex justify-end">
          <div className="bg-white w-full max-w-md h-full shadow-2xl border-l border-slate-200 flex flex-col justify-between p-5 animate-in slide-in-from-right duration-150">
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <StickyNote className="w-4 h-4 text-amber-600" />
                  <h3 className="text-sm font-bold text-slate-900">Personal Notes & Summary</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setNotesDoc(null)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div>
                <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                  {notesDoc.courseCode}
                </span>
                <h4 className="text-xs font-bold text-slate-800 mt-1">{notesDoc.title}</h4>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Private Scratchpad
                </label>
                <textarea
                  rows={14}
                  value={docNotesText}
                  onChange={(e) => setDocNotesText(e.target.value)}
                  placeholder="Record personal thoughts, hints, or formulas..."
                  className="w-full p-3 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-emerald-600 font-bold">
                {notesSavedAlert ? '✓ Note saved!' : ''}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setNotesDoc(null)}
                  className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={handleSaveNotes}
                  className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-xs"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Note</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}