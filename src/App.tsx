import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Settings, Mic, Square, FolderOpen, X, Minus, VolumeX, Copy, Check, Terminal, ClipboardCheck, Trash2, ClipboardPaste, Info, ChevronDown, Save, Loader2 } from 'lucide-react';
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

// --- Audio mixer (Web Audio API) -------------------------------------------
// An audio source entry in the mixer config. Persisted in settings.audioSources.
export type AudioSource = {
  type: 'mic' | 'system';
  deviceId: string;   // 'default' | concrete device id | 'system'
  label: string;
  volume: number;     // 0..1
  enabled: boolean;
};

type MixerGraph = {
  ctx: AudioContext;
  mixDest: MediaStreamAudioDestinationNode;
  analysers: Map<string, AnalyserNode>;
  gains: Map<string, GainNode>;
  streams: MediaStream[];
  cleanup: () => void;
};

// Build a Web Audio graph that captures EVERY source (for live level metering
// on all devices, so the user can tap a mic and identify it), applies a per-
// source GainNode (volume — 0 when disabled, the configured volume when
// enabled), taps an AnalyserNode for the meter, and sums enabled sources into
// a single MediaStreamAudioDestinationNode for recording.
//
// The graph is built ONCE (when the modal opens / devices are enumerated).
// Checkbox toggles and volume changes update gain values directly via the
// returned `gains` map — no graph rebuild, no stream re-acquisition.
async function buildMixerGraph(sources: AudioSource[]): Promise<MixerGraph> {
  const ctx = new AudioContext();
  const mixDest = ctx.createMediaStreamDestination();
  const analysers = new Map<string, AnalyserNode>();
  const gains = new Map<string, GainNode>();
  const streams: MediaStream[] = [];
  let systemSourceId: string | undefined;

  for (const s of sources) {
    try {
      let stream: MediaStream;
      if (s.type === 'system') {
        if (!systemSourceId) {
          const ds = await window.electron.getDesktopSources();
          systemSourceId = ds[0]?.id;
        }
        if (!systemSourceId) continue;
        stream = await navigator.mediaDevices.getUserMedia({
          audio: { mandatory: { chromeMediaSource: 'desktop' } } as MediaTrackConstraints,
          video: { mandatory: { chromeMediaSource: 'desktop', chromeMediaSourceId: systemSourceId } } as MediaTrackConstraints
        });
        stream.getVideoTracks().forEach(t => t.stop());
      } else {
        const constraints: MediaStreamConstraints = {
          audio: s.deviceId === 'default' ? true : { deviceId: { exact: s.deviceId } }
        };
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      }
      streams.push(stream);
      const src = ctx.createMediaStreamSource(stream);
      const gain = ctx.createGain();
      // gain = volume if enabled, 0 if disabled — so disabled sources don't
      // contribute to the mix output but STILL get an analyser for metering.
      gain.gain.value = s.enabled ? s.volume : 0;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      // Analyser taps the RAW source (before gain) so the meter shows signal
      // even when the source is disabled — user can tap and identify.
      src.connect(analyser);
      src.connect(gain);
      gain.connect(mixDest);
      const key = s.type === 'system' ? 'system' : s.deviceId;
      analysers.set(key, analyser);
      gains.set(key, gain);
    } catch (e) {
      console.error('Mixer source failed:', s, e);
    }
  }
  return {
    ctx, mixDest, analysers, gains, streams,
    cleanup: () => {
      streams.forEach(st => st.getTracks().forEach(t => t.stop()));
      try { ctx.close(); } catch (_) {}
    }
  };
}

// ---------------------------------------------------------------------------
// Streaming mixer: builds a mixer graph at 16 kHz (crispasr's native rate) and
// adds an AudioWorklet that captures raw PCM from the mixed output. The worklet
// batches 128-sample blocks into ~200ms buffers and posts them to the main
// thread, which forwards them to the main process via IPC for segment
// processing. This gives progressive transcription during recording.
//
// AudioWorklet is used here for audio DATA CAPTURE (not indication — the level
// meters still use AnalyserNode per the spec). AudioWorklet is the standard,
// non-deprecated API for tapping raw audio data in Web Audio.
// ---------------------------------------------------------------------------
const PCM_WORKLET_CODE = `
class PCMCaptureProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this._buf = [];
    this._targetSize = 3200; // 200ms at 16kHz
  }
  process(inputs) {
    const inp = inputs[0];
    if (inp && inp[0]) {
      this._buf.push(new Float32Array(inp[0]));
      let total = 0;
      for (const c of this._buf) total += c.length;
      if (total >= this._targetSize) {
        const merged = new Float32Array(total);
        let off = 0;
        for (const c of this._buf) { merged.set(c, off); off += c.length; }
        this.port.postMessage(merged, [merged.buffer]);
        this._buf = [];
      }
    }
    return true;
  }
}
registerProcessor('pcm-capture-processor', PCMCaptureProcessor);
`;

type StreamingGraph = {
  workletNode: AudioWorkletNode;
  analyser: AnalyserNode;
  cleanup: () => void;
};

async function buildStreamingMixerGraph(sources: AudioSource[]): Promise<StreamingGraph> {
  // Create AudioContext at 16 kHz so PCM samples are already at crispasr's
  // expected sample rate — no resampling needed in main.
  const ctx = new AudioContext({ sampleRate: 16000 });
  const streams: MediaStream[] = [];
  let systemSourceId: string | undefined;

  // Load the AudioWorklet module from a Blob URL (avoids needing a separate file).
  const blob = new Blob([PCM_WORKLET_CODE], { type: 'application/javascript' });
  const url = URL.createObjectURL(blob);
  await ctx.audioWorklet.addModule(url);
  URL.revokeObjectURL(url);

  const workletNode = new AudioWorkletNode(ctx, 'pcm-capture-processor');
  // AnalyserNode taps the mixed signal (after gains, before worklet) for the
  // real-time level meter on the Stop button glow. Per spec, indication uses
  // AnalyserNode — not ScriptProcessorNode or AudioWorklet.
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 1024;

  for (const s of sources.filter(s => s.enabled)) {
    try {
      let stream: MediaStream;
      if (s.type === 'system') {
        if (!systemSourceId) {
          const ds = await window.electron.getDesktopSources();
          systemSourceId = ds[0]?.id;
        }
        if (!systemSourceId) continue;
        stream = await navigator.mediaDevices.getUserMedia({
          audio: { mandatory: { chromeMediaSource: 'desktop' } } as MediaTrackConstraints,
          video: { mandatory: { chromeMediaSource: 'desktop', chromeMediaSourceId: systemSourceId } } as MediaTrackConstraints
        });
        stream.getVideoTracks().forEach(t => t.stop());
      } else {
        const constraints: MediaStreamConstraints = {
          audio: s.deviceId === 'default' ? true : { deviceId: { exact: s.deviceId } }
        };
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      }
      streams.push(stream);
      const src = ctx.createMediaStreamSource(stream);
      const gain = ctx.createGain();
      gain.gain.value = s.volume;
      src.connect(gain);
      gain.connect(workletNode); // PCM capture
      gain.connect(analyser);    // level meter tap (mixed signal)
    } catch (e) {
      console.error('Streaming source failed:', s, e);
    }
  }

  // The worklet must be connected to ctx.destination (via silent gain) so its
  // process() is called by the audio scheduler.
  const silentGain = ctx.createGain();
  silentGain.gain.value = 0;
  workletNode.connect(silentGain);
  silentGain.connect(ctx.destination);

  return {
    workletNode,
    analyser,
    cleanup: () => {
      streams.forEach(st => st.getTracks().forEach(t => t.stop()));
      try { ctx.close(); } catch (_) {}
    }
  };
}


function readLevel(analyser: AnalyserNode): number {
  const buf = new Uint8Array(analyser.fftSize);
  analyser.getByteTimeDomainData(buf);
  let sum = 0;
  for (let i = 0; i < buf.length; i++) {
    const v = (buf[i] - 128) / 128;
    sum += v * v;
  }
  return Math.sqrt(sum / buf.length);
}

// --- Audio Devices modal ---------------------------------------------------
// Lists all input devices + a System Audio row. Each row has a checkbox
// (multi-select), a volume slider (GainNode), and a real-time level meter
// (AnalyserNode). The mixer graph is built ONCE when devices are enumerated —
// ALL device streams are acquired so every meter reacts live (tap a mic to
// identify it). Checkbox/volume changes update gain values directly via ref,
// no graph rebuild. z-[60] puts this above the Settings modal (z-50).
function AudioDevicesModal({ locale, initialSources, onClose, onApply }: {
  locale: Locale;
  initialSources: AudioSource[];
  onClose: () => void;
  onApply: (sources: AudioSource[]) => void;
}) {
  const tr = (k: string, p?: Record<string, string | number>) => t(locale, k, p);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [config, setConfig] = useState<AudioSource[]>(initialSources);
  const [levels, setLevels] = useState<Record<string, number>>({});
  const graphRef = useRef<MixerGraph | null>(null);
  const rafRef = useRef<number | null>(null);
  // Track whether the graph has been built for the current device list, so we
  // don't rebuild on every config change.
  const graphBuiltRef = useRef(false);

  const keyFor = (s: AudioSource) => s.type === 'system' ? 'system' : s.deviceId;

  // Enumerate devices on open. Requesting mic permission first ensures device
  // labels are populated.
  useEffect(() => {
    (async () => {
      try {
        const tmp = await navigator.mediaDevices.getUserMedia({ audio: true });
        tmp.getTracks().forEach(t => t.stop());
      } catch (_) {}
      const list = await navigator.mediaDevices.enumerateDevices();
      setDevices(list.filter(d => d.kind === 'audioinput'));
    })();
  }, []);

  // Build the visible rows: all enumerated mics + a System Audio row.
  // Merge with persisted config so enabled/volume survive device list changes.
  const rows: AudioSource[] = [];
  for (const d of devices) {
    const id = d.deviceId || 'default';
    const existing = config.find(c => c.type === 'mic' && c.deviceId === id);
    rows.push(existing || { type: 'mic', deviceId: id, label: d.label || (id === 'default' ? tr('mic.default') : id), volume: 1, enabled: false });
  }
  const sysExisting = config.find(c => c.type === 'system');
  rows.push(sysExisting || { type: 'system', deviceId: 'system', label: tr('audio.systemAudio'), volume: 1, enabled: false });

  // Build the mixer graph ONCE when devices are first populated. The graph
  // acquires ALL device streams (for metering) and creates gain nodes (0 for
  // disabled, volume for enabled). Subsequent checkbox/volume changes update
  // gain values directly via the gains map — no rebuild.
  useEffect(() => {
    if (devices.length === 0 || graphBuiltRef.current) return;
    graphBuiltRef.current = true;
    let cancelled = false;
    (async () => {
      // Build sources list from the CURRENT rows (all devices + system).
      // Use the latest config values (enabled/volume).
      const sources = rows.map(r => {
        const c = config.find(x => x.type === r.type && x.deviceId === r.deviceId);
        return c || r;
      });
      const g = await buildMixerGraph(sources);
      if (cancelled) { g.cleanup(); return; }
      graphRef.current = g;
      // Animation loop: read all analysers every frame, update levels state.
      const loop = () => {
        if (!graphRef.current) return;
        const next: Record<string, number> = {};
        for (const [key, an] of graphRef.current.analysers) {
          next[key] = readLevel(an);
        }
        setLevels(next);
        rafRef.current = requestAnimationFrame(loop);
      };
      loop();
    })();
    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      graphRef.current?.cleanup();
      graphRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [devices.length]);

  const toggle = (s: AudioSource) => {
    setConfig(prev => {
      const next = prev.map(x =>
        (x.type === s.type && x.deviceId === s.deviceId) ? { ...x, enabled: !x.enabled } : x
      );
      // Update the gain node directly: enabled → volume, disabled → 0.
      const g = graphRef.current?.gains.get(keyFor(s));
      if (g) {
        const updated = next.find(x => x.type === s.type && x.deviceId === s.deviceId);
        g.gain.value = updated?.enabled ? updated.volume : 0;
      }
      return next;
    });
  };

  const setVol = (s: AudioSource, v: number) => {
    setConfig(prev => {
      const next = prev.map(x =>
        (x.type === s.type && x.deviceId === s.deviceId) ? { ...x, volume: v } : x
      );
      // Update the gain node directly (only if enabled — disabled stays 0).
      const g = graphRef.current?.gains.get(keyFor(s));
      const updated = next.find(x => x.type === s.type && x.deviceId === s.deviceId);
      if (g && updated?.enabled) g.gain.value = v;
      return next;
    });
  };

  const apply = () => {
    onApply(rows);
    onClose();
  };

  return (
    <div className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm z-[60] flex items-center justify-center p-6">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-2xl overflow-hidden flex flex-col shadow-2xl">
        <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
          <h2 className="text-sm font-bold text-white">{tr('audio.title')}</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-white"><X size={16} /></button>
        </div>
        <div className="p-5 overflow-y-auto max-h-[60vh] space-y-2">
          <p className="text-[11px] text-zinc-500 leading-relaxed mb-2">{tr('audio.hint')}</p>
          {rows.length === 0 && <div className="text-xs text-zinc-500 italic">{tr('audio.noDevices')}</div>}
          {rows.map((s, i) => {
            const key = keyFor(s);
            const lvl = levels[key] || 0;
            const pct = Math.min(100, Math.round(lvl * 140));
            return (
              <div key={i} className="flex items-center gap-3 bg-zinc-950/60 border border-zinc-800 rounded-lg p-2.5">
                <input
                  type="checkbox"
                  checked={s.enabled}
                  onChange={() => toggle(s)}
                  className="cursor-pointer shrink-0 w-4 h-4"
                />
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-zinc-200 truncate">{s.label}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-zinc-500 w-10 shrink-0">{tr('audio.volume')}</span>
                    <input
                      type="range" min={0} max={1} step={0.01}
                      value={s.volume}
                      onChange={e => setVol(s, parseFloat(e.target.value))}
                      disabled={!s.enabled}
                      className="flex-1 accent-emerald-500 disabled:opacity-40"
                    />
                  </div>
                </div>
                {/* Level meter (AnalyserNode-driven, raw signal — reacts even
                    when the source is disabled, so user can tap to identify). */}
                <div className="w-24 shrink-0">
                  <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-red-500 transition-[width] duration-75"
                      style={{ width: pct + '%' }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="px-5 py-4 border-t border-zinc-800 bg-zinc-950 flex justify-end space-x-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm bg-zinc-800 hover:bg-zinc-700 text-white transition">{tr('settings.cancel')}</button>
          <button onClick={apply} className="px-4 py-2 rounded-lg text-sm bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold transition">{tr('audio.apply')}</button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [settings, setSettings] = useState<any>({});
  const [showSettings, setShowSettings] = useState(false);
  // transcriptText: the accumulated, EDITABLE text. This is the source of truth
  // when no recording/transcription is in progress. During mic recording, new
  // finals are shown separately (in `finals`) and merged into transcriptText
  // when recording stops — so user edits are preserved and new text appends.
  const [transcriptText, setTranscriptText] = useState('');
  const [finals, setFinals] = useState<string[]>([]);
  const [partial, setPartial] = useState<string>('');
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false); // true during mic OR file
  const [activeMode, setActiveMode] = useState<'idle' | 'mic' | 'file-text' | 'file-srt'>('idle');
  const [subtitleMode, setSubtitleMode] = useState(false);
  const [isSilence, setIsSilence] = useState(false);
  const [copied, setCopied] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [showLogs, setShowLogs] = useState(false);
  const [toast, setToast] = useState<{ message: string; preview: string } | null>(null);
  const [uiAutoPaste, setUiAutoPaste] = useState(false);
  const [capturingHotkey, setCapturingHotkey] = useState(false);
  const [showLicense, setShowLicense] = useState(false);
  const [showAudioDevices, setShowAudioDevices] = useState(false);
  const [isMixerRecording, setIsMixerRecording] = useState(false);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const transcriptAreaRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const logsAreaRef = useRef<HTMLDivElement>(null);
  // Ref to access latest finals inside onStateChange callback (which is
  // registered once and would otherwise capture stale state).
  const finalsRef = useRef<string[]>([]);
  useEffect(() => { finalsRef.current = finals; }, [finals]);
  // Ref mirror of activeMode — the IPC callbacks in useEffect are registered
  // once on mount, so they can't read the state variable directly (stale
  // closure). This ref stays in sync and is readable from those callbacks.
  const activeModeRef = useRef<'idle' | 'mic' | 'file-text' | 'file-srt'>('idle');
  // Mixer recording refs (used when multiple sources / system audio selected).
  const recGraphRef = useRef<MixerGraph | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recChunksRef = useRef<Blob[]>([]);
  const streamingGraphRef = useRef<StreamingGraph | null>(null);
  // streamingActiveState mirrors streamingGraphRef.current !== null. We need a
  // STATE (not just a ref) because React doesn't re-render on ref changes, so
  // the audio-level useEffect below wouldn't fire when the graph is created.
  const [streamingActiveState, setStreamingActiveState] = useState(false);
  // Real-time audio level (0..1) for the Stop button glow. Updated by a
  // requestAnimationFrame loop reading the AnalyserNode while recording.
  const [audioLevel, setAudioLevel] = useState(0);
  const audioLevelRafRef = useRef<number | null>(null);

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
      // SRT mode: main sends the FULL accumulated SRT string as text with
      // isFinal=true. Replace transcriptText entirely (not append).
      if (isFinal && activeModeRef.current === 'file-srt') {
        setTranscriptText(text);
        scrollTranscript();
        return;
      }
      // File-text mode: each result line appends to transcriptText.
      if (isFinal && activeModeRef.current === 'file-text') {
        setTranscriptText((prev) => prev + (prev ? '\n' : '') + text);
        scrollTranscript();
        return;
      }
      // Mic mode: use finals/partial for colored display.
      if (isFinal) {
        setFinals((prev) => [...prev, text]);
        setPartial('');
      } else {
        setPartial(text);
      }
      scrollTranscript();
    }));

    function scrollTranscript() {
      setTimeout(() => {
        if (transcriptAreaRef.current) transcriptAreaRef.current.scrollTop = transcriptAreaRef.current.scrollHeight;
        if (textareaRef.current) textareaRef.current.scrollTop = textareaRef.current.scrollHeight;
      }, 50);
    }

    cleanups.push(window.electron.onSilenceState((silence: boolean) => setIsSilence(silence)));

    cleanups.push(window.electron.onStateChange((state: boolean) => {
      setIsRecording(state);
      if (state) {
        // Mic recording started — clear this session's colored portion.
        // transcriptText is PRESERVED (accumulation across sessions).
        setFinals([]);
        setPartial('');
        setIsProcessing(true);
        activeModeRef.current = 'mic';
        setActiveMode('mic');
      } else {
        // Mic recording stopped — merge this session's finals into the
        // accumulated transcriptText so they become part of the editable text.
        const sessionText = finalsRef.current.join(' ');
        if (sessionText) {
          setTranscriptText((prev) => prev + (prev ? ' ' : '') + sessionText);
        }
        setFinals([]);
        setPartial('');
        setIsProcessing(false);
        setIsMixerRecording(false);
        setAudioLevel(0);
        activeModeRef.current = 'idle';
        setActiveMode('idle');
      }
    }));

    // File transcription finished — re-enable editing.
    cleanups.push(window.electron.onBackendFinished(() => {
      // For mic mode, onStateChange(false) already handles cleanup.
      // For file mode, this is the only signal.
      if (activeModeRef.current !== 'mic' && activeModeRef.current !== 'idle') {
        setIsProcessing(false);
        activeModeRef.current = 'idle';
        setActiveMode('idle');
      }
    }));

    cleanups.push(window.electron.onToast((data: { message: string; preview: string }) => {
      setToast(data);
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      toastTimerRef.current = setTimeout(() => setToast(null), 2500);
    }));

    cleanups.push(window.electron.onTranscriptionClear(() => {
      setTranscriptText('');
      setFinals([]);
      setPartial('');
    }));

    cleanups.push(window.electron.onSettingsUpdated((newSettings: any) => {
      setSettings(newSettings);
    }));

    return () => { cleanups.forEach((fn) => fn()); };
  }, []);

  // Audio level meter loop: while a streaming graph is active, read its
  // AnalyserNode every animation frame and update audioLevel (0..1). Drives
  // the red glow intensity on the Stop button.
  useEffect(() => {
    if (!streamingActiveState) {
      setAudioLevel(0);
      return;
    }
    const loop = () => {
      const an = streamingGraphRef.current?.analyser;
      if (an) {
        const lvl = readLevel(an);
        setAudioLevel(lvl);
      }
      audioLevelRafRef.current = requestAnimationFrame(loop);
    };
    loop();
    return () => {
      if (audioLevelRafRef.current) cancelAnimationFrame(audioLevelRafRef.current);
      audioLevelRafRef.current = null;
      setAudioLevel(0);
    };
  }, [streamingActiveState]);

  const handleSaveSettings = () => {
    window.electron.saveSettings(settings);
    setShowSettings(false);
  };

  const copyToClipboard = () => {
    // Copy the full accumulated text (including any in-progress finals/partial
    // if recording, though the button is only shown when not processing).
    const fullText = transcriptText +
      (finals.length > 0 ? (transcriptText ? ' ' : '') + finals.join(' ') : '') +
      (partial ? ' ' + partial : '');
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

  // Start file transcription. Sets the active mode and blocks editing until
  // the backend finishes (onBackendFinished clears isProcessing).
  const handleTranscribeFile = () => {
    const mode = subtitleMode ? 'file-srt' : 'file-text';
    activeModeRef.current = mode;
    setActiveMode(mode);
    setIsProcessing(true);
    // For file mode, don't clear transcriptText — text accumulates across
    // multiple file transcriptions just like mic sessions.
    window.electron.transcribeFile(subtitleMode);
  };

  // Save SRT subtitles. Opens a save dialog that allows typing a new name
  // OR clicking a video file (in which case .srt is saved next to it with
  // the same basename).
  const handleSaveSrt = async () => {
    const result = await window.electron.saveSrt(transcriptText);
    if (result && result.success) {
      const filename = result.path.split(/[\\/]/).pop() || '';
      setToast({ message: tr('toast.saved') + ': ' + filename, preview: '' });
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      toastTimerRef.current = setTimeout(() => setToast(null), 2500);
    }
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

  // --- Recording mode selection --------------------------------------------
  // Three paths:
  //   1. Native --mic (real-time streaming via crispasr): single default mic,
  //      modes "lowest-latency" or "best-quality".
  //   2. Streaming mixer (chunked PCM → progressive transcription): mixer
  //      (multiple sources / system audio / non-default mic), modes
  //      "lowest-latency" or "best-quality". AudioWorklet captures 16kHz PCM,
  //      sends ~200ms chunks to main, main writes 2-5s WAV segments and runs
  //      crispasr on each — text appears during recording.
  //   3. Record-then-recognize: mode "record-then-recognize", ANY source.
  //      Records via Web Audio + MediaRecorder → blob → main → ffmpeg → WAV →
  //      crispasr. Text appears only after recording stops.
  const audioSources: AudioSource[] = (settings.audioSources as AudioSource[]) || [];
  const enabledSources = audioSources.filter(s => s.enabled);
  const isMode3 = settings.mode === 'record-then-recognize';
  const useMixerSources = enabledSources.length > 1 ||
    (enabledSources.length === 1 && (enabledSources[0].type === 'system' || enabledSources[0].deviceId !== 'default'));
  const useNativeMic = !isMode3 && !useMixerSources;
  const useStreaming = !isMode3 && useMixerSources;
  const useRecordThenRecognize = isMode3;

  const handleStartMic = async () => {
    if (useNativeMic) {
      // Native path: main spawns crispasr --mic with real-time streaming.
      window.electron.startMic();
      return;
    }

    if (useStreaming) {
      // Pipe streaming: AudioWorklet captures PCM → main writes to crispasr stdin.
      // crispasr reads continuously (via "-f -") and emits JSON partial/final
      // in real-time — same streaming behavior as --mic mode.
      try {
        const sg = await buildStreamingMixerGraph(enabledSources);
        streamingGraphRef.current = sg;
        setStreamingActiveState(true); // triggers the audio-level useEffect
        sg.workletNode.port.onmessage = (e: MessageEvent) => {
          window.electron.sendPcmPipe(e.data as Float32Array);
        };
        const silenceMs = settings.mode === 'lowest-latency'
          ? (settings.silenceMsLowest ?? 30)
          : (settings.silenceMsBest ?? 1150);
        window.electron.startPipeStreaming(silenceMs);
        setIsMixerRecording(true);
        // isRecording will be set by onStateChange(true) from main.
      } catch (e) {
        console.error('Pipe streaming start failed:', e);
        setToast({ message: String(e), preview: '' });
      }
      return;
    }

    // Record-then-recognize: Web Audio + MediaRecorder → blob → file → crispasr.
    // For mode 3 with no configured sources, default to the system default mic.
    const sources = enabledSources.length > 0
      ? enabledSources
      : [{ type: 'mic' as const, deviceId: 'default', label: 'Default', volume: 1, enabled: true }];
    try {
      const g = await buildMixerGraph(sources);
      recGraphRef.current = g;
      recChunksRef.current = [];
      const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm';
      const rec = new MediaRecorder(g.mixDest.stream, { mimeType: mime });
      rec.ondataavailable = (e) => { if (e.data.size > 0) recChunksRef.current.push(e.data); };
      rec.onstop = async () => {
        const blob = new Blob(recChunksRef.current, { type: mime });
        recChunksRef.current = [];
        g.cleanup();
        recGraphRef.current = null;
        setIsMixerRecording(false);
        setIsRecording(false);
        const buf = await blob.arrayBuffer();
        setIsProcessing(true);
        activeModeRef.current = 'file-text';
        setActiveMode('file-text');
        // Pass autoPaste=true so main performs clipboard + Ctrl+V when the
        // backend finishes — mirroring the streaming modes' stop behavior.
        window.electron.transcribeRecording(buf, true);
      };
      rec.start();
      mediaRecorderRef.current = rec;
      setIsMixerRecording(true);
      setIsRecording(true);
    } catch (e) {
      console.error('Record-then-recognize start failed:', e);
      setToast({ message: String(e), preview: '' });
    }
  };

  const handleStopMic = () => {
    if (useNativeMic) {
      window.electron.stopMic();
      return;
    }
    if (useStreaming) {
      // Stop the audio graph immediately (no more PCM), then tell main to
      // close crispasr's stdin (EOF). crispasr finishes processing and exits,
      // which triggers recording-state(false) + backend-finished.
      streamingGraphRef.current?.cleanup();
      streamingGraphRef.current = null;
      setStreamingActiveState(false); // stops the audio-level RAF loop
      window.electron.stopPipeStreaming();
      return;
    }
    // Record-then-recognize
    const rec = mediaRecorderRef.current;
    if (rec && rec.state !== 'inactive') rec.stop();
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

        {/* Transcript area: editable textarea when idle, read-only colored div
            when processing (mic recording shows gray partial + white finals). */}
        {isProcessing ? (
          <div
            ref={transcriptAreaRef}
            className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl p-4 overflow-y-auto text-sm leading-relaxed"
          >
            {transcriptText.length === 0 && finals.length === 0 && !partial && (
              <span className="text-zinc-600 italic">{tr('transcript.placeholder')}</span>
            )}
            {transcriptText && (
              <span className="text-zinc-200 whitespace-pre-wrap">{transcriptText} </span>
            )}
            {finals.map((t, i) => (
              <span key={i} className="text-zinc-200">{t} </span>
            ))}
            {partial && (
              <span className="text-zinc-500">{partial}</span>
            )}
          </div>
        ) : (
          <textarea
            ref={textareaRef}
            value={transcriptText}
            onChange={(e) => setTranscriptText(e.target.value)}
            placeholder={tr('transcript.placeholder')}
            className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl p-4 overflow-y-auto text-sm leading-relaxed text-zinc-200 focus:outline-none focus:border-zinc-700 resize-none font-sans"
            spellCheck={false}
          />
        )}
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
            onClick={handleTranscribeFile}
            disabled={isProcessing}
            className="p-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-zinc-400 transition disabled:opacity-40 disabled:cursor-not-allowed"
            title={tr('btn.selectFile')}
          >
            <FolderOpen size={16} />
          </button>

          {/* Subtitle mode checkbox — toggles SRT output for file transcription */}
          <label className="flex items-center space-x-1.5 text-xs text-zinc-400 cursor-pointer select-none" title={tr('subtitle.checkbox')}>
            <input
              type="checkbox"
              checked={subtitleMode}
              onChange={e => setSubtitleMode(e.target.checked)}
              disabled={isProcessing}
              className="cursor-pointer"
            />
            <span>srt</span>
          </label>

          {/* Vertical divider: separates file-related controls (file + srt)
              from the microphone recording controls. */}
          <div className="w-px h-6 bg-zinc-800" />

          {/* Processing indicator: shown during file transcription (which can
              take a long time on big files). Animated spinner + localized text. */}
          {isProcessing && activeMode !== 'mic' && !isMixerRecording && (
            <div className="flex items-center space-x-2 px-3 py-1.5 bg-zinc-900/60 border border-zinc-800 rounded-lg">
              <Loader2 size={14} className="text-emerald-400 animate-spin" />
              <span className="text-xs text-zinc-300">{tr('status.processing')}</span>
            </div>
          )}

          {/* Mixer recording indicator: shown ONLY in record-then-recognize mode
              (mode 3). In streaming mixer mode, the real-time partial/final text
              and the mic pulse in the header already indicate active recording,
              so the extra "Recording…" badge is redundant. In mode 3 the user
              sees nothing else while recording, so the badge is essential. */}
          {isMixerRecording && useRecordThenRecognize && (
            <div className="flex items-center space-x-2 px-3 py-1.5 bg-red-500/10 border border-red-500/30 rounded-lg">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-xs text-red-400">{tr('audio.recording')}</span>
            </div>
          )}

          {!isRecording ? (
            <button
              onClick={handleStartMic}
              disabled={isRecording || isProcessing || isMixerRecording}
              className="p-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-500 rounded-lg transition disabled:opacity-40 disabled:cursor-not-allowed"
              title={tr('btn.record')}
            >
              <Mic size={16} />
            </button>
          ) : (
            <button
              onClick={handleStopMic}
              style={{
                // Dynamic red glow: intensity scales with audio level (0..1).
                // Non-linear (sqrt) amplification so even quiet sounds are
                // visible. At silence — subtle base glow; at loud — strong.
                boxShadow: (() => {
                  const a = Math.sqrt(Math.min(1, audioLevel * 3)); // amplify + compress
                  return `0 0 ${6 + a * 34}px ${2 + a * 14}px rgba(239,68,68,${0.2 + a * 0.6})`;
                })()
              }}
              className="p-2 bg-zinc-800 hover:bg-zinc-700 border border-red-500/50 text-zinc-200 rounded-lg transition"
              title={tr('btn.stop')}
            >
              <Square size={16} className="text-red-400" />
            </button>
          )}
        </div>

        <div className="flex items-center space-x-3">
          {/* Clear button — visible when there's any text (editable or in-progress) */}
          {(transcriptText.length > 0 || finals.length > 0 || partial) && (
            <button
              onClick={clearTranscript}
              className="p-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-zinc-400 hover:text-red-400 transition"
              title={tr('btn.clear')}
            >
              <Trash2 size={16} />
            </button>
          )}
          {/* In subtitle mode: show Save (floppy) button instead of Copy */}
          {subtitleMode && transcriptText.length > 0 && !isProcessing && (
            <button
              onClick={handleSaveSrt}
              className="p-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-zinc-400 hover:text-emerald-400 transition"
              title={tr('btn.save')}
            >
              <Save size={16} />
            </button>
          )}
          {/* In non-subtitle mode: show Copy button when there's text */}
          {!subtitleMode && (transcriptText.length > 0 || finals.length > 0 || partial) && (
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

      {/* Audio Devices Modal (mixer with live level meters) */}
      {showAudioDevices && (
        <AudioDevicesModal
          locale={locale}
          initialSources={(settings.audioSources as AudioSource[]) || []}
          onClose={() => setShowAudioDevices(false)}
          onApply={(sources) => {
            const next = { ...settings, audioSources: sources };
            setSettings(next);
            window.electron.saveSettings(next);
          }}
        />
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

                <div className="space-y-1.5 col-span-2">
                  <label className="text-xs font-semibold text-zinc-400 uppercase">{tr('settings.inputDevice')}</label>
                  <button
                    onClick={() => setShowAudioDevices(true)}
                    className="w-full flex items-center justify-between px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-200 hover:border-emerald-500 transition text-sm"
                  >
                    <span>{tr('audio.configure')}</span>
                    {useMixerSources && (
                      <span className="text-[10px] text-emerald-400 font-medium">{enabledSources.length} ●</span>
                    )}
                  </button>
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
                <div className="grid grid-cols-3 gap-2">
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
                  <button
                    onClick={() => setSettings({ ...settings, mode: 'record-then-recognize' })}
                    className={`py-2 rounded-lg border text-xs font-medium transition ${settings.mode === 'record-then-recognize' ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400' : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:bg-zinc-900'}`}
                  >
                    {tr('settings.modeRecordThenRecognize')}
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
