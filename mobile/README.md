# AccessiBooks Mobile

Native Android and Apple client for the AccessiBooks Adaptive Experience Platform (AAX).

## What this implementation is

This is a sibling Expo/React Native application, not a WebView wrapper. It consumes the existing AccessiBooks Express catalogue/audio API and implements native accessibility semantics for VoiceOver, TalkBack and alternative input.

### Implemented foundation

- Expo Router navigation: **Discover**, **Library**, **Experience**, **Book**, **Listen**, **Learn**.
- Catalogue listing and search using `/api/books` and `/api/books/search`.
- Native book-detail format negotiation based on actual source capability.
- Native audiobook player using `expo-audio` with play/pause, ±15 seconds, playback speed, background playback and lock-screen metadata.
- Local-only saved library using AsyncStorage.
- AAX `ExperienceProfile` with immediate **Preview**, explicit **Keep**, **Cancel**, **Undo**, and **Reset**.
- Text scaling, enhanced contrast, reading-support spacing, reduced-motion preference and enhanced target size.
- PostHog product analytics behind explicit opt-in, with session replay disabled and a property sanitizer that excludes reading/content/accessibility data.
- React Native Testing Library coverage for semantic controls, AAX persistence rules, capability honesty and analytics privacy.

### Deliberately not faked

The current server exposes catalogue and audio routes, but it does not expose canonical book text, synchronized transcripts, or a provenance-aware Learn endpoint. Therefore:

- native **Read** is not claimed as complete;
- **Read Along** remains disabled until transcript/text synchronization exists;
- the **Learn** screen shows catalogue metadata and provenance status, but generated historical/author/vocabulary content remains disabled until the server can return sourced material.

This preserves the AAX rule that planned capability must not be presented as verified capability.

## Local setup

```bash
cd mobile
cp .env.example .env.local
npm install
npm run typecheck
npm test
npx expo start
```

Set `EXPO_PUBLIC_API_BASE_URL` to an HTTPS AccessiBooks API origin reachable from the device or simulator.

For PostHog, set the public project key and host in local/EAS environment variables. Do not commit personal API keys. Anonymous product analytics is **off by default** in the app and can be enabled from the Experience tab.

## Builds

The bundle/package identifiers are currently `au.org.ad.accessibooks`; verify ownership and final naming before store submission.

```bash
# Link the project to an Expo/EAS account once
npx eas-cli init

# Internal Android/iOS build
npx eas-cli build --profile preview --platform all

# Store builds
npx eas-cli build --profile production --platform android
npx eas-cli build --profile production --platform ios
```

Apple App Store signing still requires the appropriate Apple Developer credentials. Google Play submission requires a Play Console application and signing configuration.

## Analytics contract

Allowed telemetry is deliberately coarse. Examples include screen name, result count, source family and reading mode. The sanitizer excludes keys representing search queries, book identity, titles/authors, passages/transcripts, notes, profile/accessibility preferences and direct identity.

Do not add a new analytics property without updating the privacy test first.

## Accessibility release gate

Run `npm run test:accessibility`, then complete `ACCESSIBILITY_TEST_MATRIX.md` on representative iOS and Android devices. Automated tests do not replace VoiceOver/TalkBack and alternative-input testing.

## Next backend slices

1. Canonical EPUB/text endpoint with accessibility metadata.
2. Synchronization model for EPUB/DAISY text + audio to enable Read Along.
3. Provenance-aware Learn API.
4. Mobile-native AD.iD/OIDC authentication rather than reusing browser session assumptions.
5. Server-synced library/progress with explicit privacy controls and offline conflict handling.
