import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  onSnapshot,
  query,
  orderBy,
  limit,
  serverTimestamp,
} from 'firebase/firestore';
import firebaseConfigJson from '../../firebase-applet-config.json';
import {
  ActionProposal,
  AuditLogEntry,
  BusinessMemoryItem,
  Opportunity,
  SystemState,
} from '../types.js';

// Firebase configuration from auto-generated config
export const firebaseConfig = {
  apiKey: firebaseConfigJson.apiKey,
  authDomain: firebaseConfigJson.authDomain,
  projectId: firebaseConfigJson.projectId,
  storageBucket: firebaseConfigJson.storageBucket,
  messagingSenderId: firebaseConfigJson.messagingSenderId,
  appId: firebaseConfigJson.appId,
};

// Initialize Firebase singleton
export const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

// Use named database if specified in config, otherwise default
export const firestoreDatabaseId = firebaseConfigJson.firestoreDatabaseId || '(default)';
export const db = getFirestore(app, firestoreDatabaseId !== '(default)' ? firestoreDatabaseId : undefined);

// Google Auth Provider
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

/**
 * Sign in using Google Auth Popup
 */
export async function signInWithGoogle(): Promise<User> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    
    // Create/update user document in Firestore
    if (user) {
      await syncUserProfile(user);
    }
    return user;
  } catch (error: any) {
    console.error('[Firebase] Sign-in with popup error:', error);
    // If popup was blocked or failed, try redirect
    if (error.code === 'auth/popup-blocked' || error.code === 'auth/cancelled-popup-request') {
      try {
        await signInWithRedirect(auth, googleProvider);
      } catch (redirectErr) {
        console.error('[Firebase] Sign-in with redirect error:', redirectErr);
        throw redirectErr;
      }
    }
    throw error;
  }
}

/**
 * Sign out current user
 */
export async function logOut(): Promise<void> {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('[Firebase] Sign-out error:', error);
    throw error;
  }
}

/**
 * Sync user profile to Firestore
 */
export async function syncUserProfile(user: User) {
  try {
    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);
    
    const userData = {
      id: user.uid,
      email: user.email || '',
      displayName: user.displayName || 'Operator',
      photoURL: user.photoURL || '',
      role: 'operator',
      updatedAt: new Date().toISOString(),
    };

    if (!userSnap.exists()) {
      await setDoc(userRef, {
        ...userData,
        createdAt: new Date().toISOString(),
      });
    } else {
      await updateDoc(userRef, userData);
    }
  } catch (err) {
    console.warn('[Firebase] Error syncing user profile:', err);
  }
}

// ----------------- FIRESTORE DATA REPOSITORY & SYNC -----------------

/**
 * Subscribe to real-time opportunities from Firestore
 */
export function subscribeToOpportunities(callback: (opps: Opportunity[]) => void) {
  try {
    const oppsRef = collection(db, 'opportunities');
    const q = query(oppsRef, orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const items: Opportunity[] = [];
      snapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() } as Opportunity);
      });
      callback(items);
    }, (error) => {
      console.warn('[Firestore] Opportunities subscription error:', error);
    });
  } catch (err) {
    console.warn('[Firestore] Subscribe opportunities failed:', err);
    return () => {};
  }
}

/**
 * Save or update opportunity in Firestore
 */
export async function saveOpportunityToFirestore(opp: Partial<Opportunity>): Promise<string> {
  const id = opp.id || `opp_${Date.now()}`;
  const oppRef = doc(db, 'opportunities', id);
  await setDoc(oppRef, {
    ...opp,
    id,
    updatedAt: new Date().toISOString(),
  }, { merge: true });
  return id;
}

/**
 * Subscribe to real-time action proposals
 */
export function subscribeToProposals(callback: (proposals: ActionProposal[]) => void) {
  try {
    const proposalsRef = collection(db, 'proposals');
    const q = query(proposalsRef, orderBy('proposedAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const items: ActionProposal[] = [];
      snapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() } as ActionProposal);
      });
      callback(items);
    }, (error) => {
      console.warn('[Firestore] Proposals subscription error:', error);
    });
  } catch (err) {
    console.warn('[Firestore] Subscribe proposals failed:', err);
    return () => {};
  }
}

/**
 * Save proposal in Firestore
 */
export async function saveProposalToFirestore(prop: Partial<ActionProposal>): Promise<string> {
  const id = prop.id || `prop_${Date.now()}`;
  const propRef = doc(db, 'proposals', id);
  await setDoc(propRef, {
    ...prop,
    id,
    updatedAt: new Date().toISOString(),
  }, { merge: true });
  return id;
}

/**
 * Subscribe to Business Memory items
 */
export function subscribeToMemory(callback: (memories: BusinessMemoryItem[]) => void) {
  try {
    const memRef = collection(db, 'businessMemory');
    const q = query(memRef, orderBy('updatedAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const items: BusinessMemoryItem[] = [];
      snapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() } as BusinessMemoryItem);
      });
      callback(items);
    }, (error) => {
      console.warn('[Firestore] Memory subscription error:', error);
    });
  } catch (err) {
    console.warn('[Firestore] Subscribe memory failed:', err);
    return () => {};
  }
}

/**
 * Save or update memory item in Firestore
 */
export async function saveMemoryToFirestore(item: Partial<BusinessMemoryItem>): Promise<string> {
  const id = item.id || `mem_${Date.now()}`;
  const memRef = doc(db, 'businessMemory', id);
  await setDoc(memRef, {
    ...item,
    id,
    updatedAt: new Date().toISOString(),
  }, { merge: true });
  return id;
}

/**
 * Delete memory item in Firestore
 */
export async function deleteMemoryFromFirestore(id: string): Promise<void> {
  const memRef = doc(db, 'businessMemory', id);
  await deleteDoc(memRef);
}

/**
 * Record immutable Audit Log in Firestore
 */
export async function recordAuditLogToFirestore(entry: Omit<AuditLogEntry, 'id'>): Promise<string> {
  try {
    const id = `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const logRef = doc(db, 'auditLogs', id);
    await setDoc(logRef, {
      ...entry,
      id,
      timestamp: entry.timestamp || new Date().toISOString(),
    });
    return id;
  } catch (err) {
    console.warn('[Firestore] Error saving audit log:', err);
    return '';
  }
}

/**
 * Subscribe to Audit Logs
 */
export function subscribeToAuditLogs(callback: (logs: AuditLogEntry[]) => void, maxLimit = 50) {
  try {
    const logsRef = collection(db, 'auditLogs');
    const q = query(logsRef, orderBy('timestamp', 'desc'), limit(maxLimit));
    return onSnapshot(q, (snapshot) => {
      const items: AuditLogEntry[] = [];
      snapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() } as AuditLogEntry);
      });
      callback(items);
    }, (error) => {
      console.warn('[Firestore] Audit logs subscription error:', error);
    });
  } catch (err) {
    console.warn('[Firestore] Subscribe audit logs failed:', err);
    return () => {};
  }
}
