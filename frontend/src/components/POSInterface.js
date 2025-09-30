import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import NewOrder from './NewOrder';
import ActiveOrders from './ActiveOrders';
import OrderHistory from './OrderHistory';
import TableManagement from './TableManagement';
import CustomerManagement from './CustomerManagement';
import StaffManagementComponent from './StaffManagementComponent';
import MenuManagementComponent from './MenuManagementComponent';
import TaxChargesComponent from './TaxChargesComponent';
import TableSettingsComponent from './TableSettingsComponent';
import { EmployeeStatus } from './EmployeeComponents';

const POSInterface = () => {
  const { user, logout } = useAuth();
  const [currentView, setCurrentView] = useState('dashboard');
  const [showEmployeeStatus, setShowEmployeeStatus] = useState(false);

  const menuItems = [
    { id: 'dashboard', name: 'Dashboard', icon: '🏠', roles: ['manager', 'employee'] },
    { id: 'new-order', name: 'New Order', icon: '➕', roles: ['manager', 'employee'] },
    { id: 'active-orders', name: 'Active Orders', icon: '🍽️', roles: ['manager', 'employee'] },
    { id: 'order-history', name: 'Order History', icon: '📋', roles: ['manager', 'employee'] },
    { id: 'tables', name: 'Tables', icon: '🪑', roles: ['manager', 'employee'] },
    { id: 'customers', name: 'Customers', icon: '👥', roles: ['manager', 'employee'] },
    { id: 'settings', name: 'Settings', icon: '⚙️', roles: ['manager'] }
  ];

  const settingsOptions = [
    { id: 'menu-management', name: 'Menu Management', icon: '📝' },
    { id: 'staff-management', name: 'Staff Management', icon: '👨‍💼' },
    { id: 'tax-charges', name: 'Tax & Charges', icon: '💰' },
    { id: 'table-settings', name: 'Table Settings', icon: '🪑' }
  ];

  const filteredMenuItems = menuItems.filter(item => 
    item.roles.includes(user?.role) || item.roles.includes('employee')
  );

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to logout?')) {
      logout();
    }
  };

  const renderContent = () => {
    switch (currentView) {
      case 'dashboard':
        return (
          <div className="p-6">
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-gray-800 mb-2">Dashboard</h1>
              <p className="text-gray-600">Welcome back, {user?.name || user?.username}!</p>
            </div>
            
            {/* Quick Actions Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredMenuItems.slice(1, -1).map(item => (
                <button
                  key={item.id}
                  onClick={() => setCurrentView(item.id)}
                  className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow text-center"
                >
                  <div className="text-4xl mb-3">{item.icon}</div>
                  <h3 className="text-lg font-semibold text-gray-800">{item.name}</h3>
                </button>
              ))}
            </div>
          </div>
        );
      
      case 'new-order':
        return <NewOrder onBack={() => setCurrentView('dashboard')} />;
      
      case 'active-orders':
        return <ActiveOrders onBack={() => setCurrentView('dashboard')} />;
      
      case 'order-history':
        return <OrderHistory onBack={() => setCurrentView('dashboard')} />;
      
      case 'tables':
        return <TableManagement onBack={() => setCurrentView('dashboard')} />;
      
      case 'customers':
        return <CustomerManagement onBack={() => setCurrentView('dashboard')} />;
      
      case 'settings':
        return (
          <div className="p-6">
            <div className="mb-6">
              <button 
                onClick={() => setCurrentView('dashboard')}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 mb-4"
              >
                <span>←</span>
                <span>Back to Dashboard</span>
              </button>
              <h1 className="text-3xl font-bold text-gray-800">Settings</h1>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {settingsOptions.map(option => (
                <button
                  key={option.id}
                  onClick={() => setCurrentView(option.id)}
                  className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow text-center"
                >
                  <div className="text-4xl mb-3">{option.icon}</div>
                  <h3 className="text-lg font-semibold text-gray-800">{option.name}</h3>
                </button>
              ))}
            </div>
          </div>
        );
      
      case 'menu-management':
        return <MenuManagementComponent onBack={() => setCurrentView('settings')} />;
      
      case 'staff-management':
        return <StaffManagementComponent onBack={() => setCurrentView('settings')} />;
      
      case 'tax-charges':
        return <TaxChargesComponent onBack={() => setCurrentView('settings')} />;
      
      case 'table-settings':
        return <TableSettingsComponent onBack={() => setCurrentView('settings')} />;
      
      default:
        return (
          <div className="p-6 text-center">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Page Not Found</h2>
            <button 
              onClick={() => setCurrentView('dashboard')}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              Go to Dashboard
            </button>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-bold text-gray-800">Restaurant POS</h1>
            {currentView !== 'dashboard' && (
              <span className="text-gray-500">/ {menuItems.find(item => item.id === currentView)?.name || settingsOptions.find(option => option.id === currentView)?.name}</span>
            )}
          </div>
          
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setShowEmployeeStatus(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              Employee Status
            </button>
            <div className="text-sm text-gray-600">
              {user?.name || user?.username} ({user?.role})
            </div>
            <button
              onClick={handleLogout}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Navigation */}
      {currentView === 'dashboard' && (
        <nav className="bg-white border-b">
          <div className="flex space-x-8 px-6">
            {filteredMenuItems.map(item => (
              <button
                key={item.id}
                onClick={() => setCurrentView(item.id)}
                className={`flex items-center space-x-2 py-4 px-2 border-b-2 font-medium text-sm ${
                  currentView === item.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <span>{item.icon}</span>
                <span>{item.name}</span>
              </button>
            ))}
          </div>
        </nav>
      )}

      {/* Main Content */}
      <main className="flex-1">
        {renderContent()}
      </main>

      {/* Employee Status Modal */}
      {showEmployeeStatus && (
        <EmployeeStatus onClose={() => setShowEmployeeStatus(false)} />
      )}
    </div>
  );
};

export default POSInterface;