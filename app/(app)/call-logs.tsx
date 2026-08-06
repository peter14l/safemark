import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { PhoneIncoming, PhoneOutgoing, PhoneMissed, Video, Phone } from "lucide-react-native";
import { useAuth } from "../../hooks/useAuth";
import { getCallLogs, formatDuration, CallRecord } from "../../services/calling";

export default function CallLogsScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [logs, setLogs] = useState<CallRecord[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    if (!user) return;
    const data = await getCallLogs(user.id);
    setLogs(data);
  };

  useEffect(() => {
    load();
  }, [user]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const renderItem = ({ item }: { item: CallRecord }) => {
    const isOutgoing = item.caller_id === user?.id;
    const remoteName = isOutgoing
      ? (item.callee as any)?.display_name ?? "Partner"
      : (item.caller as any)?.display_name ?? "Partner";
    const isMissed = item.status === "missed" || item.status === "declined";

    const Icon = isMissed
      ? PhoneMissed
      : isOutgoing
      ? PhoneOutgoing
      : PhoneIncoming;

    const iconColor = isMissed ? "#FF5252" : isOutgoing ? "#6C63FF" : "#00C853";
    const callDate = new Date(item.started_at);
    const dateLabel = callDate.toLocaleDateString([], {
      month: "short",
      day: "numeric",
    });
    const timeLabel = callDate.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    return (
      <View style={logStyles.row}>
        <View style={[logStyles.iconWrap, { backgroundColor: `${iconColor}18` }]}>
          <Icon size={20} color={iconColor} strokeWidth={1.8} />
        </View>
        <View style={logStyles.info}>
          <Text style={logStyles.name}>{remoteName}</Text>
          <View style={logStyles.meta}>
            {item.call_type === "video" ? (
              <Video size={11} color="#555570" strokeWidth={1.6} />
            ) : (
              <Phone size={11} color="#555570" strokeWidth={1.6} />
            )}
            <Text style={logStyles.metaText}>
              {isMissed
                ? "Missed"
                : formatDuration(item.duration_seconds)}
              {"  ·  "}
              {dateLabel} {timeLabel}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={logStyles.container}>
      <View style={logStyles.header}>
        <Text style={logStyles.title}>Call Logs</Text>
        <Text style={logStyles.sub}>Your recent calls</Text>
      </View>

      <FlatList
        data={logs}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={logStyles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#6C63FF"
          />
        }
        ListEmptyComponent={
          <View style={logStyles.empty}>
            <Phone size={36} color="#333350" strokeWidth={1.4} />
            <Text style={logStyles.emptyText}>No calls yet</Text>
          </View>
        }
        ItemSeparatorComponent={() => <View style={logStyles.separator} />}
      />
    </SafeAreaView>
  );
}

const logStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0A0A0F",
    paddingBottom: 90,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "700",
  },
  sub: {
    color: "#555570",
    fontSize: 13,
    marginTop: 2,
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    gap: 14,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  info: {
    flex: 1,
  },
  name: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
  meta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 3,
  },
  metaText: {
    color: "#555570",
    fontSize: 12,
  },
  separator: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.05)",
    marginLeft: 58,
  },
  empty: {
    alignItems: "center",
    paddingTop: 80,
    gap: 12,
  },
  emptyText: {
    color: "#333350",
    fontSize: 14,
  },
});
