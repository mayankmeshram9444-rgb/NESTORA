# Firestore Security Specification — Nestora

## 1. Data Invariants

1. **Zero-Trust Default Deny**: Every path not explicitly matched under `/profiles/{userId}` or `/cases/{caseId}` is unconditionally denied (`allow read, write: if false;`).
2. **Verified Identity Enforcement**: Every read or write operation requires an authenticated user (`request.auth != null`) with a verified email (`request.auth.token.email_verified == true`).
3. **Path Variable Hardening**: Every single-document operation (`get`, `create`, `update`, `delete`) enforces `isValidId(id)` (`id is string && id.size() >= 1 && id.size() <= 128 && id.matches('^[a-zA-Z0-9_\\-]+$')`).
4. **PII Isolation on `/profiles/{userId}`**:
   - Contains PII (`email`, `mobile`, `residentialAddress`).
   - Only the owner (`request.auth.uid == userId`) can `get`, `create`, `update`, or `delete` their profile.
   - `list` on `/profiles` is strictly restricted to `resource.data.ownerId == request.auth.uid`.
5. **Ownership & Query Enforcement on `/cases/{caseId}`**:
   - Every `/cases/{caseId}` document has an immutable `ownerId` matching `request.auth.uid`.
   - `list` queries on `/cases` strictly enforce `resource.data.ownerId == request.auth.uid` on the server rules side (no blanket `isSignedIn()` reads).
   - Terminal State Locking: Once `status == 'Resolved'`, no further updates are permitted unless reopening via a strict status transition or admin override.
   - Strict Timestamps: `createdAt == request.time` on `create` and `updatedAt == request.time` on both `create` and `update`. `createdAt` and `ownerId` are immutable on `update`.
   - Bounded Lists: All array fields (`agreementTerms`, `deductions`, `payments`, `complaints`, `comparisons`, `tenantApplications`, `legalDocuments`, `rentEmailNotices`) are strictly bounded in size and type-checked on their first element when non-empty.

## 2. The "Dirty Dozen" Payloads

1. **Payload 1 (Identity Spoofing on Profile Create)**: Authenticated user `uid_1` attempts to create `/profiles/uid_1` with `ownerId: "uid_2"`. -> `PERMISSION_DENIED`.
2. **Payload 2 (Cross-User PII Read)**: Authenticated user `uid_2` attempts `get` on `/profiles/uid_1`. -> `PERMISSION_DENIED`.
3. **Payload 3 (Unverified Email Write)**: Authenticated user with `email_verified: false` attempts to create `/profiles/uid_1`. -> `PERMISSION_DENIED`.
4. **Payload 4 (Shadow Field Injection on Profile)**: User `uid_1` attempts to create `/profiles/uid_1` including an undeclared field `"isAdmin": true`. -> `PERMISSION_DENIED`.
5. **Payload 5 (Timestamp Forgery on Create)**: User `uid_1` sends a past or future client timestamp for `createdAt` instead of `request.time`. -> `PERMISSION_DENIED`.
6. **Payload 6 (Immortal Field Mutation on Update)**: User `uid_1` attempts to update `/cases/case_1` by changing `ownerId` or `createdAt`. -> `PERMISSION_DENIED`.
7. **Payload 7 (Denial-of-Wallet Oversized String)**: User `uid_1` attempts to write a 10,000-character string to `pgName` or `fullName`. -> `PERMISSION_DENIED`.
8. **Payload 8 (ID Poisoning Attack)**: User `uid_1` attempts to create a case with a document ID containing spaces or special characters (`case$bad!id`). -> `PERMISSION_DENIED`.
9. **Payload 9 (Unbounded Array Exhaustion)**: User `uid_1` attempts to write 200 items into `agreementTerms` (exceeding max 25). -> `PERMISSION_DENIED`.
10. **Payload 10 (Array Element Type Poisoning)**: User `uid_1` attempts to set `agreementTerms: [12345]` (number instead of string). -> `PERMISSION_DENIED`.
11. **Payload 11 (Unauthorized List Scraping)**: User `uid_2` attempts an unfiltered `list` query across `/cases` to read `uid_1`'s cases. -> `PERMISSION_DENIED`.
12. **Payload 12 (Terminal State Modification)**: User `uid_1` attempts to mutate `monthlyRent` on a `/cases/case_1` document that is already in terminal state `status == 'Resolved'`. -> `PERMISSION_DENIED`.

## 3. The Test Runner

See `firestore.rules.test.ts` for the complete verification suite covering all 12 Dirty Dozen payloads.
