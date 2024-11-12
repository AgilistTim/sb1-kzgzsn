import { initializeApp, getApps } from 'firebase/app';
import { 
  getAuth, 
  connectAuthEmulator,
  browserLocalPersistence,
  inMemoryPersistence,
  setPersistence
} from 'firebase/auth';
import { 
  getFirestore, 
  initializeFirestore,
  persistentLocalCache,
  persistentSingleTabManager,
  connectFirestoreEmulator,
  enableIndexedDbPersistence
} from 'firebase/firestore';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';
import { toast } from 'sonner';

// Validate required environment variables
const requiredEnvVars = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID'
];

const missingEnvVars = requiredEnvVars.filter(key => !import.meta.env[key]);
if (missingEnvVars.length > 0) {
  console.error('Missing required Firebase environment variables:', missingEnvVars);
  throw new Error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
}

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase only if no apps exist
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Initialize Auth with fallback to in-memory persistence
const auth = getAuth(app);

// Initialize Firestore with offline persistence
const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentSingleTabManager()
  })
});

// Initialize Functions
const functions = getFunctions(app);

// Check network connectivity
const checkConnectivity = () => {
  return new Promise<boolean>((resolve) => {
    const timeout = setTimeout(() => resolve(false), 5000);
    fetch('https://www.googleapis.com/identitytoolkit/v3/relyingparty/verifyPassword?key=' + firebaseConfig.apiKey, {
      method: 'HEAD'
    })
      .then(() => {
        clearTimeout(timeout);
        resolve(true);
      })
      .catch(() => {
        clearTimeout(timeout);
        resolve(false);
      });
  });
};

// Set up Firebase with connectivity check
const setupFirebase = async () => {
  try {
    // Check connectivity first
    const isOnline = await checkConnectivity();
    
    if (!isOnline) {
      console.warn('Network connectivity issues detected');
      // Fall back to in-memory persistence if offline
      await setPersistence(auth, inMemoryPersistence);
      toast.warning('Network connectivity issues', {
        description: 'Some features may be limited. Please check your connection.'
      });
    } else {
      // Set up persistent auth if online
      await setPersistence(auth, browserLocalPersistence);
      console.debug('Firebase persistence configured');

      // Enable Firestore offline persistence
      try {
        await enableIndexedDbPersistence(db);
        console.debug('Firestore offline persistence enabled');
      } catch (err) {
        if (err.code === 'failed-precondition') {
          console.warn('Multiple tabs open, persistence can only be enabled in one tab at a time.');
        } else if (err.code === 'unimplemented') {
          console.warn('Browser doesn\'t support persistence');
        }
      }
    }

    // Development environment setup
    if (import.meta.env.DEV) {
      try {
        connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
        connectFirestoreEmulator(db, 'localhost', 8080);
        connectFunctionsEmulator(functions, 'localhost', 5001);
        console.debug('Firebase emulators connected successfully');
      } catch (emulatorError) {
        console.warn('Firebase emulators not available:', emulatorError);
      }
    }

    // Set up online/offline detection
    window.addEventListener('online', () => {
      toast.success('Connection restored', {
        description: 'Your changes will now sync automatically'
      });
    });

    window.addEventListener('offline', () => {
      toast.warning('You are offline', {
        description: 'Changes will be saved and synced when connection is restored'
      });
    });

  } catch (error) {
    console.error('Firebase setup error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    toast.error('Service initialization error', {
      description: `Please refresh the page. Error: ${errorMessage}`
    });
  }
};

// Run setup immediately
setupFirebase().catch(console.error);

export { auth, db, functions };
export default app;