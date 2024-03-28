// authContext.tsx
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getApiToken } from '@/utilities/firebaseClient'; // Import getApiToken function

interface UserData {
  uid: string | null;
  apiKey: string | null;
}

const AuthContext = createContext<[UserData, React.Dispatch<React.SetStateAction<UserData>>]>([{
  uid: null,
  apiKey: null
}, () => {}]);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [userData, setUserData] = useState<UserData>({ uid: null, apiKey: null });

  // Fetch API key when user authenticates
  useEffect(() => {
    // Ensure user is authenticated
    if (userData.uid) {
      getApiToken(userData.uid)
        .then(apiKey => {
          // Ensure apiKey is not null before setting state
          if (apiKey !== null) {
            setUserData(prevUserData => ({ ...prevUserData, apiKey }));
          }
        })
        .catch(error => console.error('Error fetching API key:', error));
    }
  }, [userData.uid]);

  return <AuthContext.Provider value={[userData, setUserData]}>{children}</AuthContext.Provider>;
};

export const useAuth = (): [UserData, React.Dispatch<React.SetStateAction<UserData>>] => useContext(AuthContext);
