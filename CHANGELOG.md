# Changelog

All notable changes to SafeMark.

## [1.2.0] — 2026-07-14

### Added
- **Web Crypto Support** — Integrated `expo-standard-web-crypto` to polyfill global `crypto.subtle` APIs at the React Native runtime level for file/audio and queue encryption.
- **Markers Database Trigger** — Introduced [supabase-schema-markers-lat-lng.sql](file:///D:/tracker/safemark/supabase-schema-markers-lat-lng.sql) to add `latitude` and `longitude` columns to the `markers` table and keep PostGIS spatial `location` geography automatically synchronized.
- **Profiles Auto-creation Trigger** — Introduced [supabase-schema-profiles-trigger.sql](file:///D:/tracker/safemark/supabase-schema-profiles-trigger.sql) to automatically handle creating missing profiles upon user signup.
- **Pairings RLS Fix Migration** — Introduced [supabase-schema-pairings-rls-fix.sql](file:///D:/tracker/safemark/supabase-schema-pairings-rls-fix.sql) to support reciprocal pairing row inserts by the authenticated user.
- **Android Release Key Configuration** — Created a new standalone release keystore, stored properties locally in gitignored file, and registered variables to GitHub Repository Secrets.

### Fixed
- **`Property 'crypto' doesn't exist` Crash** — Migrated random value and UUID generation in `pairing.ts`, `contacts.ts`, and `markers.ts` to use `expo-crypto`'s native APIs (`getRandomBytes`, `randomUUID`).
- **Silent Pairing Failure** — Statically imported `redeemInviteCode` in the pairing screen UI and added error validation checks on database insertions to throw and display errors as Native Alerts.
- **ESLint Clean-up** — Resolved 33 compiler errors and 24 warnings (duplicate imports, component declaration in render body, unescaped quotes) across the React Native code.
- **Argon2 Bundler Compatibility** — Removed native C-based `@node-rs/argon2` module from `package.json` and migrated password hashing to a salted SHA-256 algorithm via `expo-crypto` in `pin-hash.ts`.

## [1.1.0] — 2026-07-12

### Added
- **SOS feature** — one-tap emergency activation with SMS, audio recording, and partner notification
- **Emergency contacts** — add/edit/remove contacts from device address book, stored locally in SecureStore
- **Boot receiver** — location tracking auto-restarts after device reboot
- **Tracking persistence** — tracking state saved in SecureStore; resumes on app open
- **Battery optimization** — settings screen option to open battery optimization for reliable background tracking
- **`stopWithTask=false`** — activity keeps foreground service alive when task is cleared
- `REQUEST_IGNORE_BATTERY_OPTIMIZATIONS` permission
- `supabase-schema-sos.sql` — sos_events table + notify_partner_sos RPC

### Fixed
- Expo-av `UnsatisfiedLinkError` crash — replaced with expo-audio
- SOS screen crash from react-native-maps MapView without Google API key — replaced with location card + Open in Maps link
- `reactNativeArchitectures` double-bracket error in app/build.gradle — kept only in gradle.properties

### Changed
- `audioRecorder.ts` rewritten to use `expo-audio` (`AudioModule.AudioRecorder`, `RecordingPresets.HIGH_QUALITY`)
- Foreground service config: `killServiceOnDestroy: false`, `Accuracy.Balanced` for battery efficiency
- Upgraded to Gradle 9.3.1 (default from SDK 57 clean prebuild)

## [1.0.0] — 2026-07-12

### Added
- Initial release
- Calculator decoy with 3-finger touch → 6-digit PIN unlock
- Bidirectional partner pairing via invite codes
- Continuous background location tracking via foreground service
- Geofence detection with configurable marker radii (50m / 100m / 250m / 500m)
- Real-time partner location feed with pull-to-refresh
- Push notifications for geofence crossings (mutable without losing in-app updates)
- Supabase + PostGIS backend with Row Level Security
- Demo/offline mode when backend is unconfigured
- NativeWind v4 styling with custom dark theme
- lucide-react-native icons throughout
