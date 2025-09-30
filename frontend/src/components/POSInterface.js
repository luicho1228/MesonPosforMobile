import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { usePrinter } from '../PrinterContext';
import NewOrder from './NewOrder';
import ActiveOrders from './ActiveOrders';
import OrderHistory from './OrderHistory';
import TableManagement from './TableManagement';
import CustomerManagement from './CustomerManagement';
import StaffManagementComponent from './StaffManagementComponent';
import MenuManagementComponent from './MenuManagementComponent';
import TaxChargesComponent from './TaxChargesComponent';
import TableSettingsComponent from './TableSettingsComponent';
import { EmployeeStatus, ClockInOut } from './EmployeeComponents';

const POSInterface = () => {
  const [currentView, setCurrentView] = useState('main');
  const [assignedTable, setAssignedTable] = useState(null);
  const [editingOrder, setEditingOrder] = useState(null);
  const [editingActiveOrder, setEditingActiveOrder] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedTable, setSelectedTable] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [fromTableManagement, setFromTableManagement] = useState(false);

  const { user, logout } = useAuth();
  const { connected, openPrinterManager } = usePrinter();

  const handleNewOrder = (table = null) => {
    setSelectedTable(table);
    setEditingOrder(null);
    setEditingActiveOrder(null);
    setFromTableManagement(false);
    setCurrentView('new-order');
  };

  const handleTableSelect = (table) => {
    setFromTableManagement(true);
    if (table.status === 'available') {
      // Start new order for available table
      setSelectedTable(table);
      setEditingOrder(null);
      setEditingActiveOrder(null);
    } else if (table.status === 'occupied') {
      // Edit existing order for occupied table
      setEditingOrder(table);
      setSelectedTable(table); // Pass the table so NewOrder can use it for assignedTable
      setEditingActiveOrder(null);
    }
    setCurrentView('new-order');
  };

  const handleOrderClick = (order) => {
    // Instead of showing modal, go to order editing
    setEditingActiveOrder(order);
    setSelectedTable(null);
    setEditingOrder(null);
    setCurrentView('new-order');
  };

  const handleBackToMain = () => {
    setCurrentView('main');
    setSelectedTable(null);
    setEditingOrder(null);
    setEditingActiveOrder(null);
    // Trigger refresh of active orders when returning to main view
    setRefreshTrigger(prev => prev + 1);
  };

  const handleOrderHistory = () => {
    setCurrentView('order-history');
  };

  const handleTableManagement = () => {
    setCurrentView('table-management');
  };

  if (currentView === 'new-order') {
    return (
      <NewOrder
        selectedTable={selectedTable}
        editingOrder={editingOrder}
        editingActiveOrder={editingActiveOrder}
        onBack={handleBackToMain}
        fromTableManagement={fromTableManagement}
      />
    );
  }

  if (currentView === 'order-history') {
    return (
      <OrderHistory onBack={handleBackToMain} />
    );
  }

  if (currentView === 'customerManagement') {
    return (
      <CustomerManagement onBack={handleBackToMain} />
    );
  }

  if (currentView === 'table-management') {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow-sm border-b p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={handleBackToMain}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-800"
              >
                <span>←</span>
                <span>Back</span>
              </button>
              <h1 className="text-2xl font-bold text-gray-800">Table Management</h1>
            </div>
          </div>
        </div>

        <div className="p-6">
          <TableManagement onTableSelect={handleTableSelect} />
        </div>
      </div>
    );
  }

  if (currentView === 'settings') {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow-sm border-b p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={handleBackToMain}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-800"
              >
                <span>←</span>
                <span>Back</span>
              </button>
              <h1 className="text-2xl font-bold text-gray-800">Settings</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                Welcome, {user?.full_name} ({user?.role})
              </span>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Settings Sections */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Menu Management */}
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center space-x-3 mb-4">
                <span className="text-2xl">🍽️</span>
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">Menu Management</h3>
                  <p className="text-sm text-gray-600">Manage menu items, categories, prices & modifiers</p>
                </div>
              </div>
              <button
                onClick={() => setCurrentView('menu-management')}
                className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Manage Menu
              </button>
            </div>

            {/* Table Settings */}
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center space-x-3 mb-4">
                <span className="text-2xl">🪑</span>
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">Table Settings</h3>
                  <p className="text-sm text-gray-600">Configure tables, capacity & layout</p>
                </div>
              </div>
              <button
                onClick={() => setCurrentView('table-settings')}
                className="w-full bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
              >
                Configure Tables
              </button>
            </div>

            {/* Staff Management - Manager Only */}
            {user?.role === 'manager' && (
              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <div className="flex items-center space-x-3 mb-4">
                  <span className="text-2xl">👥</span>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800">Staff Management</h3>
                    <p className="text-sm text-gray-600">Manage employees, roles & permissions</p>
                  </div>
                </div>
                <button
                  onClick={() => setCurrentView('staff-management')}
                  className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                >
                  Manage Staff
                </button>
              </div>
            )}

            {/* Tax & Charges - Manager Only */}
            {user?.role === 'manager' && (
              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <div className="flex items-center space-x-3 mb-4">
                  <span className="text-2xl">💰</span>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800">Tax & Charges</h3>
                    <p className="text-sm text-gray-600">Configure tax rates, service charges & fees</p>
                  </div>
                </div>
                <button
                  onClick={() => setCurrentView('tax-settings')}
                  className="w-full bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors"
                >
                  Configure Tax & Charges
                </button>
              </div>
            )}

            {/* System Settings */}
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center space-x-3 mb-4">
                <span className="text-2xl">🖨️</span>
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">Printer Settings</h3>
                  <p className="text-sm text-gray-600">{connected ? 'Printer Connected' : 'Setup Printer'}</p>
                </div>
              </div>
              <button
                onClick={openPrinterManager}
                className={`w-full px-4 py-2 rounded-lg transition-colors ${
                  connected
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-red-600 text-white hover:bg-red-700'
                }`}
              >
                {connected ? 'Manage Printer' : 'Setup Printer'}
              </button>
            </div>

            {/* User Profile */}
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center space-x-3 mb-4">
                <span className="text-2xl">👤</span>
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">User Profile</h3>
                  <p className="text-sm text-gray-600">{user?.full_name} ({user?.role})</p>
                </div>
              </div>
              <button
                onClick={() => alert('User profile editing coming soon')}
                className="w-full bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
              >
                Edit Profile
              </button>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Quick Actions</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <button
                onClick={() => setCurrentView('new-order')}
                className="flex flex-col items-center space-y-2 p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
              >
                <span className="text-2xl">🛒</span>
                <span className="text-sm font-medium">New Order</span>
              </button>
              <button
                onClick={() => setCurrentView('order-history')}
                className="flex flex-col items-center space-y-2 p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
              >
                <span className="text-2xl">📋</span>
                <span className="text-sm font-medium">Order History</span>
              </button>
              <button
                onClick={() => setCurrentView('table-management')}
                className="flex flex-col items-center space-y-2 p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
              >
                <span className="text-2xl">🪑</span>
                <span className="text-sm font-medium">Tables</span>
              </button>
              <button
                onClick={() => setCurrentView('customerManagement')}
                className="flex flex-col items-center space-y-2 p-4 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors"
              >
                <span className="text-2xl">👥</span>
                <span className="text-sm font-medium">Customers</span>
              </button>
            </div>
          </div>

          {/* System Information */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">System Information</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-600">Restaurant:</span>
                <p>El Meson Restaurant</p>
              </div>
              <div>
                <span className="font-medium text-gray-600">Address:</span>
                <p>3517 Broadway</p>
              </div>
              <div>
                <span className="font-medium text-gray-600">Phone:</span>
                <p>929-321-9679</p>
              </div>
              <div>
                <span className="font-medium text-gray-600">System:</span>
                <p>POS Web v1.0.0</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Add placeholder management screens
  if (currentView === 'menu-management') {
    return <MenuManagementComponent onBack={() => setCurrentView('settings')} />;
  }

  if (currentView === 'table-settings') {
    return <TableSettingsComponent onBack={() => setCurrentView('settings')} />;
  }

  if (currentView === 'staff-management') {
    return <StaffManagementComponent onBack={() => setCurrentView('settings')} />;
  }

  if (currentView === 'tax-settings') {
    return <TaxChargesComponent
      onBack={() => setCurrentView('settings')}
      onDataChange={() => {
        // Trigger a refresh for any active NewOrder components
        localStorage.setItem('taxChargesDataChanged', Date.now().toString());
      }}
    />;
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-white shadow-sm border-b p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-800">Restaurant POS</h1>
          <div className="flex items-center space-x-4">
            {/* Printer Status */}
            <button
              onClick={openPrinterManager}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                connected
                  ? 'bg-green-100 text-green-700 hover:bg-green-200'
                  : 'bg-red-100 text-red-700 hover:bg-red-200'
              }`}
            >
              <span>🖨️</span>
              <span>{connected ? 'Printer Connected' : 'Setup Printer'}</span>
            </button>

            {/* Settings Button */}
            <button
              onClick={() => setCurrentView('settings')}
              className="flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors bg-blue-100 text-blue-700 hover:bg-blue-200"
            >
              <span>⚙️</span>
              <span>Settings</span>
            </button>

            <span className="text-sm text-gray-600">
              Welcome, {user?.full_name} ({user?.role})
            </span>

            {user?.role === 'manager' && <EmployeeStatus />}
            <ClockInOut />

            <button
              onClick={logout}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Quick Actions */}
        <div className="flex space-x-4 flex-wrap">
          <button
            onClick={() => handleNewOrder()}
            className="bg-blue-600 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:bg-blue-700 transition-colors shadow-lg"
          >
            + New Order
          </button>
          <button
            onClick={handleOrderHistory}
            className="bg-purple-600 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:bg-purple-700 transition-colors shadow-lg"
          >
            📋 Order History
          </button>
          <button
            onClick={handleTableManagement}
            className="bg-green-600 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:bg-green-700 transition-colors shadow-lg"
          >
            🏓 Table Management
          </button>
          <button
            onClick={() => setCurrentView('customerManagement')}
            className="bg-purple-600 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:bg-purple-700 transition-colors shadow-lg"
          >
            👥 Customer Management
          </button>
          <button
            onClick={openPrinterManager}
            className={`px-8 py-4 rounded-xl text-lg font-semibold transition-colors shadow-lg ${
              connected
                ? 'bg-green-600 text-white hover:bg-green-700'
                : 'bg-orange-600 text-white hover:bg-orange-700'
            }`}
          >
            🖨️ Printer Manager
          </button>
        </div>

        {/* Active Orders */}
        <ActiveOrders onOrderClick={handleOrderClick} refreshTrigger={refreshTrigger} />
      </div>
    </div>
  );
};

export default POSInterface;