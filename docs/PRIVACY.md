# Privacy Policy

_Last updated: May 7, 2026_

H2O to You ("the app") is a personal water-conservation tool focused on California. This document explains what data the app handles, where it goes, and what control you have over it.

**The short version:** almost everything stays on your device. We do not sell, rent, or share personal information. We do not bundle advertising or analytics SDKs.

## 1. What we collect

### Stored on your device only

The app saves the following to AsyncStorage on your phone. None of it leaves the device:

- **Your profile** — display name, household size, daily-gallon goal, language, and units preference
- **Your water log** — activities you log (showers, dishes, laundry, etc.) with timestamps and gallon totals
- **Your quiz answers** — responses to the water-footprint estimator
- **Your progress** — streaks, XP, badges, lifetime gallons saved, claimed daily challenges
- **Local account** — if you create an email + password account inside the app, the email and a salted SHA-256 hash of your password are stored in AsyncStorage. The plaintext password is never stored or transmitted.

### Sent to third parties only when you opt in

- **Google Sign-In (optional).** If you tap "Sign in with Google", Google authenticates you and returns an ID token to the app. We use that token to associate your sign-in with Firebase Authentication (operated by Google). Firebase records your email address and a Firebase user ID. You can skip Google Sign-In and still use the app.
- **Newsletter (optional).** If you opt into the weekly or monthly water-state newsletter, we transmit your email address (and your first name, if provided) to Resend (https://resend.com), which stores your contact in a mailing audience and delivers the email on our behalf. We do not send any other personal data to Resend. You can unsubscribe at any time (see section 4); unsubscribing removes your email from the Resend audience.
- **AI features.** When you use AI-powered features (daily-tip generator, image analysis), the relevant prompt and any image you submit is sent through a Vercel-hosted proxy to the Groq inference API. Prompts and images are processed transiently for the response and are not retained by us.
- **CDEC data.** The app fetches reservoir storage, snowpack, and precipitation data from the California Data Exchange Center (cdec.water.ca.gov) through a Vercel proxy. These are unauthenticated, read-only requests; no personal data is sent.

### Permissions you may grant

- **Location** — used only for the "Find Nearest Reservoir" feature. Your coordinates are passed through a haversine distance calculation on-device and never transmitted to us or any third party.
- **Camera / Photos** — used for image-based features (water test-strip scanning, pollution and item analysis). Photos are sent to the AI proxy described above only when you actively trigger an analysis.
- **Notifications** — in-app notifications are stored locally; the app does not send remote push notifications.

## 2. How we use it

We use device-local data to render your home screen, compute your streak and XP, display your water log, and personalize on-device tips. We use third-party flows (above) only to deliver the specific feature that triggers them.

We never use your data for advertising, behavioral profiling, or sale to third parties.

## 3. Sharing

We do not share, sell, rent, or trade any personal information. The only outbound flows of data are the third-party services listed in section 1, each used solely to deliver the feature you requested.

## 4. Your rights and choices

- **Delete everything.** Uninstalling the app removes all on-device data. To wipe data without uninstalling: phone Settings → Apps → H2O to You → Storage → Clear data.
- **Sign out of Google.** From the home screen, tap the sign-out icon in the top-right, or use Settings → Sign out. To revoke the app's Google access entirely, visit https://myaccount.google.com/permissions.
- **Unsubscribe from the newsletter.** Click the "Unsubscribe" link at the bottom of any newsletter email, or open the app and set Settings → Newsletter → Frequency to **Off** and tap Save. Either action removes your email from our Resend audience immediately.
- **Delete your Firebase Auth record.** Open an issue (see section 11); we will delete your Firebase user record on request.

If you are a California resident, you also have rights under CCPA — see section 8.

## 5. Security

Data stored in AsyncStorage is sandboxed to the app under standard iOS / Android app isolation. Local account passwords are stored only as salted SHA-256 hashes; the salt is bundled with the app and the hashing is not a substitute for proper server-side authentication. For account security that survives device loss, use Google Sign-In.

Network traffic to our Vercel proxy, Firebase, Groq, and CDEC is encrypted in transit (HTTPS / TLS 1.2+).

## 6. Children

H2O to You is intended for users 13 and older. We do not knowingly collect personal information from children under 13. If you believe a child under 13 has provided information through Google Sign-In or the AI features, contact us and we will delete it.

## 7. Third-party services

The app relies on the following services. Their privacy policies govern any data they receive:

- **Firebase Authentication** — Google LLC. https://firebase.google.com/support/privacy
- **Google Sign-In** — Google LLC. https://policies.google.com/privacy
- **Resend (newsletter delivery)** — Resend, Inc. https://resend.com/legal/privacy-policy
- **Groq AI Inference (via our Vercel proxy)** — Groq, Inc. https://groq.com/privacy-policy/
- **Vercel hosting** — Vercel Inc. https://vercel.com/legal/privacy-policy
- **California Data Exchange Center (CDEC)** — California Department of Water Resources. CDEC requests are unauthenticated; no personal data is sent.

## 8. California residents (CCPA)

If you are a California resident, you have the right to:

- Know what personal information we hold about you (see sections 1 and 7)
- Request deletion of your personal information (see section 4)
- Opt out of the sale of personal information — we do not sell personal information
- Non-discrimination for exercising any of these rights

To exercise these rights, contact us via section 11.

## 9. Data retention

On-device data persists until you delete it via the app or your phone's settings. Firebase Authentication retains your email and user ID until you request deletion. Newsletter subscriber emails persist in Resend until you unsubscribe (immediate removal) or until we discontinue the newsletter. Groq prompts and CDEC requests are not retained by us.

## 10. Changes to this policy

We may update this document as the app evolves. The "Last updated" date at the top reflects the most recent revision. Material changes will be surfaced in-app on first launch after update.

## 11. Contact

H2O to You is an independent project; there is no customer-support team. To reach the maintainers, open an issue at https://github.com/aPerson354F/h2o-hackathon2026/issues.
