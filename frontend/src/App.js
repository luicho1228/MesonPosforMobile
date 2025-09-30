import React, { useState, useEffect, useContext, createContext, useRef } from 'react';
import axios from 'axios';
import './App.css';
import { PrinterProvider, usePrinter } from './PrinterContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import PinLogin from './components/PinLogin';
import PinVerificationModal from './components/PinVerificationModal';
import CustomerManagement from './components/CustomerManagement';
import OrderHistory from './components/OrderHistory';
import ActiveOrders from './components/ActiveOrders';
import TableManagement from './components/TableManagement';
import { EmployeeStatus, ClockInOut } from './components/EmployeeComponents';
import { PaymentModal, ItemRemovalModal } from './components/ModalComponents';
import OrderDetailModal from './components/OrderDetailModal';
import TableMergeModal from './components/TableMergeModal';
import FloorPlanDesigner from './components/FloorPlanDesigner';
import StaffManagementComponent from './components/StaffManagementComponent';
import MenuManagementComponent from './components/MenuManagementComponent';
import NewOrder from './components/NewOrder';
import TaxChargesComponent from './components/TaxChargesComponent';
import TableSettingsComponent from './components/TableSettingsComponent';
import POSInterface from './components/POSInterface';
import { parseBackendTimestamp, formatLocalDate, formatLocalTime, formatLocalDateTime, getTimeElapsed, getOrderAgeColor } from './utils/dateUtils';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Global helper function for displaying table names
const getTableDisplayName = (table) => {
  if (table.name && table.name.trim()) {
    return table.name;
  }
  return table ? 'Unknown Table' : 'Unknown Table';
};

// Helper function for orders - handles both table objects and table_name
const getOrderTableDisplayName = (order, tables = []) => {
  // First priority: table_id with tables array lookup
  if (order.table_id && tables.length > 0) {
    const table = tables.find(t => t.id === order.table_id);
    if (table) {
      return getTableDisplayName(table);
    }
  }
  
  // Second priority: table_number
  if (order.table_number) {
    return `Table ${order.table_number}`;
  }
  
  // Third priority: table_name (legacy field)
  if (order.table_name) {
    return order.table_name;
  }
  
  // Fourth priority: table object (if passed directly)
  if (order.table) {
    return getTableDisplayName(order.table);
  }
  
  return 'Unknown Table';
};

// App Component
function App() {
  return (
    <AuthProvider>
      <PrinterProvider>
        <MainApp />
      </PrinterProvider>
    </AuthProvider>
  );
}

function MainApp() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="App">
      {isAuthenticated ? <POSInterface /> : <PinLogin />}
    </div>
  );
};

export default App;