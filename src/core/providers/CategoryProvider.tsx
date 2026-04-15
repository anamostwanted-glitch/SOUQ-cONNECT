import React, { createContext, useContext, useEffect, useState } from 'react';
import { db } from '../firebase';
import { collection, getDocs } from 'firebase/firestore';
import { Category } from '../types';
import { handleFirestoreError, OperationType } from '../utils/errorHandling';

interface CategoryContextType {
  categories: Category[];
  loading: boolean;
  refreshCategories: () => Promise<void>;
}

const CategoryContext = createContext<CategoryContextType | undefined>(undefined);

export const CategoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const snapshot = await getDocs(collection(db, 'categories'));
      const allCats = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));
      setCategories(allCats.filter(c => c.status === 'active' || !c.status));
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, 'categories');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  return (
    <CategoryContext.Provider value={{ categories, loading, refreshCategories: fetchCategories }}>
      {children}
    </CategoryContext.Provider>
  );
};

export const useCategories = () => {
  const context = useContext(CategoryContext);
  if (context === undefined) {
    throw new Error('useCategories must be used within a CategoryProvider');
  }
  return context;
};
