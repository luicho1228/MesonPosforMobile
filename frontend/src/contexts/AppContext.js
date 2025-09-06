import React, { createContext, useContext, useState } from 'react';

const AppContext = createContext();

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

export const AppProvider = ({ children }) => {
  const [currentView, setCurrentView] = useState('login');
  const [selectedTable, setSelectedTable] = useState(null);
  const [editingOrder, setEditingOrder] = useState(null);
  const [editingActiveOrder, setEditingActiveOrder] = useState(null);

  const navigateTo = (view, options = {}) => {
    setCurrentView(view);
    if (options.table) setSelectedTable(options.table);
    if (options.editingOrder) setEditingOrder(options.editingOrder);
    if (options.editingActiveOrder) setEditingActiveOrder(options.editingActiveOrder);
  };

  const resetNavigation = () => {
    setSelectedTable(null);
    setEditingOrder(null);
    setEditingActiveOrder(null);
  };

  const value = {
    currentView,
    setCurrentView,
    selectedTable,
    setSelectedTable,
    editingOrder,
    setEditingOrder,
    editingActiveOrder,
    setEditingActiveOrder,
    navigateTo,
    resetNavigation
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};