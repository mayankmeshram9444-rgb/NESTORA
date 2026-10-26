import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDocFromServer,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { LandownerProfile, PgCase } from './types';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes('the client is offline')
    ) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
testConnection();

export async function signInWithGooglePopup() {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

export async function signOutFirebase() {
  await signOut(auth);
}

// Sanitize undefined values recursively from objects before sending to Firestore
function stripUndefined<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

export async function saveProfileToFirestore(
  uid: string,
  profile: LandownerProfile
): Promise<void> {
  const cleanUid = uid.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 128);
  const path = `profiles/${cleanUid}`;
  const docRef = doc(db, 'profiles', cleanUid);

  const basePayload = {
    ownerId: cleanUid,
    fullName: (profile.fullName || '').slice(0, 120),
    email: (profile.email || '').slice(0, 150),
    mobile: (profile.mobile || '').slice(0, 40),
    residentialAddress: (profile.residentialAddress || '').slice(0, 300),
    preferredLanguage: (profile.preferredLanguage || 'English').slice(0, 60),
    aboutYou: (profile.aboutYou || '').slice(0, 600),
    vacantUnits: Math.max(0, Math.min(10000, Number(profile.vacantUnits) || 0)),
  };

  try {
    const existingSnap = await getDoc(docRef);
    if (existingSnap.exists()) {
      await updateDoc(docRef, {
        ...basePayload,
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(docRef, {
        ...basePayload,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function saveCaseToFirestore(
  uid: string,
  pgCase: PgCase
): Promise<void> {
  const cleanUid = uid.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 128);
  const cleanId = (pgCase.id || `case-${Date.now()}`)
    .replace(/[^a-zA-Z0-9_-]/g, '-')
    .slice(0, 128);
  const path = `cases/${cleanId}`;
  const docRef = doc(db, 'cases', cleanId);

  const occupancyStatus =
    pgCase.occupancyStatus === 'available' ||
    pgCase.occupancyStatus === 'pending_application' ||
    pgCase.occupancyStatus === 'approved_occupied'
      ? pgCase.occupancyStatus
      : 'available';

  const rentStatus =
    pgCase.rentStatus === 'Paid' ||
    pgCase.rentStatus === 'Pending' ||
    pgCase.rentStatus === 'Overdue'
      ? pgCase.rentStatus
      : 'Pending';

  const status =
    pgCase.status === 'Active' ||
    pgCase.status === 'Disputed Deductions' ||
    pgCase.status === 'Notice Served' ||
    pgCase.status === 'Resolved' ||
    pgCase.status === 'Legal Notice Issued'
      ? pgCase.status
      : 'Active';

  const sanitizedCase = stripUndefined({
    ...pgCase,
    id: cleanId,
  });

  const basePayload = {
    id: cleanId,
    ownerId: cleanUid,
    roomCode: (pgCase.roomCode || 'UNIT-1').slice(0, 32),
    pgName: (pgCase.pgName || 'Apartment Property').slice(0, 150),
    roomNo: (pgCase.roomNo || 'Unit 1').slice(0, 150),
    occupancyStatus,
    monthlyRent: Math.max(
      0,
      Math.min(10000000, Number(pgCase.monthlyRent) || 0)
    ),
    securityDeposit: Math.max(
      0,
      Math.min(100000000, Number(pgCase.securityDeposit) || 0)
    ),
    rentStatus,
    status,
    caseDetails: sanitizedCase as unknown as Record<string, unknown>,
  };

  try {
    const existingSnap = await getDoc(docRef);
    if (existingSnap.exists()) {
      // Firestore rule enforces existing().status != 'Resolved' on update;
      // if already Resolved, only update if not locked
      const existingData = existingSnap.data();
      if (existingData?.status === 'Resolved') {
        return;
      }
      await updateDoc(docRef, {
        ...basePayload,
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(docRef, {
        ...basePayload,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteCaseFromFirestore(caseId: string): Promise<void> {
  const cleanId = caseId.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 128);
  const path = `cases/${cleanId}`;
  try {
    await deleteDoc(doc(db, 'cases', cleanId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}
