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
  const [currentView, setCurrentView] = useState('new-order');
  const [showEmployeeStatus, setShowEmployeeStatus] = useState(false);

  const mainTabs = [
    { id: 'new-order', name: 'New Order', icon: '➕', roles: ['manager', 'employee'] },
    { id: 'active-orders', name: 'Active Orders', icon: '🍽️', roles: ['manager', 'employee'] },
    { id: 'order-history', name: 'Order History', icon: '📋', roles: ['manager', 'employee'] },
    { id: 'tables', name: 'Tables', icon: '🪑', roles: ['manager', 'employee'] },
    { id: 'customers', name: 'Customers', icon: '👥', roles: ['manager', 'employee'] }
  ];

  const settingsOptions = [
    { id: 'menu-management', name: 'Menu Management', icon: '📝' },
    { id: 'staff-management', name: 'Staff Management', icon: '👨‍💼' },
    { id: 'tax-charges', name: 'Tax & Charges', icon: '💰' },
    { id: 'table-settings', name: 'Table Settings', icon: '🪑' }
  ];

  const filteredMainTabs = mainTabs.filter(tab => 
    tab.roles.includes(user?.role) || tab.roles.includes('employee')
  );

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to logout?')) {
      logout();
    }
  };

  const renderContent = () => {
    switch (currentView) {      
      case 'new-order':
        return <NewOrder onBack={() => setCurrentView('new-order')} />;
      
      case 'active-orders':
        return <ActiveOrders onBack={() => setCurrentView('active-orders')} />;
      
      case 'order-history':
        return <OrderHistory onBack={() => setCurrentView('order-history')} />;
      
      case 'tables':
        return <TableManagement onBack={() => setCurrentView('tables')} />;
      
      case 'customers':
        return <CustomerManagement onBack={() => setCurrentView('customers')} />;
      
      case 'settings':
        return (
          <div className="p-6">
            <div className="mb-6">
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
              onClick={() => setCurrentView('new-order')}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              Go to New Order
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
          </div>
          
          <div className="flex items-center space-x-4">
            {user?.role === 'manager' && (
              <button
                onClick={() => setCurrentView('settings')}
                className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
              >
                Settings
              </button>
            )}
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

      {/* Main Navigation Tabs */}
      <nav className="bg-white border-b">
        <div className="flex space-x-0 px-0">
          {filteredMainTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setCurrentView(tab.id)}
              className={`flex items-center justify-center space-x-2 py-4 px-6 border-b-3 font-medium text-sm flex-1 ${
                currentView === tab.id
                  ? 'border-blue-500 text-blue-600 bg-blue-50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.name}</span>
            </button>
          ))}
        </div>
      </nav>

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