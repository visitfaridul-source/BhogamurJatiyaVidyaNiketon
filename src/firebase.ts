import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { initializeFirestore, getFirestore, setLogLevel } from "firebase/firestore";
import firebaseConfigData from "../firebase-applet-config.json";

// Set silent log level to prevent internal offline/retry warnings from cluttering the console
try {
  setLogLevel('silent');
} catch {
  // Ignored
}

// Support both JSON config and environment variables as robust fallbacks for Vercel / production environments
export const firebaseConfig = {
  apiKey: (import.meta as any).env.VITE_FIREBASE_API_KEY || firebaseConfigData.apiKey,
  authDomain: (import.meta as any).env.VITE_FIREBASE_AUTH_DOMAIN || firebaseConfigData.authDomain,
  projectId: (import.meta as any).env.VITE_FIREBASE_PROJECT_ID || firebaseConfigData.projectId,
  storageBucket: (import.meta as any).env.VITE_FIREBASE_STORAGE_BUCKET || firebaseConfigData.storageBucket,
  messagingSenderId: (import.meta as any).env.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseConfigData.messagingSenderId,
  appId: (import.meta as any).env.VITE_FIREBASE_APP_ID || firebaseConfigData.appId,
  measurementId: (import.meta as any).env.VITE_FIREBASE_MEASUREMENT_ID || firebaseConfigData.measurementId,
  firestoreDatabaseId: (import.meta as any).env.VITE_FIREBASE_DATABASE_ID || firebaseConfigData.firestoreDatabaseId || "(default)"
};

const app = initializeApp(firebaseConfig);

// Initialize Firestore using experimentalForceLongPolling to ensure 100% stable connection in iframe/proxy environments
const firestoreSettings = {
  experimentalForceLongPolling: true,
};

const customDbId = firebaseConfig.firestoreDatabaseId && 
                  firebaseConfig.firestoreDatabaseId !== "(default)" && 
                  firebaseConfig.firestoreDatabaseId.trim() !== ""
  ? firebaseConfig.firestoreDatabaseId
  : undefined;

let firestoreInstance;
try {
  firestoreInstance = customDbId
    ? initializeFirestore(app, firestoreSettings, customDbId)
    : initializeFirestore(app, firestoreSettings);
} catch {
  // If already initialized, fallback to getFirestore
  firestoreInstance = customDbId
    ? getFirestore(app, customDbId)
    : getFirestore(app);
}

export const db = firestoreInstance;

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
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * Recursively strips undefined fields from an object or array.
 * Firestore strictly forbids `undefined` field values in setDoc, addDoc, updateDoc.
 */
export function sanitizeFirestoreData<T>(data: T): T {
  if (data === null || data === undefined) {
    return data;
  }
  if (Array.isArray(data)) {
    return data.map(item => sanitizeFirestoreData(item)) as unknown as T;
  }
  if (typeof data === 'object') {
    // Keep special objects intact (Date, Timestamp, FieldValue, etc.)
    if (data.constructor && data.constructor.name !== 'Object') {
      return data;
    }
    const sanitized: any = {};
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        sanitized[key] = sanitizeFirestoreData(value);
      }
    }
    return sanitized;
  }
  return data;
}
