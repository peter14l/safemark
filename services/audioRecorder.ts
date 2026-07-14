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
  readAsStringAsync,
  writeAsStringAsync,
} from "expo-file-system/legacy";
import { getSessionPin } from "./session-pin";
import { encryptFile, decryptFile, EncryptionMetadata } from "../lib/encryption";

const RECORDING_DIR = (documentDirectory || "") + "sos_audio/";
const METADATA_DIR = (documentDirectory || "") + "sos_audio_meta/";
const CLIP_DURATION_MS = 10_000;

let isRecording = false;
let recordingTimer: ReturnType<typeof setInterval> | null = null;
let currentRecorder: AudioRecorder | null = null;

async function ensureDirs() {
  for (const dir of [RECORDING_DIR, METADATA_DIR]) {
    const info = await getInfoAsync(dir);
    if (!info.exists) {
      await makeDirectoryAsync(dir, { intermediates: true });
    }
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

    await ensureDirs();
    const timestamp = Date.now();
    const filename = `clip_${timestamp}.m4a`;
    const dest = RECORDING_DIR + filename;
    await moveAsync({ from: uri, to: dest });

    // Encrypt the recording if user has a session PIN
    const pin = getSessionPin();
    if (pin) {
      try {
        const { encryptedPath, metadata } = await encryptFile(dest, pin);
        await writeAsStringAsync(
          METADATA_DIR + `clip_${timestamp}.meta`,
          JSON.stringify(metadata),
          { encoding: "utf8" }
        );
        // Delete unencrypted version
        await deleteAsync(dest);
        return encryptedPath;
      } catch (err) {
        console.error("Failed to encrypt recording:", err);
        // Keep unencrypted version if encryption fails
        return dest;
      }
    }

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
  await ensureDirs();
  const entries = await readDirectoryAsync(RECORDING_DIR);
  return entries
    .filter((f) => f.endsWith(".m4a") || f.endsWith(".enc"))
    .sort()
    .reverse()
    .map((f) => RECORDING_DIR + f);
}

export async function getDecryptedClip(encryptedPath: string): Promise<string | null> {
  const pin = getSessionPin();
  if (!pin) return null;
  
  try {
    const { decryptedPath } = await decryptFile(encryptedPath, pin);
    return decryptedPath;
  } catch {
    return null;
  }
}

export async function deleteClip(path: string): Promise<void> {
  const info = await getInfoAsync(path);
  if (info.exists) await deleteAsync(path);
  
  // Also delete metadata if exists
  const metaPath = path.replace(".m4a", ".meta").replace(".enc", ".meta");
  const metaInfo = await getInfoAsync(METADATA_DIR + metaPath.split("/").pop()!);
  if (metaInfo.exists) await deleteAsync(METADATA_DIR + metaPath.split("/").pop()!);
}

export async function clearAllClips(): Promise<void> {
  await ensureDirs();
  const entries = await readDirectoryAsync(RECORDING_DIR);
  for (const f of entries) {
    await deleteAsync(RECORDING_DIR + f);
  }
  const metaEntries = await readDirectoryAsync(METADATA_DIR);
  for (const f of metaEntries) {
    await deleteAsync(METADATA_DIR + f);
  }
}

export function isAudioRecording(): boolean {
  return isRecording;
}

export async function getClipCount(): Promise<number> {
  await ensureDirs();
  const entries = await readDirectoryAsync(RECORDING_DIR);
  return entries.filter((f) => f.endsWith(".m4a") || f.endsWith(".enc")).length;
}