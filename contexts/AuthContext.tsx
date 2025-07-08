import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { UserProfile } from '../types';
import { clearAllUserChatHistory } from '../services/dbService';

interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  loginWithName: (name: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    setIsLoading(true);
    try {
      const storedUser = localStorage.getItem('currentUserSession');
      if (storedUser) {
        const parsedUser: UserProfile = JSON.parse(storedUser);
        // Basic validation for the new simplified UserProfile structure
        if (parsedUser && parsedUser.id && parsedUser.name) {
            setUser(parsedUser);
            setIsAuthenticated(true);
        } else {
            localStorage.removeItem('currentUserSession');
        }
      }
    } catch (error) {
        console.error("Error loading user from localStorage:", error);
        localStorage.removeItem('currentUserSession');
    }
    setIsLoading(false);
  }, []);

  const loginWithName = async (name: string): Promise<void> => {
    setIsLoading(true);
    if (!name.trim()) {
        console.error("Name cannot be empty.");
        setIsLoading(false);
        return Promise.reject("Name cannot be empty.");
    }
    const userProfile: UserProfile = {
      id: name.trim(), // Use the name as ID
      name: name.trim(),
    };
    
    setUser(userProfile);
    setIsAuthenticated(true);
    localStorage.setItem('currentUserSession', JSON.stringify(userProfile));
    setIsLoading(false);
    return Promise.resolve();
  };

  const logout = () => {
    const activeUser = user; 
    
    if (activeUser && activeUser.id) {
      clearAllUserChatHistory(activeUser.id)
        .then(() => console.log(`Chat history cleared for user ${activeUser.id}`))
        .catch(err => console.error(`Failed to clear chat history for user ${activeUser.id}:`, err));
    }

    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem('currentUserSession');
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, loginWithName, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};