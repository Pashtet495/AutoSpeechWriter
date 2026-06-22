import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electron', {
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings: any) => ipcRenderer.invoke('save-settings', settings),
  setAutoPaste: (value: boolean) => ipcRenderer.invoke('set-auto-paste', value),
  setUiAutoPaste: (value: boolean) => ipcRenderer.invoke('set-ui-auto-paste', value),
  clearTranscript: () => ipcRenderer.invoke('clear-transcript'),
  transcribeFile: (subtitleMode: boolean = false) => ipcRenderer.invoke('transcribe-file', subtitleMode),
  saveSrt: (srtContent: string) => ipcRenderer.invoke('save-srt', srtContent),
  getDesktopSources: () => ipcRenderer.invoke('get-desktop-sources'),
  transcribeRecording: (buffer: ArrayBuffer, autoPaste: boolean = false) => ipcRenderer.invoke('transcribe-recording', buffer, autoPaste),
  startMic: () => ipcRenderer.invoke('start-mic'),
  stopMic: () => ipcRenderer.invoke('stop-mic'),
  startPipeStreaming: (silenceMs: number) => ipcRenderer.invoke('start-pipe-streaming', silenceMs),
  sendPcmPipe: (chunk: Float32Array) => ipcRenderer.send('send-pcm-pipe', chunk),
  stopPipeStreaming: () => ipcRenderer.invoke('stop-pipe-streaming'),
  closeApp: () => ipcRenderer.send('close-app'),
  minimizeApp: () => ipcRenderer.send('minimize-app'),
  openExternal: (url: string) => ipcRenderer.invoke('open-external', url),

  // Every on* method returns a cleanup function that removes the listener.
  // This is CRITICAL for React StrictMode (dev mode), which mounts → unmounts
  // → re-mounts the component. Without cleanup, each remount adds a SECOND
  // listener and every IPC event is handled twice — which was the root cause
  // of all duplicated logs / transcriptions in the UI.
  onTranscriptionUpdate: (callback: (text: string, isFinal: boolean) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, text: string, isFinal: boolean) => callback(text, isFinal);
    ipcRenderer.on('transcription-update', handler);
    return () => ipcRenderer.off('transcription-update', handler);
  },
  onTranscriptionClear: (callback: () => void) => {
    const handler = () => callback();
    ipcRenderer.on('transcription-clear', handler);
    return () => ipcRenderer.off('transcription-clear', handler);
  },
  onSilenceState: (callback: (isSilence: boolean) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, isSilence: boolean) => callback(isSilence);
    ipcRenderer.on('silence-state', handler);
    return () => ipcRenderer.off('silence-state', handler);
  },
  onLogUpdate: (callback: (text: string) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, text: string) => callback(text);
    ipcRenderer.on('log-update', handler);
    return () => ipcRenderer.off('log-update', handler);
  },
  onStateChange: (callback: (isRecording: boolean) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, isRecording: boolean) => callback(isRecording);
    ipcRenderer.on('recording-state', handler);
    return () => ipcRenderer.off('recording-state', handler);
  },
  onToast: (callback: (data: { message: string; preview: string }) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, data: { message: string; preview: string }) => callback(data);
    ipcRenderer.on('show-toast', handler);
    return () => ipcRenderer.off('show-toast', handler);
  },
  onBackendFinished: (callback: () => void) => {
    const handler = () => callback();
    ipcRenderer.on('backend-finished', handler);
    return () => ipcRenderer.off('backend-finished', handler);
  },
  onSettingsUpdated: (callback: (settings: any) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, settings: any) => callback(settings);
    ipcRenderer.on('settings-updated', handler);
    return () => ipcRenderer.off('settings-updated', handler);
  }
});

