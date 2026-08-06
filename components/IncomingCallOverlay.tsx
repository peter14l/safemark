import React, { useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Vibration,
} from "react-native";
import { useRouter } from "expo-router";
import { Phone, PhoneOff, Video } from "lucide-react-native";
import { declineCall, CallRecord } from "../services/calling";
import { startRingtone, stopRingtone } from "../lib/audio-routing";

interface IncomingCallOverlayProps {
  call: CallRecord;
  onDismiss: () => void;
}

const VIBRATE_PATTERN = [0, 400, 200, 400, 200, 400];

export function IncomingCallOverlay({ call, onDismiss }: IncomingCallOverlayProps) {
  const router = useRouter();
  const callerName = (call.caller as any)?.display_name ?? "Partner";

  useEffect(() => {
    // Ring + vibrate
    startRingtone();
    Vibration.vibrate(VIBRATE_PATTERN, true);

    return () => {
      stopRingtone();
      Vibration.cancel();
    };
  }, []);

  const handleAnswer = () => {
    stopRingtone();
    Vibration.cancel();
    onDismiss();
    router.push({
      pathname: "/(app)/call",
      params: {
        mode: "incoming",
        callId: call.id,
        callerId: call.caller_id,
        callerName,
        callType: call.call_type,
      },
    });
  };

  const handleDecline = async () => {
    stopRingtone();
    Vibration.cancel();
    onDismiss();
    await declineCall(call.id);
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        {/* Call type indicator */}
        <View style={styles.callTypeRow}>
          {call.call_type === "video" ? (
            <Video size={14} color="#6C63FF" strokeWidth={1.8} />
          ) : (
            <Phone size={14} color="#6C63FF" strokeWidth={1.8} />
          )}
          <Text style={styles.callTypeText}>
            Incoming {call.call_type === "video" ? "video" : "voice"} call
          </Text>
        </View>

        {/* Avatar */}
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {callerName.charAt(0).toUpperCase()}
          </Text>
        </View>

        <Text style={styles.callerName}>{callerName}</Text>

        {/* Action buttons */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.declineBtn]}
            onPress={handleDecline}
            activeOpacity={0.8}
          >
            <PhoneOff size={26} color="#fff" strokeWidth={2} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, styles.answerBtn]}
            onPress={handleAnswer}
            activeOpacity={0.8}
          >
            <Phone size={26} color="#fff" strokeWidth={2} />
          </TouchableOpacity>
        </View>

        <View style={styles.labels}>
          <Text style={styles.actionLabel}>Decline</Text>
          <Text style={styles.actionLabel}>Answer</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 999,
  },
  card: {
    backgroundColor: "#1A1A2E",
    borderRadius: 28,
    paddingHorizontal: 32,
    paddingVertical: 36,
    alignItems: "center",
    width: "85%",
    borderWidth: 1,
    borderColor: "rgba(108,99,255,0.25)",
    shadowColor: "#6C63FF",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 16,
  },
  callTypeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 20,
  },
  callTypeText: {
    color: "#6C63FF",
    fontSize: 13,
    fontWeight: "500",
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(108,99,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    borderWidth: 2,
    borderColor: "rgba(108,99,255,0.4)",
  },
  avatarText: {
    color: "#6C63FF",
    fontSize: 32,
    fontWeight: "700",
  },
  callerName: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 32,
  },
  actions: {
    flexDirection: "row",
    gap: 48,
    marginBottom: 12,
  },
  actionBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  declineBtn: {
    backgroundColor: "#FF3B30",
    shadowColor: "#FF3B30",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
  answerBtn: {
    backgroundColor: "#00C853",
    shadowColor: "#00C853",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
  labels: {
    flexDirection: "row",
    gap: 72,
  },
  actionLabel: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 12,
    textAlign: "center",
    width: 64,
  },
});
