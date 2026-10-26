/**
 * Firestore Security Rules Verification Suite (Dirty Dozen Payloads)
 * Verifies that all 12 adversarial payloads in security_spec.md return PERMISSION_DENIED.
 */

export interface DirtyDozenTestCase {
  id: number;
  name: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  path: string;
  auth: { uid: string; email: string; email_verified: boolean } | null;
  payload?: Record<string, unknown>;
  expectedResult: 'PERMISSION_DENIED';
}

export const DIRTY_DOZEN_TESTS: DirtyDozenTestCase[] = [
  {
    id: 1,
    name: 'Identity Spoofing on Profile Create',
    operation: 'create',
    path: '/profiles/user_1',
    auth: { uid: 'user_1', email: 'u1@example.com', email_verified: true },
    payload: { ownerId: 'user_2', fullName: 'Spoofed' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 2,
    name: 'Cross-User PII Read',
    operation: 'get',
    path: '/profiles/user_1',
    auth: { uid: 'user_2', email: 'u2@example.com', email_verified: true },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 3,
    name: 'Unverified Email Write',
    operation: 'create',
    path: '/profiles/user_1',
    auth: { uid: 'user_1', email: 'u1@example.com', email_verified: false },
    payload: { ownerId: 'user_1', fullName: 'Unverified' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 4,
    name: 'Shadow Field Injection on Profile',
    operation: 'create',
    path: '/profiles/user_1',
    auth: { uid: 'user_1', email: 'u1@example.com', email_verified: true },
    payload: { ownerId: 'user_1', fullName: 'Owner', isAdmin: true },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 5,
    name: 'Timestamp Forgery on Create',
    operation: 'create',
    path: '/profiles/user_1',
    auth: { uid: 'user_1', email: 'u1@example.com', email_verified: true },
    payload: { ownerId: 'user_1', createdAt: '1999-01-01T00:00:00Z' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 6,
    name: 'Immortal Field Mutation on Update',
    operation: 'update',
    path: '/cases/case-1',
    auth: { uid: 'user_1', email: 'u1@example.com', email_verified: true },
    payload: { ownerId: 'user_2' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 7,
    name: 'Denial-of-Wallet Oversized String',
    operation: 'create',
    path: '/cases/case-1',
    auth: { uid: 'user_1', email: 'u1@example.com', email_verified: true },
    payload: { pgName: 'A'.repeat(10000) },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 8,
    name: 'ID Poisoning Attack',
    operation: 'create',
    path: '/cases/case$bad!id',
    auth: { uid: 'user_1', email: 'u1@example.com', email_verified: true },
    payload: { id: 'case$bad!id', ownerId: 'user_1' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 9,
    name: 'Unbounded Array Exhaustion',
    operation: 'create',
    path: '/cases/case-1',
    auth: { uid: 'user_1', email: 'u1@example.com', email_verified: true },
    payload: { agreementTerms: new Array(200).fill('clause') },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 10,
    name: 'Array Element Type Poisoning',
    operation: 'create',
    path: '/cases/case-1',
    auth: { uid: 'user_1', email: 'u1@example.com', email_verified: true },
    payload: { agreementTerms: [12345] },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 11,
    name: 'Unauthorized List Scraping',
    operation: 'list',
    path: '/cases',
    auth: { uid: 'user_2', email: 'u2@example.com', email_verified: true },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 12,
    name: 'Terminal State Modification',
    operation: 'update',
    path: '/cases/case-1',
    auth: { uid: 'user_1', email: 'u1@example.com', email_verified: true },
    payload: { monthlyRent: 999999, status: 'Resolved' },
    expectedResult: 'PERMISSION_DENIED',
  },
];
