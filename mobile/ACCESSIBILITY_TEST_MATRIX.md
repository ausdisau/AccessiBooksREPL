# AccessiBooks Mobile Accessibility Release Matrix

Automated component checks are necessary but not sufficient. A release candidate must be exercised as complete journeys on representative Android and Apple devices.

## Priority journey

`Discover → Search → Book → Listen → playback controls → Experience → Preview → Keep → Undo`

Secondary journey:

`Discover → Book → Save → Library → reopen book → Learn → provenance status`

## Automated gates

- Controls expose role, accessible name, disabled/selected state where applicable.
- Search remains operable without analytics consent.
- Analytics sanitizer rejects reading identity/content and accessibility-preference fields.
- AAX preview does not commit until explicit Keep.
- `allowAutomaticChanges` remains false even if an invalid patch attempts to set it.
- Capability rules do not advertise native Read/Read Along before the backend exposes canonical text/transcript data.

## iOS manual evidence

- VoiceOver: both priority journeys, including rotor navigation through headings and controls.
- Dynamic Type: largest accessibility sizes without clipped labels or unreachable actions.
- Display Zoom and landscape/portrait rotation.
- Switch Control or external keyboard for core navigation and player controls.
- Reduce Motion enabled at OS level and in AAX preference.
- Background audio: lock screen, Control Center, interruption and resume behaviour.
- Network loss while loading catalogue and while starting audio; verify comprehensible recovery.

## Android manual evidence

- TalkBack: both priority journeys with logical reading/focus order.
- System font size and display size at maximum supported settings.
- Switch Access or external keyboard for core navigation and player controls.
- Voice Access labels remain meaningful and unique.
- Remove animations / reduced motion behaviour.
- Background audio: notification controls, lock screen, interruption and resume behaviour.
- Network loss and recovery states.

## Privacy verification

With anonymous product analytics enabled, inspect captured events and confirm that none contains:

- book ID, title, author or narrator;
- search query;
- passage/transcript content;
- notes or annotations;
- accessibility preference names or values;
- email, display name or other direct identifier.

Session replay remains disabled. Repeat the journey with analytics off and confirm no product event is emitted.

## Release decision

Do not describe the app as WCAG AA/AAA conformant solely because controls or automated tests pass. Store release requires journey-level assistive-technology evidence and no unresolved blocker/high accessibility defect.
