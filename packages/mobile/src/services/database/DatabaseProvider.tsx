import React, {createContext, useContext, useEffect, useState} from 'react';
import {DatabaseService} from './DatabaseService';

interface DatabaseContextType {
  db: DatabaseService | null;
  isReady: boolean;
}

const DatabaseContext = createContext<DatabaseContextType>({
  db: null,
  isReady: false,
});

export const useDatabaseContext = () => {
  const context = useContext(DatabaseContext);
  if (!context) {
    throw new Error('useDatabaseContext must be used within a DatabaseProvider');
  }
  return context;
};

interface DatabaseProviderProps {
  children: React.ReactNode;
}

export const DatabaseProvider: React.FC<DatabaseProviderProps> = ({children}) => {
  const [db, setDb] = useState<DatabaseService | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const initializeDatabase = async () => {
      try {
        const databaseService = new DatabaseService();
        await databaseService.initialize();
        setDb(databaseService);
        setIsReady(true);
      } catch (error) {
        console.error('Failed to initialize database:', error);
      }
    };

    initializeDatabase();
  }, []);

  return (
    <DatabaseContext.Provider value={{db, isReady}}>
      {children}
    </DatabaseContext.Provider>
  );
};