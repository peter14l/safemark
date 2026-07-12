import * as SecureStore from "expo-secure-store";

const CONTACTS_KEY = "safemark_emergency_contacts";
export const MAX_EMERGENCY_CONTACTS = 10;

export interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  addedAt: number;
}

export async function getEmergencyContacts(): Promise<EmergencyContact[]> {
  const raw = await SecureStore.getItemAsync(CONTACTS_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export async function addEmergencyContact(
  name: string,
  phone: string
): Promise<EmergencyContact> {
  const contacts = await getEmergencyContacts();
  if (contacts.length >= MAX_EMERGENCY_CONTACTS) {
    throw new Error(`Maximum ${MAX_EMERGENCY_CONTACTS} emergency contacts allowed`);
  }

  const newContact: EmergencyContact = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    name: name.trim(),
    phone: phone.replace(/[^\d+]/g, ""),
    addedAt: Date.now(),
  };

  contacts.push(newContact);
  await SecureStore.setItemAsync(CONTACTS_KEY, JSON.stringify(contacts));
  return newContact;
}

export async function removeEmergencyContact(id: string): Promise<void> {
  const contacts = await getEmergencyContacts();
  const filtered = contacts.filter((c) => c.id !== id);
  await SecureStore.setItemAsync(CONTACTS_KEY, JSON.stringify(filtered));
}

export async function updateEmergencyContact(
  id: string,
  updates: Partial<Pick<EmergencyContact, "name" | "phone">>
): Promise<void> {
  const contacts = await getEmergencyContacts();
  const idx = contacts.findIndex((c) => c.id === id);
  if (idx === -1) throw new Error("Contact not found");
  if (updates.name) contacts[idx].name = updates.name.trim();
  if (updates.phone) contacts[idx].phone = updates.phone.replace(/[^\d+]/g, "");
  await SecureStore.setItemAsync(CONTACTS_KEY, JSON.stringify(contacts));
}
