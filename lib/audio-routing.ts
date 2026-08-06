/**
 * lib/audio-routing.ts
 *
 * Wraps react-native-incall-manager to provide:
 *  - Earpiece / speakerphone / Bluetooth routing
 *  - Proximity sensor (auto-switch to earpiece when phone to ear)
 *  - Ringtone / busy tone playback
 */
import InCallManager from "react-native-incall-manager";

export type AudioRoute = "earpiece" | "speaker" | "bluetooth";

let currentRoute: AudioRoute = "earpiece";

/** Start in-call audio session. Call when entering the call screen. */
export function startAudioSession(media: "audio" | "video" = "audio") {
  InCallManager.start({ media });
  // Default to earpiece for audio calls, speaker for video
  if (media === "video") {
    InCallManager.setForceSpeakerphoneOn(true);
    currentRoute = "speaker";
  } else {
    InCallManager.setForceSpeakerphoneOn(false);
    currentRoute = "earpiece";
  }
}

/** Stop the in-call audio session. Call when leaving the call screen. */
export function stopAudioSession() {
  InCallManager.stop();
}

/** Switch to a specific route. */
export function setAudioRoute(route: AudioRoute) {
  currentRoute = route;
  switch (route) {
    case "earpiece":
      InCallManager.setForceSpeakerphoneOn(false);
      break;
    case "speaker":
      InCallManager.setForceSpeakerphoneOn(true);
      break;
    case "bluetooth":
      // Bluetooth is selected by the OS when a BT device is connected;
      // we just release force-speaker so the OS can pick BT.
      InCallManager.setForceSpeakerphoneOn(false);
      break;
  }
}

export function getCurrentRoute(): AudioRoute {
  return currentRoute;
}

/** Play the ringtone on the callee's device. */
export function startRingtone() {
  InCallManager.startRingtone("_DEFAULT_");
}

/** Stop the ringtone. */
export function stopRingtone() {
  InCallManager.stopRingtone();
}

/** Play ringback tone on the caller's device while waiting. */
export function startRingback() {
  InCallManager.startRingback("_BUNDLE_");
}

export function stopRingback() {
  InCallManager.stopRingback();
}

/** Enable proximity sensor so screen turns off when phone is held to ear. */
export function enableProximitySensor(enabled: boolean) {
  if (enabled) {
    InCallManager.turnScreenOff();
  } else {
    InCallManager.turnScreenOn();
  }
}
