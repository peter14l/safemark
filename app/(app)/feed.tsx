import React, { useState, useEffect, useCallback } from "react";
import { View, Text, FlatList, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../hooks/useAuth";
import { supabase, isConfigured } from "../../services/supabase";
import { getPartner } from "../../services/pairing";
import { FeedCard, FeedItem } from "../../components/FeedCard";
import { Navigation } from "lucide-react-native";

export default function FeedScreen() {
  const { user } = useAuth();
  const [items, setItems] = useState<FeedItem[]>([]);
  const [partnerName, setPartnerName] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchFeed = useCallback(async () => {
    if (!user) return;

    const partner = await getPartner(user.id);
    if (partner && isConfigured && supabase) {
      setPartnerName(partner.name);

      const { data } = await supabase
        .from("location_feed")
        .select("*")
        .eq("user_id", partner.id)
        .order("created_at", { ascending: false })
        .limit(50);

      setItems(data || []);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchFeed();
  }, [fetchFeed]);

  useEffect(() => {
    if (!user || !isConfigured || !supabase) return;

    const channel = supabase
      .channel("feed-changes")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "location_feed",
        },
        (payload) => {
          setItems((prev) => [payload.new as FeedItem, ...prev]);
        }
      )
      .subscribe();

    return () => {
      if (supabase) supabase.removeChannel(channel);
    };
  }, [user]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchFeed();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-bg items-center justify-center">
        <Text className="text-muted">Loading feed...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-bg">
      <View className="px-5 pt-4 mb-2">
        <Text className="text-white text-2xl font-bold mb-1">Feed</Text>
        <Text className="text-muted text-sm">
          {partnerName ? `${partnerName}'s location updates` : "Partner updates"}
        </Text>
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <FeedCard item={item} />}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#6C63FF"
          />
        }
        ListEmptyComponent={
          <View className="items-center justify-center mt-24">
            <View className="w-14 h-14 rounded-2xl bg-bg-card items-center justify-center mb-4">
              <Navigation size={28} color="#555570" strokeWidth={1.5} />
            </View>
            <Text className="text-muted text-center text-sm leading-5">
              No updates yet.{"\n"}
              {partnerName
                ? `${partnerName}'s location updates will appear here.`
                : "Pair with a partner to see their updates."}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}
