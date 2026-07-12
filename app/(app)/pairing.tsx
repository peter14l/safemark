import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../hooks/useAuth";
import { createInviteCode, getPartner } from "../../services/pairing";
import { Check, RefreshCw, User } from "lucide-react-native";

export default function PairingScreen() {
  const { user } = useAuth();
  const [inviteCode, setInviteCode] = useState("");
  const [partner, setPartner] = useState<{ id: string; name: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [redeemCode, setRedeemCode] = useState("");
  const [redeeming, setRedeeming] = useState(false);

  useEffect(() => {
    if (!user) return;
    getPartner(user.id).then((p) => {
      setPartner(p);
      setLoading(false);
    });
  }, [user]);

  const handleGenerate = async () => {
    if (!user) return;
    setGenerating(true);
    try {
      const code = await createInviteCode(user.id);
      setInviteCode(code);
    } catch (err: any) {
      Alert.alert("Error", err.message);
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-bg items-center justify-center">
        <ActivityIndicator size="large" color="#6C63FF" />
      </SafeAreaView>
    );
  }

  if (partner) {
    return (
      <SafeAreaView className="flex-1 bg-bg px-5 pt-4" style={{ paddingBottom: 90 }}>
        <Text className="text-white text-2xl font-bold mb-1">Paired</Text>
        <Text className="text-muted text-sm mb-6">
          Connected with your partner
        </Text>

        <View className="bg-bg-card rounded-2xl p-6 items-center">
          <View className="w-16 h-16 rounded-2xl bg-accent/15 items-center justify-center mb-4">
            <User size={28} color="#6C63FF" strokeWidth={1.8} />
          </View>
          <Text className="text-white text-xl font-semibold mb-1">
            {partner.name}
          </Text>
          <Text className="text-muted text-sm">Your safety partner</Text>

          <View className="mt-6 bg-success/10 px-4 py-3 rounded-xl flex-row items-center gap-2">
            <Check size={16} color="#00C853" strokeWidth={2} />
            <Text className="text-success text-sm font-medium">
              You'll receive their location updates
            </Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-bg px-5 pt-4">
      <Text className="text-white text-2xl font-bold mb-1">Pair Device</Text>
      <Text className="text-muted text-sm mb-6">
        Connect with your partner
      </Text>

      {/* Share Code */}
      <View className="bg-bg-card rounded-2xl p-5 mb-4">
        <Text className="text-white text-lg font-semibold mb-2">
          Share Your Code
        </Text>
        <Text className="text-muted text-sm mb-4">
          Give this code to your partner to pair
        </Text>

        {inviteCode ? (
          <View className="bg-bg rounded-xl p-4 items-center">
            <Text className="text-accent text-3xl font-mono font-bold tracking-widest">
              {inviteCode}
            </Text>
            <Text className="text-muted text-xs mt-2">Expires in 24 hours</Text>
          </View>
        ) : (
          <TouchableOpacity
            onPress={handleGenerate}
            disabled={generating}
            activeOpacity={0.7}
            className="bg-accent py-3 rounded-xl items-center flex-row justify-center gap-2"
          >
            {generating ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <RefreshCw size={16} color="#FFFFFF" strokeWidth={2} />
            )}
            <Text className="text-white font-medium">
              {generating ? "Generating..." : "Generate Code"}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Enter Code */}
      <View className="bg-bg-card rounded-2xl p-5">
        <Text className="text-white text-lg font-semibold mb-2">
          Enter Partner's Code
        </Text>
        <Text className="text-muted text-sm mb-4">
          Paste the code your partner shared
        </Text>

        <TextInput
          value={redeemCode}
          onChangeText={(t) => setRedeemCode(t.toUpperCase())}
          placeholder="XXXXXX"
          placeholderTextColor="#555570"
          autoCapitalize="characters"
          maxLength={6}
          className="bg-bg rounded-xl px-4 py-4 text-white text-center text-xl font-mono tracking-widest mb-4"
        />

        <TouchableOpacity
          onPress={async () => {
            if (!user || redeemCode.length !== 6) return;
            setRedeeming(true);
            try {
              const { redeemInviteCode } = await import("../../services/pairing");
              await redeemInviteCode(redeemCode, user.id);
              const p = await getPartner(user.id);
              setPartner(p);
            } catch (err: any) {
              Alert.alert("Error", err.message);
            } finally {
              setRedeeming(false);
            }
          }}
          disabled={redeeming || redeemCode.length !== 6}
          activeOpacity={0.7}
          className={`py-4 rounded-xl items-center ${
            redeemCode.length === 6 && !redeeming
              ? "bg-accent"
              : "bg-bg-elevated"
          }`}
        >
          <Text
            className={`font-medium ${
              redeemCode.length === 6 && !redeeming
                ? "text-white"
                : "text-muted"
            }`}
          >
            {redeeming ? "Pairing..." : "Pair Now"}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
