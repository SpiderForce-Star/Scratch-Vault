# Store launch checklist — Scratch Vault

Do **not** submit the app from this document. This is the human click-path
after the native foundation is in the repo.

Web stays on Vercel: https://volunteer-scratch-vault.vercel.app  
Native shells: Capacitor 6 + EAS Build  
Bundle id / application id: `com.webbspinnervisions.volunteerscratchvault`

This product is an **independent remaining-prize information tool**.
It is not a lottery, not a ticket seller, and not affiliated with any
state lottery. Unlocking Full Access **inside**
iOS/Android uses RevenueCat + StoreKit / Play Billing. Stripe stays on
the website only.

---

## 0. Machine prep (Windows is fine)

```bash
npm install
npm run typecheck
npm run build
npm run cap:sync
```

`cap:sync` builds the web app, copies assets into `dist/`, then runs
`npx cap sync`. `server.url` is **unset** unless you export
`CAP_LIVE_RELOAD=1` (dev only).

Open the native projects (macOS for iOS Simulator, any OS for Android Studio):

```bash
npm run cap:ios
npm run cap:android
```

On Windows, skip `cap:ios` and use EAS for the `.ipa`.

---

## 1. Apple Developer + App Store Connect

You click these. The agent does not.

1. Enroll at [developer.apple.com](https://developer.apple.com) (paid Apple Developer Program).
2. In **Certificates, Identifiers & Profiles → Identifiers**, create an App ID:
   - Bundle ID: `com.webbspinnervisions.volunteerscratchvault`
   - Capabilities: In-App Purchase (needed for the next IAP prompt).
3. In [App Store Connect](https://appstoreconnect.apple.com):
   - **Apps → + → New App**
   - Platform: iOS
   - Name: Scratch Vault
   - Primary language: English (US)
   - Bundle ID: the App ID from step 2
   - SKU: `vsv-ios-001` (any unique SKU)
   - User access: Full Access
4. Fill **App Privacy**:
   - Privacy Policy URL: `https://volunteer-scratch-vault.vercel.app/privacy`
   - Terms of Use URL: `https://volunteer-scratch-vault.vercel.app/terms`
   - Data: email + product interaction (subscription status). No precise location, no tracking.
5. Age rating: 18+ / Gambling (simulated / informational — be honest; this discusses lottery prizes).
6. Upload later: `store/ios/icon-1024.png` and the 6.7" / 6.1" placeholders in `store/ios/screenshots/`.
7. Create two auto-renewable subscriptions (In-App Purchases):
   - Product id `monthly` — $4.99 / month — introductory offer: 7-day free trial (card required)
   - Product id `annual` — $49.99 / year — no trial, billed immediately, auto-renews, no refunds
8. Paste reviewer notes from `store/APP_REVIEW_NOTES.md`.
9. **Do not** submit until RevenueCat products are attached (section 6).

---

## 2. Google Play Console

You click these.

1. Create / open the developer account at [play.google.com/console](https://play.google.com/console).
2. **Create app**
   - Name: Scratch Vault
   - Default language: English (United States)
   - App or game: App
   - Free or paid: Free (IAP unlocks Full Access)
   - Declarations: accept the policies you actually meet.
3. Package name (must match): `com.webbspinnervisions.volunteerscratchvault`
4. Store listing:
   - Short description: Independent scratch-off remaining-prize desk. 18+.
   - Full description: say “highest remaining-prize heat,” never “best chance to win.”
   - Privacy policy: `https://volunteer-scratch-vault.vercel.app/privacy`
   - Terms: `https://volunteer-scratch-vault.vercel.app/terms`
5. Graphics: `store/android/icon-512.png` and `store/android/screenshots/`.
6. Content rating questionnaire: 18+, references to gambling.
7. Create two subscriptions in Play Console (same product ids):
   - `monthly` — $4.99 / month — free trial offer
   - `annual` — $49.99 / year — billed immediately, auto-renews, no refunds
8. **Do not** send for review until RevenueCat is linked (section 6).

---

## 3. EAS Build (iOS .ipa from Windows)

EAS compiles on Expo’s Macs, so you do not need Xcode locally.

1. Install the CLI once: `npm install -g eas-cli`
2. Log in: `eas login` (Expo account — create one if needed).
3. Link the project (you click):
   ```bash
   eas init
   ```
   Paste the printed project id into `app.json` → `expo.extra.eas.projectId`
   (replace `REPLACE_AFTER_EAS_INIT`).
4. First iOS credentials (you click through the prompts):
   ```bash
   eas credentials
   ```
   Let EAS generate a distribution cert + provisioning profile for
   `com.webbspinnervisions.volunteerscratchvault`.
5. After `npx cap add ios` and `npx cap add android` have been run once
   (they create the `ios/` and `android/` folders):
   ```bash
   npm run cap:sync
   eas build --platform ios --profile production
   eas build --platform android --profile production
   ```
6. Download the `.ipa` / `.aab` from the Expo dashboard, or run
   `eas submit` **only when you are ready** (not now).

### Dev live-reload (optional, never for store)

```bash
set CAP_LIVE_RELOAD=1
set CAP_DEV_URL=http://YOUR-LAN-IP:8080
npm run dev
npx cap run android
```

`server.url` is injected only when `CAP_LIVE_RELOAD=1`. Store profiles in
`eas.json` keep it off.

---

## 4. What you still have to click

| Item | Who |
|---|---|
| Apple Developer enrollment + paid seat | You |
| App Store Connect app record + privacy form | You |
| Play Console app record + content rating | You |
| `eas login` / `eas init` / `eas credentials` | You |
| App Store / Play IAP product setup | You |
| RevenueCat project + public SDK keys in Vercel / EAS env | You |
| Actual submit for review | You, later |

Never put Stripe keys, RevenueCat keys, or store shared secrets in this repo.

---

## 5. Asset map

| File | Use |
|---|---|
| `store/ios/icon-1024.png` | App Store icon (no transparency, no baked rounded rect) |
| `store/ios/splash-*.png` | iOS splash |
| `store/ios/screenshots/` | 6.7" and 6.1" placeholders |
| `store/android/icon-512.png` | Play high-res icon |
| `store/android/adaptive-*.png` | Adaptive icon |
| `store/android/splash-1080x1920.png` | Android splash |
| `store/android/screenshots/` | 1080×1920 placeholders |
| `public/icons/` | PWA + apple-touch-icon |
| `public/manifest.webmanifest` | Web install |

Ticket faces in `public/tickets/` are independent reconstructions, never official Lottery art.

Regenerate rasters (needs Python + Pillow):

```bash
python scripts/generate-store-assets.py
```

---

## 6. RevenueCat (you click)

1. Create a project at [app.revenuecat.com](https://app.revenuecat.com).
2. Add iOS app (bundle `com.webbspinnervisions.volunteerscratchvault`) and
   Android app (same application id). Paste the App Store Connect / Play
   shared secrets there — never into this git repo.
3. Products:
   - `monthly` — $4.99 / month
   - `annual` — $49.99 / year
4. Entitlement: `vsv_full_access` — attach both products.
5. Default offering: include both packages (Monthly / Annual).
6. Copy the **public** SDK keys (`appl_…` and `goog_…`) into:
   - Vercel Production: `VITE_REVENUECAT_APPLE_API_KEY`, `VITE_REVENUECAT_GOOGLE_API_KEY`
   - EAS secrets / `eas.json` env for store builds
7. Reviewer notes: `store/APP_REVIEW_NOTES.md`

The website continues to use Stripe Checkout. The iOS/Android binaries never
open Stripe or a “pay on our website” link.
