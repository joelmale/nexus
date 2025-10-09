# Complete Test Pipeline Documentation

## Why TypeScript Errors Weren't Caught by Unit Tests

**TL;DR:** Unit tests check runtime behavior; TypeScript checks compile-time types. Different tools, different purposes.

### The Separation

| Test Type | Command | What It Checks | When It Runs |
|-----------|---------|----------------|--------------|
| **Unit Tests** | `npm run test` | Runtime behavior with Vitest | Every commit (CI) |
| **Type Checking** | `npm run type-check` | TypeScript compilation | Part of lint job (CI) |
| **ESLint** | `npm run lint` | Code style & some type issues | Separate job (CI) |
| **Production Build** | `npm run build` | **Both** `tsc` AND `vite build` | Docker build job (CI) |

### Why Unit Tests Passed But Build Failed

1. **Vitest runs in a forgiving environment**: It uses `esbuild` which is more lenient with types
2. **Tests can have type issues**: Test files themselves might use `any` or have loose types
3. **No compilation step for tests**: Vitest transpiles on-the-fly without strict type checking
4. **Production build is strict**: `npm run build` runs `tsc && vite build` - tsc will fail on ANY type error

**Example:**
```typescript
// This will PASS unit tests but FAIL production build
const result: string = 123; // Type error, but test might still run
expect(result).toBe(123);  // Test passes at runtime
```

---

## Complete Test Pipeline

### 1. CI Pipeline Tests (`.github/workflows/ci.yml`)

#### 1.1 Lint & Type Check
- **Command**: `npm run lint` + `npm run type-check`
- **What**: ESLint for code quality + TypeScript strict compilation
- **Files**: All `.ts`, `.tsx` files
- **Sharding**: No
- **NIST Controls**: SI-10 (Information Input Validation)

#### 1.2 Unit Tests
- **Command**: `npm run test:unit -- --shard=X/3`
- **What**: 270 Vitest unit tests
- **Files**: `tests/unit/**/*.test.{ts,tsx}`
- **Sharding**: 3 shards (parallel execution)
- **Coverage**: Uploaded from shard 1
- **NIST Controls**:
  - SI-2 (Flaw Remediation)
  - SI-11 (Error Handling)

#### 1.3 Integration Tests
- **Command**: `npm run test:integration`
- **What**: Tests across multiple modules
- **Files**: `tests/integration/**/*.test.{ts,tsx}`
- **Status**: Optional (skipped if no tests exist)
- **NIST Controls**: SI-2 (Flaw Remediation)

#### 1.4 Docker Build
- **Command**: `docker build` (frontend + backend)
- **What**: Verifies production builds work in containers
- **Dockerfiles**:
  - `docker/frontend.Dockerfile`
  - `docker/backend.Dockerfile`
- **This is where TypeScript errors blocked**: Build runs `tsc` which catches all type errors
- **NIST Controls**:
  - CM-2 (Baseline Configuration)
  - CM-3 (Configuration Change Control)

#### 1.5 Security Scan
- **Command**: `trivy fs .`
- **What**: Filesystem vulnerability scanning
- **Format**: SARIF uploaded to GitHub Security
- **NIST Controls**:
  - RA-5 (Vulnerability Scanning)
  - SI-2 (Flaw Remediation)

#### 1.6 Dependency Audit
- **Command**: `npm audit --audit-level=moderate`
- **What**: Check for known vulnerabilities in dependencies
- **Continues on error**: Yes (doesn't block CI)
- **NIST Controls**:
  - RA-5 (Vulnerability Scanning)
  - SA-11 (Developer Security Testing)

---

### 2. E2E Pipeline Tests (`.github/workflows/e2e.yml`)

#### 2.1 E2E Tests (Multi-Browser)
- **Command**: `npx playwright test --browser=X --shard=Y/2`
- **Browsers**: Chrome, Firefox, Edge
- **Sharding**: 2 shards per browser (6 jobs total)
- **Files**: `tests/e2e/**/*.test.ts`
- **Services**: Full stack (frontend + backend + redis)
- **Artifacts**: HTML reports, videos on failure
- **NIST Controls**:
  - SI-2 (Flaw Remediation)
  - SI-11 (Error Handling)
  - SC-2 (Application Partitioning)

#### 2.2 Visual Regression Tests
- **Command**: `npx percy exec -- npm run test:visual`
- **Tool**: Percy.io (screenshot comparison)
- **What**: Detects unintended UI changes
- **Config**: `playwright.config.layout.ts`
- **NIST Controls**:
  - CM-3 (Configuration Change Control)
  - SI-12 (Information Handling)

#### 2.3 Lighthouse Performance Tests
- **Command**: `lighthouse-ci`
- **Metrics**: Performance, Accessibility, Best Practices, SEO
- **Runs**: 3 (averaged)
- **URL**: `http://localhost:4173`
- **NIST Controls**:
  - SC-5 (Denial of Service Protection) - via performance
  - AU-2 (Audit Events) - via logging

#### 2.4 Accessibility Tests
- **Command**: `npm run test:a11y` (if exists)
- **Tool**: axe-core via Playwright
- **What**: WCAG 2.1 AA compliance
- **Reports**: HTML accessibility report
- **NIST Controls**:
  - AC-25 (Reference Monitor)
  - IA-2 (Identification and Authentication)

---

### 3. Security Pipeline (`.github/workflows/security.yml`)

#### 3.1 CodeQL Analysis
- **Tool**: GitHub CodeQL
- **Language**: JavaScript/TypeScript
- **Queries**: `security-and-quality`
- **Upload**: SARIF to GitHub Security
- **Schedule**: Daily at 2 AM UTC
- **NIST Controls**:
  - **SA-11 (Developer Security Testing)** ⭐
  - **SI-2 (Flaw Remediation)**
  - **RA-5 (Vulnerability Scanning)**

#### 3.2 Snyk Security Scan
- **Tool**: Snyk
- **Severity**: High and above
- **Output**: SARIF
- **Continues on error**: Yes
- **NIST Controls**:
  - **RA-5 (Vulnerability Scanning)** ⭐
  - **SA-15 (Development Process, Standards, and Tools)**

#### 3.3 Container Security Scan
- **Tools**: Trivy + Grype
- **Images**: frontend, backend
- **Severity**: CRITICAL, HIGH
- **Matrix**: 2 images scanned
- **NIST Controls**:
  - **RA-5 (Vulnerability Scanning)** ⭐
  - **CM-2 (Baseline Configuration)**
  - **SC-28 (Protection of Information at Rest)**

#### 3.4 OWASP Dependency Check
- **Tool**: OWASP Dependency-Check
- **Flags**: `--enableRetired --enableExperimental`
- **Output**: HTML report
- **Upload**: Artifact storage
- **NIST Controls**:
  - **RA-5 (Vulnerability Scanning)** ⭐
  - **SA-11 (Developer Security Testing)**
  - **CM-8 (Information System Component Inventory)**

#### 3.5 Secret Scanning
- **Tools**: TruffleHog OSS + Gitleaks
- **Scope**: Full git history
- **TruffleHog**: Only verified secrets
- **Gitleaks**: All patterns
- **NIST Controls**:
  - **SC-12 (Cryptographic Key Establishment)** ⭐
  - **SC-13 (Cryptographic Protection)**
  - **IA-5 (Authenticator Management)**
  - **AC-2 (Account Management)**

#### 3.6 License Compliance Check
- **Tool**: license-checker
- **Allowed**: MIT, Apache-2.0, BSD, ISC, LGPL-3.0+, etc.
- **Output**: JSON report
- **NIST Controls**:
  - **SA-12 (Supply Chain Protection)** ⭐
  - **CM-8 (Component Inventory)**

---

### 4. Pre-Commit Hooks (Husky + lint-staged)

#### 4.1 Layout Validation
- **Command**: `node scripts/validate-layout-css.js`
- **What**: Checks CSS constraints
- **Files**: All CSS files
- **NIST Controls**:
  - SI-10 (Information Input Validation)
  - CM-3 (Configuration Change Control)

#### 4.2 ESLint --fix
- **Command**: `eslint --fix`
- **Files**: Staged `*.{js,jsx,ts,tsx}` files only
- **Auto-fixes**: Yes
- **NIST Controls**: SI-10 (Information Input Validation)

#### 4.3 Commit Message Validation
- **Tool**: commitlint
- **Format**: Conventional Commits
- **Max line**: 100 characters
- **NIST Controls**: AU-3 (Content of Audit Records)

---

## NIST 800-53 Security Control Mapping

### Primary Controls (High Risk Management)

| NIST Control | Control Family | Tests Mapping | Risk Level |
|--------------|----------------|---------------|------------|
| **RA-5** | Risk Assessment | Trivy, Snyk, OWASP Dependency Check, CodeQL | HIGH |
| **SA-11** | System and Services Acquisition | CodeQL, OWASP, Unit Tests | HIGH |
| **SC-12** | System and Communications Protection | TruffleHog, Gitleaks | CRITICAL |
| **SI-2** | System and Information Integrity | Unit Tests, Integration Tests, CodeQL | HIGH |
| **SA-12** | System and Services Acquisition | License Compliance | MEDIUM |

### Secondary Controls (Medium Risk Management)

| NIST Control | Control Family | Tests Mapping | Risk Level |
|--------------|----------------|---------------|------------|
| **CM-2** | Configuration Management | Docker Build, Container Scan | MEDIUM |
| **CM-3** | Configuration Management | Visual Regression, Layout Validation | MEDIUM |
| **SI-10** | System and Information Integrity | Lint, Type Check, Layout Validation | MEDIUM |
| **SI-11** | System and Information Integrity | Unit Tests, E2E Tests | MEDIUM |
| **IA-5** | Identification and Authentication | Secret Scanning | HIGH |
| **CM-8** | Configuration Management | Dependency Check, License Check | LOW |

### Tertiary Controls (Supporting)

| NIST Control | Control Family | Tests Mapping | Risk Level |
|--------------|----------------|---------------|------------|
| **SC-5** | System and Communications Protection | Lighthouse Performance | LOW |
| **SC-28** | System and Communications Protection | Container Scan | MEDIUM |
| **AU-2** | Audit and Accountability | Lighthouse Logging | LOW |
| **AU-3** | Audit and Accountability | Commit Message Validation | LOW |
| **AC-2** | Access Control | Secret Scanning | MEDIUM |
| **AC-25** | Access Control | Accessibility Tests | LOW |
| **SC-2** | System and Communications Protection | E2E Tests | MEDIUM |
| **SA-15** | System and Services Acquisition | Snyk | MEDIUM |

---

## Test Execution Flow

```
Push to main/develop
    ↓
┌───────────────────────────────────────┐
│  Pre-commit Hooks (Local)             │
│  - Layout validation                  │
│  - ESLint --fix                       │
│  - Commit message check               │
└───────────────┬───────────────────────┘
                ↓
┌───────────────────────────────────────┐
│  CI Pipeline (Parallel)                │
│  ┌─────────────────────────────────┐  │
│  │ Lint & Type (1 job)             │  │
│  │  - ESLint                        │  │
│  │  - TypeScript type-check         │  │
│  └─────────────────────────────────┘  │
│  ┌─────────────────────────────────┐  │
│  │ Unit Tests (3 shards)           │  │
│  │  - 270 tests across 3 workers   │  │
│  │  - Coverage from shard 1         │  │
│  └─────────────────────────────────┘  │
│  ┌─────────────────────────────────┐  │
│  │ Integration Tests (1 job)       │  │
│  │  - Cross-module tests            │  │
│  └─────────────────────────────────┘  │
│  ┌─────────────────────────────────┐  │
│  │ Docker Build (1 job)            │  │ ← TypeScript errors block here
│  │  - Frontend image                │  │
│  │  - Backend image                 │  │
│  └─────────────────────────────────┘  │
│  ┌─────────────────────────────────┐  │
│  │ Security Scan (1 job)           │  │
│  │  - Trivy filesystem scan         │  │
│  └─────────────────────────────────┘  │
│  ┌─────────────────────────────────┐  │
│  │ Dependency Audit (1 job)        │  │
│  │  - npm audit                     │  │
│  └─────────────────────────────────┘  │
└───────────────────────────────────────┘
                ↓
┌───────────────────────────────────────┐
│  E2E Pipeline (Parallel)               │
│  ┌─────────────────────────────────┐  │
│  │ Browser Tests (6 jobs)          │  │
│  │  - Chrome x2 shards              │  │
│  │  - Firefox x2 shards             │  │
│  │  - Edge x2 shards                │  │
│  └─────────────────────────────────┘  │
│  ┌─────────────────────────────────┐  │
│  │ Visual Regression (1 job)       │  │
│  │  - Percy screenshot compare      │  │
│  └─────────────────────────────────┘  │
│  ┌─────────────────────────────────┐  │
│  │ Lighthouse (1 job)              │  │
│  │  - Performance x3 runs           │  │
│  └─────────────────────────────────┘  │
│  ┌─────────────────────────────────┐  │
│  │ Accessibility (1 job)           │  │
│  │  - axe-core WCAG checks          │  │
│  └─────────────────────────────────┘  │
└───────────────────────────────────────┘
                ↓
┌───────────────────────────────────────┐
│  Security Pipeline (Daily + On Push)   │
│  ┌─────────────────────────────────┐  │
│  │ CodeQL (1 job)                  │  │
│  │  - Static code analysis          │  │
│  └─────────────────────────────────┘  │
│  ┌─────────────────────────────────┐  │
│  │ Snyk (1 job)                    │  │
│  │  - Dependency vulnerabilities    │  │
│  └─────────────────────────────────┘  │
│  ┌─────────────────────────────────┐  │
│  │ Container Scan (2 jobs)         │  │
│  │  - Trivy + Grype on images       │  │
│  └─────────────────────────────────┘  │
│  ┌─────────────────────────────────┐  │
│  │ OWASP Dependency Check (1 job)  │  │
│  │  - Known vulnerability database  │  │
│  └─────────────────────────────────┘  │
│  ┌─────────────────────────────────┐  │
│  │ Secret Scan (1 job)             │  │
│  │  - TruffleHog + Gitleaks         │  │
│  └─────────────────────────────────┘  │
│  ┌─────────────────────────────────┐  │
│  │ License Check (1 job)           │  │
│  │  - OSS compliance                │  │
│  └─────────────────────────────────┘  │
└───────────────────────────────────────┘
```

---

## Summary Statistics

- **Total Test Jobs**: 20+ parallel jobs
- **Total Sharding**: 11 concurrent workers (3 unit + 6 E2E + 2 container)
- **Unit Tests**: 270 tests
- **E2E Browsers**: 3 (Chrome, Firefox, Edge)
- **Security Scanners**: 6 different tools
- **NIST Controls Covered**: 17 controls
- **Critical Controls**: 1 (SC-12 - Cryptographic Key)
- **High Priority Controls**: 4 (RA-5, SA-11, SI-2, IA-5)

---

## Key Insight: Why Build Failed

The **Docker Build** job runs:
```bash
npm run build  # which expands to: tsc && vite build
```

This means:
1. ✅ Unit tests passed (Vitest, no strict type checking)
2. ✅ Lint passed (ESLint catches some but not all type errors)
3. ❌ **Docker build failed** (tsc catches ALL type errors)

The production build is the **only place** that runs full TypeScript compilation in strict mode, which is why TypeScript errors that don't affect runtime behavior can slip through earlier stages.
