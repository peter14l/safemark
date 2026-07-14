import * as SecureStore from "expo-secure-store";
import { validatePhoneNumber, validateDisplayName, sanitizePhoneNumber, sanitizeTextInput } from "./validation";
import { randomUUID } from "expo-crypto";

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
  const sanitizedName = sanitizeTextInput(name, 100);
  const sanitizedPhone = sanitizePhoneNumber(phone);
  
  if (!validateDisplayName(sanitizedName)) {
    throw new Error("Invalid name. Use 1-100 characters, letters, numbers, spaces, hyphens only.");
  }
  if (!validatePhoneNumber(sanitizedPhone)) {
    throw new Error("Invalid phone number. Must be 7-15 digits with optional + prefix.");
  }

  const contacts = await getEmergencyContacts();
  if (contacts.length >= MAX_EMERGENCY_CONTACTS) {
    throw new Error(`Maximum ${MAX_EMERGENCY_CONTACTS} emergency contacts allowed`);
  }

  const newContact: EmergencyContact = {
    id: randomUUID(),
    name: sanitizedName,
    phone: sanitizedPhone,
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
  
  if (updates.name) {
    const sanitizedName = sanitizeTextInput(updates.name, 100);
    if (!validateDisplayName(sanitizedName)) {
      throw new Error("Invalid name");
    }
    contacts[idx].name = sanitizedName;
  }
  if (updates.phone) {
    const sanitizedPhone = sanitizePhoneNumber(updates.phone);
    if (!validatePhoneNumber(sanitizedPhone)) {
      throw new Error("Invalid phone number");
    }
    contacts[idx].phone = sanitizedPhone;
  }
  await SecureStore.setItemAsync(CONTACTS_KEY, JSON.stringify(contacts));
}
