import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  getEmergencyContacts,
  addEmergencyContact,
  removeEmergencyContact,
  updateEmergencyContact,
  EmergencyContact,
  MAX_EMERGENCY_CONTACTS,
} from "../../lib/contacts";
import {
  ArrowLeft,
  Plus,
  Phone,
  Trash2,
  Edit3,
  User,
  AlertTriangle,
} from "lucide-react-native";

export default function EmergencyContactsScreen() {
  const router = useRouter();
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingContact, setEditingContact] = useState<EmergencyContact | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const loadContacts = useCallback(async () => {
    const loaded = await getEmergencyContacts();
    setContacts(loaded);
  }, []);

  useEffect(() => {
    loadContacts();
  }, [loadContacts]);

  const openAdd = () => {
    setEditingContact(null);
    setName("");
    setPhone("");
    setModalVisible(true);
  };

  const openEdit = (contact: EmergencyContact) => {
    setEditingContact(contact);
    setName(contact.name);
    setPhone(contact.phone);
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert("Error", "Name is required");
      return;
    }
    if (!phone.trim() || phone.replace(/[^\d]/g, "").length < 7) {
      Alert.alert("Error", "Enter a valid phone number");
      return;
    }

    try {
      if (editingContact) {
        await updateEmergencyContact(editingContact.id, {
          name: name.trim(),
          phone: phone.trim(),
        });
      } else {
        await addEmergencyContact(name.trim(), phone.trim());
      }
      setModalVisible(false);
      loadContacts();
    } catch (err: any) {
      Alert.alert("Error", err.message);
    }
  };

  const handleDelete = (contact: EmergencyContact) => {
    Alert.alert(
      "Remove Contact",
      `Remove ${contact.name} from emergency contacts?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            await removeEmergencyContact(contact.id);
            loadContacts();
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-bg" style={{ paddingBottom: 90 }}>
      <View className="flex-row items-center gap-3 px-5 pt-4 mb-1">
        <TouchableOpacity
          onPress={() => router.back()}
          activeOpacity={0.7}
          className="w-9 h-9 rounded-xl bg-bg-card items-center justify-center"
        >
          <ArrowLeft size={18} color="#8888AA" strokeWidth={1.8} />
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-white text-xl font-bold">
            Emergency Contacts
          </Text>
          <Text className="text-muted text-sm">
            {contacts.length}/{MAX_EMERGENCY_CONTACTS} contacts
          </Text>
        </View>
      </View>

      <ScrollView
        className="flex-1 px-5 pt-4"
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {contacts.length === 0 ? (
          <View className="bg-bg-card rounded-2xl p-8 items-center mt-4">
            <View className="w-14 h-14 rounded-2xl bg-danger/10 items-center justify-center mb-4">
              <AlertTriangle size={28} color="#FF5252" strokeWidth={1.5} />
            </View>
            <Text className="text-white text-base font-semibold mb-2">
              No Emergency Contacts
            </Text>
            <Text className="text-muted text-sm text-center leading-5 mb-5">
              Add up to {MAX_EMERGENCY_CONTACTS} contacts who will receive your
              SOS SMS with live location.
            </Text>
            <TouchableOpacity
              onPress={openAdd}
              activeOpacity={0.7}
              className="bg-accent px-6 py-3 rounded-xl"
            >
              <Text className="text-white text-sm font-semibold">
                Add First Contact
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View className="gap-3 mt-4">
            {contacts.map((contact) => (
              <View
                key={contact.id}
                className="bg-bg-card rounded-2xl px-4 py-4"
              >
                <View className="flex-row items-center gap-3">
                  <View className="w-11 h-11 rounded-xl bg-danger/10 items-center justify-center">
                    <User size={20} color="#FF5252" strokeWidth={1.8} />
                  </View>
                  <View className="flex-1">
                    <Text className="text-white text-base font-semibold">
                      {contact.name}
                    </Text>
                    <View className="flex-row items-center gap-1.5 mt-0.5">
                      <Phone size={12} color="#8888AA" strokeWidth={1.8} />
                      <Text className="text-muted text-sm">{contact.phone}</Text>
                    </View>
                  </View>
                  <View className="flex-row gap-2">
                    <TouchableOpacity
                      onPress={() => openEdit(contact)}
                      activeOpacity={0.7}
                      className="w-9 h-9 rounded-xl bg-bg-elevated items-center justify-center"
                    >
                      <Edit3 size={16} color="#8888AA" strokeWidth={1.8} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDelete(contact)}
                      activeOpacity={0.7}
                      className="w-9 h-9 rounded-xl bg-danger/10 items-center justify-center"
                    >
                      <Trash2 size={16} color="#FF5252" strokeWidth={1.8} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {contacts.length > 0 && contacts.length < MAX_EMERGENCY_CONTACTS && (
        <View className="px-5 pb-4">
          <TouchableOpacity
            onPress={openAdd}
            activeOpacity={0.7}
            className="bg-accent py-3.5 rounded-xl items-center"
          >
            <View className="flex-row items-center gap-2">
              <Plus size={18} color="#FFFFFF" strokeWidth={2} />
              <Text className="text-white text-sm font-semibold">
                Add Contact
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      )}

      {/* Add/Edit Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="flex-1"
        >
          <View className="flex-1 bg-black/60 justify-end">
            <View className="bg-bg-card rounded-t-3xl px-6 pt-6 pb-10">
              <View className="w-10 h-1 rounded-full bg-muted/30 self-center mb-5" />
              <Text className="text-white text-lg font-bold mb-5">
                {editingContact ? "Edit Contact" : "Add Emergency Contact"}
              </Text>

              <Text className="text-muted text-xs uppercase tracking-wider mb-2">
                Name
              </Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="e.g. Mom, Dad, Best Friend"
                placeholderTextColor="#555570"
                className="bg-bg rounded-xl px-4 py-3.5 text-white text-sm mb-4"
              />

              <Text className="text-muted text-xs uppercase tracking-wider mb-2">
                Phone Number
              </Text>
              <TextInput
                value={phone}
                onChangeText={setPhone}
                placeholder="+1 555 123 4567"
                placeholderTextColor="#555570"
                keyboardType="phone-pad"
                className="bg-bg rounded-xl px-4 py-3.5 text-white text-sm mb-6"
              />

              <View className="flex-row gap-3">
                <TouchableOpacity
                  onPress={() => setModalVisible(false)}
                  activeOpacity={0.7}
                  className="flex-1 bg-bg-elevated py-3.5 rounded-xl items-center"
                >
                  <Text className="text-muted text-sm font-semibold">
                    Cancel
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleSave}
                  activeOpacity={0.7}
                  className="flex-1 bg-accent py-3.5 rounded-xl items-center"
                >
                  <Text className="text-white text-sm font-semibold">
                    {editingContact ? "Save" : "Add"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}
