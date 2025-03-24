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

// Add type for global window.ENV
declare global {
  interface Window {
    ENV: {
      NEXT_PUBLIC_FIREBASE_API_KEY: string;
      NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: string;
      NEXT_PUBLIC_FIREBASE_PROJECT_ID: string;
      NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: string;
      NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: string;
      NEXT_PUBLIC_FIREBASE_APP_ID: string;
      NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID: string;
    };
  }
}

// Helper function to get config from window.ENV or process.env
const getConfig = (key: string) => {
  if (typeof window !== 'undefined' && window.ENV && window.ENV[key as keyof typeof window.ENV]) {
    return window.ENV[key as keyof typeof window.ENV];
  }
  return process.env[key];
};

// Helper function to validate Firebase config
const validateFirebaseConfig = () => {
  // Create config object based on client-side or server-side environment
  const config = {
    apiKey: getConfig('NEXT_PUBLIC_FIREBASE_API_KEY'),
    authDomain: getConfig('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN'),
    projectId: getConfig('NEXT_PUBLIC_FIREBASE_PROJECT_ID'),
    storageBucket: getConfig('NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET'),
    messagingSenderId: getConfig('NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID'),
    appId: getConfig('NEXT_PUBLIC_FIREBASE_APP_ID')
  };
  
  const missingKeys = Object.entries(config)
    .filter(([_, value]) => !value)
    .map(([key]) => key);
  
  if (missingKeys.length > 0) {
    console.error(`Missing required Firebase configuration: ${missingKeys.join(', ')}`);
    return false;
  }
  
  return true;
};

// Firebase configuration
const getFirebaseConfig = () => {
  // Client-side use window.ENV, fallback to process.env
  if (typeof window !== 'undefined' && window.ENV) {
    return {
      apiKey: window.ENV.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: window.ENV.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: window.ENV.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: window.ENV.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: window.ENV.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: window.ENV.NEXT_PUBLIC_FIREBASE_APP_ID,
      measurementId: window.ENV.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
    };
  }
  
  // Server-side use process.env
  return {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
  };
};

// For debugging in production environment
if (typeof window !== 'undefined') {
  const config = getFirebaseConfig();
  console.log('Firebase config check:', {
    hasApiKey: !!config.apiKey,
    hasProjectId: !!config.projectId,
    hasAuthDomain: !!config.authDomain,
    hasAppId: !!config.appId,
    fromEnvJS: !!(window.ENV && window.ENV.NEXT_PUBLIC_FIREBASE_API_KEY)
  });
}

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
  
  // Validate config before initialization
  if (!validateFirebaseConfig()) {
    console.error('Firebase initialization skipped due to missing configuration');
    return null;
  }
  
  try {
    if (!firebaseApp && typeof window !== 'undefined') {
      const config = getFirebaseConfig();
      
      // Check if any Firebase apps have been initialized
      if (!getApps().length) {
        firebaseApp = initializeApp(config);
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
  } catch (error) {
    console.error('Failed to initialize Firebase:', error);
    return null;
  }
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