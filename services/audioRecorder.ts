import {
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  AudioModule,
  RecordingPresets,
} from "expo-audio";
import type { AudioRecorder } from "expo-audio/build/AudioModule.types";
import {
  documentDirectory,
  getInfoAsync,
  makeDirectoryAsync,
  readDirectoryAsync,
  deleteAsync,
  moveAsync,
} from "expo-file-system/legacy";

const RECORDING_DIR = (documentDirectory || "") + "sos_audio/";
const CLIP_DURATION_MS = 10_000;

let isRecording = false;
let recordingTimer: ReturnType<typeof setInterval> | null = null;
let currentRecorder: AudioRecorder | null = null;

async function ensureDir() {
  const info = await getInfoAsync(RECORDING_DIR);
  if (!info.exists) {
    await makeDirectoryAsync(RECORDING_DIR, { intermediates: true });
  }
}

async function recordClip(): Promise<string | null> {
  try {
    await setAudioModeAsync({
      allowsRecording: true,
      playsInSilentMode: true,
    });

    const recorder = new AudioModule.AudioRecorder(RecordingPresets.HIGH_QUALITY);

    await recorder.prepareToRecordAsync();
    recorder.record();
    currentRecorder = recorder;

    await new Promise((resolve) => setTimeout(resolve, CLIP_DURATION_MS));

    await recorder.stop();
    await setAudioModeAsync({ allowsRecording: false });
    currentRecorder = null;

    const uri = recorder.uri;
    if (!uri) return null;

    await ensureDir();
    const filename = `clip_${Date.now()}.m4a`;
    const dest = RECORDING_DIR + filename;
    await moveAsync({ from: uri, to: dest });
    return dest;
  } catch (err) {
    console.error("Audio clip recording error:", err);
    currentRecorder = null;
    return null;
  }
}

export async function startAudioRecording(): Promise<boolean> {
  if (isRecording) return true;

  const { granted } = await requestRecordingPermissionsAsync();
  if (!granted) return false;

  isRecording = true;

  recordClip();

  recordingTimer = setInterval(() => {
    if (isRecording) {
      recordClip();
    }
  }, CLIP_DURATION_MS);

  return true;
}

export async function stopAudioRecording(): Promise<void> {
  isRecording = false;
  if (recordingTimer) {
    clearInterval(recordingTimer);
    recordingTimer = null;
  }
  if (currentRecorder) {
    try {
      await currentRecorder.stop();
    } catch {}
    currentRecorder = null;
  }
  await setAudioModeAsync({ allowsRecording: false });
}

export async function getRecordedClips(): Promise<string[]> {
  await ensureDir();
  const entries = await readDirectoryAsync(RECORDING_DIR);
  return entries
    .filter((f) => f.endsWith(".m4a"))
    .sort()
    .reverse()
    .map((f) => RECORDING_DIR + f);
}

export async function deleteClip(path: string): Promise<void> {
  const info = await getInfoAsync(path);
  if (info.exists) await deleteAsync(path);
}

export async function clearAllClips(): Promise<void> {
  await ensureDir();
  const entries = await readDirectoryAsync(RECORDING_DIR);
  for (const f of entries) {
    await deleteAsync(RECORDING_DIR + f);
  }
}

export function isAudioRecording(): boolean {
  return isRecording;
}

export async function getClipCount(): Promise<number> {
  await ensureDir();
  const entries = await readDirectoryAsync(RECORDING_DIR);
  return entries.filter((f) => f.endsWith(".m4a")).length;
}
