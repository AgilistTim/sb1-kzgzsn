import { createContext, useContext, useEffect, useState } from 'react';
import { 
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  AuthError
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const handleAuthError = (error: AuthError) => {
  let message = 'Authentication failed';
  
  switch (error.code) {
    case 'auth/network-request-failed':
      message = 'Network error. Please check your internet connection.';
      break;
    case 'auth/user-not-found':
    case 'auth/wrong-password':
      message = 'Invalid email or password';
      break;
    case 'auth/too-many-requests':
      message = 'Too many attempts. Please try again later.';
      break;
    case 'auth/email-already-in-use':
      message = 'Email is already registered';
      break;
    default:
      message = error.message;
  }

  return message;
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      await signInWithEmailAndPassword(auth, email, password);
      toast.success('Welcome back!');
      navigate('/candidate');
    } catch (error) {
      console.error('Sign in error:', error);
      const message = error instanceof Error ? handleAuthError(error as AuthError) : 'Authentication failed';
      toast.error('Sign in failed', {
        description: message
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      setLoading(true);
      await createUserWithEmailAndPassword(auth, email, password);
      toast.success('Account created successfully');
      navigate('/candidate');
    } catch (error) {
      console.error('Sign up error:', error);
      const message = error instanceof Error ? handleAuthError(error as AuthError) : 'Registration failed';
      toast.error('Sign up failed', {
        description: message
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      await signOut(auth);
      toast.success('Signed out successfully');
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
      const message = error instanceof Error ? handleAuthError(error as AuthError) : 'Sign out failed';
      toast.error('Sign out failed', {
        description: message
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const value = {
    user,
    loading,
    signIn,
    signUp,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}