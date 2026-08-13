import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  AppState,
  Platform,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { RTCView } from "react-native-webrtc";
import {
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  Video,
  VideoOff,
  Volume2,
  Bluetooth,
  RotateCcw,
  Ear,
} from "lucide-react-native";
import { useAuth } from "../../hooks/useAuth";
import {
  startCall,
  answerCall,
  endCall,
  setMicMuted,
  setCameraEnabled,
  flipCamera,
  getLocalStream,
  getRemoteStream,
  formatDuration,
  CallType,
} from "../../services/calling";
import {
  startAudioSession,
  stopAudioSession,
  setAudioRoute,
  startRingtone,
  stopRingtone,
  startRingback,
  stopRingback,
  AudioRoute,
} from "../../lib/audio-routing";
import { sendLocalNotification } from "../../services/notifications";
import type { MediaStream } from "react-native-webrtc";

// ─── Params from navigation ───────────────────────────────────────────────────
// Outgoing: { mode: "outgoing", calleeId, calleeName, callType }
// Incoming: { mode: "incoming", callId, callerId, callerName, callType }

export default function CallScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams<{
    mode: "outgoing" | "incoming";
    callId?: string;
    calleeId?: string;
    calleeName?: string;
    callerId?: string;
    callerName?: string;
    callType: CallType;
  }>();

  const isOutgoing = params.mode === "outgoing";
  const remotePartyName = isOutgoing
    ? params.calleeName ?? "Partner"
    : params.callerName ?? "Partner";
  const callType = (params.callType ?? "audio") as CallType;

  // ─── State ──────────────────────────────────────────────────────────────────
  const [callStatus, setCallStatus] = useState<
    "connecting" | "ringing" | "active" | "ended"
  >(isOutgoing ? "connecting" : "ringing");
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [muted, setMuted] = useState(false);
  const [cameraOn, setCameraOn] = useState(callType === "video");
  const [audioRoute, setAudioRouteState] = useState<AudioRoute>(
    callType === "video" ? "speaker" : "earpiece"
  );
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const callIdRef = useRef<string | null>(params.callId ?? null);

  // ─── Helpers ─────────────────────────────────────────────────────────────────
  const startTimer = useCallback(() => {
    timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const handleCallEnded = useCallback(() => {
    stopRingtone();
    stopRingback();
    stopTimer();
    stopAudioSession();
    setCallStatus("ended");
    setTimeout(() => router.back(), 1500);
  }, [router, stopTimer]);

  const handleRemoteStream = useCallback((stream: MediaStream) => {
    setRemoteStream(stream);
    stopRingback();
    setCallStatus("active");
    startTimer();
  }, [startTimer]);

  // ─── Initiate / answer call ───────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;

    startAudioSession(callType);

    (async () => {
      try {
        if (isOutgoing) {
          startRingback();
          const callId = await startCall(
            user.id,
            params.calleeId!,
            callType,
            { onRemoteStream: handleRemoteStream, onCallEnded: handleCallEnded }
          );
          callIdRef.current = callId;
          setCallStatus("ringing");
          setLocalStream(getLocalStream());
        } else {
          // Incoming — play ringtone until answered
          startRingtone();
          await answerCall(
            params.callId!,
            callType,
            { onRemoteStream: handleRemoteStream, onCallEnded: handleCallEnded }
          );
          stopRingtone();
          setLocalStream(getLocalStream());
          setCallStatus("active");
          startTimer();
        }
      } catch (err: any) {
        Alert.alert("Call Error", err.message);
        router.back();
      }
    })();

    return () => {
      stopTimer();
      stopAudioSession();
      stopRingtone();
      stopRingback();
      if (user) {
        endCall(user.id).catch((err) =>
          console.error("Error releasing call resources on unmount:", err)
        );
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Background: show persistent notification ─────────────────────────────
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "background" && callStatus === "active") {
        sendLocalNotification(
          "Call in progress",
          `On a call with ${remotePartyName} · ${formatDuration(elapsed)}`
        );
      }
    });
    return () => sub.remove();
  }, [callStatus, elapsed, remotePartyName]);

  // ─── Hang up ──────────────────────────────────────────────────────────────
  const handleHangUp = useCallback(async () => {
    if (!user) return;
    await endCall(user.id);
    handleCallEnded();
  }, [user, handleCallEnded]);

  // ─── Controls ─────────────────────────────────────────────────────────────
  const toggleMic = () => {
    const next = !muted;
    setMuted(next);
    setMicMuted(next);
  };

  const toggleCamera = () => {
    const next = !cameraOn;
    setCameraOn(next);
    setCameraEnabled(next);
  };

  const cycleAudioRoute = () => {
    const routes: AudioRoute[] = ["earpiece", "speaker", "bluetooth"];
    const idx = routes.indexOf(audioRoute);
    const next = routes[(idx + 1) % routes.length];
    setAudioRouteState(next);
    setAudioRoute(next);
  };

  const AudioRouteIcon =
    audioRoute === "bluetooth"
      ? Bluetooth
      : audioRoute === "speaker"
      ? Volume2
      : Ear;

  const statusLabel =
    callStatus === "connecting"
      ? "Connecting…"
      : callStatus === "ringing"
      ? isOutgoing
        ? "Ringing…"
        : "Incoming call"
      : callStatus === "ended"
      ? "Call ended"
      : formatDuration(elapsed);

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      {/* Remote video (or avatar background for audio calls) */}
      {callType === "video" && remoteStream ? (
        <RTCView
          streamURL={(remoteStream as any).toURL()}
          style={StyleSheet.absoluteFill}
          objectFit="cover"
          zOrder={0}
        />
      ) : (
        <View style={styles.audioBg} />
      )}

      {/* Local video (PiP overlay for video calls) */}
      {callType === "video" && localStream && cameraOn && (
        <View style={styles.localVideoContainer}>
          <RTCView
            streamURL={(localStream as any).toURL()}
            style={styles.localVideo}
            objectFit="cover"
            zOrder={1}
            mirror
          />
          <TouchableOpacity
            onPress={flipCamera}
            style={styles.flipButton}
            activeOpacity={0.7}
          >
            <RotateCcw size={16} color="#fff" strokeWidth={2} />
          </TouchableOpacity>
        </View>
      )}

      {/* Overlay */}
      <SafeAreaView style={styles.overlay}>
        {/* Header info */}
        <View style={styles.header}>
          <Text style={styles.remoteName}>{remotePartyName}</Text>
          <Text style={styles.statusLabel}>{statusLabel}</Text>
        </View>

        {/* Controls */}
        <View style={styles.controls}>
          {/* Row 1 — secondary controls */}
          <View style={styles.controlRow}>
            <ControlButton
              icon={muted ? MicOff : Mic}
              label={muted ? "Unmute" : "Mute"}
              active={muted}
              onPress={toggleMic}
            />
            {callType === "video" && (
              <ControlButton
                icon={cameraOn ? Video : VideoOff}
                label={cameraOn ? "Camera" : "No cam"}
                active={!cameraOn}
                onPress={toggleCamera}
              />
            )}
            <ControlButton
              icon={AudioRouteIcon}
              label={audioRoute === "earpiece" ? "Earpiece" : audioRoute === "speaker" ? "Speaker" : "Bluetooth"}
              onPress={cycleAudioRoute}
            />
          </View>

          {/* Row 2 — end call */}
          <View style={styles.endRow}>
            <TouchableOpacity
              style={styles.endButton}
              onPress={handleHangUp}
              activeOpacity={0.8}
            >
              <PhoneOff size={30} color="#fff" strokeWidth={2} />
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function ControlButton({
  icon: Icon,
  label,
  active,
  onPress,
}: {
  icon: React.ComponentType<any>;
  label: string;
  active?: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.controlBtn, active && styles.controlBtnActive]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Icon
        size={22}
        color={active ? "#FF5252" : "#fff"}
        strokeWidth={active ? 2.2 : 1.8}
      />
      <Text style={[styles.controlLabel, active && styles.controlLabelActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0A0A0F",
  },
  audioBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#12122A",
  },
  overlay: {
    flex: 1,
    justifyContent: "space-between",
  },
  header: {
    alignItems: "center",
    paddingTop: 40,
  },
  remoteName: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  statusLabel: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 15,
    marginTop: 8,
  },
  localVideoContainer: {
    position: "absolute",
    top: 60,
    right: 20,
    width: 110,
    height: 160,
    borderRadius: 14,
    overflow: "hidden",
    zIndex: 10,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.2)",
  },
  localVideo: {
    flex: 1,
  },
  flipButton: {
    position: "absolute",
    bottom: 6,
    right: 6,
    backgroundColor: "rgba(0,0,0,0.45)",
    borderRadius: 12,
    padding: 4,
  },
  controls: {
    paddingBottom: 40,
    paddingHorizontal: 32,
    gap: 24,
  },
  controlRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 24,
  },
  controlBtn: {
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.1)",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 20,
    minWidth: 80,
  },
  controlBtnActive: {
    backgroundColor: "rgba(255,82,82,0.15)",
  },
  controlLabel: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 11,
    fontWeight: "500",
  },
  controlLabelActive: {
    color: "#FF5252",
  },
  endRow: {
    alignItems: "center",
  },
  endButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#FF3B30",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#FF3B30",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
});
