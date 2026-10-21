# Annapurna — Every household, accounted for.

A React, TypeScript, Vite, and Tailwind workspace for ration cards and household members. It runs in Chromium browsers as a progressive web app (PWA), and as a standalone native cross-platform desktop executable on Linux, Windows, and macOS.

## Start locally

Install dependencies with `npm install`, then use the Vite development command (`npm run dev`). `npm run build` produces the production web app in `dist`. `npm run lint` checks the source.

### Conflict-Free Updates to Latest Main Release

- **In-App (Desktop & Web)**: Open **Settings → App updates & releases** or choose **Help → Check for Updates...** in the Electron menu. This queries releases built exclusively from the `main` branch (`Byte-Craftsman-Alpha/Annapurna`), detects your operating system, and offers the standalone conflict-free package (`.AppImage` on Linux, portable `.exe` on Windows, `.dmg` on macOS).
- **CLI Workspace Update**: Run `npm run update` to automatically sync your local workspace directly to `origin/main` without merge conflicts, install dependencies, and rebuild the production bundle.

### Desktop Application

- `npm run electron:start`: Launch Annapurna in a native Electron window against the compiled production bundle.
- `npm run electron:dev`: Launch Electron with hot-reloading connected to the live Vite dev server.
- `npm run dist:linux`: Build Linux distribution packages (`.AppImage`, `.deb`, `.tar.gz`) in `release/`.
- `npm run dist:win`: Build Windows packages (NSIS setup `.exe`, portable `.exe`, `.zip`) in `release/`.
- `npm run dist:mac`: Build macOS distribution packages (`.dmg`, `.zip`) in `release/`.
- `npm run dist:all`: Build all target platforms.
- `npm run dist:dir`: Fast unpacked local testing build.

Automated continuous integration via GitHub Actions (`.github/workflows/desktop-release.yml`) compiles native binaries on Ubuntu, Windows, and macOS runners on each release tag.

The initial eight households are explicitly fictional examples retained from the reference workspace in the supplied input file. No private records were present in that file. Clear the local workspace in Settings to start with your own data.

## Get your Firebase credentials

1. In the Firebase console, create or open a project.
2. In Project overview, select the Web icon (`</>`) or Add app → Web. Register your app. Hosting and Analytics are not needed by this client.
3. Copy the complete `firebaseConfig` object. To retrieve it later, open Project settings → General → Your apps → SDK setup and configuration → Config.
4. Required fields: `apiKey`, `authDomain`, `projectId`, `appId`. The parser also accepts `storageBucket` and `messagingSenderId`. JSON and the JavaScript configuration snippet both work; no pasted code is executed.
5. Open Authentication → Sign-in method and enable Email/Password. In Authentication → Users → Add user, create a dedicated account with an email and strong password.
6. Create the default Cloud Firestore database in production/locked mode. Choose a suitable region. In its Rules tab, publish the owner-only rules available through the app’s Connect Firebase → Setup guide → Step 4 → Copy rules.
7. In Annapurna, choose Connect Firebase. Paste the web configuration and sign in with the Firebase Authentication user created in step 5—not your Google account password.
8. Enable trusted-device caching only on a personal, secured device. Leave it off on a shared device.

**Never paste a service-account private key into a browser.** Firebase web API keys identify the project; Authentication and Firestore Security Rules authorize access. The app refuses known private-key formats. Passwords are not persisted by the app. Firebase manages the authentication session.

## Storage and writes

- Local mode: records and activity are saved atomically in an IndexedDB transaction. BroadcastChannel updates other tabs. Stale edits and deletions are rejected.
- Cloud mode: each card is one Firestore document at `users/{uid}/cards/{cardId}`. Members are nested in the card, so updating a household is atomic. No Firebase credentials are included in this repository.
- Trusted Firebase devices use persistent IndexedDB caching with multi-tab management. Shared devices use memory-only Firestore caching and session authentication.
- Online cloud edits and deletions use version checks inside transactions. Offline operations use Firestore’s write queue; its conflict behavior is last-write-wins. Keep the browser open if you chose memory-only caching.
- A pending write is not reported as server-confirmed. The sync indicator tracks acknowledgments and errors. Sign-out is blocked while this tab has pending writes.
- Imports validate all records, reject duplicate card/Aadhaar numbers visible in the workspace, and write up to 400 cards in a single batch. Simultaneous, separate cloud clients should avoid creating the same card number; client-side uniqueness checks are not a replacement for a centralized allocation system.
- Local examples and real local records are never automatically uploaded when connecting. Export a full JSON backup, connect, then explicitly import it if you want to move records to Firebase.

## Data structure

Card fields: `Card_holder_Name`, `Card_Number`, `Guardian_Name`, `Mother_Name`, `Total_Unit`, `Card_Type` (APL/BPL), `Category` (Gen/OBC/SC/ST/EWS), and optional `Members`.

Member fields: `Name`, `Guardian_Name`, `Gender` (M/F), `DOB` (DD-MM-YYYY), `Relation_with_Holder` (self/son/father/husband/mother/daughter), `Aadhaar` (12 numeric characters, optional), and `Contact_No` (10 numeric characters, optional).

The Members page uses a **Cardholder name** column in place of a relationship column. Relationships are retained in the data and can be viewed or edited inside a household.

## Privacy, exports, and XML interoperability

Only process records you are authorized to use. Aadhaar and contact numbers are masked in lists and member CSV exports. A full JSON backup includes unmasked information and must be stored securely.

### Export and import formats

- **Masked CSV**: Available from Ration cards and Members views. Personal identifiers are masked (`XXXXXXXX1234`).
- **JSON Backup**: Exports the complete database array for cold-storage backup or migration between workspaces.
- **Well-Defined XML Export**:
  - **Bulk XML**: Available via `Export records` → `Export cards as XML` or the table toolbar `Export XML`. Generates an XML document under `<annapurna version="2.0"><rationCards>...</rationCards></annapurna>`.
  - **Single Household XML**: Available via the row 3-dots action menu (`Export as XML`) or the household modal footer (`Export XML`). Generates a standalone `<annapurna version="2.0"><RationCard>...</RationCard></annapurna>` document.
- **Bulk & Single XML Import**:
  - Select or drag-and-drop any `.xml` file into the Import file prompt.
  - Automatically identifies single household documents (`<RationCard>`) or bulk registries (`<rationCards>`).
  - Evaluates card numbers, units, date of birth format (`DD-MM-YYYY`), and intra-household duplicate Aadhaar numbers before presenting a validation summary modal.
  - Duplicate card numbers present in the workspace halt the entire import to guarantee atomicity.

### Demo data templates

Pre-built sample files are available in the repository root under `demo-data/` for immediate import verification:
- `demo-data/single-household.xml`: Single household XML document with head and children.
- `demo-data/bulk-households.xml`: Multi-card XML registry (`<rationCards>`).
- `demo-data/single-household.json`: Single household JSON object array.
- `demo-data/bulk-households.json`: Multi-card JSON snapshot.

This app does not encrypt the browser cache. Clearing site data removes local records; keep a backup. Sign-out attempts to clear Firestore persistence, but another open tab can prevent immediate cache removal.

## Install and offline access

- **Web / Progressive Web App (PWA)**: Open the deployed app in a Chromium browser (Chrome, Edge, Brave). Use the browser address-bar install icon or menu. The service worker caches the application shell, bundled fonts, and illustration after the first online visit.
- **Desktop Application (Native Executable)**: Download and run the standalone package for your operating system:
  - Linux: Run `Annapurna-1.0.0.AppImage` directly (`chmod +x` then execute), or install `annapurna_1.0.0_amd64.deb`.
  - Windows: Run the setup wizard `Annapurna Setup 1.0.0.exe` or launch the zero-install `Annapurna 1.0.0.exe` portable executable.
  - macOS: Open `Annapurna-1.0.0.dmg` and drag to Applications.
  All local storage operates offline using sandboxed IndexedDB storage.

## Verification

`npm run build` and `npm run lint` validate the code. After installing the Playwright Chromium browser, run `node scripts/functional-check.mjs` to exercise local CRUD, validation, member-to-cardholder mapping, masked CSV exports, JSON backups and imports, the Firebase guide, configuration validation, offline app reloads and writes, cross-tab edit protection, and mobile layouts. A live Firebase round trip requires your own project and account; no production credentials were supplied.
