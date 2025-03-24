import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getAnalytics } from 'firebase/analytics';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  User
} from 'firebase/auth';

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Lazy initialization to avoid SSR issues
let firebaseApp: FirebaseApp | undefined;
let analytics: any = null;
let storage: any = null;
let auth: any = null;

// Initialize Firebase only on client side
function initializeFirebase() {
  if (typeof window === 'undefined') {
    return null;
  }
  
  if (!firebaseApp && typeof window !== 'undefined') {
    // Check if any Firebase apps have been initialized
    if (!getApps().length) {
      firebaseApp = initializeApp(firebaseConfig);
    } else {
      firebaseApp = getApps()[0];
    }
    
    // Only initialize analytics on the client side
    try {
      analytics = getAnalytics(firebaseApp);
    } catch (error) {
      console.error('Error initializing analytics:', error);
    }
    
    storage = getStorage(firebaseApp);
    auth = getAuth(firebaseApp);
  }
  
  return firebaseApp;
}

// Ensure Firebase is initialized before exporting
const getFirebaseApp = () => {
  if (!firebaseApp) {
    return initializeFirebase();
  }
  return firebaseApp;
};

// Get auth instance
const getFirebaseAuth = () => {
  getFirebaseApp();
  return auth;
};

// Get storage instance
const getFirebaseStorage = () => {
  getFirebaseApp();
  return storage;
};

/**
 * Upload a file to Firebase Storage
 * @param file The file to upload
 * @param path The path in storage to upload to
 * @returns URL of the uploaded file
 */
export async function uploadFile(file: File, path: string): Promise<string> {
  const storageInstance = getFirebaseStorage();
  if (!storageInstance) throw new Error('Firebase Storage not initialized');
  
  try {
    const storageRef = ref(storageInstance, path);
    await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(storageRef);
    return downloadURL;
  } catch (error) {
    console.error('Error uploading file:', error);
    throw error;
  }
}

/**
 * Sign in with email and password
 * @param email User's email
 * @param password User's password
 * @returns User credentials
 */
export async function loginWithEmail(email: string, password: string) {
  const authInstance = getFirebaseAuth();
  if (!authInstance) throw new Error('Firebase Auth not initialized');
  
  try {
    return await signInWithEmailAndPassword(authInstance, email, password);
  } catch (error) {
    console.error('Error signing in:', error);
    throw error;
  }
}

/**
 * Create a new user with email and password
 * @param email User's email
 * @param password User's password
 * @returns User credentials
 */
export async function registerWithEmail(email: string, password: string) {
  const authInstance = getFirebaseAuth();
  if (!authInstance) throw new Error('Firebase Auth not initialized');
  
  try {
    return await createUserWithEmailAndPassword(authInstance, email, password);
  } catch (error) {
    console.error('Error registering user:', error);
    throw error;
  }
}

/**
 * Sign out the current user
 */
export async function logout() {
  const authInstance = getFirebaseAuth();
  if (!authInstance) throw new Error('Firebase Auth not initialized');
  
  try {
    await signOut(authInstance);
  } catch (error) {
    console.error('Error signing out:', error);
    throw error;
  }
}

/**
 * Subscribe to auth state changes
 * @param callback Function to call when auth state changes
 * @returns Unsubscribe function
 */
export function onAuthChange(callback: (user: User | null) => void) {
  const authInstance = getFirebaseAuth();
  if (!authInstance) {
    // If auth is not initialized, just call the callback with null
    callback(null);
    return () => {};
  }
  
  return onAuthStateChanged(authInstance, callback);
}

// Initialize Firebase when this module is imported on client side
if (typeof window !== 'undefined') {
  initializeFirebase();
}

export { 
  getFirebaseApp, 
  getFirebaseAuth as auth, 
  getFirebaseStorage as storage, 
  ref, 
  getDownloadURL, 
  analytics 
}; 