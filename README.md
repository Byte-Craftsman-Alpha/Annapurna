<div align="center">

# 🌾 Annapurna (अन्नपूर्णा)

**Every household, accounted for.**

A privacy-first, offline-ready, progressive web application (PWA) designed for seamless ration card and household member lifecycle management.

Developed by **[Aditya Chaudhari](https://aditya.teamparadox.in)** under **[Team Paradox](https://teamparadox.in)**.

[![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg)](./LICENSE)
[![React](https://img.shields.io/badge/React-19.2-61dafb.svg?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178c6.svg?logo=typescript)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-7.3-646cff.svg?logo=vite)](https://vite.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.2-38bdf8.svg?logo=tailwindcss)](https://tailwindcss.com/)
[![Firebase](https://img.shields.io/badge/Firebase-13.0-ffca28.svg?logo=firebase)](https://firebase.google.com/)

</div>

---

## 📖 Overview

**Annapurna** is a modern, responsive digital workspace built to assist administrators, community volunteers, and civic workers in managing household ration records, family dependencies, and welfare unit entitlements.

Engineered with an **offline-first philosophy**, Annapurna ensures that zero connectivity never halts frontline operations. All data can be stored and processed entirely inside the browser's IndexedDB, synchronized across multiple open browser tabs in real time, or connected to your dedicated Google Cloud Firestore backend when cloud sync and multi-device access are needed.

---

## ✨ Key Features

### 🗂️ 1. Household & Ration Card Management
- **Complete Entitlement Tracking**: Manage cardholder name, unique ration card number, guardian name, mother's name, total units, card type (**APL** / **BPL**), and category (**Gen**, **OBC**, **SC**, **ST**, **EWS**).
- **Unit Validation**: Enforces integrity constraints (e.g., registered members cannot exceed allocated total units; 1–100 units allowed).
- **Fast Search & Smart Filters**: Instant real-time filtering by card type, category, cardholder name, and card number.

### 👥 2. Household Members Management
- **Demographic Details**: Register household members with full name, guardian name, gender (**M** / **F**), date of birth (**DD-MM-YYYY** with strict validation), and relationship to the cardholder (`self`, `son`, `father`, `husband`, `mother`, `daughter`).
- **Optional Aadhaar & Contact Number**:
  - **Aadhaar Number**: *Optional* input. When provided, validated strictly for 12 digits and intra-household uniqueness.
  - **Contact Number**: *Optional* input. When provided, validated strictly for 10 digits with a standard country code prefix (`+91`).
- **Age Calculation**: Automatically computes exact chronological age from date of birth.
- **Cardholder Connection**: The Members view directly maps every person to their respective cardholder and card number.

### 🔒 3. Privacy by Design & Security
- **Data Masking by Default**: Aadhaar and contact numbers are masked across list views (`•••• 1234` and `••••••1234`) and standard CSV exports (`XXXXXXXX1234` and `XXXXXX1234`).
- **Controlled Reveal**: Masking can be temporarily toggled in the single-household detail modal.
- **No Insecure Storage**: Passwords and private API service account keys are never stored by the application.
- **Device Trust Model**: Choose persistent caching on personal devices, or memory-only caching on shared public terminals.

### ⚡ 4. Offline-First & Multi-Tab Synchronization
- **Zero-Cloud Local Mode**: All cards and audit activities persist in IndexedDB via atomic transactions.
- **Cross-Tab Reactivity**: Real-time cross-tab updates powered by `BroadcastChannel` with automatic stale-edit conflict detection.
- **Optional Cloud Sync**: Direct integration with Firebase Authentication & Cloud Firestore (`users/{uid}/cards/{cardId}`) with owner-only access rules and offline write queuing.

### 📦 5. Export, Backup & Import
- **Masked CSV Exports**: Export filtered or selected cards and members with sensitive numbers securely masked (`XXXXXXXX1234`).
- **JSON Full Backup & Restore**: Download complete workspace backups (cards + member records) for archival, with atomic batch validation on import.
- **Well-Defined XML Export (Bulk & Single)**:
  - **Bulk XML**: Export all or filtered ration cards into a standardized `<annapurna version="2.0"><rationCards>...</rationCards></annapurna>` XML document.
  - **Single Household XML**: Export an individual household's complete record with member details from the card detail modal or row action menu.
  - **Bulk & Single XML Import**: Auto-detects and parses both single `<RationCard>` and bulk `<rationCards>` XML files. Validates card numbers, dates, units, and optional Aadhaar/contacts before committing.

### 📱 6. Progressive Web App (PWA)
- Installable on desktop and mobile Chromium browsers (Chrome, Edge, Brave).
- Service worker caching for fast offline boot and instant resource loading.

### ⌨️ 7. Keyboard Accessibility
- `Ctrl` / `⌘` + `K`: Focus instant search
- `N`: Create a new ration card
- `Esc`: Close any active dialog or modal

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | [React 19](https://react.dev/) |
| **Language** | [TypeScript 5.9](https://www.typescriptlang.org/) |
| **Build Tool & Bundler** | [Vite 7](https://vite.dev/) |
| **Styling** | [Tailwind CSS v4](https://tailwindcss.com/) & Native CSS Custom Properties |
| **Animation** | [Framer Motion](https://www.framer.com/motion/) |
| **Icons** | [Lucide React](https://lucide.dev/) |
| **Local Persistence** | [idb](https://github.com/jakearchibald/idb) (IndexedDB Wrapper) |
| **Cloud Synchronization** | [Firebase 13 SDK](https://firebase.google.com/) (Auth & Firestore) |
| **Testing & Automation** | [Playwright Test](https://playwright.dev/) |

---

## 📋 Data Formats & Import/Export Demos

Annapurna provides native support for loading and exporting household records in both **XML** and **JSON** formats. Ready-to-use demo templates are located in [`demo-data/`](./demo-data/):

- [`demo-data/single-household.xml`](./demo-data/single-household.xml)
- [`demo-data/bulk-households.xml`](./demo-data/bulk-households.xml)
- [`demo-data/single-household.json`](./demo-data/single-household.json)
- [`demo-data/bulk-households.json`](./demo-data/bulk-households.json)

---

### 1. XML Formats

#### A. Single Household XML
Used when exporting an individual household from the Card Details modal or row actions menu, or importing a single household record.

```xml
<?xml version="1.0" encoding="UTF-8"?>
<annapurna xmlns="https://teamparadox.in/annapurna/schema/v2" version="2.0">
  <RationCard>
    <Card_holder_Name>Aditya Chaudhari</Card_holder_Name>
    <Card_Number>DEMO2026001</Card_Number>
    <Guardian_Name>Ramesh Chaudhari</Guardian_Name>
    <Mother_Name>Sunita Chaudhari</Mother_Name>
    <Total_Unit>3</Total_Unit>
    <Card_Type>BPL</Card_Type>
    <Category>OBC</Category>
    <Members>
      <Member>
        <Name>Aditya Chaudhari</Name>
        <Guardian_Name>Ramesh Chaudhari</Guardian_Name>
        <Gender>M</Gender>
        <DOB>12-04-1996</DOB>
        <Relation_with_Holder>self</Relation_with_Holder>
        <!-- Aadhaar and Contact_No are optional -->
        <Aadhaar>999911112222</Aadhaar>
        <Contact_No>9876543210</Contact_No>
      </Member>
      <Member>
        <Name>Kavita Chaudhari</Name>
        <Guardian_Name>Aditya Chaudhari</Guardian_Name>
        <Gender>F</Gender>
        <DOB>05-09-1998</DOB>
        <Relation_with_Holder>daughter</Relation_with_Holder>
        <Aadhaar>999911113333</Aadhaar>
        <Contact_No></Contact_No>
      </Member>
      <Member>
        <Name>Rohit Chaudhari</Name>
        <Guardian_Name>Aditya Chaudhari</Guardian_Name>
        <Gender>M</Gender>
        <DOB>18-11-2015</DOB>
        <Relation_with_Holder>son</Relation_with_Holder>
      </Member>
    </Members>
  </RationCard>
</annapurna>
```

#### B. Bulk Households XML
Used when backing up the entire registry or importing multiple households in a single batch.

```xml
<?xml version="1.0" encoding="UTF-8"?>
<annapurna xmlns="https://teamparadox.in/annapurna/schema/v2" version="2.0">
  <rationCards count="2">
    <RationCard>
      <Card_holder_Name>Aditya Chaudhari</Card_holder_Name>
      <Card_Number>DEMO2026001</Card_Number>
      <Guardian_Name>Ramesh Chaudhari</Guardian_Name>
      <Mother_Name>Sunita Chaudhari</Mother_Name>
      <Total_Unit>2</Total_Unit>
      <Card_Type>BPL</Card_Type>
      <Category>OBC</Category>
      <Members>
        <Member>
          <Name>Aditya Chaudhari</Name>
          <Guardian_Name>Ramesh Chaudhari</Guardian_Name>
          <Gender>M</Gender>
          <DOB>12-04-1996</DOB>
          <Relation_with_Holder>self</Relation_with_Holder>
          <Aadhaar>999911112222</Aadhaar>
          <Contact_No>9876543210</Contact_No>
        </Member>
      </Members>
    </RationCard>
    <RationCard>
      <Card_holder_Name>Meera Verma</Card_holder_Name>
      <Card_Number>DEMO2026002</Card_Number>
      <Guardian_Name>Nandkishore Verma</Guardian_Name>
      <Mother_Name>Kamla Devi</Mother_Name>
      <Total_Unit>1</Total_Unit>
      <Card_Type>APL</Card_Type>
      <Category>Gen</Category>
      <Members>
        <Member>
          <Name>Meera Verma</Name>
          <Guardian_Name>Nandkishore Verma</Guardian_Name>
          <Gender>F</Gender>
          <DOB>10-06-1988</DOB>
          <Relation_with_Holder>self</Relation_with_Holder>
        </Member>
      </Members>
    </RationCard>
  </rationCards>
</annapurna>
```

---

### 2. JSON Formats

#### A. Single Household JSON
Can be passed as an array with a single object or wrapped in a `cards` property:

```json
{
  "cards": [
    {
      "Card_holder_Name": "Aditya Chaudhari",
      "Card_Number": "DEMO2026001",
      "Guardian_Name": "Ramesh Chaudhari",
      "Mother_Name": "Sunita Chaudhari",
      "Total_Unit": 3,
      "Card_Type": "BPL",
      "Category": "OBC",
      "Members": [
        {
          "Name": "Aditya Chaudhari",
          "Guardian_Name": "Ramesh Chaudhari",
          "Gender": "M",
          "DOB": "12-04-1996",
          "Relation_with_Holder": "self",
          "Aadhaar": "999911112222",
          "Contact_No": "9876543210"
        },
        {
          "Name": "Kavita Chaudhari",
          "Guardian_Name": "Aditya Chaudhari",
          "Gender": "F",
          "DOB": "05-09-1998",
          "Relation_with_Holder": "daughter",
          "Aadhaar": "999911113333",
          "Contact_No": ""
        },
        {
          "Name": "Rohit Chaudhari",
          "Guardian_Name": "Aditya Chaudhari",
          "Gender": "M",
          "DOB": "18-11-2015",
          "Relation_with_Holder": "son"
        }
      ]
    }
  ]
}
```

#### B. Bulk Households JSON
Supports standard Annapurna backup snapshots or direct JSON arrays:

```json
{
  "version": "2.0",
  "cards": [
    {
      "Card_holder_Name": "Aditya Chaudhari",
      "Card_Number": "DEMO2026001",
      "Guardian_Name": "Ramesh Chaudhari",
      "Mother_Name": "Sunita Chaudhari",
      "Total_Unit": 1,
      "Card_Type": "BPL",
      "Category": "OBC",
      "Members": [
        {
          "Name": "Aditya Chaudhari",
          "Guardian_Name": "Ramesh Chaudhari",
          "Gender": "M",
          "DOB": "12-04-1996",
          "Relation_with_Holder": "self"
        }
      ]
    },
    {
      "Card_holder_Name": "Meera Verma",
      "Card_Number": "DEMO2026002",
      "Guardian_Name": "Nandkishore Verma",
      "Mother_Name": "Kamla Devi",
      "Total_Unit": 1,
      "Card_Type": "APL",
      "Category": "Gen",
      "Members": [
        {
          "Name": "Meera Verma",
          "Guardian_Name": "Nandkishore Verma",
          "Gender": "F",
          "DOB": "10-06-1988",
          "Relation_with_Holder": "self"
        }
      ]
    }
  ]
}
```

---

### 3. Field Dictionary & Validation Rules

| Level | Field | Type | Required? | Validation Rules |
|---|---|---|---|---|
| **Card** | `Card_holder_Name` | String | Yes | Non-empty household head name |
| **Card** | `Card_Number` | String | Yes | Unique alphanumeric identifier (case-insensitive) |
| **Card** | `Guardian_Name` | String | Yes | Father / Husband / Guardian name |
| **Card** | `Mother_Name` | String | Yes | Mother's full name |
| **Card** | `Total_Unit` | Integer | Yes | Positive integer $\ge 1$ (defaults to member count if omitted) |
| **Card** | `Card_Type` | Enum | Yes | Must be `'APL'` or `'BPL'` |
| **Card** | `Category` | Enum | Yes | Must be `'Gen'`, `'OBC'`, `'SC'`, `'ST'`, or `'EWS'` |
| **Card** | `Members` | Array | No | List of member objects belonging to this card |
| **Member** | `Name` | String | Yes | Non-empty member full name |
| **Member** | `Guardian_Name` | String | Yes | Guardian name |
| **Member** | `Gender` | Enum | Yes | `'M'` or `'F'` |
| **Member** | `DOB` | String | Yes | Strict `DD-MM-YYYY` calendar date (ISO `YYYY-MM-DD` is auto-converted) |
| **Member** | `Relation_with_Holder`| Enum | Yes | `'self'`, `'son'`, `'father'`, `'husband'`, `'mother'`, or `'daughter'` |
| **Member** | `Aadhaar` | String | **Optional** | If provided: exactly 12 numeric digits; must be unique within household |
| **Member** | `Contact_No` | String | **Optional** | If provided: exactly 10 numeric digits |

---

## 🚀 Getting Started

### Prerequisites

Ensure you have the following installed on your system:
- **Node.js**: `v20.19.0+` or `v22.12.0+` (Node 22 LTS strongly recommended)
- **npm**: `v10+`

Check your versions:
```bash
node -v
npm -v
```

---

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Byte-Craftsman-Alpha/Annapurna.git
   cd annapurna
   ```

2. **Install project dependencies**:
   ```bash
   npm install
   ```

   > 💡 **Filesystem Note (FAT32 / exFAT / USB Drives)**:
   > If your repository resides on an external drive or filesystem that does not support POSIX symlinks, install with the `--no-bin-links` flag:
   > ```bash
   > npm install --no-bin-links
   > ```

---

### Running the Development Server

To start the local Vite development server with Hot Module Replacement (HMR):

```bash
npm run dev
```

The application will start immediately. Open your browser and navigate to:
```
http://localhost:5173
```

To expose the development server to your local network (e.g., for testing on mobile devices):
```bash
npm run dev -- --host
```

---

### Building for Production

To perform static type checking and compile the optimized production bundle:

```bash
npm run build
```

This runs `tsc -b` to verify types, followed by `vite build`. The bundled files are output to the `dist/` directory.

---

### Previewing the Production Build

To locally preview the generated production build:

```bash
npm run preview
```

---

### Code Linting

To inspect the codebase for style, syntax, and React best practices using ESLint:

```bash
npm run lint
```

---

### Automated Functional Testing

Annapurna includes an automated Playwright-based test suite in `scripts/functional-check.mjs`:

1. **Install Playwright Chromium**:
   ```bash
   npx playwright install chromium-headless-shell
   ```

2. **Execute the test suite**:
   ```bash
   node scripts/functional-check.mjs
   ```

This script spins up a temporary server, exercises end-to-end CRUD operations, verifies validation rules (including optional Aadhaar and contact numbers), tests masked CSV and unmasked JSON exports, verifies cross-tab synchronization, and checks mobile responsiveness.

---

## ☁️ Firebase Cloud Setup (Optional)

Annapurna works 100% offline without any backend. If you wish to enable cloud synchronization:

1. **Create a Firebase Project**: Open the [Firebase Console](https://console.firebase.google.com/) and create a new project.
2. **Register a Web App**: In Project Overview, click the **Web icon (`</>`)**, name the app, and copy the `firebaseConfig` object.
3. **Enable Authentication**: In **Authentication** → **Sign-in method**, enable **Email/Password**. Create a user in the **Users** tab.
4. **Create Cloud Firestore**: Create a Firestore database in production mode.
5. **Publish Security Rules**: Under Firestore **Rules**, apply owner-only access:
   ```text
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /users/{userId}/{document=**} {
         allow read, write: if request.auth != null && request.auth.uid == userId;
       }
     }
   }
   ```
6. **Connect in Annapurna**: Click **Connect Firebase** in the application sidebar, paste your config, and sign in.

---

## 📁 Project Structure

```text
annapurna/
├── demo-data/              # Demo JSON and XML files for single and bulk import testing
│   ├── bulk-households.json
│   ├── bulk-households.xml
│   ├── single-household.json
│   └── single-household.xml
├── public/                 # Static assets, PWA icons, manifest, and service worker
├── scripts/                # Automated verification and visual check scripts
│   ├── functional-check.mjs
│   └── visual-check.mjs
├── src/
│   ├── assets/             # SVGs and illustrations
│   ├── components/         # Reusable UI components
│   │   ├── CardDetails.tsx     # Single household overview & masking toggle
│   │   ├── CardForm.tsx        # Household & member creation/editing modal
│   │   ├── FirebaseSetup.tsx   # Firebase credential configuration modal
│   │   ├── Modal.tsx           # Accessible animated modal dialog wrapper
│   │   ├── Stats.tsx           # Overview metrics & insight charts
│   │   └── TableTools.tsx      # Search bar, pagination, and empty state
│   ├── lib/                # Core business logic and storage utilities
│   │   ├── cloud.ts            # Cloud Firestore read/write operations
│   │   ├── export.ts           # CSV/XML generators, JSON backup/restore & parsers
│   │   ├── sampleData.ts       # Fictional reference datasets
│   │   ├── storage.ts          # IndexedDB wrapper and tab broadcasting
│   │   ├── types.ts            # TypeScript interfaces, schemas & validators
│   │   └── useWorkspace.ts     # Central application state and sync hook
│   ├── pages/              # Primary application route views
│   │   ├── CardsPage.tsx       # Ration card registry and bulk tools
│   │   ├── HelpPage.tsx        # FAQs, keyboard shortcuts, security guides
│   │   ├── MembersPage.tsx     # Member-to-cardholder directory
│   │   ├── OverviewPage.tsx    # Dashboard analytics and coverage metrics
│   │   └── SettingsPage.tsx    # Workspace settings, backups & cloud status
│   ├── App.css             # Component-level styling
│   ├── App.tsx             # Root component with routing and navigation
│   ├── index.css           # Global Tailwind utilities, tokens, and themes
│   ├── main.tsx            # Application entry point
│   └── refinements.css     # Responsive overrides and micro-interactions
├── CODE_OF_CONDUCT.md      # Contributor Covenant Code of Conduct
├── CONTRIBUTING.md         # Contribution guidelines and dev workflows
├── LICENSE                 # MIT License
├── package.json            # Project dependencies and script commands
├── README.md               # Main project documentation
├── SECURITY.md             # Security policy and vulnerability reporting
├── SETUP.md                # Comprehensive technical reference manual
├── tsconfig.json           # TypeScript configuration
└── vite.config.ts          # Vite build and plugin configuration
```

---

## 🛡️ Security & Privacy

Annapurna adheres to strict privacy and data protection standards:
- **Masked Data**: Sensitive government identifiers are never displayed unmasked by default.
- **Client-Side Verification**: Data is validated client-side before submission.
- **Local Isolation**: Each workspace operates in its own sandboxed IndexedDB database.
- For detailed information on our security practices and vulnerability reporting, see [SECURITY.md](./SECURITY.md).

---

## 🤝 Contributing

We welcome contributions! Please review our [CONTRIBUTING.md](./CONTRIBUTING.md) guide before submitting issues or pull requests.
All contributors must adhere to our [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md).

---

## 👨‍💻 Author & Organization

This project is developed and maintained by:

- **Developer**: [Aditya Chaudhari](https://aditya.teamparadox.in)
- **Organization**: [Team Paradox](https://teamparadox.in)
- **Inquiries**: `contact@teamparadox.in` / `aditya@teamparadox.in`

---

## 📄 License

This project is licensed under the **MIT License**. See the [LICENSE](./LICENSE) file for details.
