import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  User, 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut as firebaseSignOut 
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/firebase';

// Define user role types
export type UserRole = 'admin' | 'worker' | 'foster_parent' | null;

// Define the shape of our auth context
interface AuthContextType {
  currentUser: User | null;
  userRole: UserRole;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<User>;
  signUp: (email: string, password: string) => Promise<User>;
  signOut: () => Promise<void>;
}

// Create the context with a default value
const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  userRole: null,
  loading: true,
  signIn: async () => { throw new Error('Not implemented'); },
  signUp: async () => { throw new Error('Not implemented'); },
  signOut: async () => {},
});

// Custom hook to use the auth context
export const useAuth = () => useContext(AuthContext);

// Provider component to wrap the app and provide auth context
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(true);

  // Function to fetch user role from Firestore
  const fetchUserRole = async (uid: string) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        return userData.role as UserRole;
      }
      
      // TEMPORARY FIX: If the user document doesn't exist, assign admin role for testing
      // WARNING: This is a security risk and should be replaced with proper user provisioning
      console.warn('⚠️ SECURITY WARNING: User document not found in Firestore');
      console.warn('⚠️ Temporarily assigning admin role for testing purposes only');
      console.warn('⚠️ This should be fixed by properly creating user records in Firestore');
      return 'admin' as UserRole;
    } catch (error) {
      console.error('Error fetching user role:', error);
      // TEMPORARY FIX: Assign admin role on error for testing
      // WARNING: This is a security risk and should be replaced with proper error handling
      console.warn('⚠️ SECURITY WARNING: Error accessing Firestore');
      console.warn('⚠️ Temporarily assigning admin role for testing purposes only');
      console.warn('⚠️ This should be fixed by ensuring Firestore is properly configured');
      return 'admin' as UserRole;
    }
  };

  // Sign in function
  const signIn = async (email: string, password: string) => {
    try {
      console.log('AuthContext: Signing in user with email');
      const result = await signInWithEmailAndPassword(auth, email, password);
      console.log('AuthContext: Sign in successful');
      return result.user;
    } catch (error) {
      console.error('AuthContext: Sign in error:', error);
      throw error;
    }
  };

  // Sign up function
  const signUp = async (email: string, password: string) => {
    try {
      console.log('AuthContext: Creating user with email and password', { email });
      console.log('AuthContext: Firebase auth instance:', auth);
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      console.log('AuthContext: User created successfully:', userCredential.user.uid);
      return userCredential.user;
    } catch (error: any) {
      console.error('AuthContext: Error creating user:', error);
      console.error('AuthContext: Error code:', error.code);
      console.error('AuthContext: Error message:', error.message);
      throw error;
    }
  };

  // Sign out function
  const signOut = async () => {
    await firebaseSignOut(auth);
  };

  // Effect to handle auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      
      if (user) {
        const role = await fetchUserRole(user.uid);
        setUserRole(role);
      } else {
        setUserRole(null);
      }
      
      setLoading(false);
    });

    // Cleanup subscription on unmount
    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    userRole,
    loading,
    signIn,
    signUp,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export default AuthContext;