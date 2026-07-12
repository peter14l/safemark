# SafeMark

A discreet safety tracking app disguised as a calculator. Looks like a normal calc app on your home screen — secretly tracks location checkpoints and notifies your partner when geofences are crossed.

Built with **Expo SDK 57**, **React Native 0.86**, **Supabase + PostGIS**, and **NativeWind v4**.

## Features

### Calculator Decoy
- Functional calculator as the default screen
- 3-finger touch reveals the hidden PIN entry screen
- 6-digit PIN unlocks the real app
- App icon and name show as "Calc" on the home screen

### SOS
- Emergency SOS with one-tap activation
- Sends SMS to all emergency contacts
- Records audio clip during SOS event
- Logs SOS to Supabase with GPS coordinates
- Notifies partner immediately in-app
- Quick-access card on the dashboard

### Emergency Contacts
- Add, edit, and remove emergency contacts
- Stored locally in SecureStore
- Contact picker from device address book
- Maximum 10 contacts

### Location Tracking
- Continuous background location tracking via foreground service
- GPS coordinates with accuracy reporting
- Automatic geofence detection when entering/exiting marker zones
- Survives app kill and device reboot via BootReceiver
- Battery optimization exemption prompt in Settings

### Geofence Markers
- Add named checkpoints with custom radius (50m / 100m / 250m / 500m)
- Uses your current GPS location when placing markers
- PostGIS-powered spatial queries for efficient distance calculations

### Partner Pairing
- Generate a 6-digit invite code (expires in 24 hours)
- Enter your partner's code to link devices bidirectionally
- Both partners can see each other's location updates

### Feed
- Real-time feed of partner location updates
- Geofence crossing events with marker names
- Pull-to-refresh with live Supabase subscriptions
- Push notifications can be muted — updates still appear in-app

### Settings
- Toggle push notifications on/off
- Battery optimization settings for reliable background tracking
- Emergency contacts management
- Reset PIN
- Sign out

## Architecture

```
safemark/
├── app/                    # Expo Router screens
│   ├── (app)/              # Authenticated screens (bottom nav)
│   │   ├── dashboard.tsx   # Overview: tracking status, markers, partner, SOS
│   │   ├── markers.tsx     # Add/manage geofence checkpoints
│   │   ├── feed.tsx        # Partner location updates
│   │   ├── pairing.tsx     # Generate/redeem invite codes
│   │   ├── settings.tsx    # Account, notifications, battery, security
│   │   ├── sos.tsx         # Emergency SOS activation
│   │   └── emergency-contacts.tsx  # Manage emergency contacts
│   ├── (auth)/
│   │   └── login.tsx       # Email/password login
│   ├── calculator.tsx      # Decoy calculator screen
│   ├── setup-pin.tsx       # Initial PIN creation
│   └── index.tsx           # Entry: checks PIN → calculator or app
├── components/             # Reusable UI components
│   ├── Calculator.tsx      # Full calculator with eval engine
│   ├── FeedCard.tsx        # Feed item card
│   ├── MarkerCard.tsx      # Marker info card
│   └── PinInput.tsx        # 6-digit PIN entry with auto-advance
├── hooks/                  # React hooks
│   ├── useAuth.ts          # Auth state + demo mode fallback
│   ├── useLocation.ts      # GPS location watching
│   └── useMarkers.ts       # Marker CRUD
├── services/               # Backend integration
│   ├── supabase.ts         # Client init (demo mode if unconfigured)
│   ├── auth.ts             # Sign up, sign in, sign out
│   ├── markers.ts          # Marker CRUD via Supabase
│   ├── pairing.ts          # Invite code generation + redemption
│   ├── location.ts         # Foreground service + geofence detection
│   ├── notifications.ts    # Push notification registration
│   ├── audioRecorder.ts    # SOS audio recording (expo-audio)
│   └── sos.ts              # SOS activation orchestrator
├── lib/                    # Utilities
│   ├── battery.ts          # Battery optimization settings
│   ├── constants.ts        # App-wide constants
│   ├── contacts.ts         # Emergency contacts CRUD
│   ├── geofence.ts         # Haversine distance calculation
│   ├── icons.tsx           # SVG icon components
│   └── securestore.ts      # Encrypted PIN + tracking preference
├── supabase-schema.sql     # Core database schema (PostGIS, RLS, RPCs)
├── supabase-schema-sos.sql # SOS events table + notify_partner_sos RPC
└── supabase/               # Supabase Edge Functions
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Expo SDK 57 + React Native 0.86 |
| Navigation | Expo Router v57 |
| Styling | NativeWind v4 (Tailwind CSS) |
| Icons | lucide-react-native |
| Database | Supabase (PostgreSQL + PostGIS) |
| Auth | Supabase Auth (email/password) |
| Location | expo-location + expo-task-manager (foreground service) |
| Audio | expo-audio (SOS recording) |
| SMS | expo-sms (emergency contacts) |
| Notifications | expo-notifications (Expo Push) |
| Secure Storage | expo-secure-store (PIN, contacts, tracking state) |
| Animations | react-native-reanimated |
| Maps | react-native-maps (markers view) |

## Database Schema

PostGIS-powered tables with Row Level Security:

- **profiles** — User display name, push token, notification preference
- **pairings** — Bidirectional partner links
- **invite_codes** — 6-char codes with expiry and used flag
- **markers** — Geofence checkpoints with geography POINT column + GIST index
- **geofence_events** — Entered/exited events per marker
- **location_feed** — Shared location updates between partners
- **sos_events** — SOS activations with coordinates, audio path, SMS status

RPC functions:
- `get_marker_location(marker_id)` — Extract lat/lng from geography
- `find_nearby_markers(user, lat, lng, max_dist)` — Find markers within distance
- `notify_partner_sos(sos_lat, sos_lng)` — Alert partner of SOS event

See [`supabase-schema.sql`](supabase-schema.sql) and [`supabase-schema-sos.sql`](supabase-schema-sos.sql) for the full schema.

## Getting Started

### Prerequisites

- Node.js 18+
- Expo CLI (`npm install -g expo-cli`)
- Supabase project (free tier works)
- Android device or emulator

### 1. Clone & Install

```bash
git clone https://github.com/YOUR_USERNAME/safemark.git
cd safemark
npm install --legacy-peer-deps
```

### 2. Set Up Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Run `supabase-schema.sql` in the SQL Editor
3. Run `supabase-schema-sos.sql` for SOS features
4. Copy your project URL and anon key

### 3. Configure Environment

Update `services/supabase.ts` with your Supabase credentials:

```typescript
const SUPABASE_URL = "https://YOUR_PROJECT.supabase.co";
const SUPABASE_ANON_KEY = "YOUR_ANON_KEY";
```

> The app runs in **demo mode** if these are left as placeholders — no crashes, just no backend.

### 4. Run

```bash
npx expo start
```

Scan the QR code with Expo Go (SDK 57) or run on emulator:

```bash
npx expo run:android
```

### 5. Build APK (Standalone)

```bash
npx expo prebuild --platform android --clean
cd android && ./gradlew assembleRelease
```

APK output: `android/app/build/outputs/apk/release/app-release.apk`

## How It Works

1. **Launch** — Calculator opens by default
2. **Unlock** — 3-finger touch → enter 6-digit PIN → app unlocks
3. **Track** — Location tracking runs as a foreground service, even when backgrounded
4. **Detect** — When GPS enters/exits a marker's radius, a geofence event fires
5. **Notify** — Partner receives a push notification (if enabled) and sees the update in the Feed
6. **Pair** — Generate a code on Device A, enter it on Device B to link them
7. **SOS** — Tap SOS button → SMS to all contacts + audio recording + partner alert

## Permissions

The app requests:
- **Fine/Coarse Location** — GPS tracking
- **Background Location** — Continuous tracking when app is backgrounded
- **Foreground Service** — Persistent notification for background location
- **Notifications** — Push alerts for geofence crossings
- **Boot Completed** — Restart tracking after device reboot
- **Record Audio** — SOS audio clip recording
- **Send SMS** — Emergency text messages to contacts
- **Read/Write Contacts** — Pick emergency contacts from address book
- **Battery Optimization** — Prevent system from killing background tracking

## License

MIT
