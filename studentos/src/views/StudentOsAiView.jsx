import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  BrainCircuit, 
  Send, 
  Bot, 
  Loader2, 
  RotateCcw,
  BookOpen,
  Sparkles
} from 'lucide-react';

export default function StudentOsAiView({
  courses = [],
  routine = {},
  workItems = [],
  exams = [],
  user
}) {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedCourseScope, setSelectedCourseScope] = useState('All');

  const studentDisplayName = useMemo(() => {
    if (!user?.name) return 'Student';
    const parts = user.name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0];
    if (/^(md\.?|mohammed|muhammad|mst\.?)$/i.test(parts[0])) {
      return `${parts[0]} ${parts[1] || ''}`.trim();
    }
    return parts[0];
  }, [user?.name]);

  const localKnowledgeBase = useMemo(() => {
    const knowledge = {};
    (courses || []).forEach((c) => {
      const code = (c.code || '').trim().toUpperCase();
      if (!code) return;

      const savedNotes = localStorage.getItem(`studentos_notes_${code}`) || '';
      let savedSyllabus = [];
      try {
        const syl = localStorage.getItem(`studentos_syllabus_${code}`);
        if (syl) savedSyllabus = JSON.parse(syl);
      } catch (e) {
        console.warn(e);
      }

      knowledge[code] = {
        name: c.name || code,
        teacher: c.teacher || 'TBA',
        credits: c.credits || c.credit || 3,
        notes: savedNotes,
        syllabus: savedSyllabus,
        syllabusCompleted: savedSyllabus.filter((m) => m.completed).length,
        syllabusTotal: savedSyllabus.length
      };
    });
    return knowledge;
  }, [courses]);

  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: `Hello **${studentDisplayName}**! I am your StudentOS Intelligence Copilot. I have synchronized access to your **${courses.length} courses**, **${(workItems || []).length} tasks**, syllabus checklists, and private lecture scratchpads for **Section ${user?.section || 'F1'}**. What would you like to review or plan today?`
    }
  ]);

  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const getTomorrowSchedule = () => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const tomorrowIdx = (new Date().getDay() + 1) % 7;
    const tomorrowDay = days[tomorrowIdx];

    let dayClasses = [];
    if (Array.isArray(routine)) {
      dayClasses = routine.filter((r) => (r.day || '').toLowerCase() === tomorrowDay.toLowerCase());
    } else if (routine && typeof routine === 'object') {
      dayClasses = routine[tomorrowDay] || [];
    }

    return { tomorrowDay, dayClasses };
  };

  const generateDirectAnswer = (query) => {
    const q = query.toLowerCase();

    if (q.includes('notes') || q.includes('scratchpad') || q.includes('summary')) {
      const matchedKey = Object.keys(localKnowledgeBase).find(
        (code) => q.includes(code.toLowerCase()) || (selectedCourseScope !== 'All' && code === selectedCourseScope)
      );

      if (matchedKey) {
        const item = localKnowledgeBase[matchedKey];
        if (!item.notes || !item.notes.trim()) {
          return `📝 **Scratchpad for ${matchedKey} (${item.name}):**\n\nNo lecture notes have been recorded in this workspace yet.`;
        }
        return `📝 **Active Scratchpad Notes for ${matchedKey}:**\n\n${item.notes}`;
      }

      const coursesWithNotes = Object.entries(localKnowledgeBase).filter(([_, data]) => Boolean(data.notes.trim()));
      if (coursesWithNotes.length === 0) {
        return `📝 You haven't added scratchpad notes to your course workspaces yet.`;
      }
      const list = coursesWithNotes
        .map(([code, data]) => `• **${code}**: "${data.notes.slice(0, 80).replace(/\n/g, ' ')}..."`)
        .join('\n');
      return `📝 **Current Synced Notes:**\n\n${list}`;
    }

    if (q.includes('syllabus') || q.includes('curriculum') || q.includes('module') || q.includes('coverage')) {
      const matchedKey = Object.keys(localKnowledgeBase).find(
        (code) => q.includes(code.toLowerCase()) || (selectedCourseScope !== 'All' && code === selectedCourseScope)
      );

      if (matchedKey) {
        const item = localKnowledgeBase[matchedKey];
        const progressPct = item.syllabusTotal > 0 ? Math.round((item.syllabusCompleted / item.syllabusTotal) * 100) : 0;
        const modulesList = item.syllabus.map((m) => `   ${m.completed ? '✅' : '⏳'} ${m.title}`).join('\n');

        return `📚 **Syllabus Mastery Report for ${matchedKey} (${progressPct}% Completed):**\n\n${modulesList}`;
      }

      const report = Object.entries(localKnowledgeBase).map(([code, data]) => {
        const pct = data.syllabusTotal > 0 ? Math.round((data.syllabusCompleted / data.syllabusTotal) * 100) : 0;
        return `• **${code}**: **${pct}%** syllabus covered (${data.syllabusCompleted}/${data.syllabusTotal} modules)`;
      }).join('\n');

      return `📚 **Overall Syllabus Completion Across Subjects:**\n\n${report}`;
    }

    if (q.includes('bunk') || q.includes('attendance') || q.includes('skip') || q.includes('75%') || q.includes('miss')) {
      if (!courses || courses.length === 0) {
        return 'No enrolled courses found to evaluate attendance compliance.';
      }

      const evaluated = courses.map((c) => {
        const logs = c.attendanceLogs || [];
        const held = logs.length > 0 ? logs.length : (c.attendance?.total || 0);
        const present = logs.length > 0 ? logs.filter((l) => l.status === 'present').length : (c.attendance?.present || 0);
        const pct = held > 0 ? Math.round((present / held) * 100) : 100;
        const canMiss = Math.floor((present - 0.75 * held) / 0.75);
        const need = Math.ceil((0.75 * held - present) / 0.25);

        return { code: c.code, name: c.name, held, present, pct, canMiss, need };
      });

      const atRisk = evaluated.filter((e) => e.pct < 75);
      const safe = evaluated.filter((e) => e.pct >= 75);

      let report = `📊 **75% Attendance & Safe Bunk Evaluation:**\n\n`;

      if (atRisk.length > 0) {
        report += `⚠️ **High Risk (<75%):**\n` + atRisk.map((r) => 
          `• **${r.code}**: currently at **${r.pct}%** (${r.present}/${r.held} classes). Attend the next **${Math.max(1, r.need)}** sessions.`
        ).join('\n') + '\n\n';
      }

      if (safe.length > 0) {
        report += `✅ **Safe Courses (≥75%):**\n` + safe.slice(0, 4).map((s) => 
          `• **${s.code}**: **${s.pct}%** (${s.present}/${s.held} classes) — Safe to miss **${Math.max(0, s.canMiss)}** upcoming session(s).`
        ).join('\n');
      }

      return report;
    }

    if (q.includes('tomorrow') || q.includes('next class')) {
      const { tomorrowDay, dayClasses } = getTomorrowSchedule();
      if (!dayClasses || dayClasses.length === 0) {
        return `📅 Tomorrow is **${tomorrowDay}**, and you have **no classes scheduled**. Enjoy your day off!`;
      }
      const list = dayClasses
        .map((c) => `• **${c.time || 'Time TBA'}**: **${c.code || c.course}** (${c.name || 'Lecture'}) — 📍 Room: **${c.room || 'TBA'}**`)
        .join('\n');
      return `📅 Here is your schedule for tomorrow (**${tomorrowDay}**):\n\n${list}`;
    }

    if (q.includes('study') || q.includes('prioritize') || q.includes('tonight') || q.includes('priority')) {
      const pendingTasks = (workItems || []).filter((t) => t.status !== 'Completed');
      const upcomingExams = exams || [];

      let advice = `🎯 **Recommended Priority Study Plan:**\n\n`;

      if (pendingTasks.length > 0) {
        advice += `1. **Immediate Deliverables (Due Soon):**\n` + pendingTasks.slice(0, 3).map((t) =>
          `   • **${t.title}** (${t.courseCode || t.course || 'Academic'}) — Due: **${t.deadlineDate || t.due || 'Soon'}**`
        ).join('\n') + '\n\n';
      }

      if (upcomingExams.length > 0) {
        advice += `2. **Upcoming Exam Checkpoints:**\n` + upcomingExams.slice(0, 2).map((e) =>
          `   • **${e.courseCode || e.title}** on **${e.date || 'Upcoming'}** (Room: ${e.room || 'TBA'})`
        ).join('\n') + '\n\n';
      }

      return advice;
    }

    return `I analyzed your active semester records for **Section ${user?.section || 'F1'}** (${courses.length} courses, ${(workItems || []).filter(t => t.status !== 'Completed').length} pending tasks). Try asking:
• *"What does my syllabus look like for CSE 101?"*
• *"Show me my scratchpad notes"*
• *"Can I safely bunk tomorrow's class?"*
• *"What should I prioritize studying tonight?"*`;
  };

  const handleSend = async (e, customPrompt) => {
    if (e) e.preventDefault();
    const query = (customPrompt || input).trim();
    if (!query || loading) return;

    const updatedMessages = [...messages, { role: 'user', text: query }];
    setMessages(updatedMessages);
    setInput('');
    setLoading(true);

    const token = localStorage.getItem('studentos_token');

    try {
      const res = await fetch('http://localhost:5001/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          prompt: query,
          studentContext: {
            user,
            courses,
            routine,
            tasks: workItems,
            exams,
            knowledgeBase: localKnowledgeBase,
            activeCourseScope: selectedCourseScope
          }
        })
      });

      const data = await res.json();
      if (data.success && data.reply) {
        setMessages([...updatedMessages, { role: 'assistant', text: data.reply }]);
        setLoading(false);
        return;
      }
    } catch (err) {
      console.warn('Backend Gemini API fallback:', err);
    }

    setTimeout(() => {
      const directAnswer = generateDirectAnswer(query);
      setMessages([...updatedMessages, { role: 'assistant', text: directAnswer }]);
      setLoading(false);
    }, 250);
  };

  const renderFormattedText = (rawText) => {
    return rawText.split('\n').map((line, lineIdx) => {
      const parts = line.split(/(\*\*.*?\*\*)/g);
      return (
        <span key={lineIdx} className="block leading-relaxed">
          {parts.map((part, pIdx) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              return (
                <strong key={pIdx} className="font-bold text-slate-900">
                  {part.slice(2, -2)}
                </strong>
              );
            }
            return part;
          })}
        </span>
      );
    });
  };

  const dynamicQuickPrompts = useMemo(() => {
    if (selectedCourseScope !== 'All') {
      return [
        `What is my syllabus progress for ${selectedCourseScope}?`,
        `Show my scratchpad notes for ${selectedCourseScope}`,
        `Can I skip ${selectedCourseScope} under the 75% rule?`,
        `What tasks are due for ${selectedCourseScope}?`
      ];
    }
    return [
      "What classes do I have tomorrow?",
      "Can I safely bunk tomorrow's class under 75% rule?",
      "What should I prioritize studying tonight?",
      "Summarize my syllabus completion across all courses"
    ];
  }, [selectedCourseScope]);

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
      <div className="p-4 border-b border-slate-100 bg-slate-50/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
            <BrainCircuit className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <span>StudentOS Context Assistant</span>
              <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded bg-blue-100 text-blue-700">
                Gemini 2.5 Flash
              </span>
            </h2>
            <p className="text-[11px] text-slate-500 font-medium">
              Synchronized with {courses.length} courses, scratchpads, and Section {user?.section || 'F1'}.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-xl border border-slate-200 shadow-2xs">
            <BookOpen className="w-3.5 h-3.5 text-blue-600" />
            <select
              value={selectedCourseScope}
              onChange={(e) => setSelectedCourseScope(e.target.value)}
              className="text-xs font-bold text-slate-700 bg-transparent focus:outline-none cursor-pointer"
            >
              <option value="All">All Courses Context</option>
              {courses.map((c) => (
                <option key={c.id || c.code} value={c.code}>
                  {c.code}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={() => setMessages([messages[0]])}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition cursor-pointer"
            title="Reset conversation"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs">
        {messages.map((m, idx) => (
          <div key={idx} className={`flex items-start gap-2.5 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {m.role === 'assistant' && (
              <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                <Bot className="w-4 h-4" />
              </div>
            )}
            <div className={`p-3.5 rounded-2xl max-w-xl text-xs ${
              m.role === 'user'
                ? 'bg-blue-600 text-white font-medium rounded-tr-none shadow-2xs'
                : 'bg-slate-100 text-slate-800 rounded-tl-none font-medium border border-slate-200/60'
            }`}>
              {renderFormattedText(m.text)}
            </div>
            {m.role === 'user' && (
              <div className="w-7 h-7 rounded-lg bg-slate-700 text-white flex items-center justify-center shrink-0 text-[10px] font-bold uppercase">
                {user?.name ? user.name.substring(0, 2) : 'RU'}
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2 text-slate-400 text-xs pl-9">
            <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
            <span>Consulting StudentOS syllabus and lecture notes...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="px-4 py-2 bg-slate-50/60 border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto text-[11px]">
        <span className="text-slate-400 font-bold shrink-0 text-[9px] uppercase">Try:</span>
        {dynamicQuickPrompts.map((qp, i) => (
          <button
            key={i}
            type="button"
            onClick={() => handleSend(null, qp)}
            className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-600 font-medium shrink-0 transition cursor-pointer"
          >
            {qp}
          </button>
        ))}
      </div>

      <form onSubmit={(e) => handleSend(e)} className="p-3 border-t border-slate-100 flex gap-2 bg-white">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={`Ask about ${selectedCourseScope === 'All' ? 'any course, syllabus module, or scratchpad' : `${selectedCourseScope} notes and curriculum`}...`}
          className="flex-1 px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-medium"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
        >
          <Send className="w-3.5 h-3.5" />
          <span>Ask</span>
        </button>
      </form>
    </div>
  );
}