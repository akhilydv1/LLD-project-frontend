import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity, ArrowDownRight, ArrowLeft, ArrowRight, ArrowUpRight, BookOpen, Check,
  CheckCircle2, ChevronDown, ChevronRight, CircleHelp, Clock3, FileText, Filter,
  Gauge, GitBranch, History, LayoutDashboard, Lightbulb, ListChecks, Menu,
  MessageSquareText, Plus, RefreshCw, RotateCcw, Save, Search, Send, Settings2,
  ShieldCheck, Sparkles, X, Zap
} from 'lucide-react';
import { fallbackProblems, emptySections, sectionFields } from './data/problems.js';
import { API_ENABLED, api, displayApiError } from './services/api.js';

const STORAGE_KEY = 'designloop-v2-attempts';
const MODE_INFO = {
  TEXT: { label: 'Write with text', short: 'Text', description: 'Explain your design in structured sections.', icon: FileText },
  DOCUMENT: { label: 'Upload document', short: 'Document', description: 'Upload PDF, DOCX, TXT or Markdown notes.', icon: FileText },
  DIAGRAM: { label: 'Upload diagram', short: 'Diagram', description: 'Share a class diagram, flow or architecture sketch.', icon: GitBranch },
  COMBINED: { label: 'Combine formats', short: 'Combined', description: 'Use text plus a document or diagram together.', icon: GitBranch },
};

function readStoredAttempts() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
}
function saveStoredAttempts(items) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); } catch { /* private browsing/storage limit */ }
}
function uid() {
  return globalThis.crypto?.randomUUID?.() || `local-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
function formatDate(date) {
  if (!date) return 'Just now';
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return 'Recently';
  return parsed.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
function formatSize(bytes = 0) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
function difficultyClass(value = 'Medium') {
  return String(value).toLowerCase().replace(/\s+/g, '-');
}
function normalizeAttempt(raw, fallback = {}) {
  if (!raw) return fallback;
  return {
    ...fallback,
    id: raw.id || raw.attemptId || fallback.id,
    problemId: raw.problem?.id || raw.problemId || fallback.problemId,
    problemTitle: raw.problem?.title || raw.problemTitle || fallback.problemTitle,
    status: raw.status || fallback.status || 'DRAFT',
    revision: raw.revision ?? fallback.revision ?? 0,
    format: (() => { const f = raw.draft?.format || raw.submission?.artifact?.format || raw.format || fallback.format || 'TEXT'; return f === 'STRUCTURED_TEXT' ? 'TEXT' : f; })(),
    sections: raw.draft?.sections || raw.sections || fallback.sections || { ...emptySections },
    notes: raw.draft?.notes || raw.notes || fallback.notes || '',
    files: raw.attachments || raw.files || fallback.files || [],
    feedback: raw.feedback || fallback.feedback || null,
    updatedAt: raw.updatedAt || raw.createdAt || fallback.updatedAt || new Date().toISOString(),
    submissionId: raw.submission?.id || fallback.submissionId || null,
  };
}

function Button({ children, variant = 'primary', icon: Icon, className = '', ...props }) {
  return <button className={`button button-${variant} ${className}`} {...props}>{Icon && <Icon size={16} strokeWidth={2.2} />}{children}</button>;
}
function Tag({ children, color = '' }) { return <span className={`tag ${color ? `tag-${color}` : ''}`}>{children}</span>; }
function Field({ field, value, onChange }) {
  return <label className="field-block">
    <span className="field-label">{field.label}{field.required && <span className="required-star"> *</span>}</span>
    <span className="field-hint">{field.hint}</span>
    <textarea value={value || ''} onChange={e => onChange(field.key, e.target.value)} placeholder={field.placeholder} rows={field.key === 'code' ? 5 : 4} />
    <span className="field-foot"><span>{field.required ? 'Recommended: be specific and explain why' : 'Optional evidence'}</span><span>{(value || '').length.toLocaleString()} chars</span></span>
  </label>;
}

function App() {
  const [view, setView] = useState('overview');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [problems, setProblems] = useState(fallbackProblems);
  const [attempts, setAttempts] = useState(readStoredAttempts);
  const [selectedProblem, setSelectedProblem] = useState(null);
  const [selectedAttempt, setSelectedAttempt] = useState(null);
  const [attemptId, setAttemptId] = useState('');
  const [revision, setRevision] = useState(0);
  const [mode, setMode] = useState('TEXT');
  const [sections, setSections] = useState({ ...emptySections });
  const [files, setFiles] = useState([]);
  const [notes, setNotes] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('All');
  const [toast, setToast] = useState(null);
  const [busy, setBusy] = useState(false);
  const [apiError, setApiError] = useState('');
  const [currentFeedback, setCurrentFeedback] = useState(null);
  const [currentServerAttempt, setCurrentServerAttempt] = useState(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [fileDropActive, setFileDropActive] = useState(false);
  const docInputRef = useRef(null);
  const diagramInputRef = useRef(null);

  useEffect(() => { saveStoredAttempts(attempts); }, [attempts]);
  useEffect(() => {
    if (!API_ENABLED) return;
    let cancelled = false;
    api.listProblems().then(items => {
      if (!cancelled && items.length) setProblems(items.map((p, i) => ({ ...fallbackProblems[i % fallbackProblems.length], ...p, id: p.id || p.problemId, title: p.title || p.name || 'Untitled problem', description: p.description || p.context || '' })));
    }).catch(error => { if (!cancelled) setApiError(displayApiError(error)); });
    api.listAttempts().then(items => {
      if (!cancelled && items.length) setAttempts(items.map(item => normalizeAttempt(item)));
    }).catch(error => { if (!cancelled) setApiError(displayApiError(error)); });
    return () => { cancelled = true; };
  }, []);
  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(null), 4200);
    return () => clearTimeout(timer);
  }, [toast]);

  const filteredProblems = useMemo(() => problems.filter(problem => {
    const term = searchTerm.trim().toLowerCase();
    const matchesSearch = !term || `${problem.title} ${problem.description} ${(problem.skills || []).join(' ')}`.toLowerCase().includes(term);
    const matchesDifficulty = difficultyFilter === 'All' || String(problem.difficulty || '').toLowerCase() === difficultyFilter.toLowerCase();
    return matchesSearch && matchesDifficulty;
  }), [problems, searchTerm, difficultyFilter]);
  const completedCount = attempts.filter(a => String(a.status).toUpperCase() === 'COMPLETED').length;
  const activeCount = attempts.filter(a => ['DRAFT', 'SUBMITTED', 'EVALUATING'].includes(String(a.status).toUpperCase())).length;

  function go(nextView) {
    setView(nextView);
    setMobileNavOpen(false);
    setApiError('');
  }
  function beginPractice(problem) {
    setSelectedProblem(problem);
    setSelectedAttempt(null);
    setAttemptId('');
    setRevision(0);
    setMode('TEXT');
    setSections({ ...emptySections });
    setFiles([]);
    setNotes('');
    setCurrentFeedback(null);
    setCurrentServerAttempt(null);
    setStatusMessage('');
    go('workspace');
  }
  function editAttempt(attempt) {
    const linkedProblem = problems.find(p => String(p.id) === String(attempt.problemId)) || {
      id: attempt.problemId || 'unknown', title: attempt.problemTitle || 'Saved attempt', difficulty: 'Medium', minutes: 40,
      description: 'Continue working on this saved attempt.', requirements: [], skills: [],
    };
    setSelectedProblem(linkedProblem);
    setSelectedAttempt(attempt);
    setAttemptId(attempt.id);
    setRevision(attempt.revision || 0);
    setMode(attempt.format === 'STRUCTURED_TEXT' ? 'TEXT' : (attempt.format || 'TEXT'));
    setSections({ ...emptySections, ...(attempt.sections || {}) });
    setFiles((attempt.files || []).map(f => ({ ...f, file: null, uploaded: true })));
    setNotes(attempt.notes || '');
    setCurrentFeedback(attempt.feedback || null);
    setCurrentServerAttempt(null);
    setStatusMessage('');
    go('workspace');
  }
  function addFiles(fileList, type) {
    const incoming = Array.from(fileList || []);
    if (!incoming.length) return;
    const valid = [];
    for (const file of incoming) {
      if (file.size > 20 * 1024 * 1024) {
        setToast({ type: 'error', message: `${file.name} is over the 20 MB limit.` });
        continue;
      }
      const isDiagram = type === 'DIAGRAM';
      const allowed = isDiagram
        ? /\.(png|jpe?g|webp|svg|pdf|drawio|xml)$/i.test(file.name)
        : /\.(pdf|docx?|txt|md|rtf|odt)$/i.test(file.name);
      if (!allowed) {
        setToast({ type: 'error', message: `${file.name}: unsupported ${isDiagram ? 'diagram' : 'document'} format.` });
        continue;
      }
      valid.push({ id: uid(), file, name: file.name, size: file.size, type: file.type, kind: type, uploaded: false });
    }
    if (valid.length) setFiles(previous => [...previous, ...valid]);
  }
  function removeFile(fileId) { setFiles(prev => prev.filter(f => f.id !== fileId)); }
  function updateSection(key, value) { setSections(prev => ({ ...prev, [key]: value })); }

  async function ensureAttempt() {
    if (attemptId) return attemptId;
    if (API_ENABLED) {
      const raw = await api.createAttempt(selectedProblem.id, mode);
      const id = raw?.id || raw?.attemptId;
      if (!id) throw new Error('The attempt was created, but the server did not return an attempt ID. Please check the backend API response.');
      setAttemptId(id);
      setRevision(raw.revision ?? 0);
      return id;
    }
    const id = uid();
    setAttemptId(id);
    return id;
  }

  function validateDraft(forSubmit = false) {
    if (!selectedProblem) return 'Please select a problem first.';
    const needsText = mode === 'TEXT' || mode === 'COMBINED';
    if (needsText && forSubmit) {
      const missing = sectionFields.filter(f => f.required && !String(sections[f.key] || '').trim());
      if (missing.length) return `Please fill: ${missing.map(f => f.label).join(', ')}.`;
    }
    const hasDoc = files.some(f => f.kind === 'DOCUMENT');
    const hasDiagram = files.some(f => f.kind === 'DIAGRAM');
    if (forSubmit && mode === 'DOCUMENT' && !hasDoc) return 'Please attach at least one document before submitting.';
    if (forSubmit && mode === 'DIAGRAM' && !hasDiagram) return 'Please attach a diagram before submitting.';
    if (forSubmit && mode === 'COMBINED' && files.length === 0) return 'Combined mode needs text plus at least one document or diagram.';
    return '';
  }

  function localAttempt(id, state, previous = null) {
    const uploadedMeta = files.map(f => ({ id: f.id, name: f.name, size: f.size, type: f.type, kind: f.kind, uploaded: f.uploaded }));
    return {
      ...(previous || selectedAttempt || {}), id, problemId: selectedProblem.id, problemTitle: selectedProblem.title,
      status: state, revision: (revision || 0) + 1, format: mode, sections: { ...sections }, files: uploadedMeta,
      notes, feedback: currentFeedback, updatedAt: new Date().toISOString(),
    };
  }

  async function persistDraft(forSubmit = false) {
    const validationError = validateDraft(forSubmit);
    if (validationError) throw new Error(validationError);
    const id = await ensureAttempt();
    if (API_ENABLED) {
      const backendFormat = mode === 'TEXT' ? 'STRUCTURED_TEXT' : mode;
      const artifact = { format: backendFormat, sections: { ...sections }, notes };
      const saved = await api.saveDraft(id, revision, artifact);
      const nextRevision = saved?.revision ?? saved?.attempt?.revision ?? revision + 1;
      setRevision(nextRevision);
      const attachmentsToUpload = files.filter(f => f.file && !f.uploaded);
      for (const entry of attachmentsToUpload) {
        await api.uploadAttachment(id, entry.file, entry.kind, notes);
      }
      if (attachmentsToUpload.length) setFiles(prev => prev.map(f => f.file ? { ...f, uploaded: true } : f));
      let fresh = null;
      try { fresh = await api.getAttempt(id); } catch { /* draft save itself succeeded */ }
      const entry = normalizeAttempt(fresh, localAttempt(id, 'DRAFT'));
      setAttempts(prev => [entry, ...prev.filter(a => a.id !== id)]);
      setSelectedAttempt(entry);
      setCurrentServerAttempt(fresh);
      setToast({ type: 'success', message: 'Draft saved successfully to the server.' });
      return entry;
    }
    const entry = localAttempt(id, 'DRAFT');
    setAttempts(prev => [entry, ...prev.filter(a => a.id !== id)]);
    setSelectedAttempt(entry);
    setRevision(entry.revision);
    setToast({ type: 'success', message: 'Draft is saved in this browser (demo mode).' });
    return entry;
  }

  async function handleSaveDraft(event) {
    event?.preventDefault();
    if (busy) return;
    setBusy(true); setApiError('');
    try { await persistDraft(false); }
    catch (error) { setToast({ type: 'error', message: displayApiError(error) }); if (API_ENABLED) setApiError(displayApiError(error)); }
    finally { setBusy(false); }
  }

  

async function handleSubmit() {
  if (busy) return;

  setBusy(true);
  setApiError('');

  try {
    const id = await ensureAttempt();

    if (API_ENABLED) {
      const artifact = buildArtifact();
      const saved = await api.saveDraft(id, revision, artifact);

      setRevision(saved?.revision ?? revision);

      await api.submitAttempt(id);

      const latest = await api.getAttempt(id);
      const normalized = normalizeAttempt(latest);

      setAttempts((prev) => ({
        ...prev,
        [id]: normalized,
      }));

      setFeedback(
        normalized.status === "COMPLETED"
          ? normalized.feedback ?? null
          : null
      );

      setToast({
        type: 'success',
        message: 'Your submission was received successfully. Evaluation may take some time.'
      });
    } else {
      setToast({
        type: 'info',
        message: 'Live AI feedback is unavailable in demo mode.'
      });
    }

    go("feedback");
  } catch (error) {
    const message = displayApiError(error);
    setToast({ type: 'error', message });

    if (API_ENABLED) {
      setApiError(message);
    }
  } finally {
    setBusy(false);
  }
}


  async function retryEvaluation(attempt) {
    const target = attempt || selectedAttempt;
    if (!target?.id) return;
    if (!API_ENABLED) {
      setToast({ type: 'info', message: 'Retry evaluation requires the backend API.' });
      return;
    }
    setBusy(true);
    try {
      const raw = await api.retryEvaluation(target.id);
      const normalized = normalizeAttempt(raw, { ...target, status: raw?.status || 'SUBMITTED' });
      setSelectedAttempt(normalized);
      setCurrentServerAttempt(raw);
      setCurrentFeedback(raw?.feedback || null);
      setStatusMessage(normalized.status);
      setAttempts(prev => [normalized, ...prev.filter(a => a.id !== normalized.id)]);
      setToast({ type: 'success', message: 'Evaluation retry requested. Refresh status in a moment.' });
    } catch (error) {
      setToast({ type: 'error', message: displayApiError(error) });
    } finally { setBusy(false); }
  }

 
async function refreshFeedback() {
  if (!API_ENABLED || !attemptId) {
    setToast("Live feedback is unavailable in demo mode.");
    return;
  }

  try {
    setLoading(true);

    const latest = await api.getAttempt(attemptId);
    const normalized = normalizeAttempt(latest);

    setAttempts((prev) => ({
      ...prev,
      [attemptId]: normalized,
    }));

    if (normalized.status !== "COMPLETED") {
      setFeedback(null);
      setToast(
        "Evaluation is still in progress. Please check again shortly."
      );
      return;
    }

    const result = normalized.feedback
      ? normalized.feedback
      : await api.getFeedback(attemptId);

    setFeedback(result);
    setToast("Feedback loaded successfully.");
  } catch (error) {
    if (error?.status === 409 || error?.status === 425) {
      setToast(
        "Evaluation is still in progress. Please check again shortly."
      );
    } else {
      setToast(displayApiError(error));
    }
  } finally {
    setLoading(false);
  }
}


  async function openAttempt(attempt) {
    let target = attempt;
    let serverRecord = null;
    if (API_ENABLED) {
      setBusy(true);
      try {
        serverRecord = await api.getAttempt(attempt.id);
        let feedback = serverRecord?.feedback || null;
        if (!feedback && String(serverRecord?.status).toUpperCase() === 'COMPLETED') {
          try {
            const f = await api.getFeedback(attempt.id);
            feedback = f?.feedback || (f?.provider ? f : null);
          } catch { /* no feedback available yet */ }
        }
        target = normalizeAttempt(serverRecord, attempt);
        target.feedback = feedback;
        setCurrentServerAttempt(serverRecord);
        setAttempts(prev => [target, ...prev.filter(a => a.id !== target.id)]);
      } catch (error) {
        setToast({ type: 'error', message: displayApiError(error) });
      } finally { setBusy(false); }
    }
    if (String(target.status).toUpperCase() === 'DRAFT') {
      editAttempt(target);
    } else {
      setSelectedAttempt(target);
      setAttemptId(target.id);
      setCurrentFeedback(target.feedback || null);
      setStatusMessage(target.status);
      if (serverRecord) setCurrentServerAttempt(serverRecord);
      go('feedback');
    }
  }

  const latestAttempts = attempts.slice().sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0)).slice(0, 4);

  return <div className="app-shell">
    <aside className={`sidebar ${mobileNavOpen ? 'sidebar-open' : ''}`}>
      <div className="brand-row">
        <div className="brand-mark"><GitBranch size={19} strokeWidth={2.5} /></div>
        <div><div className="brand-name">DesignLoop</div><div className="brand-caption">LLD PRACTICE STUDIO</div></div>
        <button className="icon-button mobile-close" onClick={() => setMobileNavOpen(false)} aria-label="Close navigation"><X size={18} /></button>
      </div>
      <div className="nav-label">WORKSPACE</div>
      <nav className="side-nav">
        <button className={`nav-item ${view === 'overview' ? 'active' : ''}`} onClick={() => go('overview')}><LayoutDashboard size={18} />Overview</button>
        <button className={`nav-item ${view === 'problems' ? 'active' : ''}`} onClick={() => go('problems')}><BookOpen size={18} />Problem library <span className="nav-count">{problems.length}</span></button>
        <button className={`nav-item ${view === 'history' ? 'active' : ''}`} onClick={() => go('history')}><History size={18} />My attempts <span className="nav-count">{attempts.length}</span></button>
      </nav>
      <div className="sidebar-bottom">
        <div className="sidebar-tip">
          <div className="tip-icon"><Lightbulb size={17} /></div>
          <strong>Design tip</strong>
          <p>Explain why each class owns a responsibility, not just what the class is called.</p>
          <button onClick={() => { setSelectedProblem(problems[0]); go('problems'); }}>Explore problems <ArrowRight size={14} /></button>
        </div>
        <div className="profile-row">
          <div className="avatar">DL</div>
          <div className="profile-text"><strong>Practice workspace</strong><span>{API_ENABLED ? 'Connected mode' : 'Local demo mode'}</span></div>
          <button className="icon-button" title="Settings" onClick={() => setToast({ type: 'info', message: 'API base is configured through the .env file.' })}><Settings2 size={17} /></button>
        </div>
      </div>
    </aside>

    <main className="main-area">
      <header className="topbar">
        <button className="icon-button mobile-menu" onClick={() => setMobileNavOpen(true)} aria-label="Open navigation"><Menu size={20} /></button>
        <div className="breadcrumb"><span>Workspace</span><ChevronRight size={15} /><strong>{view === 'overview' ? 'Overview' : view === 'problems' ? 'Problem library' : view === 'workspace' ? 'Design workspace' : view === 'feedback' ? 'Review feedback' : 'My attempts'}</strong></div>
        <div className="topbar-right">
          <span className={`connection-pill ${API_ENABLED ? 'connected' : 'demo'}`}><span className="connection-dot" />{API_ENABLED ? 'API configured' : 'Demo mode'}</span>
          <div className="topbar-avatar">DL</div>
        </div>
      </header>

      {apiError && <div className="api-alert"><CircleHelp size={18} /><div><strong>Backend connection needs attention</strong><span>{apiError}</span></div><button onClick={() => setApiError('')} aria-label="Dismiss"><X size={16} /></button></div>}
      {!API_ENABLED && <div className="demo-banner"><Sparkles size={16} /><span><strong>Local demo:</strong> attempts stay in this browser. Live evaluation and server uploads work after the backend API is connected.</span><button onClick={() => go('problems')}>Try a problem <ArrowRight size={14} /></button></div>}

      {view === 'overview' && <Overview problems={problems} attempts={attempts} latestAttempts={latestAttempts} completedCount={completedCount} activeCount={activeCount} onPractice={beginPractice} onViewProblems={() => go('problems')} onViewHistory={() => go('history')} onOpenAttempt={openAttempt} />}
      {view === 'problems' && <ProblemLibrary problems={filteredProblems} searchTerm={searchTerm} setSearchTerm={setSearchTerm} difficultyFilter={difficultyFilter} setDifficultyFilter={setDifficultyFilter} onPractice={beginPractice} />}
      {view === 'workspace' && <Workspace
        problem={selectedProblem} mode={mode} setMode={setMode} sections={sections} updateSection={updateSection}
        files={files} addFiles={addFiles} removeFile={removeFile} notes={notes} setNotes={setNotes}
        docInputRef={docInputRef} diagramInputRef={diagramInputRef} fileDropActive={fileDropActive} setFileDropActive={setFileDropActive}
        busy={busy} onSave={handleSaveDraft} onSubmit={handleSubmit} onBack={() => go('problems')} attemptId={attemptId} revision={revision}
      />}
      {view === 'feedback' && <FeedbackView attempt={selectedAttempt} serverAttempt={currentServerAttempt} feedback={currentFeedback || selectedAttempt?.feedback} busy={busy} statusMessage={statusMessage} onRefresh={() => refreshFeedback(selectedAttempt)} onRetry={() => retryEvaluation(selectedAttempt)} onNew={() => go('problems')} onEdit={() => selectedAttempt && editAttempt(selectedAttempt)} />}
      {view === 'history' && <HistoryView attempts={attempts} busy={busy} onOpen={openAttempt} onNew={() => go('problems')} />}
    </main>
    {toast && <div className={`toast toast-${toast.type || 'success'}`} role="status"><span className="toast-icon">{toast.type === 'error' ? <X size={17} /> : toast.type === 'warning' ? <CircleHelp size={17} /> : <CheckCircle2 size={17} />}</span><span>{toast.message}</span><button onClick={() => setToast(null)} aria-label="Dismiss notification"><X size={15} /></button></div>}
  </div>;
}

function Overview({ problems, attempts, latestAttempts, completedCount, activeCount, onPractice, onViewProblems, onViewHistory, onOpenAttempt }) {
  return <div className="page-content fade-in">
    <section className="welcome-row"><div><div className="eyebrow"><Sparkles size={14} />YOUR DESIGN JOURNEY</div><h1>Turn design ideas into<br /><span>stronger architecture.</span></h1><p className="welcome-copy">Practice real-world LLD problems, explain your choices, and learn from structured feedback.</p><div className="welcome-actions"><Button onClick={() => onPractice(problems[0])} icon={ArrowRight}>Start practicing</Button><Button variant="secondary" onClick={onViewProblems} icon={BookOpen}>Browse all problems</Button></div></div><div className="hero-illustration" aria-hidden="true"><div className="hero-glow" /><div className="diagram-card diagram-card-back"><div className="mini-card-title">Interface</div><div className="mini-lines"><i /><i /><i /></div></div><div className="diagram-card diagram-card-front"><div className="mini-card-top"><span className="mini-purple-dot" /><span className="mini-purple-dot" /><span className="mini-purple-dot" /></div><div className="mini-node main-node">ParkingLot</div><div className="mini-connectors"><span /><span /><span /></div><div className="mini-node-row"><div className="mini-node">Ticket</div><div className="mini-node">Spot</div></div><div className="mini-connector-bottom" /><div className="mini-node fee-node">FeeCalculator</div></div><div className="floating-chip chip-top"><CheckCircle2 size={15} /> Clear responsibilities</div><div className="floating-chip chip-bottom"><GitBranch size={15} /> Better class design</div></div></section>

    <section className="stats-grid">
      <StatCard icon={BookOpen} label="Problems to explore" value={problems.length} note="Across common LLD patterns" accent="violet" />
      <StatCard icon={Activity} label="In progress" value={activeCount} note="Drafts and submitted attempts" accent="blue" />
      <StatCard icon={CheckCircle2} label="Completed reviews" value={completedCount} note="Attempts marked complete" accent="green" />
      <StatCard icon={Gauge} label="Total attempts" value={attempts.length} note="Your practice history" accent="orange" />
    </section>

    <section className="section-heading-row"><div><div className="eyebrow">PICK UP A NEW CHALLENGE</div><h2>Popular problems</h2><p>Start with one focused design. You can save a draft at any point.</p></div><button className="text-link" onClick={onViewProblems}>View library <ArrowRight size={15} /></button></section>
    <section className="problem-grid overview-problems">{problems.slice(0, 3).map((problem, index) => <ProblemCard key={problem.id} problem={problem} index={index} onPractice={onPractice} />)}</section>

    <section className="bottom-grid"><div className="panel recent-panel"><div className="panel-heading"><div><h3>Recent attempts</h3><p>Your latest design work</p></div><button className="text-link small" onClick={onViewHistory}>See history <ArrowRight size={14} /></button></div>{latestAttempts.length ? <div className="recent-list">{latestAttempts.map(item => <button key={item.id} className="recent-row" onClick={() => onOpenAttempt(item)}><div className="recent-file-icon"><FileText size={17} /></div><div className="recent-detail"><strong>{item.problemTitle || item.problemId || 'LLD practice'}</strong><span>{MODE_INFO[item.format]?.short || item.format || 'Text'} · {formatDate(item.updatedAt)}</span></div><StatusPill status={item.status} /><ChevronRight size={16} className="recent-chevron" /></button>)}</div> : <EmptySmall icon={History} title="Your attempts will appear here" body="Choose a problem and save your first design." action="Browse problems" onAction={onViewProblems} />}</div><div className="panel guide-panel"><div className="guide-icon"><Lightbulb size={20} /></div><div className="eyebrow">A GOOD DESIGN ANSWER</div><h3>Show the thinking,<br />not just the classes.</h3><p>A strong LLD answer explains who owns each rule, what happens when something fails, and how the design can change later.</p><div className="guide-check"><span><Check size={14} /></span> Clear class responsibilities</div><div className="guide-check"><span><Check size={14} /></span> Relationships and interaction flow</div><div className="guide-check"><span><Check size={14} /></span> Edge cases and test plan</div></div></section>
  </div>;
}

function StatCard({ icon: Icon, label, value, note, accent }) { return <div className="stat-card"><div className={`stat-icon stat-${accent}`}><Icon size={18} /></div><div className="stat-label">{label}</div><div className="stat-value">{value}</div><div className="stat-note">{note}</div></div>; }

function ProblemLibrary({ problems, searchTerm, setSearchTerm, difficultyFilter, setDifficultyFilter, onPractice }) {
  return <div className="page-content fade-in"><div className="page-title-row"><div><div className="eyebrow">BUILD YOUR DESIGN SKILLS</div><h1>Problem library</h1><p>Choose a real-world system and practice its object model.</p></div><div className="library-count"><BookOpen size={16} /> {problems.length} problems</div></div>
    <div className="library-toolbar"><div className="search-box"><Search size={17} /><input aria-label="Search problems" placeholder="Search by problem or skill…" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />{searchTerm && <button onClick={() => setSearchTerm('')} aria-label="Clear search"><X size={15} /></button>}</div><div className="filter-box"><Filter size={16} /><select aria-label="Filter by difficulty" value={difficultyFilter} onChange={e => setDifficultyFilter(e.target.value)}><option>All</option><option>Easy</option><option>Medium</option><option>Hard</option></select><ChevronDown size={14} /></div></div>
    {problems.length ? <div className="problem-grid library-grid">{problems.map((problem, index) => <ProblemCard key={problem.id} problem={problem} index={index} onPractice={onPractice} />)}</div> : <div className="empty-state"><Search size={25} /><h3>No problems match</h3><p>Try another search term or select a different difficulty.</p><Button variant="secondary" onClick={() => { setSearchTerm(''); setDifficultyFilter('All'); }}>Clear filters</Button></div>}
  </div>;
}

function ProblemCard({ problem, index = 0, onPractice }) {
  const palette = ['violet', 'blue', 'orange', 'green', 'pink', 'teal'];
  const Icon = [GitBranch, Activity, Zap, ListChecks, BookOpen, ArrowDownRight][index % 6];
  const tags = problem.skills || problem.tags || [];
  return <article className="problem-card"><div className="problem-card-top"><div className={`problem-symbol symbol-${palette[index % palette.length]}`}><Icon size={20} /></div><Tag color={difficultyClass(problem.difficulty)}>{problem.difficulty || 'Medium'}</Tag></div><div className="problem-category">{problem.category || 'System design'}</div><h3>{problem.title}</h3><p className="problem-description">{problem.description || problem.context || 'Practice class responsibilities, relationships and edge cases for this system.'}</p><div className="skill-tags">{tags.slice(0, 3).map(tag => <span key={tag}>{tag}</span>)}</div><div className="problem-card-footer"><span className="time-estimate"><Clock3 size={14} /> {problem.minutes || problem.suggestedMinutes || 40} min</span><Button variant="card" onClick={() => onPractice(problem)}>Start design <ArrowRight size={15} /></Button></div></article>;
}

function Workspace({ problem, mode, setMode, sections, updateSection, files, addFiles, removeFile, notes, setNotes, docInputRef, diagramInputRef, fileDropActive, setFileDropActive, busy, onSave, onSubmit, onBack, attemptId, revision }) {
  const textCount = Object.values(sections).reduce((sum, value) => sum + (value || '').length, 0);
  if (!problem) return <div className="page-content"><div className="empty-state"><BookOpen size={28} /><h3>Choose a problem first</h3><p>Select a problem from the library to open the design workspace.</p><Button onClick={onBack}>Go to problems</Button></div></div>;
  const requirements = problem.requirements || [];
  const canShowText = mode === 'TEXT' || mode === 'COMBINED';
  const canShowDoc = mode === 'DOCUMENT' || mode === 'COMBINED';
  const canShowDiagram = mode === 'DIAGRAM' || mode === 'COMBINED';
  const textFields = mode === 'TEXT' || mode === 'COMBINED' ? sectionFields : [];
  return <div className="page-content workspace-page fade-in"><button className="back-link" onClick={onBack}><ArrowLeft size={15} /> Back to problem library</button>
    <div className="workspace-heading"><div><div className="eyebrow">DESIGN WORKSPACE <span className="eyebrow-dot" /> {problem.category || 'OBJECT MODELLING'}</div><h1>{problem.title}</h1><p>{problem.description || problem.context}</p></div><div className="workspace-heading-meta"><Tag color={difficultyClass(problem.difficulty)}>{problem.difficulty || 'Medium'}</Tag><span><Clock3 size={14} /> {problem.minutes || problem.suggestedMinutes || 40} min</span>{attemptId && <span className="revision-note">Revision {revision}</span>}</div></div>
    <div className="workspace-layout"><aside className="problem-brief panel"><div className="brief-header"><span className="brief-icon"><BookOpen size={17} /></span><div><h3>Problem brief</h3><span>Keep these rules in mind</span></div></div>{requirements.length ? <ol className="requirement-list">{requirements.map((req, idx) => <li key={req.id || idx}><span className="req-id">{req.id || `R${idx + 1}`}</span><span>{req.description || req}</span></li>)}</ol> : <p className="brief-copy">Clarify requirements and assumptions before choosing classes. Identify important behaviours, invalid states, and likely changes.</p>}{problem.changeScenario && <div className="change-scenario"><div><Lightbulb size={15} /> Change scenario</div><p>{problem.changeScenario}</p></div>}
      <div className="brief-footer"><ShieldCheck size={16} /><span>Your design is evidence. The platform should evaluate reasoning, not just match a reference class list.</span></div></aside>
      <section className="design-form-column"><div className="panel submission-panel"><div className="panel-heading submission-title"><div><div className="eyebrow">YOUR SUBMISSION</div><h2>How would you present your design?</h2><p>Choose an input type. You can save a draft before submitting.</p></div><span className="autosave-chip"><span className="autosave-dot" /> Manual save</span></div>
        <div className="mode-grid">{Object.entries(MODE_INFO).map(([key, item]) => { const Icon = item.icon; return <button type="button" key={key} className={`mode-card ${mode === key ? 'mode-selected' : ''}`} onClick={() => setMode(key)}><span className="mode-icon"><Icon size={19} /></span><span className="mode-title">{item.label}</span><span className="mode-desc">{item.description}</span>{mode === key && <span className="mode-check"><Check size={13} /></span>}</button>; })}</div>
        <div className="format-note"><CircleHelp size={15} /><span>Choose what fits your explanation. Document and diagram uploads are treated as design evidence—not executable code. Combined mode lets you attach more than one kind of evidence.</span></div>

        {canShowText && <div className="text-evidence-block"><div className="subsection-heading"><div><h3>Design explanation</h3><p>Be specific about behaviour, state, ownership and why you chose this design.</p></div><span className="character-count">{textCount.toLocaleString()} chars</span></div><div className="fields-grid">{textFields.map(field => <Field key={field.key} field={field} value={sections[field.key]} onChange={updateSection} />)}</div></div>}

        {canShowDoc && <div className="upload-section"><div className="subsection-heading"><div><h3>Upload a document</h3><p>Add a written design note, exported document or supporting text.</p></div><Tag>Up to 20 MB each</Tag></div><input className="visually-hidden" ref={docInputRef} type="file" accept=".pdf,.doc,.docx,.txt,.md,.rtf,.odt" multiple onChange={e => { addFiles(e.target.files, 'DOCUMENT'); e.target.value = ''; }} /><div className={`upload-dropzone ${fileDropActive ? 'drop-active' : ''}`} onDragOver={e => { e.preventDefault(); setFileDropActive(true); }} onDragLeave={() => setFileDropActive(false)} onDrop={e => { e.preventDefault(); setFileDropActive(false); addFiles(e.dataTransfer.files, 'DOCUMENT'); }}><div className="upload-circle"><ArrowUpRight size={23} /></div><div><strong>Drop your document here</strong><p>PDF, DOCX, TXT, MD, RTF or ODT</p></div><Button variant="secondary" type="button" onClick={() => docInputRef.current?.click()} icon={ArrowUpRight}>Browse files</Button></div><AttachmentList files={files.filter(f => f.kind === 'DOCUMENT')} onRemove={removeFile} /></div>}

        {canShowDiagram && <div className="upload-section"><div className="subsection-heading"><div><h3>Upload a diagram</h3><p>Share a class diagram, sequence flow or architecture sketch from your preferred tool.</p></div><Tag>Up to 20 MB each</Tag></div><input className="visually-hidden" ref={diagramInputRef} type="file" accept=".png,.jpg,.jpeg,.webp,.svg,.pdf,.drawio,.xml" multiple onChange={e => { addFiles(e.target.files, 'DIAGRAM'); e.target.value = ''; }} /><div className={`upload-dropzone diagram-zone ${fileDropActive ? 'drop-active' : ''}`} onDragOver={e => { e.preventDefault(); setFileDropActive(true); }} onDragLeave={() => setFileDropActive(false)} onDrop={e => { e.preventDefault(); setFileDropActive(false); addFiles(e.dataTransfer.files, 'DIAGRAM'); }}><div className="upload-circle diagram-upload-circle"><GitBranch size={23} /></div><div><strong>Drop your diagram here</strong><p>PNG, JPG, WEBP, SVG, PDF, Draw.io or XML</p></div><Button variant="secondary" type="button" onClick={() => diagramInputRef.current?.click()} icon={ArrowUpRight}>Choose diagram</Button></div><AttachmentList files={files.filter(f => f.kind === 'DIAGRAM')} onRemove={removeFile} /></div>}

        {(mode !== 'TEXT') && <label className="field-block notes-field"><span className="field-label">Context for your attachment <span className="optional-label">Optional</span></span><span className="field-hint">Tell the reviewer what to focus on or how the document/diagram relates to your design.</span><textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)} placeholder="For example: This diagram shows composition and the payment-failure flow…" /></label>}
        <div className="submission-footer"><div className="save-status"><span className="save-status-icon"><ShieldCheck size={16} /></span><span><strong>Your work is kept as a draft until you submit.</strong><small>{API_ENABLED ? 'Saved to the backend when you choose Save draft.' : 'Demo mode saves text and attachment names in this browser.'}</small></span></div><div className="submission-actions"><Button type="button" variant="secondary" icon={busy ? RotateCcw : Save} onClick={onSave} disabled={busy}>{busy ? 'Working…' : 'Save draft'}</Button><Button type="button" icon={busy ? RotateCcw : Send} onClick={onSubmit} disabled={busy}>{busy ? 'Submitting…' : 'Submit for review'} <ArrowRight size={15} /></Button></div></div>
      </div><div className="workspace-footnote"><ShieldCheck size={14} /><span>Be honest about assumptions. There can be multiple valid LLD solutions—the explanation matters as much as the class names.</span></div></section>
    </div>
  </div>;
}

function AttachmentList({ files, onRemove }) {
  if (!files.length) return null;
  return <div className="attachment-list">{files.map(file => { const Icon = file.kind === 'DIAGRAM' ? GitBranch : FileText; return <div className="attachment-row" key={file.id || file.name}><div className="attachment-icon"><Icon size={18} /></div><div className="attachment-info"><strong>{file.name}</strong><span>{formatSize(file.size || 0)} · {file.uploaded ? 'Uploaded' : 'Ready to attach'}</span></div><Tag color={file.uploaded ? 'green' : 'blue'}>{file.uploaded ? 'Saved' : 'Added'}</Tag><button className="icon-button attachment-remove" type="button" onClick={() => onRemove(file.id)} aria-label={`Remove ${file.name}`}><X size={16} /></button></div>; })}</div>;
}

function FeedbackView({ attempt, serverAttempt, feedback, busy, statusMessage, onRefresh, onRetry, onNew, onEdit }) {
  if (!attempt && !serverAttempt) return <div className="page-content"><div className="empty-state"><MessageSquareText size={28} /><h3>No review selected</h3><p>Submit a design to view its status and feedback here.</p><Button onClick={onNew}>Choose a problem</Button></div></div>;
  const status = String(statusMessage || attempt?.status || serverAttempt?.status || (feedback ? 'COMPLETED' : 'SUBMITTED')).toUpperCase();
  const provider = feedback?.provider || feedback?.activeEvaluator || '';
  const isReadinessOnly = feedback?.assessmentType === 'READINESS_ONLY' || (provider && String(provider).toUpperCase() === 'RULES' && !feedback?.overallScore);
  const criteria = feedback?.criteria || feedback?.scores || [];
  const score = typeof feedback?.overallScore === 'number' ? feedback.overallScore : (typeof feedback?.score === 'number' ? feedback.score : null);
  return <div className="page-content feedback-page fade-in"><div className="page-title-row"><div><div className="eyebrow">DESIGN REVIEW</div><h1>Submission review</h1><p>Track evaluation progress and review feedback for your attempt.</p></div><Button variant="secondary" icon={RefreshCw} onClick={onRefresh} disabled={busy}>{busy ? 'Checking…' : 'Refresh status'}</Button></div>
    <div className="review-summary panel"><div className={`review-status-icon ${status === 'COMPLETED' ? 'review-complete' : status === 'FAILED' ? 'review-failed' : ''}`}>{status === 'COMPLETED' ? <CheckCircle2 size={24} /> : status === 'FAILED' ? <X size={24} /> : <RotateCcw size={24} />}</div><div className="review-summary-main"><div className="review-title-row"><h2>{attempt?.problemTitle || serverAttempt?.problem?.title || 'LLD submission'}</h2><StatusPill status={status} /></div><p>{feedback?.summary || (status === 'COMPLETED' ? 'Evaluation is marked complete. Load feedback or inspect the evaluator status below.' : status === 'FAILED' ? 'Evaluation could not complete. Check failure details, then retry if supported.' : 'Your submission has been accepted. Evaluation may still be running.')}</p><div className="review-meta"><span><FileText size={14} /> {MODE_INFO[attempt?.format]?.short || attempt?.format || 'Text'} submission</span><span><Clock3 size={14} /> Submitted {formatDate(attempt?.updatedAt || serverAttempt?.updatedAt)}</span>{attempt?.id && <span className="attempt-id">ID · {String(attempt.id).slice(0, 13)}…</span>}</div></div>{score !== null && <div className="overall-score"><span>Overall score</span><strong>{score}<small>/100</small></strong></div>}</div>
    {isReadinessOnly && <div className="notice-card notice-warning"><div className="notice-icon"><CircleHelp size={18} /></div><div><strong>This is readiness feedback, not AI design evaluation.</strong><p>The current evaluator checks basic completeness. It has not judged whether your class design is correct. Configure the backend LLM evaluator to receive evidence-based design scores.</p></div></div>}
    {!API_ENABLED && <div className="notice-card notice-info"><div className="notice-icon"><Sparkles size={18} /></div><div><strong>Local demo mode — no AI feedback was generated.</strong><p>This frontend can save a local demo attempt, but evaluation requires the Spring Boot API. No score is fabricated in demo mode.</p></div></div>}
    {feedback && !isReadinessOnly && <><div className="feedback-heading"><div><h2>What the evaluator found</h2><p>Review each criterion and use the suggestions to improve your next attempt.</p></div><Tag color="green">{provider || 'Evaluator'} feedback</Tag></div>{criteria.length ? <div className="criteria-list">{criteria.map((item, idx) => { const itemScore = item.score ?? item.value ?? null; const numberScore = typeof itemScore === 'number' ? itemScore : null; const label = item.label || item.criterionId || item.name || `Criterion ${idx + 1}`; const evidence = item.evidence || []; return <div className="criterion-card panel" key={item.criterionId || item.id || idx}><div className="criterion-top"><div className="criterion-number">{String(idx + 1).padStart(2, '0')}</div><div className="criterion-main"><h3>{label.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase())}</h3><p>{item.concern || item.reason || item.feedback || 'No concern was provided for this criterion.'}</p></div><div className="criterion-score">{numberScore !== null ? <><strong>{numberScore}</strong><small>{numberScore <= 4 ? '/4' : '/100'}</small></> : <Tag>Not scored</Tag>}</div></div>{evidence.length > 0 && <div className="evidence-list"><strong>Evidence</strong>{evidence.map((entry, i) => <blockquote key={i}>{entry.quote || entry.text || entry}</blockquote>)}</div>}{(item.suggestion || item.improvement || item.nextStep) && <div className="suggestion-row"><Lightbulb size={16} /><div><strong>How to improve</strong><p>{item.suggestion || item.improvement || item.nextStep}</p></div></div>}</div>; })}</div> : <div className="notice-card notice-info"><div className="notice-icon"><MessageSquareText size={18} /></div><div><strong>Feedback returned, but no criterion list was found.</strong><p>Check the backend feedback response mapping in src/services/api.js.</p></div></div>}</>}
    {feedback?.nextSteps?.length > 0 && <div className="panel next-steps"><h3>Suggested next steps</h3>{feedback.nextSteps.map((step, i) => <div key={i} className="next-step"><span>{i + 1}</span><p>{step}</p></div>)}</div>}
    {status === 'FAILED' && <div className="notice-card notice-danger"><div className="notice-icon"><X size={18} /></div><div><strong>Evaluation failed</strong><p>{serverAttempt?.failure?.detail || serverAttempt?.failure?.message || 'The backend did not provide a detailed failure message. Inspect the API response or server log.'}</p></div></div>}
    {!feedback && status !== 'FAILED' && API_ENABLED && <div className="pending-card panel"><div className="pending-animation"><RotateCcw size={25} /></div><div><h3>Waiting for evaluator feedback</h3><p>Submission is saved. Click refresh status to check whether the evaluator has finished.</p></div><Button variant="secondary" onClick={onRefresh} disabled={busy} icon={RefreshCw}>Check again</Button></div>}
    <div className="feedback-bottom-actions">{status === 'FAILED' && <Button variant="secondary" onClick={onRetry} icon={RefreshCw} disabled={busy}>Retry evaluation</Button>}<Button onClick={onNew} icon={Plus}>Practice another problem</Button>{String(status).toUpperCase() === 'DRAFT' && <Button variant="secondary" onClick={onEdit}>Continue draft</Button>}</div>
  </div>;
}

function HistoryView({ attempts, busy, onOpen, onNew }) {
  const [filter, setFilter] = useState('All');
  const filtered = attempts.filter(a => filter === 'All' || String(a.status).toUpperCase() === filter.toUpperCase()).sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
  return <div className="page-content history-page fade-in"><div className="page-title-row"><div><div className="eyebrow">YOUR PRACTICE LOG</div><h1>My attempts</h1><p>Pick up a draft or revisit a previous submission.</p></div><Button onClick={onNew} icon={Plus}>New attempt</Button></div><div className="history-toolbar"><div className="history-total"><History size={17} /><strong>{attempts.length}</strong> saved attempts</div><div className="history-filter"><span>Show</span><select value={filter} onChange={e => setFilter(e.target.value)}><option>All</option><option>DRAFT</option><option>SUBMITTED</option><option>EVALUATING</option><option>COMPLETED</option><option>FAILED</option></select><ChevronDown size={14} /></div></div>
    {filtered.length ? <div className="history-table-wrap panel"><div className="history-table-head"><span>PROBLEM</span><span>INPUT FORMAT</span><span>LAST UPDATED</span><span>STATUS</span><span /></div>{filtered.map(attempt => <button className="history-table-row" key={attempt.id} onClick={() => onOpen(attempt)}><div className="history-problem"><div className="history-problem-icon"><GitBranch size={17} /></div><div><strong>{attempt.problemTitle || attempt.problemId || 'LLD attempt'}</strong><small>ID: {String(attempt.id).slice(0, 12)}…</small></div></div><span className="history-format">{MODE_INFO[attempt.format]?.short || attempt.format || 'Text'}</span><span className="history-date">{formatDate(attempt.updatedAt)}</span><StatusPill status={attempt.status} /><ChevronRight size={17} className="history-arrow" /></button>)}</div> : <div className="empty-state panel"><History size={30} /><h3>{attempts.length ? 'No attempts in this status' : 'Your history is empty'}</h3><p>{attempts.length ? 'Choose another filter to see your other work.' : 'Your saved drafts and submitted designs will show up here.'}</p><Button onClick={onNew} icon={Plus}>Start your first attempt</Button></div>}
  </div>;
}

function StatusPill({ status = 'DRAFT' }) {
  const normalized = String(status).toUpperCase();
  const classes = normalized === 'COMPLETED' ? 'status-completed' : normalized === 'FAILED' ? 'status-failed' : normalized === 'EVALUATING' ? 'status-evaluating' : normalized === 'SUBMITTED' ? 'status-submitted' : 'status-draft';
  const label = normalized === 'COMPLETED' ? 'Completed' : normalized === 'FAILED' ? 'Failed' : normalized === 'EVALUATING' ? 'Evaluating' : normalized === 'SUBMITTED' ? 'Submitted' : 'Draft';
  return <span className={`status-pill ${classes}`}><span />{label}</span>;
}
function EmptySmall({ icon: Icon, title, body, action, onAction }) { return <div className="empty-small"><span><Icon size={20} /></span><strong>{title}</strong><p>{body}</p><button onClick={onAction}>{action} <ArrowRight size={13} /></button></div>; }

export default App;
