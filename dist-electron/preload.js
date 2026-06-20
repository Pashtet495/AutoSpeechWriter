"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("electron", {
  getSettings: () => electron.ipcRenderer.invoke("get-settings"),
  saveSettings: (settings) => electron.ipcRenderer.invoke("save-settings", settings),
  setAutoPaste: (value) => electron.ipcRenderer.invoke("set-auto-paste", value),
  setUiAutoPaste: (value) => electron.ipcRenderer.invoke("set-ui-auto-paste", value),
  clearTranscript: () => electron.ipcRenderer.invoke("clear-transcript"),
  transcribeFile: () => electron.ipcRenderer.invoke("transcribe-file"),
  startMic: () => electron.ipcRenderer.invoke("start-mic"),
  stopMic: () => electron.ipcRenderer.invoke("stop-mic"),
  closeApp: () => electron.ipcRenderer.send("close-app"),
  minimizeApp: () => electron.ipcRenderer.send("minimize-app"),
  openExternal: (url) => electron.ipcRenderer.invoke("open-external", url),
  // Every on* method returns a cleanup function that removes the listener.
  // This is CRITICAL for React StrictMode (dev mode), which mounts → unmounts
  // → re-mounts the component. Without cleanup, each remount adds a SECOND
  // listener and every IPC event is handled twice — which was the root cause
  // of all duplicated logs / transcriptions in the UI.
  onTranscriptionUpdate: (callback) => {
    const handler = (_event, text, isFinal) => callback(text, isFinal);
    electron.ipcRenderer.on("transcription-update", handler);
    return () => electron.ipcRenderer.off("transcription-update", handler);
  },
  onTranscriptionClear: (callback) => {
    const handler = () => callback();
    electron.ipcRenderer.on("transcription-clear", handler);
    return () => electron.ipcRenderer.off("transcription-clear", handler);
  },
  onSilenceState: (callback) => {
    const handler = (_event, isSilence) => callback(isSilence);
    electron.ipcRenderer.on("silence-state", handler);
    return () => electron.ipcRenderer.off("silence-state", handler);
  },
  onLogUpdate: (callback) => {
    const handler = (_event, text) => callback(text);
    electron.ipcRenderer.on("log-update", handler);
    return () => electron.ipcRenderer.off("log-update", handler);
  },
  onStateChange: (callback) => {
    const handler = (_event, isRecording) => callback(isRecording);
    electron.ipcRenderer.on("recording-state", handler);
    return () => electron.ipcRenderer.off("recording-state", handler);
  },
  onToast: (callback) => {
    const handler = (_event, data) => callback(data);
    electron.ipcRenderer.on("show-toast", handler);
    return () => electron.ipcRenderer.off("show-toast", handler);
  },
  onSettingsUpdated: (callback) => {
    const handler = (_event, settings) => callback(settings);
    electron.ipcRenderer.on("settings-updated", handler);
    return () => electron.ipcRenderer.off("settings-updated", handler);
  }
});
