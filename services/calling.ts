/**
 * services/calling.ts
 *
 * VoIP calling service — WebRTC peer connection + Supabase Realtime signaling.
 *
 * Architecture:
 *  - Supabase Realtime Broadcast is used for signaling (offer/answer/ICE).
 *    This is ephemeral (no DB writes for signals), ultra-low latency, and
 *    requires no extra infrastructure.
 *  - The `calls` DB table records call metadata for logs/history.
 *  - STUN: Google's free servers (works for most networks).
 *  - react-native-webrtc handles the actual peer-to-peer audio/video.
 */

import {
  RTCPeerConnection,
  RTCIceCandidate,
  RTCSessionDescription,
  mediaDevices,
  MediaStream,
} from "react-native-webrtc";
import { supabase, isConfigured } from "./supabase";

// ─── STUN / TURN config ──────────────────────────────────────────────────────
const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun2.l.google.com:19302" },
];

// ─── Types ───────────────────────────────────────────────────────────────────
export type CallType = "audio" | "video";

export type CallStatus =
  | "ringing"
  | "active"
  | "ended"
  | "missed"
  | "declined";

export interface CallRecord {
  id: string;
  caller_id: string;
  callee_id: string;
  call_type: CallType;
  status: CallStatus;
  started_at: string;
  answered_at: string | null;
  ended_at: string | null;
  duration_seconds: number | null;
  ended_by: string | null;
  // Joined profile names
  caller?: { display_name: string };
  callee?: { display_name: string };
}

// ─── Module-level state ──────────────────────────────────────────────────────
let pc: RTCPeerConnection | null = null;
let localStream: MediaStream | null = null;
let remoteStream: MediaStream | null = null;
let signalingChannel: ReturnType<typeof supabase.channel> | null = null;
let currentCallId: string | null = null;
let onRemoteStreamCallback: ((stream: MediaStream) => void) | null = null;
let onCallEndedCallback: (() => void) | null = null;
let pendingCandidates: RTCIceCandidate[] = [];

// ─── Helpers ─────────────────────────────────────────────────────────────────
function channelId(callId: string) {
  return `call:${callId}`;
}

async function getLocalStream(callType: CallType): Promise<MediaStream> {
  const constraints = {
    audio: true,
    video:
      callType === "video"
        ? { facingMode: "user", width: 640, height: 480 }
        : false,
  };
  const stream = await mediaDevices.getUserMedia(constraints);
  return stream as unknown as MediaStream;
}

function createPeerConnection(): RTCPeerConnection {
  const connection = new RTCPeerConnection({ iceServers: ICE_SERVERS });
  return connection;
}

function cleanup() {
  localStream?.getTracks().forEach((t) => t.stop());
  localStream = null;
  remoteStream = null;
  pendingCandidates = [];

  if (pc) {
    pc.close();
    pc = null;
  }

  if (signalingChannel && isConfigured && supabase) {
    supabase.removeChannel(signalingChannel);
    signalingChannel = null;
  }

  currentCallId = null;
  onRemoteStreamCallback = null;
  onCallEndedCallback = null;
}

// ─── Signaling channel setup ─────────────────────────────────────────────────
function setupSignalingChannel(
  callId: string,
  isCaller: boolean,
  onOffer?: (sdp: RTCSessionDescription) => void
) {
  if (!isConfigured || !supabase) return;

  signalingChannel = supabase
    .channel(channelId(callId))
    .on("broadcast", { event: "offer" }, async ({ payload }) => {
      if (isCaller) return; // caller never receives own offer
      if (!pc) return;
      const sdp = new RTCSessionDescription(payload);
      await pc.setRemoteDescription(sdp);
      // Drain pending candidates
      for (const c of pendingCandidates) {
        await pc.addIceCandidate(c).catch(() => {});
      }
      pendingCandidates = [];
      onOffer?.(sdp);
    })
    .on("broadcast", { event: "answer" }, async ({ payload }) => {
      if (!isCaller || !pc) return;
      const sdp = new RTCSessionDescription(payload);
      await pc.setRemoteDescription(sdp);
      for (const c of pendingCandidates) {
        await pc.addIceCandidate(c).catch(() => {});
      }
      pendingCandidates = [];
    })
    .on("broadcast", { event: "ice-candidate" }, async ({ payload }) => {
      if (!pc) return;
      const candidate = new RTCIceCandidate(payload);
      if (pc.remoteDescription) {
        await pc.addIceCandidate(candidate).catch(() => {});
      } else {
        pendingCandidates.push(candidate);
      }
    })
    .on("broadcast", { event: "hangup" }, () => {
      onCallEndedCallback?.();
      cleanup();
    })
    .subscribe();
}

function sendSignal(event: string, payload: object) {
  if (!signalingChannel) return;
  signalingChannel.send({ type: "broadcast", event, payload });
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Initiate a call. Creates the DB row, acquires media, creates the peer
 * connection, generates an offer, and sends it via signaling.
 */
export async function startCall(
  callerId: string,
  calleeId: string,
  callType: CallType,
  callbacks: {
    onRemoteStream: (stream: MediaStream) => void;
    onCallEnded: () => void;
  }
): Promise<string> {
  if (!isConfigured || !supabase) throw new Error("Supabase not configured");

  // 1. Create call record
  const { data: callRow, error } = await supabase
    .from("calls")
    .insert({
      caller_id: callerId,
      callee_id: calleeId,
      call_type: callType,
      status: "ringing",
    })
    .select("id")
    .single();
  if (error || !callRow) throw new Error(error?.message ?? "Failed to create call");

  currentCallId = callRow.id;
  onRemoteStreamCallback = callbacks.onRemoteStream;
  onCallEndedCallback = callbacks.onCallEnded;

  // 2. Get local media
  localStream = await getLocalStream(callType);

  // 3. Create peer connection
  pc = createPeerConnection();

  // Add local tracks
  localStream.getTracks().forEach((track) => {
    pc!.addTrack(track, localStream!);
  });

  // Listen for remote track
  (pc as any).ontrack = (event: any) => {
    const streams = event.streams;
    if (streams && streams[0]) {
      remoteStream = streams[0];
      callbacks.onRemoteStream(streams[0]);
    }
  };

  // ICE candidate handler
  (pc as any).onicecandidate = (event: any) => {
    if (event.candidate) {
      sendSignal("ice-candidate", event.candidate.toJSON());
    }
  };

  // 4. Setup signaling channel
  setupSignalingChannel(currentCallId, true);

  // 5. Create and send offer
  const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: callType === "video" });
  await pc.setLocalDescription(offer);
  sendSignal("offer", offer);

  return currentCallId;
}

/**
 * Answer an incoming call. Called by callee when they accept.
 */
export async function answerCall(
  callId: string,
  callType: CallType,
  callbacks: {
    onRemoteStream: (stream: MediaStream) => void;
    onCallEnded: () => void;
  }
): Promise<void> {
  if (!isConfigured || !supabase) throw new Error("Supabase not configured");

  currentCallId = callId;
  onRemoteStreamCallback = callbacks.onRemoteStream;
  onCallEndedCallback = callbacks.onCallEnded;

  // 1. Update call record
  await supabase
    .from("calls")
    .update({ status: "active", answered_at: new Date().toISOString() })
    .eq("id", callId);

  // 2. Get local media
  localStream = await getLocalStream(callType);

  // 3. Create peer connection
  pc = createPeerConnection();

  localStream.getTracks().forEach((track) => {
    pc!.addTrack(track, localStream!);
  });

  (pc as any).ontrack = (event: any) => {
    const streams = event.streams;
    if (streams && streams[0]) {
      remoteStream = streams[0];
      callbacks.onRemoteStream(streams[0]);
    }
  };

  (pc as any).onicecandidate = (event: any) => {
    if (event.candidate) {
      sendSignal("ice-candidate", event.candidate.toJSON());
    }
  };

  // 4. Setup signaling — callee receives offer here, then creates answer
  setupSignalingChannel(callId, false, async (_offer) => {
    if (!pc) return;
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    sendSignal("answer", answer);
  });
}

/**
 * End/hang up the current call. Updates DB record and broadcasts hangup.
 */
export async function endCall(endedByUserId: string): Promise<void> {
  if (!currentCallId || !isConfigured || !supabase) {
    cleanup();
    return;
  }

  const callId = currentCallId;

  // Compute duration
  const { data: callRow } = await supabase
    .from("calls")
    .select("answered_at, status")
    .eq("id", callId)
    .single();

  const now = new Date();
  let duration: number | null = null;
  if (callRow?.answered_at) {
    duration = Math.round(
      (now.getTime() - new Date(callRow.answered_at).getTime()) / 1000
    );
  }

  const finalStatus: CallStatus =
    callRow?.status === "ringing" ? "missed" : "ended";

  await supabase
    .from("calls")
    .update({
      status: finalStatus,
      ended_at: now.toISOString(),
      duration_seconds: duration,
      ended_by: endedByUserId,
    })
    .eq("id", callId);

  // Notify the other peer
  sendSignal("hangup", {});

  cleanup();
}

/**
 * Decline an incoming call without answering.
 */
export async function declineCall(callId: string): Promise<void> {
  if (!isConfigured || !supabase) return;

  // Join channel briefly to send hangup signal
  const ch = supabase.channel(channelId(callId));
  await new Promise<void>((resolve) => {
    ch.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        ch.send({ type: "broadcast", event: "hangup", payload: {} });
        setTimeout(() => {
          supabase!.removeChannel(ch);
          resolve();
        }, 500);
      }
    });
  });

  await supabase
    .from("calls")
    .update({ status: "declined", ended_at: new Date().toISOString() })
    .eq("id", callId);
}

// ─── Media controls ───────────────────────────────────────────────────────────

export function setMicMuted(muted: boolean) {
  localStream?.getAudioTracks().forEach((t) => {
    t.enabled = !muted;
  });
}

export function setCameraEnabled(enabled: boolean) {
  localStream?.getVideoTracks().forEach((t) => {
    t.enabled = enabled;
  });
}

export function flipCamera() {
  const videoTrack = localStream?.getVideoTracks()[0];
  if (videoTrack) {
    (videoTrack as any)._switchCamera?.();
  }
}

export function getLocalStream(): MediaStream | null {
  return localStream;
}

export function getRemoteStream(): MediaStream | null {
  return remoteStream;
}

export function getCurrentCallId(): string | null {
  return currentCallId;
}

// ─── Call log helpers ─────────────────────────────────────────────────────────

export async function getCallLogs(userId: string): Promise<CallRecord[]> {
  if (!isConfigured || !supabase) return [];

  const { data } = await supabase
    .from("calls")
    .select(
      `id, caller_id, callee_id, call_type, status, started_at,
       answered_at, ended_at, duration_seconds, ended_by,
       caller:profiles!caller_id(display_name),
       callee:profiles!callee_id(display_name)`
    )
    .or(`caller_id.eq.${userId},callee_id.eq.${userId}`)
    .order("started_at", { ascending: false })
    .limit(50);

  return (data ?? []) as unknown as CallRecord[];
}

export function formatDuration(seconds: number | null): string {
  if (!seconds || seconds < 1) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
