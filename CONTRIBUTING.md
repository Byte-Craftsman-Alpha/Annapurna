# Contributing to Annapurna

Thank you for your interest in contributing to **Annapurna**! We welcome contributions from developers, designers, and community members of all experience levels.

Annapurna is developed by **[Aditya Chaudhari](https://aditya.teamparadox.in)** under **[Team Paradox](https://teamparadox.in)**. Our goal is to provide a privacy-first, offline-ready, transparent household and ration card management workspace.

---

## Code of Conduct

By participating in this project, you agree to abide by our [Code of Conduct](./CODE_OF_CONDUCT.md). Please treat all contributors and community members with respect and kindness.

---

## How Can You Contribute?

### 1. Reporting Bugs
- Search existing issues to ensure the bug hasn't already been reported.
- Open an issue describing the problem:
  - Steps to reproduce
  - Expected vs. actual behavior
  - Browser name, version, and operating system
  - Console logs or screenshots (make sure **no real personal data or Aadhaar numbers** are shown)

### 2. Suggesting Enhancements
- Feature requests and ideas are warmly welcomed! Open an issue outlining:
  - The problem or use-case you are trying to address
  - Proposed solution or UX concept
  - Any potential impact on offline mode, Firebase sync, or privacy

### 3. Submitting Pull Requests (PRs)
- Fork the repository and create your feature branch:
  ```bash
  git checkout -b feature/your-feature-name
  ```
- Keep changes focused and atomic.
- Ensure all tests pass, the linter reports zero errors, and the production build succeeds.
- Submit your PR with a clear description of the problem solved and changes made.

---

## Development Workflow

### Prerequisites
- **Node.js**: `v20.19.0+` or `v22.12.0+` (LTS recommended)
- **npm**: `v10+`
- **Git**

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/team-paradox/annapurna.git
   cd annapurna
   ```

2. Install dependencies:
   ```bash
   npm install
   ```
   > **Note for FAT32 / exFAT drives:** If your workspace is located on a filesystem that does not support symlinks, install with:
   > ```bash
   > npm install --no-bin-links
   > ```

3. Start the local development server:
   ```bash
   npm run dev
   ```
   The app will be available at `http://localhost:5173`.

4. Check code quality with ESLint:
   ```bash
   npm run lint
   ```

5. Build for production:
   ```bash
   npm run build
   ```

6. Preview the production build:
   ```bash
   npm run preview
   ```

---

## Testing & Verification

We provide automated Playwright-based verification scripts in `scripts/`:

1. Install the Playwright browser:
   ```bash
   npx playwright install chromium-headless-shell
   ```

2. Run the end-to-end functional check:
   ```bash
   node scripts/functional-check.mjs
   ```

This validates:
- Household and ration card CRUD operations
- Optional member fields (Aadhaar & Contact Number)
- Strict date of birth validation (`DD-MM-YYYY`)
- Masked data rendering in tables and CSV exports
- JSON backup and restore workflows
- Offline persistence and cross-tab multi-window protection
- Responsive mobile layouts

---

## Coding Guidelines

1. **TypeScript First**: Write strictly typed code. Avoid `any` types; prefer explicit types and interfaces in `src/lib/types.ts`.
2. **Privacy by Design**:
   - Aadhaar numbers (12 digits) and mobile numbers (10 digits) are **optional**.
   - Sensitive identifiers must **never** appear unmasked in public UI lists, tables, or standard CSV exports.
   - Always handle missing/empty Aadhaar or Contact gracefully (`—` or `Not provided`).
3. **Data Integrity & Offline Resilience**:
   - Edits and deletions must respect concurrency checks (`updatedAt`).
   - All state mutations must remain consistent across both IndexedDB (local) and Firestore (cloud) paths.
4. **Clean Code & Styling**:
   - Follow standard React 19 functional component best practices.
   - Maintain styling consistency using existing design tokens in `src/index.css` and `src/refinements.css`.

---

## Commit Message Conventions

We recommend following conventional commit standards:

- `feat:` A new feature or user-facing improvement
- `fix:` A bug fix
- `docs:` Documentation updates or additions
- `refactor:` Code refactoring without behavioral changes
- `test:` Adding or updating tests
- `chore:` Tooling, dependency updates, or repository maintenance

Example:
```bash
git commit -m "feat: make aadhaar and contact numbers optional in member details"
```

---

## Questions & Contact

For questions, feedback, or collaboration inquiries:
- **Developer**: Aditya Chaudhari ([aditya.teamparadox.in](https://aditya.teamparadox.in))
- **Organization**: Team Paradox ([teamparadox.in](https://teamparadox.in))
- **Email**: `contact@teamparadox.in` / `aditya@teamparadox.in`

