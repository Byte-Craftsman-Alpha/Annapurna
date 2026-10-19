# Security Policy

## Supported Versions

We provide security updates and patches for the current release branch of Annapurna.

| Version | Supported          |
| ------- | ------------------ |
| 2.x     | :white_check_mark: |
| 1.x     | :x:                |

---

## Reporting a Vulnerability

The Annapurna team takes security, privacy, and confidentiality seriously—especially when handling household and personal identity records.

If you believe you have found a security vulnerability in Annapurna, please report it privately:

- **Email**: `security@teamparadox.in` / `contact@teamparadox.in`
- **Lead Developer**: Aditya Chaudhari ([aditya.teamparadox.in](https://aditya.teamparadox.in))
- **Team**: Team Paradox ([teamparadox.in](https://teamparadox.in))

**Please do not report security vulnerabilities through public GitHub issues.**

When reporting, please include:
1. A description of the issue and potential impact
2. Steps to reproduce or proof-of-concept code
3. Affected components (e.g., local IndexedDB cache, Firestore security rules, backup parsing)
4. Any potential remediations you've identified

We will acknowledge receipt within 48 hours and work with you on a resolution.

---

## Data Privacy & Security Principles in Annapurna

Annapurna is built around strict data privacy and security fundamentals:

### 1. Aadhaar & Personal Number Masking
- Aadhaar (12-digit) and Contact (10-digit) numbers are optional fields.
- In user interfaces and public lists, personal numbers are masked by default (`•••• 1234` and `••••••1234`).
- Standard member CSV exports mask Aadhaar (`XXXXXXXX1234`) and contact numbers (`XXXXXX1234`).
- Full unmasked data is only exported in explicit, user-initiated JSON backups.

### 2. Client-Side Secrets & Firebase Credentials
- **Never paste a service-account private key into the browser.**
- Annapurna uses public Firebase Web Client configurations (`apiKey`, `authDomain`, `projectId`, `appId`).
- Access control is strictly enforced through Firebase Authentication (Email/Password) and Firestore Security Rules.
- Passwords are not retained or saved by Annapurna.

### 3. Local Storage & Device Trust
- In Local Mode, data is stored in the browser's IndexedDB. The browser cache is not encrypted; therefore, only use Annapurna on secure, trusted devices.
- On shared devices, cloud synchronization operates with in-memory caching to avoid lingering sensitive data after session termination.

### 4. Firestore Security Rules
Always deploy owner-only rules in your Cloud Firestore database so that each user can only read and write their own documents:
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

