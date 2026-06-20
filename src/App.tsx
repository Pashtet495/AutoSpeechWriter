import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Settings, Mic, Square, FolderOpen, X, Minus, VolumeX, Copy, Check, Terminal, ClipboardCheck, Trash2, ClipboardPaste, Info, ChevronDown } from 'lucide-react';
import { t, LOCALES, Locale } from './i18n';

// --- Hotkey helpers ---------------------------------------------------------
// Convert an Electron accelerator string (e.g. "CommandOrControl+Shift+R")
// into a human-readable display string (e.g. "Ctrl + Shift + R").
function acceleratorToDisplay(acc: string): string {
  if (!acc) return '';
  return acc.replace(/CommandOrControl/g, 'Ctrl').replace(/\+/g, ' + ');
}

// Convert a browser KeyboardEvent into an Electron accelerator string.
// Returns:
//   '__cancel__'  — Esc pressed (cancel capture)
//   '__clear__'   — Backspace with no other key (clear hotkey)
//   ''            — modifier-only press or unsupported key (ignore)
//   "<accel>"     — a valid accelerator like "CommandOrControl+Shift+R"
function eventToAccelerator(e: React.KeyboardEvent): string {
  const mods: string[] = [];
  if (e.ctrlKey) mods.push('CommandOrControl');
  if (e.altKey) mods.push('Alt');
  if (e.shiftKey) mods.push('Shift');
  if (e.metaKey) mods.push('Super');

  const code = e.code;
  if (code === 'Escape') return '__cancel__';
  if (code === 'Backspace' && mods.length === 0) return '__clear__';

  let key = '';
  if (code.startsWith('Key')) key = code.slice(3);
  else if (code.startsWith('Digit')) key = code.slice(5);
  else if (/^F([1-9]|1[0-9]|2[0-4])$/.test(code)) key = code;
  else if (code === 'Space') key = 'Space';
  else if (code === 'Enter') key = 'Return';
  else if (code === 'Tab') key = 'Tab';
  else if (code === 'Insert') key = 'Insert';
  else if (code === 'Home') key = 'Home';
  else if (code === 'End') key = 'End';
  else if (code === 'PageUp') key = 'PageUp';
  else if (code === 'PageDown') key = 'PageDown';
  else if (code.startsWith('Arrow')) key = code.slice(5); // Up/Down/Left/Right
  else return ''; // ignore other keys

  if (!key) return '';
  return [...mods, key].join('+');
}

// --- Info popover (the "i" icon next to a setting) -------------------------
// Renders the popover through a portal to document.body and measures the icon
// position on open, centering the popover on the icon and clamping it to the
// viewport so it never overflows the window (the old absolute-positioned
// version "fell out" to the right when the icon sat near the right edge).
// The portal also escapes the modal's backdrop-filter containing block, which
// would otherwise break fixed positioning.
function InfoButton({ locale, k }: { locale: Locale; k: string }) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  const POPW = 320; // popover width (w-80)

  useEffect(() => {
    if (!open) { setPos(null); return; }
    const measure = () => {
      if (!btnRef.current) return;
      const r = btnRef.current.getBoundingClientRect();
      const margin = 8;
      // Center horizontally on the icon, then clamp to viewport bounds.
      let left = r.left + r.width / 2 - POPW / 2;
      left = Math.max(margin, Math.min(left, window.innerWidth - POPW - margin));
      // Place below the icon; if not enough room, place above.
      const top = r.bottom + 6 + 120 < window.innerHeight ? r.bottom + 6 : Math.max(margin, r.top - 6 - 200);
      setPos({ left, top });
    };
    measure();
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [open]);

  // Close on outside click or Escape. No full-screen backdrop — the user can
  // still interact with the rest of the settings modal while reading help.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const tgt = e.target as Node;
      if (btnRef.current?.contains(tgt)) return;
      if (popRef.current?.contains(tgt)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <span className="inline-flex align-middle">
      <button
        ref={btnRef}
        type="button"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen((o) => !o); }}
        className="text-zinc-500 hover:text-zinc-200 transition p-0.5"
        aria-label={t(locale, k + '.title')}
      >
        <Info size={13} />
      </button>
      {open && pos && createPortal(
        <div
          ref={popRef}
          style={{ position: 'fixed', left: pos.left, top: pos.top, width: POPW }}
          className="z-[70] bg-zinc-950 border border-zinc-700 rounded-lg p-3 shadow-2xl text-xs text-zinc-300 leading-relaxed"
        >
          <div className="font-semibold text-zinc-100 mb-1.5">{t(locale, k + '.title')}</div>
          <div className="whitespace-pre-wrap text-zinc-400">{t(locale, k + '.body')}</div>
          <button
            onClick={() => setOpen(false)}
            className="absolute top-1.5 right-1.5 text-zinc-500 hover:text-white"
            aria-label="Close"
          >
            <X size={12} />
          </button>
        </div>,
        document.body
      )}
    </span>
  );
}

// --- External link (opens in the user's default browser via main) ----------
function ExtLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      onClick={(e) => { e.preventDefault(); window.electron.openExternal(href); }}
      className="text-emerald-400 hover:text-emerald-300 underline underline-offset-2 cursor-pointer"
      target="_blank"
      rel="noreferrer"
    >
      {children}
    </a>
  );
}

export default function App() {
  const [settings, setSettings] = useState<any>({});
  const [showSettings, setShowSettings] = useState(false);
  const [finals, setFinals] = useState<string[]>([]);
  const [partial, setPartial] = useState<string>('');
  const [isRecording, setIsRecording] = useState(false);
  const [isSilence, setIsSilence] = useState(false);
  const [copied, setCopied] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [showLogs, setShowLogs] = useState(false);
  const [toast, setToast] = useState<{ message: string; preview: string } | null>(null);
  // uiAutoPaste is INDEPENDENT of settings.autoPaste. It's the "interface
  // mode" toggle controlled by the footer button.
  const [uiAutoPaste, setUiAutoPaste] = useState(false);
  const [capturingHotkey, setCapturingHotkey] = useState(false);
  const [showLicense, setShowLicense] = useState(false);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const transcriptAreaRef = useRef<HTMLDivElement>(null);
  const logsAreaRef = useRef<HTMLDivElement>(null);

  // Current interface locale (falls back to English if unset).
  const locale: Locale = (settings.locale as Locale) || 'en';
  const tr = (k: string, p?: Record<string, string | number>) => t(locale, k, p);

  useEffect(() => {
    const cleanups: Array<() => void> = [];

    window.electron.getSettings().then(setSettings);

    cleanups.push(window.electron.onLogUpdate((text: string) => {
      setLogs((prev) => [...prev, text]);
      setTimeout(() => {
        if (logsAreaRef.current) logsAreaRef.current.scrollTop = logsAreaRef.current.scrollHeight;
      }, 10);
    }));

    cleanups.push(window.electron.onTranscriptionUpdate((text: string, isFinal: boolean) => {
      if (isFinal) {
        setFinals((prev) => [...prev, text]);
        setPartial('');
      } else {
        setPartial(text);
      }
      setTimeout(() => {
        if (transcriptAreaRef.current) transcriptAreaRef.current.scrollTop = transcriptAreaRef.current.scrollHeight;
      }, 50);
    }));

    cleanups.push(window.electron.onSilenceState((silence: boolean) => setIsSilence(silence)));

    cleanups.push(window.electron.onStateChange((state: boolean) => {
      setIsRecording(state);
      if (state) { setFinals([]); setPartial(''); }
    }));

    cleanups.push(window.electron.onToast((data: { message: string; preview: string }) => {
      setToast(data);
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      toastTimerRef.current = setTimeout(() => setToast(null), 2500);
    }));

    cleanups.push(window.electron.onTranscriptionClear(() => {
      setFinals([]);
      setPartial('');
    }));

    cleanups.push(window.electron.onSettingsUpdated((newSettings: any) => {
      setSettings(newSettings);
    }));

    return () => { cleanups.forEach((fn) => fn()); };
  }, []);

  const handleSaveSettings = () => {
    window.electron.saveSettings(settings);
    setShowSettings(false);
  };

  const copyToClipboard = () => {
    const fullText = finals.join(' ') + (partial ? ' ' + partial : '');
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const clearTranscript = () => {
    window.electron.clearTranscript();
  };

  const toggleAutoPaste = () => {
    const next = !uiAutoPaste;
    setUiAutoPaste(next);
    window.electron.setUiAutoPaste(next);
  };

  // Hotkey capture: when the field is focused, capture the next key combo.
  const onHotkeyKeyDown = (e: React.KeyboardEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const acc = eventToAccelerator(e);
    if (acc === '__cancel__' || acc === '') {
      // Esc (or modifier-only) — stop capturing without change.
      setCapturingHotkey(false);
      (e.target as HTMLElement).blur();
      return;
    }
    if (acc === '__clear__') {
      setSettings({ ...settings, hotkey: '' });
      setCapturingHotkey(false);
      (e.target as HTMLElement).blur();
      return;
    }
    setSettings({ ...settings, hotkey: acc });
    setCapturingHotkey(false);
    (e.target as HTMLElement).blur();
  };

  return (
    <div className="flex flex-col h-screen text-zinc-300 font-sans">
      {/* Frameless Header */}
      <header className="drag-region bg-zinc-950 border-b border-zinc-900 h-10 flex items-center justify-between px-3 shrink-0">
        <div className="flex items-center space-x-2 text-sm font-semibold tracking-wide text-zinc-100">
          <div className={`w-2.5 h-2.5 rounded-full ${isRecording ? 'bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.6)]' : 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]'}`} />
          <span>{tr('header.title')}</span>
        </div>
        <div className="no-drag flex items-center space-x-1">
          <button onClick={() => window.electron.minimizeApp()} className="p-1 hover:bg-zinc-800 rounded transition text-zinc-400">
            <Minus size={16} />
          </button>
          <button onClick={() => window.electron.closeApp()} className="p-1 hover:bg-red-500/20 hover:text-red-400 rounded transition text-zinc-400">
            <X size={16} />
          </button>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="flex-1 flex flex-col min-h-0 bg-zinc-900/50 p-4 relative">
        <div className="absolute top-6 right-6 z-10 flex items-center space-x-2 pointer-events-none transition-opacity duration-300">
          {isSilence && (
            <div className="flex items-center space-x-2 bg-zinc-950/80 border border-zinc-800 px-3 py-1.5 rounded-full text-xs text-zinc-400 backdrop-blur-sm">
              <VolumeX size={14} className="text-zinc-500" />
              <span>{tr('transcript.silence')}</span>
            </div>
          )}
        </div>

        <div
          ref={transcriptAreaRef}
          className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl p-4 overflow-y-auto text-sm leading-relaxed"
        >
          {finals.length === 0 && !partial && <span className="text-zinc-600 italic">{tr('transcript.placeholder')}</span>}
          {finals.map((t, i) => (
            <span key={i} className="text-zinc-200">{t} </span>
          ))}
          {partial && (
            <span className="text-zinc-500">{partial}</span>
          )}
        </div>
      </main>

      {/* In-app toast */}
      {toast && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-50 transition-all duration-300">
          <div className="flex items-center space-x-3 bg-zinc-800 border border-emerald-500/40 rounded-xl px-4 py-3 shadow-2xl shadow-emerald-500/10 max-w-md">
            <div className="shrink-0 w-8 h-8 rounded-full bg-emerald-500/15 flex items-center justify-center">
              <ClipboardCheck size={18} className="text-emerald-400" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-zinc-100">{toast.message}</div>
              {toast.preview && (
                <div className="text-xs text-zinc-400 truncate mt-0.5">{toast.preview}</div>
              )}
            </div>
            <button onClick={() => setToast(null)} className="shrink-0 text-zinc-500 hover:text-zinc-300 transition">
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Footer Controls */}
      <footer className="shrink-0 p-4 bg-zinc-950 border-t border-zinc-900 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => window.electron.transcribeFile()}
            className="flex items-center space-x-2 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-sm transition"
          >
            <FolderOpen size={16} />
            <span>{tr('btn.selectFile')}</span>
          </button>

          {!isRecording ? (
            <button
              onClick={() => window.electron.startMic()}
              disabled={isRecording}
              className="flex items-center space-x-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-500 rounded-lg text-sm transition font-medium"
            >
              <Mic size={16} />
              <span>{tr('btn.record')}</span>
            </button>
          ) : (
            <button
              onClick={() => window.electron.stopMic()}
              className="flex items-center space-x-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 rounded-lg text-sm transition shadow-[0_0_15px_rgba(239,68,68,0.2)]"
            >
              <Square size={16} className="text-red-400" />
              <span>{tr('btn.stop')}</span>
            </button>
          )}
        </div>

        <div className="flex items-center space-x-3">
          {(finals.length > 0 || partial) && (
            <button
              onClick={clearTranscript}
              className="p-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-zinc-400 hover:text-red-400 transition"
              title={tr('btn.clear')}
            >
              <Trash2 size={16} />
            </button>
          )}
          {(finals.length > 0 || partial) && (
            <button
              onClick={copyToClipboard}
              className="p-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-zinc-400 transition"
              title={tr('btn.copy')}
            >
              {copied ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
            </button>
          )}
          {/* Interface-mode auto-paste toggle (independent of the settings/tray
              autoPaste). When active, each finalized phrase is pasted directly
              into the focused application via Ctrl+V. The window is NOT hidden. */}
          <button
            onClick={toggleAutoPaste}
            className={`flex items-center space-x-2 px-3 py-2 border rounded-lg text-xs font-medium transition ${
              uiAutoPaste
                ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400'
                : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800'
            }`}
            title={uiAutoPaste ? tr('autopaste.on.tip') : tr('autopaste.off.tip')}
          >
            <ClipboardPaste size={16} />
            <span className="hidden sm:inline">{tr('btn.autoPaste')}</span>
          </button>
          <button
            onClick={() => setShowLogs(!showLogs)}
            className={`p-2 bg-zinc-900 border border-zinc-800 rounded-lg transition ${showLogs ? 'text-zinc-100 bg-zinc-800' : 'text-zinc-400 hover:bg-zinc-800'}`}
            title={tr('btn.logs')}
          >
            <Terminal size={16} />
          </button>
          <button
            onClick={() => setShowSettings(true)}
            className="p-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-zinc-400 transition"
            title={tr('btn.settings')}
          >
            <Settings size={16} />
          </button>
        </div>
      </footer>

      {/* Logs Modal */}
      {showLogs && (
        <div className="absolute inset-0 bg-black/50 z-40 p-4 pt-12 pb-20 pointer-events-none flex justify-end flex-col">
          <div className="bg-zinc-950 border border-zinc-800 rounded-xl h-64 overflow-hidden flex flex-col shadow-2xl pointer-events-auto">
            <div className="px-4 py-2 border-b border-zinc-800 flex items-center justify-between shrink-0 bg-zinc-900/50">
              <span className="text-xs font-mono text-zinc-400 flex items-center space-x-2">
                <Terminal size={12} />
                <span>{tr('logs.title')}</span>
              </span>
              <button onClick={() => setShowLogs(false)} className="text-zinc-500 hover:text-white p-1">
                <X size={12} />
              </button>
            </div>
            <div
              ref={logsAreaRef}
              className="flex-1 overflow-y-auto p-3 text-[11px] font-mono leading-relaxed bg-black/50 overflow-x-hidden whitespace-pre-wrap word-break"
            >
              {logs.map((log, i) => (
                <div key={i} className={`${log.includes('ERROR') || log.includes('error') ? 'text-red-400' : 'text-zinc-500'}`}>
                  {log}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg overflow-hidden flex flex-col shadow-2xl">
            <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
              <h2 className="text-sm font-bold text-white">{tr('settings.title')}</h2>
              <button onClick={() => setShowSettings(false)} className="text-zinc-500 hover:text-white">
                <X size={16} />
              </button>
            </div>

            <div className="p-5 overflow-y-auto max-h-[65vh] space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-400 uppercase">{tr('settings.backend')}</label>
                  <select
                    value={settings.backend}
                    onChange={e => setSettings({ ...settings, backend: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-zinc-200 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="cpu">CPU (crispasr-windows-x86_64-cpu)</option>
                    <option value="vulkan">GPU Vulkan (crispasr-windows-x86_64-vulkan)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-400 uppercase">{tr('settings.inputDevice')}</label>
                  <select
                    value={settings.micDevice}
                    onChange={e => setSettings({ ...settings, micDevice: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-zinc-200 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="default">{tr('mic.default')}</option>
                    <option value="1">{tr('mic.index', { n: 1 })}</option>
                    <option value="2">{tr('mic.index', { n: 2 })}</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-400 uppercase">{tr('settings.cpuThreads')}</label>
                  <input
                    type="number"
                    value={settings.threads}
                    onChange={e => setSettings({ ...settings, threads: parseInt(e.target.value) || 4 })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-zinc-200 focus:outline-none"
                    min="1" max="64"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-400 uppercase">{tr('settings.gpuId')}</label>
                  <input
                    type="number"
                    value={settings.gpuId}
                    onChange={e => setSettings({ ...settings, gpuId: parseInt(e.target.value) || 0 })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-zinc-200 focus:outline-none"
                    min="0"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-400 uppercase">{tr('settings.language')}</label>
                  <select
                    value={settings.locale || 'en'}
                    onChange={e => {
                      // Apply interface language immediately (persists + rebuilds tray menu).
                      const next = { ...settings, locale: e.target.value };
                      setSettings(next);
                      window.electron.saveSettings(next);
                    }}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-zinc-200 focus:outline-none focus:border-emerald-500"
                  >
                    {LOCALES.map(l => (
                      <option key={l.code} value={l.code}>{l.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-400 uppercase">{tr('settings.recognitionLanguage')}</label>
                  <input
                    type="text"
                    value={settings.language}
                    onChange={e => setSettings({ ...settings, language: e.target.value })}
                    placeholder="ru / en / auto"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-zinc-200 focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5 col-span-2">
                  <label className="text-xs font-semibold text-zinc-400 uppercase flex items-center gap-1.5">
                    {tr('settings.hotkey')}
                  </label>
                  <div
                    tabIndex={0}
                    onFocus={() => setCapturingHotkey(true)}
                    onBlur={() => setCapturingHotkey(false)}
                    onKeyDown={onHotkeyKeyDown}
                    className={`w-full bg-zinc-950 border rounded-lg p-2 text-zinc-200 focus:outline-none cursor-pointer select-none ${
                      capturingHotkey ? 'border-emerald-500 ring-1 ring-emerald-500/40' : 'border-zinc-800'
                    }`}
                  >
                    {capturingHotkey
                      ? <span className="text-emerald-400">…</span>
                      : (settings.hotkey
                          ? acceleratorToDisplay(settings.hotkey)
                          : <span className="text-zinc-600">{tr('settings.hotkeyHint')}</span>)}
                  </div>
                  <p className="text-[11px] text-zinc-500 leading-relaxed">{tr('settings.hotkeyHint')}</p>
                </div>
              </div>

              <div className="space-y-1.5 pt-2">
                <label className="text-xs font-semibold text-zinc-400 uppercase flex items-center gap-1.5">
                  {tr('settings.performanceMode')}
                  <InfoButton locale={locale} k="help.performance" />
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setSettings({ ...settings, mode: 'lowest-latency' })}
                    className={`py-2 rounded-lg border text-xs font-medium transition ${settings.mode === 'lowest-latency' ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400' : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:bg-zinc-900'}`}
                  >
                    {tr('settings.modeLowest')}
                  </button>
                  <button
                    onClick={() => setSettings({ ...settings, mode: 'best-quality' })}
                    className={`py-2 rounded-lg border text-xs font-medium transition ${settings.mode === 'best-quality' ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400' : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:bg-zinc-900'}`}
                  >
                    {tr('settings.modeBest')}
                  </button>
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <input
                  type="checkbox"
                  id="autoStart"
                  checked={settings.autoStart}
                  onChange={e => setSettings({ ...settings, autoStart: e.target.checked })}
                />
                <label htmlFor="autoStart" className="text-xs text-zinc-300">{tr('settings.autoStart')}</label>
              </div>

              <div className="space-y-1.5 pt-2 border-t border-zinc-800/50">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="autoPaste"
                    checked={settings.autoPaste}
                    onChange={e => setSettings({ ...settings, autoPaste: e.target.checked })}
                  />
                  <label htmlFor="autoPaste" className="text-xs text-zinc-300 font-medium flex items-center gap-1.5">
                    {tr('settings.autoPasteHotkey')}
                    <InfoButton locale={locale} k="help.autopaste" />
                  </label>
                </div>
              </div>

              {/* License & Components — collapsible disclosure */}
              <div className="pt-3 border-t border-zinc-800/50">
                <button
                  type="button"
                  onClick={() => setShowLicense((s) => !s)}
                  className="w-full flex items-center justify-between text-xs font-semibold text-zinc-400 uppercase hover:text-zinc-200 transition py-1"
                  aria-expanded={showLicense}
                >
                  <span>{tr('license.title')}</span>
                  <ChevronDown size={14} className={`transition-transform ${showLicense ? 'rotate-180' : ''}`} />
                </button>
                {showLicense && (
                  <div className="space-y-1.5 pt-1.5">
                    <p className="text-[11px] text-zinc-500 leading-relaxed">{tr('license.app')}</p>
                    <p className="text-[11px] text-zinc-500 leading-relaxed">
                      {tr('license.backend')} <ExtLink href="https://github.com/CrispStrobe/CrispASR">CrispASR</ExtLink>. {tr('license.backendLicense')}
                    </p>
                    <p className="text-[11px] text-zinc-500 leading-relaxed">
                      {tr('license.model')} <ExtLink href="https://huggingface.co/nvidia/parakeet-tdt-0.6b-v3">parakeet-tdt-0.6b-v3</ExtLink>.
                    </p>
                    <p className="text-[11px] text-zinc-500 leading-relaxed">
                      {tr('license.modelTerms')} <ExtLink href="https://creativecommons.org/licenses/by/4.0/legalcode.en">CC-BY-4.0</ExtLink>
                    </p>
                    <p className="text-[11px] text-zinc-500 leading-relaxed">
                      {tr('license.quantModel')} <ExtLink href="https://huggingface.co/cstr/parakeet-tdt-0.6b-v3-GGUF">parakeet-tdt-0.6b-v3-q4_k.gguf</ExtLink>
                    </p>
                  </div>
                )}
              </div>

            </div>
            <div className="px-5 py-4 border-t border-zinc-800 bg-zinc-950 flex justify-end space-x-2">
              <button onClick={() => setShowSettings(false)} className="px-4 py-2 rounded-lg text-sm bg-zinc-800 hover:bg-zinc-700 text-white transition">{tr('settings.cancel')}</button>
              <button onClick={handleSaveSettings} className="px-4 py-2 rounded-lg text-sm bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold transition">{tr('settings.apply')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
