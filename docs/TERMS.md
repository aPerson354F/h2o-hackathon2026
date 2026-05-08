# Terms of Service

_Last updated: May 7, 2026_

These terms govern your use of the H2O to You mobile application ("the app"). By installing or using the app, you agree to these terms. If you do not agree, do not install or use the app.

## 1. What the app does

H2O to You is an educational tool that helps California residents track personal water usage, compare it to statewide averages, learn about local reservoirs and watersheds, and complete daily water-saving challenges. It is not affiliated with the State of California, the Department of Water Resources, the U.S. Bureau of Reclamation, or any water agency.

## 2. Eligibility

You must be at least 13 years old to use the app. By using it, you represent that you are 13 or older.

## 3. Your account

You may use the app without an account, with a local-only email and password (stored only on your device), or with a Google account via Firebase Authentication. You are responsible for keeping your account credentials secure.

The local account system stores only a salted SHA-256 hash of your password on the device. It is not a server-backed authentication system and is not appropriate for sensitive use. For sign-in that survives device loss or works across multiple devices, use Google Sign-In.

## 4. Acceptable use

You agree to:

- Use the app for personal, non-commercial water-conservation purposes only
- Not attempt to reverse-engineer, decompile, or extract credentials embedded in the app
- Not use the app's AI proxy for content that violates Groq's acceptable-use policy (https://wow.groq.com/terms-of-use/), including content that is unlawful, harassing, fraudulent, or solicits harmful instructions
- Not submit images or prompts designed to test, probe, or attack the underlying AI or hosting infrastructure
- Not attempt to overwhelm the AI or CDEC proxies with automated requests

We may rate-limit or block users that abuse these endpoints.

## 5. Data sources and disclaimers

### CDEC data is provisional

Reservoir levels, snowpack, and precipitation values shown in the app are sourced from the California Data Exchange Center (https://cdec.water.ca.gov). CDEC designates these readings as provisional — they may be revised, corrected, or removed at any time, and individual sensors may be offline, miscalibrated, or report sentinel error values. **Do not rely on the app for any operational, financial, or safety-critical decision** (irrigation scheduling, recreation planning, flood preparedness, dam-safety assessment, etc.). For authoritative data, visit cdec.water.ca.gov directly.

### Water-saving estimates are educational, not engineering-grade

Quiz results, daily-challenge gallon counts, and "savings" figures are produced from coarse averages (gallons-per-shower, gallons-per-flush, etc.) and your self-reported usage. They are intended to motivate behavior change, not to substitute for a metered audit. Actual savings depend on your fixtures, behavior, and supply pressure.

### AI output is best-effort

AI-generated tips, daily facts, and image analyses are produced by a third-party large-language model and may be inaccurate, incomplete, or biased. Treat AI output as a suggestion, not advice. Always verify before acting on health, plumbing, or regulatory information.

### Newsletter content

If you subscribe to the weekly or monthly water-state newsletter, the body of each email is auto-generated from CDEC data and is subject to the same provisional-data caveat in this section. Newsletters are commercial electronic messages under the U.S. CAN-SPAM Act (15 U.S.C. § 7701) and Canada's Anti-Spam Legislation. Each email includes:

- A clear identification of the sender
- A working unsubscribe link (one-click via the `List-Unsubscribe` header)
- A physical postal address provided by Resend on our behalf

You may unsubscribe at any time, and we will honor the request immediately. We do not sell, lend, or transfer subscriber email addresses to any third party.

## 6. Intellectual property

The app's source code, design, and bundled content are © 2026 the H2O to You project contributors. The app's source is available in the project repository at https://github.com/aPerson354F/h2o-hackathon2026; refer to the LICENSE file in that repository for permitted uses.

CDEC data is produced by the California Department of Water Resources and is in the public domain. Third-party trademarks (Google, Firebase, Vercel, Groq, Expo, etc.) are the property of their respective owners.

## 7. Third-party services

Use of the app means you also accept the terms of the underlying services it depends on:

- **Google / Firebase** — https://policies.google.com/terms and https://firebase.google.com/terms
- **Vercel** — https://vercel.com/legal/terms
- **Groq** — https://wow.groq.com/terms-of-use/
- **Resend (newsletter delivery)** — https://resend.com/legal/terms-of-service (applies if you subscribe to the newsletter)

We are not responsible for outages, data loss, or behavior of these third-party services.

## 8. Disclaimer of warranties

The app is provided "as is" and "as available" without warranties of any kind, express or implied, including but not limited to merchantability, fitness for a particular purpose, accuracy, completeness, or non-infringement. We do not warrant that the app will be uninterrupted, error-free, or secure.

## 9. Limitation of liability

To the maximum extent permitted by law, the H2O to You project contributors will not be liable for any indirect, incidental, special, consequential, or punitive damages — including lost data, lost water savings, or operational decisions made on the basis of the app — arising out of or related to your use of the app. Our total cumulative liability for any claim related to the app will not exceed five U.S. dollars ($5.00).

## 10. Termination

You may stop using the app at any time by uninstalling it. We may discontinue the app, the AI proxy, or the CDEC proxy at any time, with or without notice.

## 11. Changes to these terms

We may update these terms as the app evolves. The "Last updated" date at the top reflects the most recent revision. Continued use after a material change constitutes acceptance of the revised terms.

## 12. Governing law

These terms are governed by the laws of the State of California, United States, without regard to conflict-of-laws principles. Any dispute arising out of or related to the app will be resolved in the state or federal courts located in California.

## 13. Contact

To reach the maintainers, open an issue at https://github.com/aPerson354F/h2o-hackathon2026/issues.
