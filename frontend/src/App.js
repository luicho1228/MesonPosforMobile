import React, { useState, useEffect, useContext, createContext } from 'react';
import axios from 'axios';
import './App.css';
import { PrinterProvider, usePrinter } from './PrinterContext';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Authentication Context
const AuthContext = createContext();

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchCurrentUser();
    }
  }, [token]);

  const fetchCurrentUser = async () => {
    try {
      const response = await axios.get(`${API}/auth/me`);
      setUser(response.data);
    } catch (error) {
      logout();
    }
  };

  const login = async (pin) => {
    try {
      const response = await axios.post(`${API}/auth/login`, { pin });
      const { access_token, user: userData } = response.data;
      
      localStorage.setItem('token', access_token);
      setToken(access_token);
      setUser(userData);
      axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error.response?.data?.detail || 'Login failed' };
    }
  };

  const verifyPin = async (pin) => {
    try {
      const response = await axios.post(`${API}/auth/verify-pin`, { pin });
      return { success: true, user: response.data.user };
    } catch (error) {
      return { success: false, error: error.response?.data?.detail || 'Invalid PIN' };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    delete axios.defaults.headers.common['Authorization'];
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, verifyPin, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
};

const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// PIN Login Component
const PinLogin = () => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handlePinInput = (digit) => {
    if (pin.length < 4) {
      setPin(pin + digit);
    }
  };

  const handleBackspace = () => {
    setPin(pin.slice(0, -1));
  };

  const handleClear = () => {
    setPin('');
    setError('');
  };

  const handleLogin = async () => {
    if (pin.length !== 4) {
      setError('Please enter a 4-digit PIN');
      return;
    }

    setLoading(true);
    setError('');

    const result = await login(pin);
    if (!result.success) {
      setError(result.error);
      setPin('');
    }
    setLoading(false);
  };

  useEffect(() => {
    if (pin.length === 4) {
      handleLogin();
    }
  }, [pin]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-700 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Restaurant POS</h1>
          <p className="text-gray-600">Enter your 4-digit PIN</p>
        </div>

        {/* PIN Display */}
        <div className="flex justify-center mb-8">
          <div className="flex space-x-3">
            {[0,1,2,3].map(i => (
              <div 
                key={i}
                className={`w-4 h-4 rounded-full border-2 ${
                  i < pin.length ? 'bg-blue-600 border-blue-600' : 'border-gray-300'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[1,2,3,4,5,6,7,8,9].map(num => (
            <button
              key={num}
              onClick={() => handlePinInput(num.toString())}
              className="h-16 bg-gray-100 hover:bg-gray-200 rounded-xl text-2xl font-semibold text-gray-800 transition-colors"
              disabled={loading}
            >
              {num}
            </button>
          ))}
          <button
            onClick={handleClear}
            className="h-16 bg-red-100 hover:bg-red-200 rounded-xl text-sm font-semibold text-red-600 transition-colors"
            disabled={loading}
          >
            Clear
          </button>
          <button
            onClick={() => handlePinInput('0')}
            className="h-16 bg-gray-100 hover:bg-gray-200 rounded-xl text-2xl font-semibold text-gray-800 transition-colors"
            disabled={loading}
          >
            0
          </button>
          <button
            onClick={handleBackspace}
            className="h-16 bg-gray-100 hover:bg-gray-200 rounded-xl text-sm font-semibold text-gray-600 transition-colors"
            disabled={loading}
          >
            ←
          </button>
        </div>

        {error && (
          <div className="text-red-600 text-center text-sm mb-4">{error}</div>
        )}

        {loading && (
          <div className="text-center text-blue-600 text-sm">Logging in...</div>
        )}

        <div className="text-center text-xs text-gray-500 mt-8">
          <strong>Demo PIN:</strong> 1234 (Manager) | 5678 (Employee)
        </div>
      </div>
    </div>
  );
};

// PIN Verification Modal
const PinVerificationModal = ({ isOpen, onClose, onSuccess, title = "Enter PIN to Continue" }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { verifyPin } = useAuth();

  const handlePinInput = (digit) => {
    if (pin.length < 4) {
      setPin(pin + digit);
    }
  };

  const handleBackspace = () => {
    setPin(pin.slice(0, -1));
  };

  const handleClear = () => {
    setPin('');
    setError('');
  };

  const handleVerification = async () => {
    if (pin.length !== 4) {
      setError('Please enter a 4-digit PIN');
      return;
    }

    setLoading(true);
    setError('');

    const result = await verifyPin(pin);
    if (result.success) {
      onSuccess(result.user);
      onClose();
      setPin('');
    } else {
      setError(result.error);
      setPin('');
    }
    setLoading(false);
  };

  useEffect(() => {
    if (pin.length === 4) {
      handleVerification();
    }
  }, [pin]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">{title}</h2>
        </div>

        {/* PIN Display */}
        <div className="flex justify-center mb-8">
          <div className="flex space-x-3">
            {[0,1,2,3].map(i => (
              <div 
                key={i}
                className={`w-4 h-4 rounded-full border-2 ${
                  i < pin.length ? 'bg-blue-600 border-blue-600' : 'border-gray-300'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[1,2,3,4,5,6,7,8,9].map(num => (
            <button
              key={num}
              onClick={() => handlePinInput(num.toString())}
              className="h-12 bg-gray-100 hover:bg-gray-200 rounded-xl text-xl font-semibold text-gray-800 transition-colors"
              disabled={loading}
            >
              {num}
            </button>
          ))}
          <button
            onClick={handleClear}
            className="h-12 bg-red-100 hover:bg-red-200 rounded-xl text-sm font-semibold text-red-600 transition-colors"
            disabled={loading}
          >
            Clear
          </button>
          <button
            onClick={() => handlePinInput('0')}
            className="h-12 bg-gray-100 hover:bg-gray-200 rounded-xl text-xl font-semibold text-gray-800 transition-colors"
            disabled={loading}
          >
            0
          </button>
          <button
            onClick={handleBackspace}
            className="h-12 bg-gray-100 hover:bg-gray-200 rounded-xl text-sm font-semibold text-gray-600 transition-colors"
            disabled={loading}
          >
            ←
          </button>
        </div>

        {error && (
          <div className="text-red-600 text-center text-sm mb-4">{error}</div>
        )}

        <div className="flex space-x-3">
          <button
            onClick={onClose}
            className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

// Helper function to properly parse backend timestamps (UTC) and convert to local timezone
const parseBackendTimestamp = (timestamp) => {
  // Backend now sends proper UTC timestamps with timezone info (+00:00)
  // JavaScript Date constructor will properly handle these and convert to local timezone
  return new Date(timestamp);
};

// Helper function to format date for display
const formatLocalDate = (timestamp) => {
  const date = parseBackendTimestamp(timestamp);
  return date.toLocaleDateString();
};

// Helper function to format time for display
const formatLocalTime = (timestamp) => {
  const date = parseBackendTimestamp(timestamp);
  return date.toLocaleTimeString();
};

// Helper function to format full datetime for display
const formatLocalDateTime = (timestamp) => {
  const date = parseBackendTimestamp(timestamp);
  return date.toLocaleString();
};

// Helper function to calculate time elapsed
const getTimeElapsed = (createdAt) => {
  const now = new Date();
  const created = parseBackendTimestamp(createdAt);
  
  // Ensure we're working with valid dates
  if (isNaN(created.getTime())) {
    return "Invalid date";
  }
  
  const diffMs = Math.abs(now - created);
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffMonths = Math.floor(diffDays / 30);
  
  if (diffMins < 1) {
    return "just now";
  } else if (diffMins < 60) {
    return `${diffMins} min ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  } else if (diffDays < 30) {
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  } else {
    return `${diffMonths} month${diffMonths > 1 ? 's' : ''} ago`;
  }
};

// Helper function to get order age color
const getOrderAgeColor = (createdAt) => {
  const now = new Date();
  const orderTime = parseBackendTimestamp(createdAt);
  const minutesAgo = Math.floor((now - orderTime) / (1000 * 60));
  
  if (minutesAgo >= 45) return 'bg-red-100 border-red-500 text-red-800';
  if (minutesAgo >= 30) return 'bg-orange-100 border-orange-500 text-orange-800';
  if (minutesAgo >= 20) return 'bg-yellow-100 border-yellow-500 text-yellow-800';
  return 'bg-white border-gray-200';
};

// Customer Management Component
const CustomerManagement = ({ onBack }) => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [customerStats, setCustomerStats] = useState({});
  const [customerOrders, setCustomerOrders] = useState([]);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const response = await axios.get(`${API}/customers`);
      setCustomers(response.data);
    } catch (error) {
      console.error('Error fetching customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomerStats = async (customerId) => {
    try {
      const [statsResponse, ordersResponse] = await Promise.all([
        axios.get(`${API}/customers/${customerId}/stats`),
        axios.get(`${API}/customers/${customerId}/orders`)
      ]);
      setCustomerStats(statsResponse.data);
      setCustomerOrders(ordersResponse.data);
    } catch (error) {
      console.error('Error fetching customer details:', error);
    }
  };

  const handleCustomerClick = async (customer) => {
    setSelectedCustomer(customer);
    setShowCustomerModal(true);
    await fetchCustomerStats(customer.id);
  };

  const handleEditCustomer = (customer) => {
    setEditingCustomer(customer);
  };

  const handleSaveCustomer = async (customerData) => {
    try {
      if (editingCustomer) {
        // Update existing customer
        await axios.put(`${API}/customers/${editingCustomer.id}`, customerData);
      } else {
        // Create new customer
        await axios.post(`${API}/customers`, customerData);
      }
      await fetchCustomers();
      setEditingCustomer(null);
    } catch (error) {
      console.error('Error saving customer:', error);
      alert('Error saving customer');
    }
  };

  const handleDeleteCustomer = async (customerId) => {
    if (window.confirm('Are you sure you want to delete this customer?')) {
      try {
        await axios.delete(`${API}/customers/${customerId}`);
        await fetchCustomers();
        setShowCustomerModal(false);
        setSelectedCustomer(null);
      } catch (error) {
        console.error('Error deleting customer:', error);
        alert('Error deleting customer');
      }
    }
  };

  const getFilteredCustomers = () => {
    if (!searchTerm) return customers;
    return customers.filter(customer => 
      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.phone.includes(searchTerm) ||
      customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.address.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const getDaysSinceLastOrder = (lastOrderDate) => {
    if (!lastOrderDate) return 'Never ordered';
    const lastOrder = parseBackendTimestamp(lastOrderDate);
    const now = new Date();
    const diffTime = Math.abs(now - lastOrder);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return '1 day ago';
    return `${diffDays} days ago`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={onBack}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-800"
            >
              <span>←</span>
              <span>Back</span>
            </button>
            <h1 className="text-2xl font-bold text-gray-800">Customer Management</h1>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setEditingCustomer({})}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
            >
              Add Customer
            </button>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Search and Stats */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Search Customers</label>
              <input
                type="text"
                placeholder="Search by name, phone, email, or address..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{customers.length}</div>
              <div className="text-sm text-gray-600">Total Customers</div>
            </div>
          </div>
        </div>

        {/* Customer List */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Orders</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Spent</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Order</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {getFilteredCustomers().map((customer) => (
                  <tr key={customer.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => handleCustomerClick(customer)}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{customer.name}</div>
                        {customer.address && (
                          <div className="text-sm text-gray-500">{customer.address}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{customer.phone}</div>
                      {customer.email && (
                        <div className="text-sm text-gray-500">{customer.email}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-gray-900">
                        {customer.total_orders || 0}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-green-600">
                        ${(customer.total_spent || 0).toFixed(2)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-500">
                        {getDaysSinceLastOrder(customer.last_order_date)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditCustomer(customer);
                        }}
                        className="text-purple-600 hover:text-purple-900"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Customer Detail Modal */}
      {showCustomerModal && selectedCustomer && (
        <CustomerDetailModal
          customer={selectedCustomer}
          stats={customerStats}
          orders={customerOrders}
          onClose={() => {
            setShowCustomerModal(false);
            setSelectedCustomer(null);
          }}
          onClose={() => setShowCustomerModal(false)}
        />
      )}

      {/* Customer Edit Modal */}
      {editingCustomer && (
        <CustomerEditModal
          customer={editingCustomer}
          onSave={handleSaveCustomer}
          onClose={() => setEditingCustomer(null)}
        />
      )}
    </div>
  );
};
// Customer Detail Modal Component
const CustomerDetailModal = ({ customer, stats, orders, onClose, onEdit }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-6 max-w-4xl w-full max-h-96 overflow-y-auto">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="text-xl font-bold text-gray-800">{customer.name}</h3>
            <p className="text-gray-600">{customer.phone}</p>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={onEdit}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
            >
              Edit
            </button>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-xl"
            >
              ×
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Customer Info */}
          <div>
            <h4 className="font-medium text-gray-700 mb-3">Customer Information</h4>
            <div className="space-y-2 text-sm">
              <p><span className="font-medium">Email:</span> {customer.email || 'Not provided'}</p>
              <p><span className="font-medium">Address:</span> {customer.address || 'Not provided'}</p>
              <p><span className="font-medium">Notes:</span> {customer.notes || 'None'}</p>
              <p><span className="font-medium">Customer Since:</span> {formatLocalDate(customer.created_at)}</p>
            </div>
          </div>

          {/* Customer Stats */}
          <div>
            <h4 className="font-medium text-gray-700 mb-3">Statistics</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="bg-blue-50 p-3 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{stats.total_orders || 0}</div>
                <div className="text-blue-700">Total Orders</div>
              </div>
              <div className="bg-green-50 p-3 rounded-lg">
                <div className="text-2xl font-bold text-green-600">${(stats.total_spent || 0).toFixed(2)}</div>
                <div className="text-green-700">Total Spent</div>
              </div>
              <div className="bg-purple-50 p-3 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">${(stats.average_order_value || 0).toFixed(2)}</div>
                <div className="text-purple-700">Avg Order</div>
              </div>
              <div className="bg-orange-50 p-3 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">
                  {stats.days_since_last_order !== null ? stats.days_since_last_order : 'N/A'}
                </div>
                <div className="text-orange-700">Days Since Last</div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Orders */}
        <div className="mt-6">
          <h4 className="font-medium text-gray-700 mb-3">Recent Orders</h4>
          <div className="max-h-48 overflow-y-auto">
            {orders.length > 0 ? (
              <div className="space-y-2">
                {orders.slice(0, 10).map((order) => (
                  <div key={order.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div>
                      <span className="font-medium">{order.order_number}</span>
                      <span className="text-gray-500 text-sm ml-2">
                        {formatLocalDateTime(order.created_at)}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="font-medium text-green-600">${order.total.toFixed(2)}</div>
                      <div className="text-xs text-gray-500">{order.order_type.replace('_', ' ')}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">No orders found</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Customer Edit Modal Component
const CustomerEditModal = ({ customer, onSave, onClose }) => {
  const [formData, setFormData] = useState({
    name: customer.name || '',
    phone: customer.phone || '',
    email: customer.email || '',
    address: customer.address || '',
    apartment: customer.apartment || '',
    notes: customer.notes || ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.phone.trim()) {
      alert('Name and phone are required');
      return;
    }
    onSave(formData);
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Auto-fill functionality for customer modal
  const handlePhoneChangeModal = async (phone) => {
    setFormData(prev => ({ ...prev, phone }));
    
    if (phone.length >= 10) {
      await lookupCustomerByPhoneModal(phone);
    }
  };

  const handleAddressChangeModal = async (address) => {
    setFormData(prev => ({ ...prev, address }));
    
    if (address.length >= 10) {
      await lookupCustomerByAddressModal(address);
    }
  };

  const lookupCustomerByPhoneModal = async (phone) => {
    try {
      const response = await axios.get(`${API}/customers/${phone}`);
      const customer = response.data;
      
      setFormData(prev => ({
        ...prev,
        name: customer.name || prev.name,
        address: customer.address || prev.address,
        apartment: customer.apartment || prev.apartment,
        email: customer.email || prev.email,
        notes: customer.notes || prev.notes
      }));
    } catch (error) {
      console.log('Customer not found by phone in modal');
    }
  };

  const lookupCustomerByAddressModal = async (address) => {
    try {
      const response = await axios.get(`${API}/customers`);
      const customers = response.data;
      
      const matchingCustomer = customers.find(customer => 
        customer.address && 
        customer.address.toLowerCase().includes(address.toLowerCase()) &&
        customer.address.length > 0
      );
      
      if (matchingCustomer) {
        setFormData(prev => ({
          ...prev,
          name: matchingCustomer.name || prev.name,
          phone: matchingCustomer.phone || prev.phone,
          apartment: matchingCustomer.apartment || prev.apartment,
          email: matchingCustomer.email || prev.email,
          notes: matchingCustomer.notes || prev.notes
        }));
      }
    } catch (error) {
      console.log('Error looking up customer by address in modal:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-6 max-w-md w-full">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-gray-800">
            {customer.id ? 'Edit Customer' : 'Add New Customer'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-xl"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => handlePhoneChangeModal(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Street Address</label>
              <textarea
                value={formData.address}
                onChange={(e) => handleAddressChangeModal(e.target.value)}
                rows="2"
                placeholder="Street address"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Apartment/Unit</label>
              <input
                type="text"
                value={formData.apartment}
                onChange={(e) => handleChange('apartment', e.target.value)}
                placeholder="Apt, Suite, Unit"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              rows="2"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Special dietary requirements, preferences, etc."
            />
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700"
            >
              {customer.id ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Order History Component
const OrderHistory = ({ onBack }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showOrderModal, setShowOrderModal] = useState(false);

  useEffect(() => {
    fetchAllOrders();
  }, []);

  const fetchAllOrders = async () => {
    try {
      const response = await axios.get(`${API}/orders`);
      setOrders(response.data);
    } catch (error) {
      console.error('Error fetching order history:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOrderClick = (order) => {
    setSelectedOrder(order);
    setShowOrderModal(true);
  };

  const getFilteredOrders = () => {
    let filtered = orders;

    // Filter by status
    if (filter !== 'all') {
      filtered = filtered.filter(order => order.status === filter);
    }

    // Filter by date
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    if (dateFilter === 'today') {
      filtered = filtered.filter(order => parseBackendTimestamp(order.created_at) >= today);
    } else if (dateFilter === 'yesterday') {
      filtered = filtered.filter(order => {
        const orderDate = parseBackendTimestamp(order.created_at);
        return orderDate >= yesterday && orderDate < today;
      });
    } else if (dateFilter === 'week') {
      filtered = filtered.filter(order => parseBackendTimestamp(order.created_at) >= weekAgo);
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(order => 
        order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.customer_phone.includes(searchTerm)
      );
    }

    return filtered.sort((a, b) => parseBackendTimestamp(b.created_at) - parseBackendTimestamp(a.created_at));
  };

  const getStatusColor = (status) => {
    const colors = {
      draft: 'bg-gray-100 text-gray-800',
      pending: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-blue-100 text-blue-800',
      preparing: 'bg-orange-100 text-orange-800',
      ready: 'bg-green-100 text-green-800',
      out_for_delivery: 'bg-purple-100 text-purple-800',
      delivered: 'bg-green-200 text-green-900',
      paid: 'bg-emerald-200 text-emerald-900',
      cancelled: 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getTotalRevenue = () => {
    const filteredOrders = getFilteredOrders();
    return filteredOrders
      .filter(order => ['delivered', 'paid'].includes(order.status))
      .reduce((sum, order) => sum + order.total, 0);
  };

  const getOrderCount = () => {
    return getFilteredOrders().length;
  };

  const filteredOrders = getFilteredOrders();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={onBack}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-800"
            >
              <span>←</span>
              <span>Back</span>
            </button>
            <h1 className="text-2xl font-bold text-gray-800">Order History & Transactions</h1>
          </div>
          
          {/* Summary Stats */}
          <div className="flex items-center space-x-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{getOrderCount()}</div>
              <div className="text-sm text-gray-600">Orders</div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
              <input
                type="text"
                placeholder="Order #, Customer name, Phone"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Date Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="yesterday">Yesterday</option>
                <option value="week">Last 7 Days</option>
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Orders</option>
                <option value="paid">Paid</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
                <option value="pending">Pending</option>
                <option value="preparing">Preparing</option>
                <option value="ready">Ready</option>
                <option value="out_for_delivery">Out for Delivery</option>
              </select>
            </div>

            {/* Refresh Button */}
            <div className="flex items-end">
              <button
                onClick={fetchAllOrders}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Orders List */}
        <div className="bg-white rounded-2xl shadow-lg">
          <div className="p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-6">Orders ({filteredOrders.length})</h3>
            
            {filteredOrders.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No orders found matching your criteria</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full table-auto">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Order #</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Date & Time</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Customer</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Type</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Items</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Total</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Payment</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Status</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.map((order) => (
                      <tr 
                        key={order.id} 
                        className="border-b hover:bg-gray-50 cursor-pointer"
                        onClick={() => handleOrderClick(order)}
                      >
                        <td className="px-4 py-3">
                          <div className="font-medium text-blue-600">{order.order_number}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm">
                            <div>{formatLocalDate(order.created_at)}</div>
                            <div className="text-gray-500">{formatLocalTime(order.created_at)}</div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm">
                            <div className="font-medium">{order.customer_name || 'Walk-in'}</div>
                            {order.customer_phone && (
                              <div className="text-gray-500">{order.customer_phone}</div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm">
                            <div className="font-medium">{order.order_type.replace('_', ' ').toUpperCase()}</div>
                            {order.table_number && (
                              <div className="text-gray-500">Table {order.table_number}</div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm">
                            <div>{order.items.length} items</div>
                            <div className="text-gray-500">
                              {order.items.slice(0, 2).map(item => item.menu_item_name).join(', ')}
                              {order.items.length > 2 && '...'}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-green-600">${order.total.toFixed(2)}</div>
                          {order.cash_received && (
                            <div className="text-xs text-gray-500">
                              Cash: ${order.cash_received.toFixed(2)}
                              {order.change_amount > 0 && (
                                <div>Change: ${order.change_amount.toFixed(2)}</div>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm">
                            <div className="font-medium">{order.payment_method?.toUpperCase() || 'Pending'}</div>
                            <div className="text-gray-500">{order.payment_status}</div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(order.status)}`}>
                            {order.status.replace('_', ' ').toUpperCase()}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex space-x-2">
                            {order.status === 'paid' && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  console.log('Print receipt for:', order);
                                  alert(`Receipt for ${order.order_number} sent to printer`);
                                }}
                                className="text-green-600 hover:text-green-800 text-sm"
                              >
                                Print
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Order Detail Modal */}
      {showOrderModal && selectedOrder && (
        <OrderDetailModal
          order={selectedOrder}
          onClose={() => {
            setShowOrderModal(false);
            setSelectedOrder(null);
          }}
        />
      )}
    </div>
  );
};

// Active Orders Component
const ActiveOrders = ({ onOrderClick, refreshTrigger }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [orderTypeFilter, setOrderTypeFilter] = useState('all');
  const [selectedOrders, setSelectedOrders] = useState(new Set());
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);

  useEffect(() => {
    fetchActiveOrders();
    const interval = setInterval(fetchActiveOrders, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [refreshTrigger]);

  // Update current time every 30 seconds to refresh timers in real-time
  useEffect(() => {
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 30000); // Update every 30 seconds for real-time updates
    
    return () => clearInterval(timeInterval);
  }, []);

  const fetchActiveOrders = async () => {
    try {
      const response = await axios.get(`${API}/orders/active`);
      setOrders(response.data);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelOrder = async (orderId) => {
    if (window.confirm('Are you sure you want to cancel this order?')) {
      try {
        await axios.post(`${API}/orders/${orderId}/cancel`);
        alert('Order cancelled successfully');
        fetchActiveOrders(); // Refresh the list
      } catch (error) {
        console.error('Error cancelling order:', error);
        alert(error.response?.data?.detail || 'Error cancelling order');
      }
    }
  };

  const handleSelectOrder = (orderId) => {
    const newSelected = new Set(selectedOrders);
    if (newSelected.has(orderId)) {
      newSelected.delete(orderId);
    } else {
      newSelected.add(orderId);
    }
    setSelectedOrders(newSelected);
  };

  const handleSelectAll = () => {
    const cancelableOrders = orders.filter(order => 
      order.status !== 'paid' && order.status !== 'delivered' && order.status !== 'cancelled'
    );
    
    if (selectedOrders.size === cancelableOrders.length) {
      setSelectedOrders(new Set());
    } else {
      setSelectedOrders(new Set(cancelableOrders.map(order => order.id)));
    }
  };

  const handleBulkCancel = () => {
    if (selectedOrders.size === 0) {
      alert('Please select orders to cancel');
      return;
    }
    setShowCancelModal(true);
  };

  const toggleSelectionMode = () => {
    setSelectionMode(!selectionMode);
    setSelectedOrders(new Set()); // Clear selections when toggling mode
  };

  const handleOrderClick = (order) => {
    if (selectionMode) {
      handleSelectOrder(order.id);
    } else {
      onOrderClick(order);
    }
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      await axios.put(`${API}/orders/${orderId}/status`, { status: newStatus });
      fetchActiveOrders();
    } catch (error) {
      console.error('Error updating order status:', error);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      confirmed: 'bg-blue-500',
      preparing: 'bg-orange-500',
      ready: 'bg-green-500',
      out_for_delivery: 'bg-purple-500'
    };
    return colors[status] || 'bg-gray-500';
  };

  const getNextStatus = (currentStatus) => {
    const progression = {
      confirmed: 'preparing',
      preparing: 'ready',
      ready: 'out_for_delivery',
      out_for_delivery: 'delivered'
    };
    return progression[currentStatus];
  };

  const getNextStatusLabel = (currentStatus) => {
    const labels = {
      confirmed: 'Start Prep',
      preparing: 'Ready',
      ready: 'Out for Delivery',
      out_for_delivery: 'Delivered'
    };
    return labels[currentStatus];
  };

  // Filter orders by type
  const filteredOrders = orderTypeFilter === 'all' 
    ? orders 
    : orders.filter(order => order.order_type === orderTypeFilter);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-4">Active Orders</h3>
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-bold text-gray-800">Active Orders</h3>
        
        {/* Filter and Selection Controls */}
        <div className="flex items-center space-x-4">
          {/* Selection Mode Controls */}
          <div className="flex items-center space-x-2">
            {!selectionMode ? (
              <button
                onClick={toggleSelectionMode}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium"
              >
                Select
              </button>
            ) : (
              <>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={selectedOrders.size > 0 && selectedOrders.size === orders.filter(order => 
                      order.status !== 'paid' && order.status !== 'delivered' && order.status !== 'cancelled'
                    ).length}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                  />
                  <span className="text-sm text-gray-700">Select All</span>
                </label>
                
                {selectedOrders.size > 0 && (
                  <button
                    onClick={handleBulkCancel}
                    className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 text-sm font-medium"
                  >
                    Cancel Selected ({selectedOrders.size})
                  </button>
                )}
                
                <button
                  onClick={toggleSelectionMode}
                  className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 text-sm font-medium"
                >
                  Done
                </button>
              </>
            )}
          </div>
          
          {/* Order Type Filter */}
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Filter:</label>
            <select
              value={orderTypeFilter}
              onChange={(e) => setOrderTypeFilter(e.target.value)}
              className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Orders</option>
              <option value="dine_in">Dine In</option>
              <option value="takeout">Takeout</option>
              <option value="delivery">Delivery</option>
              <option value="phone_order">Phone Order</option>
            </select>
          </div>
        </div>
      </div>
      
      {filteredOrders.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>No active orders</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredOrders.map((order) => (
            <div
              key={order.id}
              className={`border-2 rounded-xl p-4 transition-all hover:shadow-md ${getOrderAgeColor(order.created_at)} ${selectedOrders.has(order.id) ? 'ring-2 ring-red-500' : ''} ${selectionMode ? '' : 'cursor-pointer'}`}
              onClick={() => handleOrderClick(order)}
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-start space-x-3">
                  {/* Checkbox for cancellable orders - only show in selection mode */}
                  {selectionMode && order.status !== 'paid' && order.status !== 'delivered' && order.status !== 'cancelled' && (
                    <input
                      type="checkbox"
                      checked={selectedOrders.has(order.id)}
                      onChange={() => handleSelectOrder(order.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="mt-1 rounded border-gray-300 text-red-600 focus:ring-red-500"
                    />
                  )}
                  
                  <div className="flex-1">
                    <h4 className="font-bold text-lg">{order.order_number}</h4>
                    <p className="text-sm text-gray-600">
                      {formatLocalTime(order.created_at)}
                    </p>
                    {/* Real-time Order Timer */}
                    <p className="text-xs font-semibold text-orange-600">
                      ⏱️ {getTimeElapsed(order.created_at)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {/* Show status indicator only if not pending */}
                  {order.status !== 'pending' && (
                    <>
                      <span className={`inline-block w-3 h-3 rounded-full ${getStatusColor(order.status)}`}></span>
                      <span className="text-xs font-medium capitalize">
                        {order.status.replace('_', ' ')}
                      </span>
                    </>
                  )}
                  {/* Show pending indicator for pending orders */}
                  {order.status === 'pending' && (
                    <span className="inline-block px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded-full">
                      PENDING
                    </span>
                  )}
                </div>
              </div>

              <div className="mb-3">
                <p className="text-sm font-medium">
                  {order.order_type.replace('_', ' ').toUpperCase()}
                  {order.table_number && ` - Table ${order.table_number}`}
                  {order.order_type === 'delivery' && order.customer_address && ` - ${order.customer_address.substring(0, 30)}...`}
                </p>
                {order.customer_name && (
                  <p className="text-sm text-gray-600">{order.customer_name}</p>
                )}
              </div>

              <div className="mb-3 text-sm">
                {order.items.slice(0, 2).map((item, index) => (
                  <div key={index} className="flex justify-between">
                    <span>{item.quantity}x {item.menu_item_name}</span>
                  </div>
                ))}
                {order.items.length > 2 && (
                  <p className="text-gray-500">+{order.items.length - 2} more items</p>
                )}
              </div>

              <div className="flex justify-between items-center">
                <span className="font-bold text-lg">${order.total.toFixed(2)}</span>
                <div className="flex space-x-2">
                  {/* Only show status buttons for delivery orders and not pending */}
                  {order.order_type === 'delivery' && order.status !== 'pending' && getNextStatus(order.status) && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        updateOrderStatus(order.id, getNextStatus(order.status));
                      }}
                      className="bg-blue-600 text-white px-3 py-1 rounded-lg text-sm hover:bg-blue-700 transition-colors"
                    >
                      {getNextStatusLabel(order.status)}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Cancellation Reason Modal */}
      {showCancelModal && (
        <CancellationReasonModal
          selectedOrders={Array.from(selectedOrders)}
          onCancel={() => setShowCancelModal(false)}
          onConfirm={async (reason, notes) => {
            try {
              // Cancel all selected orders
              const cancelPromises = Array.from(selectedOrders).map(orderId =>
                axios.post(`${API}/orders/${orderId}/cancel`, { reason, notes })
              );
              
              await Promise.all(cancelPromises);
              
              alert(`${selectedOrders.size} order(s) cancelled successfully`);
              setSelectedOrders(new Set());
              setShowCancelModal(false);
              fetchActiveOrders();
            } catch (error) {
              console.error('Error cancelling orders:', error);
              alert('Error cancelling some orders. Please try again.');
            }
          }}
        />
      )}
    </div>
  );
};

// Cancellation Reason Modal Component
const CancellationReasonModal = ({ selectedOrders, onCancel, onConfirm }) => {
  const [reason, setReason] = useState('customer_canceled');
  const [customNotes, setCustomNotes] = useState('');

  const reasonOptions = [
    { value: 'customer_canceled', label: 'Customer Canceled' },
    { value: 'wrong_order', label: 'Wrong Order' },
    { value: 'other', label: 'Other' }
  ];

  const handleConfirm = () => {
    const notes = reason === 'other' ? customNotes : '';
    if (reason === 'other' && !customNotes.trim()) {
      alert('Please provide a reason for cancellation');
      return;
    }
    onConfirm(reason, notes);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-6 max-w-md w-full">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-gray-800">Cancel Orders</h3>
          <button
            onClick={onCancel}
            className="text-gray-500 hover:text-gray-700 text-xl"
          >
            ×
          </button>
        </div>

        <div className="mb-4">
          <p className="text-gray-600 mb-4">
            You are about to cancel {selectedOrders.length} order(s). Please select a reason:
          </p>
          
          <div className="space-y-3">
            {reasonOptions.map((option) => (
              <label key={option.value} className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="radio"
                  value={option.value}
                  checked={reason === option.value}
                  onChange={(e) => setReason(e.target.value)}
                  className="text-red-600 focus:ring-red-500"
                />
                <span className="text-gray-700">{option.label}</span>
              </label>
            ))}
          </div>
        </div>

        {reason === 'other' && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Please specify the reason:
            </label>
            <textarea
              value={customNotes}
              onChange={(e) => setCustomNotes(e.target.value)}
              rows="3"
              placeholder="Enter the reason for cancellation..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>
        )}

        <div className="flex space-x-3">
          <button
            onClick={onCancel}
            className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700"
          >
            Confirm Cancellation
          </button>
        </div>
      </div>
    </div>
  );
};

// Employee Status Component
const EmployeeStatus = () => {
  const [activeEmployees, setActiveEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (showModal) {
      fetchActiveEmployees();
    }
  }, [showModal]);

  const fetchActiveEmployees = async () => {
    try {
      const response = await axios.get(`${API}/time/active-employees`);
      setActiveEmployees(response.data.active_employees);
    } catch (error) {
      console.error('Error fetching active employees:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
      >
        Employee Status
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full max-h-96 overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">Active Employees</h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-500 hover:text-gray-700 text-xl"
              >
                ×
              </button>
            </div>

            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : activeEmployees.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No employees currently clocked in</p>
            ) : (
              <div className="space-y-3">
                {activeEmployees.map((employee) => (
                  <div key={employee.user_id} className="bg-gray-50 rounded-lg p-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium">{employee.full_name}</h4>
                        <p className="text-sm text-gray-600">
                          Clocked in: {new Date(employee.clock_in_time).toLocaleTimeString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-green-600">
                          {employee.active_hours.toFixed(1)}h
                        </p>
                        <p className="text-xs text-gray-500">Active</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

// Clock In/Out Component
const ClockInOut = () => {
  const [isClockingIn, setIsClockingIn] = useState(false);
  const [isClockingOut, setIsClockingOut] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [clockAction, setClockAction] = useState(null);
  const [timeEntries, setTimeEntries] = useState([]);
  const [currentEntry, setCurrentEntry] = useState(null);

  useEffect(() => {
    checkClockStatus();
  }, []);

  const checkClockStatus = async () => {
    try {
      const response = await axios.get(`${API}/time/entries`);
      setTimeEntries(response.data);
      
      const today = new Date().toISOString().split('T')[0];
      const todayEntry = response.data.find(entry => 
        entry.date === today && !entry.clock_out
      );
      setCurrentEntry(todayEntry);
    } catch (error) {
      console.error('Error checking clock status:', error);
    }
  };

  const handleClockAction = async (user) => {
    try {
      if (clockAction === 'in') {
        setIsClockingIn(true);
        await axios.post(`${API}/time/clock-in`);
        alert('Clocked in successfully!');
      } else {
        setIsClockingOut(true);
        const response = await axios.post(`${API}/time/clock-out`);
        alert(`Clocked out successfully! Total hours: ${response.data.total_hours.toFixed(2)}`);
      }
      
      checkClockStatus();
      setShowPinModal(false);
    } catch (error) {
      alert(error.response?.data?.detail || 'Error processing clock action');
    } finally {
      setIsClockingIn(false);
      setIsClockingOut(false);
    }
  };

  const initiateClock = (action) => {
    setClockAction(action);
    setShowPinModal(true);
  };

  return (
    <>
      <button
        onClick={() => initiateClock(currentEntry ? 'out' : 'in')}
        className={`px-4 py-2 rounded-lg transition-colors ${
          currentEntry 
            ? 'bg-red-600 text-white hover:bg-red-700' 
            : 'bg-blue-600 text-white hover:bg-blue-700'
        }`}
        disabled={isClockingIn || isClockingOut}
      >
        {isClockingIn || isClockingOut ? 'Processing...' : 
         currentEntry ? 'Clock Out' : 'Clock In'}
      </button>

      <PinVerificationModal
        isOpen={showPinModal}
        onClose={() => setShowPinModal(false)}
        onSuccess={handleClockAction}
        title={clockAction === 'in' ? 'Clock In' : 'Clock Out'}
      />
    </>
  );
};

// Table Management Component
const TableManagement = ({ onTableSelect }) => {
  const [tables, setTables] = useState([]);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [selectedSourceTable, setSelectedSourceTable] = useState(null);
  const [selectedDestTable, setSelectedDestTable] = useState(null);
  const [showMergeConfirm, setShowMergeConfirm] = useState(false);
  const [step, setStep] = useState('select-source'); // 'select-source', 'select-destination'
  const [showCancelTableModal, setShowCancelTableModal] = useState(false);
  const [selectedTablesForCancel, setSelectedTablesForCancel] = useState([]);
  const [showCancelTableSelection, setShowCancelTableSelection] = useState(false);

  useEffect(() => {
    fetchTables();
  }, []);

  const fetchTables = async () => {
    try {
      const response = await axios.get(`${API}/tables`);
      setTables(response.data);
    } catch (error) {
      console.error('Error fetching tables:', error);
    }
  };



  const updateTableStatus = async (tableId, status) => {
    try {
      const updateData = { status };
      if (status === 'available') {
        updateData.current_order_id = null;
      }
      await axios.put(`${API}/tables/${tableId}`, updateData);
      fetchTables();
    } catch (error) {
      console.error('Error updating table:', error);
    }
  };

  const moveTableOrder = async (fromTableId, toTableId) => {
    try {
      await axios.post(`${API}/tables/${fromTableId}/move`, { new_table_id: toTableId });
      fetchTables();
      resetMoveModal();
      alert('Order moved successfully!');
    } catch (error) {
      alert(error.response?.data?.detail || 'Error moving order');
    }
  };

  const mergeTableOrders = async (fromTableId, toTableId) => {
    try {
      await axios.post(`${API}/tables/${fromTableId}/merge`, { new_table_id: toTableId });
      fetchTables();
      resetMoveModal();
      setShowMergeConfirm(false);
      alert('Orders merged successfully!');
    } catch (error) {
      alert(error.response?.data?.detail || 'Error merging orders');
    }
  };

  const resetMoveModal = () => {
    setShowMoveModal(false);
    setSelectedSourceTable(null);
    setSelectedDestTable(null);
    setStep('select-source');
    setShowMergeConfirm(false);
  };

  const handleMoveClick = () => {
    setShowMoveModal(true);
    setStep('select-source');
  };

  const handleSourceTableSelect = (table) => {
    setSelectedSourceTable(table);
    setStep('select-destination');
  };

  const handleDestTableSelect = (table) => {
    setSelectedDestTable(table);
    
    if (table.status === 'occupied') {
      setShowMergeConfirm(true);
    } else {
      // Available table - just move
      moveTableOrder(selectedSourceTable.id, table.id);
    }
  };

  const getTableColor = (status) => {
    const colors = {
      available: 'bg-green-100 border-green-500 text-green-800',
      occupied: 'bg-red-100 border-red-500 text-red-800',
      needs_cleaning: 'bg-yellow-100 border-yellow-500 text-yellow-800',
      reserved: 'bg-blue-100 border-blue-500 text-blue-800',
      problem: 'bg-gray-100 border-gray-500 text-gray-800'
    };
    return colors[status] || 'bg-gray-100 border-gray-300';
  };

  const occupiedTables = tables.filter(t => t.status === 'occupied');
  const availableTables = tables.filter(t => t.status === 'available');

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-bold text-gray-800">Table Management</h3>
        
        {/* Action Buttons */}
        <div className="flex space-x-2">
          {occupiedTables.length > 0 && (
            <>
              <button
                onClick={handleMoveClick}
                className="bg-purple-600 text-white px-3 py-1 rounded-lg text-sm hover:bg-purple-700"
              >
                Move Order
              </button>
              
              <button
                onClick={() => {
                  setShowCancelTableSelection(true);
                  setSelectedTablesForCancel([]);
                }}
                className="bg-red-600 text-white px-3 py-1 rounded-lg text-sm hover:bg-red-700"
              >
                Cancel Table
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-5 gap-3">
        {tables.map((table) => (
          <div
            key={table.id}
            className={`border-2 rounded-xl p-4 cursor-pointer transition-all hover:shadow-md ${getTableColor(table.status)}`}
            onClick={() => onTableSelect(table)}
          >
            <div className="text-center">
              <div className="text-2xl font-bold mb-1">{table.number}</div>
              <div className="text-xs capitalize">
                {table.status.replace('_', ' ')}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Enhanced Move Modal */}
      {showMoveModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            {step === 'select-source' && (
              <>
                <h3 className="text-lg font-bold mb-4">Select Table to Move</h3>
                
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {occupiedTables.map((table) => (
                    <button
                      key={table.id}
                      onClick={() => handleSourceTableSelect(table)}
                      className="bg-red-100 border-2 border-red-500 text-red-800 p-3 rounded-lg hover:bg-red-200"
                    >
                      Table {table.number}
                    </button>
                  ))}
                </div>

                {occupiedTables.length === 0 && (
                  <p className="text-center text-gray-500 py-4">No occupied tables to move</p>
                )}
              </>
            )}

            {step === 'select-destination' && selectedSourceTable && (
              <>
                <h3 className="text-lg font-bold mb-4">
                  Move Table {selectedSourceTable.number} to:
                </h3>
                
                <div className="mb-4">
                  <h4 className="text-md font-semibold mb-2 text-green-600">Available Tables</h4>
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    {availableTables.map((table) => (
                      <button
                        key={table.id}
                        onClick={() => handleDestTableSelect(table)}
                        className="bg-green-100 border-2 border-green-500 text-green-800 p-3 rounded-lg hover:bg-green-200"
                      >
                        Table {table.number}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mb-4">
                  <h4 className="text-md font-semibold mb-2 text-red-600">Occupied Tables (Merge)</h4>
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    {occupiedTables.filter(t => t.id !== selectedSourceTable.id).map((table) => (
                      <button
                        key={table.id}
                        onClick={() => handleDestTableSelect(table)}
                        className="bg-red-100 border-2 border-red-500 text-red-800 p-3 rounded-lg hover:bg-red-200"
                      >
                        Table {table.number}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => setStep('select-source')}
                  className="w-full bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400 mb-2"
                >
                  ← Back
                </button>
              </>
            )}

            <button
              onClick={resetMoveModal}
              className="w-full bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Merge Confirmation Modal */}
      {showMergeConfirm && selectedSourceTable && selectedDestTable && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-bold mb-4 text-orange-600">⚠️ Table Occupied</h3>
            
            <p className="mb-4">
              Table {selectedDestTable.number} is already occupied with an order. 
              Do you want to <strong>merge</strong> the orders from Table {selectedSourceTable.number} 
              into Table {selectedDestTable.number}?
            </p>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-yellow-800">
                <strong>Note:</strong> This will combine all items from both tables into one order 
                on Table {selectedDestTable.number}. Table {selectedSourceTable.number} will become available.
              </p>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => setShowMergeConfirm(false)}
                className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={() => mergeTableOrders(selectedSourceTable.id, selectedDestTable.id)}
                className="flex-1 bg-orange-600 text-white py-2 px-4 rounded-lg hover:bg-orange-700"
              >
                Merge Orders
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Cancel Table Selection Modal */}
      {showCancelTableSelection && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-2xl w-full max-h-96 overflow-y-auto">
            <h3 className="text-lg font-bold mb-4 text-red-600">Select Tables to Cancel</h3>
            
            <p className="mb-4 text-gray-600">
              Select one or more occupied tables to cancel their orders and free them up.
            </p>
            
            <div className="grid grid-cols-3 gap-3 mb-6">
              {occupiedTables.map((table) => (
                <div
                  key={table.id}
                  onClick={() => {
                    const isSelected = selectedTablesForCancel.includes(table.id);
                    if (isSelected) {
                      setSelectedTablesForCancel(prev => prev.filter(id => id !== table.id));
                    } else {
                      setSelectedTablesForCancel(prev => [...prev, table.id]);
                    }
                  }}
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    selectedTablesForCancel.includes(table.id)
                      ? 'border-red-500 bg-red-50 text-red-700'
                      : 'border-gray-300 bg-gray-50 text-gray-700 hover:border-red-300'
                  }`}
                >
                  <div className="text-center">
                    <div className="text-xl font-bold">Table {table.number}</div>
                    <div className="text-sm">Occupied</div>
                    {selectedTablesForCancel.includes(table.id) && (
                      <div className="text-xs text-red-600 mt-1">✓ Selected</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            
            {occupiedTables.length === 0 && (
              <p className="text-center text-gray-500 py-4">No occupied tables to cancel</p>
            )}
            
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowCancelTableSelection(false);
                  setSelectedTablesForCancel([]);
                }}
                className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400"
              >
                Cancel
              </button>
              {selectedTablesForCancel.length > 0 && (
                <button
                  onClick={() => {
                    setShowCancelTableSelection(false);
                    setShowCancelTableModal(true);
                  }}
                  className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700"
                >
                  Cancel Selected ({selectedTablesForCancel.length})
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Cancel Table Confirmation Modal */}
      {showCancelTableModal && selectedTablesForCancel.length > 0 && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-bold mb-4 text-red-600">Confirm Table Cancellation</h3>
            
            <p className="mb-4">
              Are you sure you want to cancel {selectedTablesForCancel.length} table(s)? 
              This will cancel the associated orders and free up the tables.
            </p>
            
            <div className="mb-4 bg-gray-50 rounded-lg p-3">
              <div className="text-sm font-medium text-gray-700 mb-2">Tables to cancel:</div>
              <div className="text-sm text-gray-600">
                {selectedTablesForCancel.map(tableId => {
                  const table = tables.find(t => t.id === tableId);
                  return table ? `Table ${table.number}` : '';
                }).filter(Boolean).join(', ')}
              </div>
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowCancelTableModal(false);
                  setSelectedTablesForCancel([]);
                }}
                className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  try {
                    // Cancel orders for all selected tables
                    for (const tableId of selectedTablesForCancel) {
                      const table = tables.find(t => t.id === tableId);
                      if (table && table.current_order_id) {
                        await axios.post(`${API}/orders/${table.current_order_id}/cancel`, {
                          reason: 'other',
                          notes: `Table ${table.number} cancelled via table management`
                        });
                      }
                      
                      // Free the table
                      await updateTableStatus(tableId, 'available');
                    }
                    
                    setShowCancelTableModal(false);
                    setSelectedTablesForCancel([]);
                    alert(`${selectedTablesForCancel.length} table(s) cancelled successfully`);
                  } catch (error) {
                    console.error('Error cancelling tables:', error);
                    alert('Error cancelling tables');
                  }
                }}
                className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700"
              >
                Confirm Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Payment Modal Component
const PaymentModal = ({ isOpen, order, onClose, onPaymentComplete }) => {
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [cashReceived, setCashReceived] = useState('');
  const [emailReceipt, setEmailReceipt] = useState('');
  const [printReceipt, setPrintReceipt] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [showPrintButton, setShowPrintButton] = useState(false);
  const [paidOrder, setPaidOrder] = useState(null);
  const { printOrderReceipt, connected, openPrinterManager } = usePrinter();

  const calculateChange = () => {
    if (paymentMethod === 'cash' && cashReceived) {
      return Math.max(0, parseFloat(cashReceived) - order.total);
    }
    return 0;
  };

  const handlePayment = async () => {
    if (paymentMethod === 'cash' && parseFloat(cashReceived) < order.total) {
      alert('Cash received is less than total amount');
      return;
    }

    setProcessing(true);
    try {
      const paymentData = {
        payment_method: paymentMethod,
        cash_received: paymentMethod === 'cash' ? parseFloat(cashReceived) : null,
        email_receipt: emailReceipt || null,
        print_receipt: printReceipt
      };

      const response = await axios.post(`${API}/orders/${order.id}/pay`, paymentData);
      
      // Store the paid order for printing
      const orderWithPayment = {
        ...order,
        payment_method: paymentMethod,
        change_amount: response.data.change_amount || 0,
        paid_at: new Date().toISOString()
      };
      setPaidOrder(orderWithPayment);
      
      alert(`Payment successful! ${paymentMethod === 'cash' ? `Change: $${response.data.change_amount.toFixed(2)}` : ''}`);
      
      // Auto-print if enabled and printer connected
      if (printReceipt && connected) {
        try {
          await printOrderReceipt(orderWithPayment);
        } catch (error) {
          console.error('Auto-print failed:', error);
        }
      }
      
      // Show print button option for a few seconds
      if (printReceipt) {
        setShowPrintButton(true);
        setTimeout(() => setShowPrintButton(false), 10000); // Hide after 10 seconds
      }
      
      setTimeout(() => {
        onPaymentComplete();
        onClose();
        setShowPrintButton(false);
        setPaidOrder(null);
      }, showPrintButton ? 3000 : 1000);
      
    } catch (error) {
      alert(error.response?.data?.detail || 'Payment failed');
    } finally {
      setProcessing(false);
    }
  };

  const handlePayLater = async () => {
    setProcessing(true);
    try {
      // Update order status to pending (pay later)
      await axios.put(`${API}/orders/${order.id}/status`, { status: 'pending' });
      alert('Order marked as pay later - moved to active orders');
      onPaymentComplete();
      onClose();
    } catch (error) {
      alert(error.response?.data?.detail || 'Error processing pay later');
    } finally {
      setProcessing(false);
    }
  };

  const handlePrintReceipt = async () => {
    if (paidOrder) {
      try {
        await printOrderReceipt(paidOrder);
      } catch (error) {
        alert('Print failed. Please check printer connection.');
      }
    }
  };

  if (!isOpen || !order) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-6 max-w-md w-full">
        <h3 className="text-xl font-bold mb-4">Process Payment</h3>
        
        <div className="mb-4">
          <h4 className="font-medium mb-2">Order Total: ${order.total.toFixed(2)}</h4>
        </div>

        {/* Payment Method */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
          <div className="flex space-x-2">
            <button
              onClick={() => setPaymentMethod('card')}
              className={`flex-1 py-2 px-4 rounded-lg border ${
                paymentMethod === 'card' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-white text-gray-700 border-gray-300'
              }`}
            >
              Card
            </button>
            <button
              onClick={() => setPaymentMethod('cash')}
              className={`flex-1 py-2 px-4 rounded-lg border ${
                paymentMethod === 'cash' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-white text-gray-700 border-gray-300'
              }`}
            >
              Cash
            </button>
          </div>
        </div>

        {/* Cash Payment */}
        {paymentMethod === 'cash' && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Cash Received</label>
            <input
              type="number"
              step="0.01"
              value={cashReceived}
              onChange={(e) => setCashReceived(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0.00"
            />
            {cashReceived && (
              <p className="text-sm text-gray-600 mt-1">
                Change: ${calculateChange().toFixed(2)}
              </p>
            )}
          </div>
        )}

        {/* Receipt Options */}
        <div className="mb-6">
          <div className="flex items-center mb-2">
            <input
              type="checkbox"
              checked={printReceipt}
              onChange={(e) => setPrintReceipt(e.target.checked)}
              className="mr-2"
            />
            <label className="text-sm">Print Receipt</label>
          </div>
          
          {/* Printer Status */}
          {printReceipt && (
            <div className="mb-2 p-2 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="text-xs">
                  <span className="font-medium">Printer: </span>
                  <span className={connected ? 'text-green-600' : 'text-red-600'}>
                    {connected ? 'Connected' : 'Not Connected'}
                  </span>
                </div>
                {!connected && (
                  <button
                    onClick={openPrinterManager}
                    className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700"
                  >
                    Setup
                  </button>
                )}
              </div>
            </div>
          )}
          
          <div className="mb-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Email Receipt (optional)</label>
            <input
              type="email"
              value={emailReceipt}
              onChange={(e) => setEmailReceipt(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="customer@email.com"
            />
          </div>
        </div>

        {/* Print Receipt Button (shows after payment) */}
        {showPrintButton && paidOrder && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm text-green-700">Payment successful!</span>
              <button
                onClick={handlePrintReceipt}
                className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
              >
                🖨️ Print Receipt
              </button>
            </div>
          </div>
        )}

        <div className="flex space-x-3">
          <button
            onClick={onClose}
            className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400"
            disabled={processing}
          >
            Cancel
          </button>
          
          <button
            onClick={handlePayLater}
            className="flex-1 bg-yellow-600 text-white py-2 px-4 rounded-lg hover:bg-yellow-700"
            disabled={processing}
          >
            Pay Later
          </button>
          
          <button
            onClick={handlePayment}
            className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700"
            disabled={processing || (paymentMethod === 'cash' && (!cashReceived || parseFloat(cashReceived) < order.total))}
          >
            {processing ? 'Processing...' : 'Pay Now'}
          </button>
        </div>
      </div>
    </div>
  );
};

// Item Removal Modal
const ItemRemovalModal = ({ isOpen, onClose, onRemove }) => {
  const [reason, setReason] = useState('wrong_item');
  const [notes, setNotes] = useState('');

  const handleRemove = () => {
    onRemove({ reason, notes });
    setReason('wrong_item');
    setNotes('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-6 max-w-md w-full">
        <h3 className="text-lg font-bold mb-4">Remove Item - Reason Required</h3>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Reason</label>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="wrong_item">Wrong Item Selected</option>
            <option value="customer_changed_mind">Customer Changed Mind</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Notes (optional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows="3"
            placeholder="Additional details..."
          />
        </div>

        <div className="flex space-x-3">
          <button
            onClick={onClose}
            className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400"
          >
            Cancel
          </button>
          <button
            onClick={handleRemove}
            className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700"
          >
            Remove Item
          </button>
        </div>
      </div>
    </div>
  );
};

// New Order Component
const NewOrder = ({ selectedTable, editingOrder, editingActiveOrder, onBack, fromTableManagement = false }) => {
  const { printOrderReceipt, connected, openPrinterManager } = usePrinter();
  const [menuItems, setMenuItems] = useState([]);
  const [modifierGroups, setModifierGroups] = useState([]);
  const [modifiers, setModifiers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [cart, setCart] = useState([]);
  const [currentOrder, setCurrentOrder] = useState(null);
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    phone: '',
    address: '',
    apartment: ''
  });
  const [showCustomerInfo, setShowCustomerInfo] = useState(false);
  const [orderType, setOrderType] = useState(fromTableManagement ? 'dine_in' : (selectedTable ? 'dine_in' : 'takeout'));
  const [tip, setTip] = useState(0);
  const [showModifierModal, setShowModifierModal] = useState(false);
  const [selectedMenuItem, setSelectedMenuItem] = useState(null);
  const [selectedModifiers, setSelectedModifiers] = useState({});
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showRemovalModal, setShowRemovalModal] = useState(false);
  const [removalItemIndex, setRemovalItemIndex] = useState(null);
  const [orderNotes, setOrderNotes] = useState('');
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showTableModal, setShowTableModal] = useState(false);
  const [assignedTable, setAssignedTable] = useState(selectedTable || null);
  const [tables, setTables] = useState([]);

  // Auto-fill customer info when phone number is entered
  const handlePhoneChange = async (phone) => {
    setCustomerInfo(prev => ({ ...prev, phone }));
    
    // If phone number is complete (at least 10 digits), try to lookup customer
    if (phone.length >= 10) {
      await lookupCustomerByPhone(phone);
    }
  };

  // Auto-fill customer info when address is entered (at least 10 characters)
  const handleAddressChange = async (address) => {
    setCustomerInfo(prev => ({ ...prev, address }));
    
    // If address is substantial (at least 10 characters), try to lookup customer
    if (address.length >= 10) {
      await lookupCustomerByAddress(address);
    }
  };

  // Lookup customer by phone number
  const lookupCustomerByPhone = async (phone) => {
    try {
      const response = await axios.get(`${API}/customers/${phone}`);
      const customer = response.data;
      
      // Auto-fill name and address if found
      setCustomerInfo(prev => ({
        ...prev,
        name: customer.name || prev.name,
        address: customer.address || prev.address,
        apartment: customer.apartment || prev.apartment
      }));
      
      // Show customer info section since we found a customer
      setShowCustomerInfo(true);
    } catch (error) {
      // Customer not found, which is fine - just continue with manual entry
      console.log('Customer not found by phone, continuing with manual entry');
    }
  };

  // Lookup customer by address (search through all customers)
  const lookupCustomerByAddress = async (address) => {
    try {
      const response = await axios.get(`${API}/customers`);
      const customers = response.data;
      
      // Find customer with matching address (case insensitive partial match)
      const matchingCustomer = customers.find(customer => 
        customer.address && 
        customer.address.toLowerCase().includes(address.toLowerCase()) &&
        customer.address.length > 0
      );
      
      if (matchingCustomer) {
        // Auto-fill other fields if found
        setCustomerInfo(prev => ({
          ...prev,
          name: matchingCustomer.name || prev.name,
          phone: matchingCustomer.phone || prev.phone,
          apartment: matchingCustomer.apartment || prev.apartment
        }));
        
        // Show customer info section since we found a customer
        setShowCustomerInfo(true);
      }
    } catch (error) {
      console.log('Error looking up customer by address:', error);
    }
  };

  useEffect(() => {
    if (editingOrder) {
      loadExistingTableOrder();
    } else if (editingActiveOrder) {
      loadActiveOrder();
    }
    fetchMenuItems();
    fetchCategories();
    fetchModifierData();
    fetchTables();
  }, [editingOrder, editingActiveOrder]);

  const fetchTables = async () => {
    try {
      const response = await axios.get(`${API}/tables`);
      setTables(response.data);
    } catch (error) {
      console.error('Error fetching tables:', error);
    }
  };

  const loadExistingTableOrder = async () => {
    try {
      const response = await axios.get(`${API}/orders/${editingOrder.current_order_id}`);
      const order = response.data;
      setCurrentOrder(order);
      setCart(order.items);
      setCustomerInfo({
        name: order.customer_name,
        phone: order.customer_phone,
        address: order.customer_address
      });
      setOrderType(order.order_type);
    } catch (error) {
      console.error('Error loading existing order:', error);
    }
  };

  const loadActiveOrder = () => {
    const order = editingActiveOrder;
    setCurrentOrder(order);
    setCart(order.items);
    setCustomerInfo({
      name: order.customer_name,
      phone: order.customer_phone,
      address: order.customer_address
    });
    setOrderType(order.order_type);
  };

  const fetchMenuItems = async () => {
    try {
      const response = await axios.get(`${API}/menu/items`);
      setMenuItems(response.data);
    } catch (error) {
      console.error('Error fetching menu items:', error);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${API}/menu/categories`);
      setCategories(response.data.categories);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchModifierData = async () => {
    try {
      const [groupsRes, modRes] = await Promise.all([
        axios.get(`${API}/modifiers/groups`),
        axios.get(`${API}/modifiers`)
      ]);
      setModifierGroups(groupsRes.data);
      setModifiers(modRes.data);
    } catch (error) {
      console.error('Error fetching modifier data:', error);
    }
  };

  const addToCart = (item) => {
    if (item.modifier_groups && item.modifier_groups.length > 0) {
      setSelectedMenuItem(item);
      setSelectedModifiers({});
      setShowModifierModal(true);
    } else {
      // Add item without modifiers
      const cartItem = {
        menu_item_id: item.id,
        menu_item_name: item.name,
        quantity: 1,
        base_price: item.price,
        modifiers: [],
        total_price: item.price
      };
      
      const existingIndex = cart.findIndex(cartItem => 
        cartItem.menu_item_id === item.id && cartItem.modifiers.length === 0
      );
      
      if (existingIndex >= 0) {
        const newCart = [...cart];
        newCart[existingIndex].quantity += 1;
        newCart[existingIndex].total_price = newCart[existingIndex].base_price * newCart[existingIndex].quantity;
        setCart(newCart);
      } else {
        setCart([...cart, cartItem]);
      }
    }
  };

  const handleModifierSelection = () => {
    if (!selectedMenuItem) return;
    
    const selectedModifiersList = [];
    let modifierTotal = 0;
    
    Object.entries(selectedModifiers).forEach(([groupId, modifierIds]) => {
      modifierIds.forEach(modifierId => {
        const modifier = modifiers.find(m => m.id === modifierId);
        if (modifier) {
          selectedModifiersList.push({
            modifier_id: modifier.id,
            name: modifier.name,
            price: modifier.price
          });
          modifierTotal += modifier.price;
        }
      });
    });
    
    const cartItem = {
      menu_item_id: selectedMenuItem.id,
      menu_item_name: selectedMenuItem.name,
      quantity: 1,
      base_price: selectedMenuItem.price,
      modifiers: selectedModifiersList,
      total_price: selectedMenuItem.price + modifierTotal
    };
    
    setCart([...cart, cartItem]);
    setShowModifierModal(false);
    setSelectedMenuItem(null);
  };

  const updateCartItemQuantity = (index, newQuantity) => {
    if (newQuantity <= 0) {
      initiateItemRemoval(index);
      return;
    }
    
    const newCart = [...cart];
    newCart[index].quantity = newQuantity;
    const modifierTotal = newCart[index].modifiers.reduce((sum, mod) => sum + mod.price, 0);
    newCart[index].total_price = (newCart[index].base_price + modifierTotal) * newQuantity;
    setCart(newCart);
  };

  const initiateItemRemoval = (index) => {
    setRemovalItemIndex(index);
    setShowRemovalModal(true);
  };

  const removeFromCart = async (removalData) => {
    if (currentOrder) {
      // Remove from existing order
      try {
        await axios.delete(`${API}/orders/${currentOrder.id}/items/${removalItemIndex}`, {
          data: removalData
        });
        loadExistingTableOrder(); // Reload order
      } catch (error) {
        console.error('Error removing item from order:', error);
      }
    } else {
      // Remove from cart
      const newCart = cart.filter((_, i) => i !== removalItemIndex);
      setCart(newCart);
    }
  };

  const calculateTotal = () => {
    const subtotal = cart.reduce((sum, item) => sum + item.total_price, 0);
    const tax = subtotal * 0.08;
    return {
      subtotal,
      tax,
      total: subtotal + tax
    };
  };

  const createOrUpdateOrder = async () => {
    if (cart.length === 0) {
      alert('Please add items to your order');
      return;
    }

    // Auto-create customer if they don't exist and we have customer info
    if (customerInfo.phone && customerInfo.name && !currentOrder) {
      try {
        const response = await axios.get(`${API}/customers/${customerInfo.phone}`);
        // Customer exists, we're good
      } catch (error) {
        if (error.response?.status === 404) {
          // Customer doesn't exist, create them
          try {
            const newCustomerData = {
              name: customerInfo.name,
              phone: customerInfo.phone,
              address: customerInfo.address || '',
              email: '',
              notes: `Auto-created from order on ${new Date().toLocaleDateString()}`
            };
            await axios.post(`${API}/customers`, newCustomerData);
            console.log('New customer auto-created successfully');
          } catch (createError) {
            console.error('Error auto-creating customer:', createError);
            // Continue with order creation even if customer creation fails
          }
        }
      }
    }

    try {
      const orderData = {
        customer_name: customerInfo.name,
        customer_phone: customerInfo.phone,
        customer_address: customerInfo.address,
        table_id: assignedTable?.id || selectedTable?.id || null,
        items: cart.map(item => ({
          menu_item_id: item.menu_item_id,
          quantity: item.quantity,
          modifiers: item.modifiers,
          special_instructions: ''
        })),
        order_type: orderType,
        tip: 0,
        delivery_instructions: '',
        order_notes: orderNotes
      };

      const response = await axios.post(`${API}/orders`, orderData);
      setCurrentOrder(response.data);
      return response.data;
    } catch (error) {
      console.error('Error creating order:', error);
      alert('Error creating order. Please try again.');
      return null;
    }
  };

  const sendToKitchen = async () => {
    let order = currentOrder;
    
    if (!order) {
      // Create new order
      order = await createOrUpdateOrder();
      if (!order) return;
      
      try {
        await axios.post(`${API}/orders/${order.id}/send`);
        alert('Order sent successfully!');
        onBack();
      } catch (error) {
        console.error('Error sending order:', error);
        alert(error.response?.data?.detail || 'Error sending order');
      }
    } else {
      // Update existing order
      try {
        await updateExistingOrder();
        alert('Order updated successfully!');
        onBack();
      } catch (error) {
        console.error('Error updating order:', error);
        alert(error.response?.data?.detail || 'Error updating order');
      }
    }
  };

  const updateExistingOrder = async () => {
    if (!currentOrder) return;

    try {
      const orderData = {
        customer_name: customerInfo.name,
        customer_phone: customerInfo.phone,
        customer_address: customerInfo.address,
        table_id: selectedTable?.id || currentOrder.table_id,
        items: cart.map(item => ({
          menu_item_id: item.menu_item_id,
          quantity: item.quantity,
          modifiers: item.modifiers,
          special_instructions: ''
        })),
        order_type: orderType,
        tip: 0,
        delivery_instructions: '',
        order_notes: orderNotes
      };

      // Update the existing order (keeps same order number)
      const response = await axios.put(`${API}/orders/${currentOrder.id}`, orderData);
      const updatedOrder = response.data;
      
      setCurrentOrder(updatedOrder);
      return updatedOrder;
    } catch (error) {
      console.error('Error updating order:', error);
      throw error;
    }
  };

  const initiateCheckout = async () => {
    let order = currentOrder;
    
    if (!order) {
      order = await createOrUpdateOrder();
      if (!order) return;
    }

    setShowPaymentModal(true);
  };

  const printReceipt = async () => {
    if (!connected) {
      const shouldSetup = window.confirm('Printer not connected. Would you like to set up the printer now?');
      if (shouldSetup) {
        openPrinterManager();
      }
      return;
    }

    try {
      const orderData = currentOrder || {
        ...calculateTotal(),
        items: cart,
        customer_name: customerInfo.name,
        customer_phone: customerInfo.phone,
        customer_address: customerInfo.address,
        order_type: orderType,
        table_number: assignedTable?.number || selectedTable?.number,
        created_at: new Date().toISOString(),
        order_number: `TEMP-${Date.now()}`
      };

      await printOrderReceipt(orderData);
    } catch (error) {
      console.error('Print receipt error:', error);
      alert('Failed to print receipt. Please check printer connection.');
    }
  };


  const filteredItems = selectedCategory === 'all' 
    ? menuItems 
    : menuItems.filter(item => item.category === selectedCategory);

  const { subtotal, tax, total } = calculateTotal();

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-white shadow-sm border-b p-4">
        <div className="flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-800"
          >
            <span>←</span>
            <span>Back</span>
          </button>
          <h1 className="text-xl font-bold">
            {editingOrder ? `Edit Table ${editingOrder.number} Order` : 
             editingActiveOrder ? `Edit Order ${editingActiveOrder.order_number}` :
             selectedTable ? `New Order - Table ${selectedTable.number}` : 'New Order'}
          </h1>
          <div className="text-right">
            <div className="text-2xl font-bold text-green-600">${total.toFixed(2)}</div>
            <div className="text-sm text-gray-600">{cart.length} items</div>
          </div>
        </div>
      </div>

      <div className="flex h-screen">
        {/* Menu Items */}
        <div className="flex-1 p-6">
          {/* Order Type Selection */}
          {!fromTableManagement && (
            <div className="mb-6">
              <div className="flex space-x-2">
                {[
                  { value: 'dine_in', label: 'Dine In' },
                  { value: 'takeout', label: 'Takeout' },
                  { value: 'delivery', label: 'Delivery' }
                ].map(type => (
                  <button
                    key={type.value}
                    onClick={() => setOrderType(type.value)}
                    className={`px-4 py-2 rounded-lg font-medium ${
                      orderType === type.value
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-gray-700 border hover:bg-gray-50'
                    }`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {/* Show order type indicator when from table management */}
          {fromTableManagement && (
            <div className="mb-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <span className="text-blue-800 font-medium">Order Type: Dine In</span>
                <span className="text-blue-600 text-sm ml-2">(Table Management Mode)</span>
              </div>
            </div>
          )}

          {/* Table Selection for Dine In */}
          {orderType === 'dine_in' && (
            <div className="mb-6 bg-white rounded-xl p-4">
              <h3 className="font-bold text-lg mb-4">Selected Table</h3>
              {assignedTable ? (
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div>
                    <span className="font-medium">Table {assignedTable.number}</span>
                    <span className="text-sm text-gray-600 ml-2">({assignedTable.status})</span>
                  </div>
                  {!fromTableManagement && (
                    <button
                      onClick={() => setShowTableModal(true)}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium"
                    >
                      Change Table
                    </button>
                  )}
                </div>
              ) : (
                <div className="text-center">
                  <button
                    onClick={() => setShowTableModal(true)}
                    className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 text-lg font-medium"
                  >
                    Choose Table
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Customer Info for Delivery */}
          {orderType === 'delivery' && (
            <div className="mb-6 bg-white rounded-xl p-4">
              {!showCustomerInfo ? (
                // Show only Add Customer button initially
                <div className="text-center">
                  <button
                    onClick={() => setShowCustomerModal(true)}
                    className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 text-lg font-medium"
                  >
                    + Add Customer
                  </button>
                </div>
              ) : (
                // Show customer information section
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-lg">Customer Information</h3>
                    <button
                      onClick={() => setShowCustomerModal(true)}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium"
                    >
                      Edit Customer
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name</label>
                      <input
                        type="text"
                        placeholder="Customer Name"
                        value={customerInfo.name}
                        onChange={(e) => setCustomerInfo({...customerInfo, name: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                      <input
                        type="tel"
                        placeholder="Phone Number"
                        value={customerInfo.phone}
                        onChange={(e) => handlePhoneChange(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Street Address</label>
                      <input
                        type="text"
                        placeholder="Street Address"
                        value={customerInfo.address}
                        onChange={(e) => handleAddressChange(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Apartment/Unit</label>
                      <input
                        type="text"
                        placeholder="Apt, Suite, Unit"
                        value={customerInfo.apartment}
                        onChange={(e) => setCustomerInfo({...customerInfo, apartment: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Category Filter */}
          <div className="mb-6">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-4 py-2 rounded-lg ${
                  selectedCategory === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 border hover:bg-gray-50'
                }`}
              >
                All
              </button>
              {categories.map(category => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 py-2 rounded-lg ${
                    selectedCategory === category
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 border hover:bg-gray-50'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          {/* Menu Items Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredItems.map(item => (
              <div key={item.id} className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
                {item.image_url && (
                  <img 
                    src={item.image_url} 
                    alt={item.name}
                    className="w-full h-32 object-cover rounded-lg mb-3"
                  />
                )}
                <h3 className="font-semibold text-gray-800 mb-1">{item.name}</h3>
                <p className="text-sm text-gray-600 mb-3 line-clamp-2">{item.description}</p>
                <div className="flex justify-between items-center">
                  <span className="text-lg font-bold text-green-600">
                    ${item.price.toFixed(2)}
                  </span>
                  <button
                    onClick={() => addToCart(item)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Add
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Order Summary */}
        <div className="w-96 bg-white shadow-lg p-6 overflow-y-auto">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Order Summary</h3>
          
          {/* Cart Items */}
          <div className="space-y-3 mb-6">
            {cart.map((item, index) => (
              <div key={index} className="bg-gray-50 rounded-lg p-3">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-medium">{item.menu_item_name}</h4>
                  <button
                    onClick={() => initiateItemRemoval(index)}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    ×
                  </button>
                </div>
                
                {item.modifiers.length > 0 && (
                  <div className="text-xs text-gray-600 mb-2">
                    {item.modifiers.map(mod => mod.name).join(', ')}
                  </div>
                )}
                
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => updateCartItemQuantity(index, item.quantity - 1)}
                      className="w-6 h-6 bg-gray-200 rounded text-sm hover:bg-gray-300"
                    >
                      -
                    </button>
                    <span className="w-8 text-center">{item.quantity}</span>
                    <button
                      onClick={() => updateCartItemQuantity(index, item.quantity + 1)}
                      className="w-6 h-6 bg-gray-200 rounded text-sm hover:bg-gray-300"
                    >
                      +
                    </button>
                  </div>
                  <span className="font-medium">${item.total_price.toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Total */}
          <div className="border-t pt-4 space-y-2 mb-6">
            <div className="flex justify-between text-sm">
              <span>Subtotal:</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Tax (8%):</span>
              <span>${tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-bold text-lg border-t pt-2">
              <span>Total:</span>
              <span>${total.toFixed(2)}</span>
            </div>
          </div>

          {/* Order Notes */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Order Notes</label>
            <textarea
              value={orderNotes}
              onChange={(e) => setOrderNotes(e.target.value)}
              placeholder="Add special instructions or comments for this order..."
              rows="3"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">These notes will appear on the receipt</p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={initiateCheckout}
              className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 text-lg font-semibold"
            >
              Checkout
            </button>
            
            <button
              onClick={sendToKitchen}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 font-semibold"
            >
              Send
            </button>
            
            <button
              onClick={printReceipt}
              className="w-full bg-gray-600 text-white py-3 px-4 rounded-lg hover:bg-gray-700 font-semibold"
            >
              Print Receipt
            </button>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showModifierModal && selectedMenuItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full max-h-96 overflow-y-auto">
            <h3 className="text-lg font-bold mb-4">Customize {selectedMenuItem.name}</h3>
            
            {selectedMenuItem.modifier_groups && selectedMenuItem.modifier_groups.length > 0 ? (
              selectedMenuItem.modifier_groups.map(groupId => {
                const group = modifierGroups.find(g => g.id === groupId);
                if (!group) return null;
                
                const groupModifiers = modifiers.filter(m => m.group_id === groupId);
                
                return (
                  <div key={groupId} className="mb-4">
                    <h4 className="font-medium mb-2">
                      {group.name} {group.required && <span className="text-red-500">*</span>}
                    </h4>
                    <div className="space-y-2">
                      {groupModifiers.map(modifier => (
                        <label key={modifier.id} className="flex items-center space-x-2">
                          <input
                            type={group.max_selections === 1 ? "radio" : "checkbox"}
                            name={`group-${groupId}`}
                            onChange={(e) => {
                              const newSelected = { ...selectedModifiers };
                              if (!newSelected[groupId]) newSelected[groupId] = [];
                              
                              if (group.max_selections === 1) {
                                newSelected[groupId] = e.target.checked ? [modifier.id] : [];
                              } else {
                                if (e.target.checked) {
                                  newSelected[groupId].push(modifier.id);
                                } else {
                                  newSelected[groupId] = newSelected[groupId].filter(id => id !== modifier.id);
                                }
                              }
                              setSelectedModifiers(newSelected);
                            }}
                          />
                          <span className="flex-1">{modifier.name}</span>
                          {modifier.price > 0 && (
                            <span className="text-green-600">+${modifier.price.toFixed(2)}</span>
                          )}
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-gray-500 mb-4">No modifiers available for this item.</p>
            )}
            
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowModifierModal(false)}
                className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={handleModifierSelection}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700"
              >
                Add to Cart
              </button>
            </div>
          </div>
        </div>
      )}

      <PaymentModal
        isOpen={showPaymentModal}
        order={currentOrder || { ...calculateTotal(), id: 'temp' }}
        onClose={() => setShowPaymentModal(false)}
        onPaymentComplete={() => {
          setShowPaymentModal(false);
          onBack();
        }}
      />

      <ItemRemovalModal
        isOpen={showRemovalModal}
        onClose={() => setShowRemovalModal(false)}
        onRemove={removeFromCart}
      />

      {/* Customer Modal */}
      {showCustomerModal && (
        <CustomerEditModal
          customer={{}}
          onSave={async (customerData) => {
            try {
              const response = await axios.post(`${API}/customers`, customerData);
              const newCustomer = response.data;
              
              // Auto-fill the customer info
              setCustomerInfo({
                name: newCustomer.name,
                phone: newCustomer.phone,
                address: newCustomer.address,
                apartment: ''
              });
              
              // Show customer info section
              setShowCustomerInfo(true);
              
              setShowCustomerModal(false);
              alert('Customer added successfully!');
            } catch (error) {
              console.error('Error adding customer:', error);
              alert('Error adding customer');
            }
          }}
          onClose={() => setShowCustomerModal(false)}
        />
      )}
      
      {/* Table Selection Modal */}
      {showTableModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full max-h-96 overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-800">Select Table</h3>
              <button
                onClick={() => setShowTableModal(false)}
                className="text-gray-500 hover:text-gray-700 text-xl"
              >
                ×
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {tables.map((table) => (
                <button
                  key={table.id}
                  onClick={() => {
                    if (table.status === 'occupied') {
                      // Show warning for occupied table
                      if (window.confirm(`Table ${table.number} is occupied. Do you want to merge orders with this table?`)) {
                        // Handle merge logic here
                        setAssignedTable(table);
                        setShowTableModal(false);
                        alert(`Order will be merged with Table ${table.number}`);
                      }
                    } else {
                      // Assign available table
                      setAssignedTable(table);
                      setShowTableModal(false);
                    }
                  }}
                  className={`p-4 rounded-lg border-2 text-center font-medium transition-colors ${
                    table.status === 'available' 
                      ? 'border-green-500 bg-green-50 text-green-700 hover:bg-green-100' 
                      : table.status === 'occupied'
                      ? 'border-orange-500 bg-orange-50 text-orange-700 hover:bg-orange-100'
                      : 'border-red-500 bg-red-50 text-red-700 cursor-not-allowed'
                  }`}
                  disabled={table.status === 'cleaning'}
                >
                  <div className="text-lg font-bold">Table {table.number}</div>
                  <div className="text-sm capitalize">{table.status}</div>
                  {table.status === 'occupied' && (
                    <div className="text-xs mt-1">Click to merge</div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Order Detail Modal
const OrderDetailModal = ({ order, onClose }) => {
  const { printOrderReceipt, connected, openPrinterManager } = usePrinter();
  
  if (!order) return null;

  const handlePrintOrder = async () => {
    if (!connected) {
      const shouldSetup = window.confirm('Printer not connected. Would you like to set up the printer now?');
      if (shouldSetup) {
        openPrinterManager();
      }
      return;
    }

    try {
      await printOrderReceipt(order);
    } catch (error) {
      alert('Failed to print receipt. Please check printer connection.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-6 max-w-lg w-full max-h-96 overflow-y-auto">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-xl font-bold">Order {order.order_number}</h3>
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrintOrder}
              className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 flex items-center space-x-1"
            >
              <span>🖨️</span>
              <span>Print</span>
            </button>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-xl"
            >
              ×
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <h4 className="font-medium text-gray-700 mb-2">Order Details</h4>
            <p><strong>Type:</strong> {order.order_type.replace('_', ' ').toUpperCase()}</p>
            <p><strong>Status:</strong> {order.status.replace('_', ' ').toUpperCase()}</p>
            <p><strong>Time:</strong> {formatLocalDateTime(order.created_at)}</p>
            {order.table_number && <p><strong>Table:</strong> {order.table_number}</p>}
          </div>

          {order.customer_name && (
            <div>
              <h4 className="font-medium text-gray-700 mb-2">Customer Information</h4>
              <p><strong>Name:</strong> {order.customer_name}</p>
              {order.customer_phone && <p><strong>Phone:</strong> {order.customer_phone}</p>}
              {order.customer_address && <p><strong>Address:</strong> {order.customer_address}</p>}
            </div>
          )}

          {order.order_notes && (
            <div>
              <h4 className="font-medium text-gray-700 mb-2">Order Notes</h4>
              <p className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">{order.order_notes}</p>
            </div>
          )}

          <div>
            <h4 className="font-medium text-gray-700 mb-2">Items</h4>
            {order.items.map((item, index) => (
              <div key={index} className="border-b pb-2 mb-2">
                <div className="flex justify-between">
                  <span>{item.quantity}x {item.menu_item_name}</span>
                  <span>${item.total_price.toFixed(2)}</span>
                </div>
                {item.modifiers && item.modifiers.length > 0 && (
                  <div className="text-sm text-gray-600 ml-4">
                    {item.modifiers.map(mod => mod.name).join(', ')}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="border-t pt-4">
            <div className="flex justify-between text-sm">
              <span>Subtotal:</span>
              <span>${order.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Tax:</span>
              <span>${order.tax.toFixed(2)}</span>
            </div>
            {order.tip > 0 && (
              <div className="flex justify-between text-sm">
                <span>Tip:</span>
                <span>${order.tip.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-lg border-t pt-2 mt-2">
              <span>Total:</span>
              <span>${order.total.toFixed(2)}</span>
            </div>
            
            {/* Payment Information */}
            {order.payment_method && (
              <div className="mt-4 pt-4 border-t">
                <h4 className="font-medium text-gray-700 mb-2">Payment Information</h4>
                <p><strong>Method:</strong> {order.payment_method.toUpperCase()}</p>
                {order.change_amount > 0 && (
                  <p><strong>Change Given:</strong> ${order.change_amount.toFixed(2)}</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Table Settings Component
const TableSettingsComponent = ({ onBack }) => {
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('management');
  const [showAddTableModal, setShowAddTableModal] = useState(false);
  const [showBulkAddModal, setShowBulkAddModal] = useState(false);
  const [showEditTableModal, setShowEditTableModal] = useState(false);
  const [editingTable, setEditingTable] = useState(null);
  const [selectedLayout, setSelectedLayout] = useState('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [tableForm, setTableForm] = useState({
    number: '',
    name: '',
    capacity: '4'
  });

  const [bulkAddForm, setBulkAddForm] = useState({
    startNumber: '',
    endNumber: '',
    namePrefix: '',
    capacity: '4'
  });

  const tableStatuses = [
    { value: 'available', label: 'Available', color: 'bg-green-100 text-green-800', icon: '✅' },
    { value: 'occupied', label: 'Occupied', color: 'bg-red-100 text-red-800', icon: '🔴' },
    { value: 'needs_cleaning', label: 'Needs Cleaning', color: 'bg-yellow-100 text-yellow-800', icon: '🧹' },
    { value: 'reserved', label: 'Reserved', color: 'bg-blue-100 text-blue-800', icon: '📅' }
  ];

  useEffect(() => {
    fetchTables();
  }, []);

  const fetchTables = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/tables`);
      setTables(response.data.sort((a, b) => a.number - b.number));
    } catch (error) {
      console.error('Error fetching tables:', error);
      alert('Failed to load tables');
    } finally {
      setLoading(false);
    }
  };

  const handleAddTable = async () => {
    if (!tableForm.number || !tableForm.capacity) {
      alert('Please fill in table number and capacity');
      return;
    }

    const tableNumber = parseInt(tableForm.number);
    const capacity = parseInt(tableForm.capacity);

    if (isNaN(tableNumber) || tableNumber <= 0) {
      alert('Please enter a valid table number');
      return;
    }

    if (isNaN(capacity) || capacity <= 0) {
      alert('Please enter a valid capacity');
      return;
    }

    // Check if table number already exists
    if (tables.some(table => table.number === tableNumber)) {
      alert('Table number already exists');
      return;
    }

    try {
      await axios.post(`${API}/tables`, {
        number: tableNumber,
        name: tableForm.name.trim(),
        capacity: capacity
      });
      alert('Table added successfully');
      setShowAddTableModal(false);
      setTableForm({ number: '', name: '', capacity: '4' });
      fetchTables();
    } catch (error) {
      console.error('Error adding table:', error);
      alert(error.response?.data?.detail || 'Failed to add table');
    }
  };

  const handleBulkAdd = async () => {
    if (!bulkAddForm.startNumber || !bulkAddForm.endNumber || !bulkAddForm.capacity) {
      alert('Please fill in start number, end number, and capacity');
      return;
    }

    const startNum = parseInt(bulkAddForm.startNumber);
    const endNum = parseInt(bulkAddForm.endNumber);
    const capacity = parseInt(bulkAddForm.capacity);

    if (isNaN(startNum) || isNaN(endNum) || isNaN(capacity)) {
      alert('Please enter valid numbers');
      return;
    }

    if (startNum > endNum) {
      alert('Start number must be less than or equal to end number');
      return;
    }

    if (endNum - startNum > 50) {
      alert('Cannot add more than 50 tables at once');
      return;
    }

    try {
      const existingNumbers = tables.map(t => t.number);
      const tablesToAdd = [];
      
      for (let i = startNum; i <= endNum; i++) {
        if (!existingNumbers.includes(i)) {
          const tableName = bulkAddForm.namePrefix ? 
            `${bulkAddForm.namePrefix} ${i}` : '';
          tablesToAdd.push({ 
            number: i, 
            name: tableName,
            capacity: capacity 
          });
        }
      }

      if (tablesToAdd.length === 0) {
        alert('All table numbers in this range already exist');
        return;
      }

      // Add tables one by one
      for (const table of tablesToAdd) {
        await axios.post(`${API}/tables`, table);
      }

      alert(`Successfully added ${tablesToAdd.length} tables`);
      setShowBulkAddModal(false);
      setBulkAddForm({ startNumber: '', endNumber: '', namePrefix: '', capacity: '4' });
      fetchTables();
    } catch (error) {
      console.error('Error bulk adding tables:', error);
      alert('Failed to add some tables');
      fetchTables(); // Refresh to show which ones were added
    }
  };

  const handleEditTable = (table) => {
    setEditingTable(table);
    setTableForm({
      number: table.number.toString(),
      name: table.name || '',
      capacity: table.capacity.toString()
    });
    setShowEditTableModal(true);
  };

  const handleUpdateTable = async () => {
    if (!tableForm.capacity) {
      alert('Please enter a capacity');
      return;
    }

    const capacity = parseInt(tableForm.capacity);
    if (isNaN(capacity) || capacity <= 0) {
      alert('Please enter a valid capacity');
      return;
    }

    try {
      await axios.put(`${API}/tables/${editingTable.id}`, {
        name: tableForm.name.trim(),
        capacity: capacity,
        status: editingTable.status,
        current_order_id: editingTable.current_order_id
      });
      
      alert('Table updated successfully');
      setShowEditTableModal(false);
      setEditingTable(null);
      setTableForm({ number: '', name: '', capacity: '4' });
      fetchTables();
    } catch (error) {
      console.error('Error updating table:', error);
      alert('Failed to update table');
    }
  };

  const handleDeleteTable = async (table) => {
    if (table.status === 'occupied' && table.current_order_id) {
      alert('Cannot delete table with active order. Please clear the order first.');
      return;
    }

    if (window.confirm(`Are you sure you want to delete Table ${table.number}?`)) {
      try {
        await axios.delete(`${API}/tables/${table.id}`);
        alert('Table deleted successfully');
        fetchTables();
      } catch (error) {
        console.error('Error deleting table:', error);
        alert('Failed to delete table');
      }
    }
  };

  const handleStatusChange = async (table, newStatus) => {
    try {
      await axios.put(`${API}/tables/${table.id}`, {
        status: newStatus,
        current_order_id: newStatus === 'available' ? null : table.current_order_id
      });
      fetchTables();
    } catch (error) {
      console.error('Error updating table status:', error);
      alert('Failed to update table status');
    }
  };

  const getStatusInfo = (status) => {
    return tableStatuses.find(s => s.value === status) || tableStatuses[0];
  };

  const getTableDisplayName = (table) => {
    if (table.name && table.name.trim()) {
      return table.name;
    }
    return `Table ${table.number}`;
  };

  const filteredTables = tables.filter(table => {
    const matchesSearch = table.number.toString().includes(searchQuery) || 
                         (table.name && table.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
                         table.capacity.toString().includes(searchQuery) ||
                         searchQuery === '';
    const matchesStatus = statusFilter === 'all' || table.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const tableStats = {
    total: tables.length,
    available: tables.filter(t => t.status === 'available').length,
    occupied: tables.filter(t => t.status === 'occupied').length,
    needsCleaning: tables.filter(t => t.status === 'needs_cleaning').length,
    reserved: tables.filter(t => t.status === 'reserved').length,
    totalCapacity: tables.reduce((sum, t) => sum + t.capacity, 0)
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading tables...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={onBack}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-800"
            >
              <span>←</span>
              <span>Back to Settings</span>
            </button>
            <h1 className="text-2xl font-bold text-gray-800">Table Settings</h1>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setShowBulkAddModal(true)}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center space-x-2"
            >
              <span>+</span>
              <span>Bulk Add</span>
            </button>
            <button
              onClick={() => setShowAddTableModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
            >
              <span>+</span>
              <span>Add Table</span>
            </button>
          </div>
        </div>
      </div>

      {/* Stats Dashboard */}
      <div className="bg-white border-b p-6">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-800">{tableStats.total}</div>
            <div className="text-sm text-gray-600">Total Tables</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{tableStats.available}</div>
            <div className="text-sm text-gray-600">Available</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{tableStats.occupied}</div>
            <div className="text-sm text-gray-600">Occupied</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">{tableStats.needsCleaning}</div>
            <div className="text-sm text-gray-600">Cleaning</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{tableStats.reserved}</div>
            <div className="text-sm text-gray-600">Reserved</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{tableStats.totalCapacity}</div>
            <div className="text-sm text-gray-600">Total Seats</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b">
        <div className="flex space-x-8 px-6">
          {[
            { id: 'management', name: 'Table Management', icon: '🪑' },
            { id: 'layout', name: 'Layout View', icon: '🗂️' },
            { id: 'status', name: 'Status Control', icon: '⚙️' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 py-4 px-2 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.name}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="p-6">
        {/* Table Management Tab */}
        {activeTab === 'management' && (
          <div className="space-y-6">
            {/* Search and Filter */}
            <div className="bg-white p-4 rounded-lg border">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
                <div className="flex flex-col md:flex-row md:items-center space-y-2 md:space-y-0 md:space-x-4">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search tables..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full md:w-64 px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    />
                    <span className="absolute right-3 top-2.5 text-gray-400">🔍</span>
                  </div>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="all">All Status</option>
                    {tableStatuses.map(status => (
                      <option key={status.value} value={status.value}>
                        {status.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="text-sm text-gray-600">
                  {filteredTables.length} tables found
                </div>
              </div>
            </div>

            {/* Tables Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredTables.map(table => {
                const statusInfo = getStatusInfo(table.status);
                return (
                  <div key={table.id} className="bg-white border rounded-lg p-4 hover:shadow-lg transition-shadow">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="text-lg font-bold text-gray-800">{getTableDisplayName(table)}</h3>
                        <p className="text-sm text-gray-600">{table.capacity} seats</p>
                        {table.name && table.name.trim() && (
                          <p className="text-xs text-gray-500">#{table.number}</p>
                        )}
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
                        {statusInfo.icon} {statusInfo.label}
                      </span>
                    </div>
                    
                    {table.current_order_id && (
                      <div className="mb-3 p-2 bg-orange-50 rounded text-sm">
                        <span className="text-orange-800">Order: {table.current_order_id.slice(-8)}</span>
                      </div>
                    )}

                    <div className="space-y-2">
                      <select
                        value={table.status}
                        onChange={(e) => handleStatusChange(table, e.target.value)}
                        className="w-full px-3 py-1 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                      >
                        {tableStatuses.map(status => (
                          <option key={status.value} value={status.value}>
                            {status.label}
                          </option>
                        ))}
                      </select>
                      
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEditTable(table)}
                          className="flex-1 bg-blue-50 text-blue-600 px-3 py-2 rounded text-sm font-medium hover:bg-blue-100"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteTable(table)}
                          className="flex-1 bg-red-50 text-red-600 px-3 py-2 rounded text-sm font-medium hover:bg-red-100"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {filteredTables.length === 0 && (
              <div className="text-center py-12">
                <span className="text-6xl mb-4 block">🪑</span>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No tables found</h3>
                <p className="text-gray-500 mb-4">Get started by adding your first table</p>
                <div className="flex justify-center space-x-4">
                  <button
                    onClick={() => setShowAddTableModal(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                  >
                    Add Single Table
                  </button>
                  <button
                    onClick={() => setShowBulkAddModal(true)}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                  >
                    Bulk Add Tables
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Layout View Tab */}
        {activeTab === 'layout' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Restaurant Layout</h2>
              <div className="flex space-x-2">
                <button
                  onClick={() => setSelectedLayout('grid')}
                  className={`px-4 py-2 rounded-lg ${selectedLayout === 'grid' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
                >
                  Grid View
                </button>
                <button
                  onClick={() => setSelectedLayout('floor')}
                  className={`px-4 py-2 rounded-lg ${selectedLayout === 'floor' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
                >
                  Floor Plan
                </button>
              </div>
            </div>

            {selectedLayout === 'grid' && (
              <div className="bg-white border rounded-lg p-6">
                <div className="grid grid-cols-8 gap-4">
                  {tables.map(table => {
                    const statusInfo = getStatusInfo(table.status);
                    return (
                      <div
                        key={table.id}
                        className={`aspect-square border-2 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:shadow-lg transition-all ${
                          table.status === 'available' ? 'border-green-300 bg-green-50' :
                          table.status === 'occupied' ? 'border-red-300 bg-red-50' :
                          table.status === 'needs_cleaning' ? 'border-yellow-300 bg-yellow-50' :
                          'border-blue-300 bg-blue-50'
                        }`}
                        title={`${getTableDisplayName(table)} - ${statusInfo.label} - ${table.capacity} seats`}
                      >
                        <div className="text-sm font-bold text-center px-1">
                          {table.name && table.name.trim() ? table.name : table.number}
                        </div>
                        <div className="text-xs">{table.capacity} seats</div>
                        <div className="text-lg">{statusInfo.icon}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {selectedLayout === 'floor' && (
              <div className="bg-white border rounded-lg p-6">
                <div className="text-center py-12">
                  <span className="text-6xl mb-4 block">🏗️</span>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Floor Plan Designer</h3>
                  <p className="text-gray-500 mb-4">Advanced floor plan layout tool coming soon</p>
                  <p className="text-sm text-gray-400">
                    Features will include: Drag & drop table positioning, Custom room layouts, 
                    Visual table management, and Export/import floor plans
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Status Control Tab */}
        {activeTab === 'status' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">Bulk Status Management</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {tableStatuses.map(status => {
                const tablesWithStatus = tables.filter(t => t.status === status.value);
                return (
                  <div key={status.value} className="bg-white border rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">{status.icon}</span>
                        <div>
                          <h3 className="font-semibold text-gray-800">{status.label}</h3>
                          <p className="text-sm text-gray-600">{tablesWithStatus.length} tables</p>
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${status.color}`}>
                        {tablesWithStatus.length}
                      </span>
                    </div>
                    
                    <div className="space-y-2">
                      {tablesWithStatus.slice(0, 5).map(table => (
                        <div key={table.id} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                          <span className="font-medium">{getTableDisplayName(table)}</span>
                          <span className="text-sm text-gray-600">{table.capacity} seats</span>
                        </div>
                      ))}
                      {tablesWithStatus.length > 5 && (
                        <div className="text-sm text-gray-500 text-center pt-2">
                          +{tablesWithStatus.length - 5} more tables
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="bg-white border rounded-lg p-6">
              <h3 className="font-semibold text-gray-800 mb-4">Quick Actions</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <button
                  onClick={() => {
                    if (window.confirm('Mark all available tables as needs cleaning?')) {
                      tables.filter(t => t.status === 'available').forEach(table => {
                        handleStatusChange(table, 'needs_cleaning');
                      });
                    }
                  }}
                  className="bg-yellow-50 text-yellow-700 border border-yellow-200 px-4 py-3 rounded-lg hover:bg-yellow-100"
                >
                  Mark All for Cleaning
                </button>
                <button
                  onClick={() => {
                    if (window.confirm('Mark all cleaning tables as available?')) {
                      tables.filter(t => t.status === 'needs_cleaning').forEach(table => {
                        handleStatusChange(table, 'available');
                      });
                    }
                  }}
                  className="bg-green-50 text-green-700 border border-green-200 px-4 py-3 rounded-lg hover:bg-green-100"
                >
                  Clean All Done
                </button>
                <button
                  onClick={() => {
                    if (window.confirm('Clear all reservations?')) {
                      tables.filter(t => t.status === 'reserved').forEach(table => {
                        handleStatusChange(table, 'available');
                      });
                    }
                  }}
                  className="bg-blue-50 text-blue-700 border border-blue-200 px-4 py-3 rounded-lg hover:bg-blue-100"
                >
                  Clear Reservations
                </button>
                <button
                  onClick={fetchTables}
                  className="bg-gray-50 text-gray-700 border border-gray-200 px-4 py-3 rounded-lg hover:bg-gray-100"
                >
                  Refresh Status
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add Single Table Modal */}
      {showAddTableModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold">Add New Table</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Table Number *</label>
                <input
                  type="number"
                  min="1"
                  value={tableForm.number}
                  onChange={(e) => setTableForm({...tableForm, number: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter table number"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Custom Name (Optional)</label>
                <input
                  type="text"
                  value={tableForm.name}
                  onChange={(e) => setTableForm({...tableForm, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., Bar 1, Patio A, Window Table"
                />
                <p className="text-xs text-gray-500 mt-1">Leave empty to use "Table [number]"</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Capacity (seats) *</label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={tableForm.capacity}
                  onChange={(e) => setTableForm({...tableForm, capacity: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Number of seats"
                />
              </div>
            </div>
            <div className="p-6 border-t flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowAddTableModal(false);
                  setTableForm({ number: '', name: '', capacity: '4' });
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleAddTable}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Add Table
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Add Tables Modal */}
      {showBulkAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold">Bulk Add Tables</h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Number *</label>
                  <input
                    type="number"
                    min="1"
                    value={bulkAddForm.startNumber}
                    onChange={(e) => setBulkAddForm({...bulkAddForm, startNumber: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., 1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Number *</label>
                  <input
                    type="number"
                    min="1"
                    value={bulkAddForm.endNumber}
                    onChange={(e) => setBulkAddForm({...bulkAddForm, endNumber: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., 20"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name Prefix (Optional)</label>
                <input
                  type="text"
                  value={bulkAddForm.namePrefix}
                  onChange={(e) => setBulkAddForm({...bulkAddForm, namePrefix: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., Bar, Patio, VIP"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Will create names like "Bar 1", "Bar 2", etc. Leave empty for "Table [number]"
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Default Capacity *</label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={bulkAddForm.capacity}
                  onChange={(e) => setBulkAddForm({...bulkAddForm, capacity: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Default seats per table"
                />
              </div>
              {bulkAddForm.startNumber && bulkAddForm.endNumber && (
                <div className="bg-blue-50 p-3 rounded">
                  <p className="text-sm text-blue-800">
                    This will create {Math.max(0, parseInt(bulkAddForm.endNumber) - parseInt(bulkAddForm.startNumber) + 1)} tables
                    {bulkAddForm.namePrefix ? 
                      ` named "${bulkAddForm.namePrefix} ${bulkAddForm.startNumber}" through "${bulkAddForm.namePrefix} ${bulkAddForm.endNumber}"` :
                      ` (Tables ${bulkAddForm.startNumber} - ${bulkAddForm.endNumber})`
                    }
                  </p>
                </div>
              )}
            </div>
            <div className="p-6 border-t flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowBulkAddModal(false);
                  setBulkAddForm({ startNumber: '', endNumber: '', namePrefix: '', capacity: '4' });
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkAdd}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                Add Tables
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Table Modal */}
      {showEditTableModal && editingTable && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold">Edit Table {editingTable.number}</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Table Number</label>
                <input
                  type="number"
                  value={tableForm.number}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-500"
                  title="Table number cannot be changed"
                />
                <p className="text-xs text-gray-500 mt-1">Table number cannot be changed</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Custom Name</label>
                <input
                  type="text"
                  value={tableForm.name}
                  onChange={(e) => setTableForm({...tableForm, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., Bar 1, Patio A, Window Table"
                />
                <p className="text-xs text-gray-500 mt-1">Leave empty to use "Table [number]"</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Capacity (seats) *</label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={tableForm.capacity}
                  onChange={(e) => setTableForm({...tableForm, capacity: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Number of seats"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Current Status</label>
                <div className={`px-3 py-2 border rounded-md ${getStatusInfo(editingTable.status).color}`}>
                  {getStatusInfo(editingTable.status).icon} {getStatusInfo(editingTable.status).label}
                </div>
              </div>
            </div>
            <div className="p-6 border-t flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowEditTableModal(false);
                  setEditingTable(null);
                  setTableForm({ number: '', capacity: '4' });
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateTable}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Update Table
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Menu Management Component
const MenuManagementComponent = ({ onBack }) => {
  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [modifierGroups, setModifierGroups] = useState([]);
  const [modifiers, setModifiers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('items');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showItemModal, setShowItemModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showModifierModal, setShowModifierModal] = useState(false);
  const [showModifierGroupModal, setShowModifierGroupModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [editingModifier, setEditingModifier] = useState(null);
  const [editingModifierGroup, setEditingModifierGroup] = useState(null);

  const [itemForm, setItemForm] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
    image_url: '',
    available: true,
    modifier_groups: []
  });

  const [categoryForm, setCategoryForm] = useState({
    name: ''
  });

  const [modifierForm, setModifierForm] = useState({
    name: '',
    price: '',
    group_id: ''
  });

  const [modifierGroupForm, setModifierGroupForm] = useState({
    name: '',
    required: false,
    max_selections: 1
  });

  useEffect(() => {
    fetchMenuData();
  }, []);

  const fetchMenuData = async () => {
    try {
      setLoading(true);
      const [itemsRes, categoriesRes, modifierGroupsRes, modifiersRes] = await Promise.all([
        axios.get(`${API}/menu/items/all`),
        axios.get(`${API}/menu/categories`),
        axios.get(`${API}/modifiers/groups`),
        axios.get(`${API}/modifiers`)
      ]);

      setMenuItems(itemsRes.data);
      setCategories(['all', ...categoriesRes.data.categories]);
      setModifierGroups(modifierGroupsRes.data);
      setModifiers(modifiersRes.data);
    } catch (error) {
      console.error('Error fetching menu data:', error);
      alert('Failed to load menu data');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveItem = async () => {
    if (!itemForm.name || !itemForm.price || !itemForm.category) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      const itemData = {
        ...itemForm,
        price: parseFloat(itemForm.price)
      };

      if (editingItem) {
        await axios.put(`${API}/menu/items/${editingItem.id}`, itemData);
        alert('Menu item updated successfully');
      } else {
        await axios.post(`${API}/menu/items`, itemData);
        alert('Menu item added successfully');
      }

      setShowItemModal(false);
      setEditingItem(null);
      setItemForm({
        name: '',
        description: '',
        price: '',
        category: '',
        image_url: '',
        available: true,
        modifier_groups: []
      });
      fetchMenuData();
    } catch (error) {
      console.error('Error saving item:', error);
      alert('Failed to save menu item');
    }
  };

  const handleEditItem = (item) => {
    setItemForm({
      name: item.name,
      description: item.description || '',
      price: item.price.toString(),
      category: item.category,
      image_url: item.image_url || '',
      available: item.available,
      modifier_groups: item.modifier_groups || []
    });
    setEditingItem(item);
    setShowItemModal(true);
  };

  const handleDeleteItem = async (item) => {
    if (window.confirm(`Are you sure you want to delete "${item.name}"?`)) {
      try {
        await axios.delete(`${API}/menu/items/${item.id}`);
        alert('Menu item deleted successfully');
        fetchMenuData();
      } catch (error) {
        console.error('Error deleting item:', error);
        alert('Failed to delete menu item');
      }
    }
  };

  const handleSaveModifierGroup = async () => {
    if (!modifierGroupForm.name) {
      alert('Please enter a group name');
      return;
    }

    try {
      const groupData = {
        ...modifierGroupForm,
        max_selections: parseInt(modifierGroupForm.max_selections)
      };

      await axios.post(`${API}/modifiers/groups`, groupData);
      alert('Modifier group added successfully');
      setShowModifierGroupModal(false);
      setModifierGroupForm({
        name: '',
        required: false,
        max_selections: 1
      });
      fetchMenuData();
    } catch (error) {
      console.error('Error saving modifier group:', error);
      alert('Failed to save modifier group');
    }
  };

  const handleDeleteModifierGroup = async (group) => {
    if (window.confirm(`Are you sure you want to delete "${group.name}" and all its modifiers?`)) {
      try {
        await axios.delete(`${API}/modifiers/groups/${group.id}`);
        alert('Modifier group deleted successfully');
        fetchMenuData();
      } catch (error) {
        console.error('Error deleting modifier group:', error);
        alert('Failed to delete modifier group');
      }
    }
  };

  const handleSaveModifier = async () => {
    if (!modifierForm.name || !modifierForm.price || !modifierForm.group_id) {
      alert('Please fill in all fields');
      return;
    }

    try {
      const modifierData = {
        ...modifierForm,
        price: parseFloat(modifierForm.price)
      };

      await axios.post(`${API}/modifiers`, modifierData);
      alert('Modifier added successfully');
      setShowModifierModal(false);
      setModifierForm({
        name: '',
        price: '',
        group_id: ''
      });
      fetchMenuData();
    } catch (error) {
      console.error('Error saving modifier:', error);
      alert('Failed to save modifier');
    }
  };

  const handleDeleteModifier = async (modifier) => {
    if (window.confirm(`Are you sure you want to delete "${modifier.name}"?`)) {
      try {
        await axios.delete(`${API}/modifiers/${modifier.id}`);
        alert('Modifier deleted successfully');
        fetchMenuData();
      } catch (error) {
        console.error('Error deleting modifier:', error);
        alert('Failed to delete modifier');
      }
    }
  };

  const filteredItems = menuItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading menu data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={onBack}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-800"
            >
              <span>←</span>
              <span>Back to Settings</span>
            </button>
            <h1 className="text-2xl font-bold text-gray-800">Menu Management</h1>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setShowItemModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
            >
              <span>+</span>
              <span>Add Item</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b">
        <div className="flex space-x-8 px-6">
          {[
            { id: 'items', name: 'Menu Items', icon: '🍽️' },
            { id: 'categories', name: 'Categories', icon: '📂' },
            { id: 'modifiers', name: 'Modifiers', icon: '🔧' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 py-4 px-2 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.name}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="p-6">
        {/* Menu Items Tab */}
        {activeTab === 'items' && (
          <div className="space-y-6">
            {/* Search and Filter */}
            <div className="bg-white p-4 rounded-lg border">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
                <div className="flex flex-col md:flex-row md:items-center space-y-2 md:space-y-0 md:space-x-4">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search menu items..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full md:w-64 px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    />
                    <span className="absolute right-3 top-2.5 text-gray-400">🔍</span>
                  </div>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  >
                    {categories.map(category => (
                      <option key={category} value={category}>
                        {category === 'all' ? 'All Categories' : category}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="text-sm text-gray-600">
                  {filteredItems.length} items found
                </div>
              </div>
            </div>

            {/* Menu Items Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredItems.map(item => (
                <div key={item.id} className="bg-white border rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold text-lg text-gray-800">{item.name}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        item.available 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {item.available ? 'Available' : 'Unavailable'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{item.description}</p>
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-lg font-bold text-green-600">${item.price.toFixed(2)}</span>
                      <span className="text-sm bg-gray-100 px-2 py-1 rounded">{item.category}</span>
                    </div>
                    {item.modifier_groups && item.modifier_groups.length > 0 && (
                      <div className="mb-3">
                        <span className="text-xs text-gray-500">Modifiers: {item.modifier_groups.length} groups</span>
                      </div>
                    )}
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEditItem(item)}
                        className="flex-1 bg-blue-50 text-blue-600 px-3 py-2 rounded text-sm font-medium hover:bg-blue-100"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteItem(item)}
                        className="flex-1 bg-red-50 text-red-600 px-3 py-2 rounded text-sm font-medium hover:bg-red-100"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {filteredItems.length === 0 && (
              <div className="text-center py-12">
                <span className="text-6xl mb-4 block">🍽️</span>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No menu items found</h3>
                <p className="text-gray-500 mb-4">Get started by adding your first menu item</p>
                <button
                  onClick={() => setShowItemModal(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                  Add Menu Item
                </button>
              </div>
            )}
          </div>
        )}

        {/* Categories Tab */}
        {activeTab === 'categories' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Menu Categories</h2>
              <button
                onClick={() => setShowCategoryModal(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
              >
                <span>+</span>
                <span>Add Category</span>
              </button>
            </div>

            <div className="bg-white border rounded-lg">
              <div className="divide-y">
                {categories.filter(cat => cat !== 'all').map((category, index) => {
                  const itemCount = menuItems.filter(item => item.category === category).length;
                  return (
                    <div key={category} className="p-4 flex justify-between items-center">
                      <div>
                        <h3 className="font-medium text-gray-900">{category}</h3>
                        <p className="text-sm text-gray-500">{itemCount} items</p>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => {
                            setCategoryForm({ name: category });
                            setShowCategoryModal(true);
                          }}
                          className="text-blue-600 hover:text-blue-800 px-3 py-1 text-sm"
                        >
                          Edit
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Modifiers Tab */}
        {activeTab === 'modifiers' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Modifier Groups & Options</h2>
              <div className="flex space-x-2">
                <button
                  onClick={() => setShowModifierGroupModal(true)}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center space-x-2"
                >
                  <span>+</span>
                  <span>Add Group</span>
                </button>
                <button
                  onClick={() => setShowModifierModal(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
                >
                  <span>+</span>
                  <span>Add Modifier</span>
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {modifierGroups.map(group => {
                const groupModifiers = modifiers.filter(mod => mod.group_id === group.id);
                return (
                  <div key={group.id} className="bg-white border rounded-lg">
                    <div className="p-4 bg-gray-50 border-b">
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="font-medium text-gray-900">{group.name}</h3>
                          <p className="text-sm text-gray-500">
                            {group.required ? 'Required' : 'Optional'} • 
                            Max {group.max_selections} selection{group.max_selections !== 1 ? 's' : ''} • 
                            {groupModifiers.length} modifier{groupModifiers.length !== 1 ? 's' : ''}
                          </p>
                        </div>
                        <button
                          onClick={() => handleDeleteModifierGroup(group)}
                          className="text-red-600 hover:text-red-800 px-3 py-1 text-sm"
                        >
                          Delete Group
                        </button>
                      </div>
                    </div>
                    <div className="divide-y">
                      {groupModifiers.map(modifier => (
                        <div key={modifier.id} className="p-4 flex justify-between items-center">
                          <div>
                            <span className="font-medium">{modifier.name}</span>
                            <span className="ml-2 text-green-600 font-medium">+${modifier.price.toFixed(2)}</span>
                          </div>
                          <button
                            onClick={() => handleDeleteModifier(modifier)}
                            className="text-red-600 hover:text-red-800 px-3 py-1 text-sm"
                          >
                            Delete
                          </button>
                        </div>
                      ))}
                      {groupModifiers.length === 0 && (
                        <div className="p-4 text-center text-gray-500">
                          No modifiers in this group
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {modifierGroups.length === 0 && (
              <div className="text-center py-12">
                <span className="text-6xl mb-4 block">🔧</span>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No modifier groups found</h3>
                <p className="text-gray-500 mb-4">Create modifier groups to add options to your menu items</p>
                <button
                  onClick={() => setShowModifierGroupModal(true)}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                >
                  Add Modifier Group
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add/Edit Item Modal */}
      {showItemModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-screen overflow-y-auto">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold">
                {editingItem ? 'Edit Menu Item' : 'Add Menu Item'}
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input
                  type="text"
                  value={itemForm.name}
                  onChange={(e) => setItemForm({...itemForm, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter item name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={itemForm.description}
                  onChange={(e) => setItemForm({...itemForm, description: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  rows="3"
                  placeholder="Enter description"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Price *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={itemForm.price}
                    onChange={(e) => setItemForm({...itemForm, price: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                  <input
                    type="text"
                    value={itemForm.category}
                    onChange={(e) => setItemForm({...itemForm, category: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter category"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Image URL</label>
                <input
                  type="url"
                  value={itemForm.image_url}
                  onChange={(e) => setItemForm({...itemForm, image_url: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="https://example.com/image.jpg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Modifier Groups</label>
                <div className="space-y-2">
                  {modifierGroups.map(group => (
                    <label key={group.id} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={itemForm.modifier_groups.includes(group.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setItemForm({
                              ...itemForm,
                              modifier_groups: [...itemForm.modifier_groups, group.id]
                            });
                          } else {
                            setItemForm({
                              ...itemForm,
                              modifier_groups: itemForm.modifier_groups.filter(id => id !== group.id)
                            });
                          }
                        }}
                        className="mr-2"
                      />
                      <span>{group.name}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={itemForm.available}
                    onChange={(e) => setItemForm({...itemForm, available: e.target.checked})}
                    className="mr-2"
                  />
                  <span className="text-sm font-medium text-gray-700">Available for ordering</span>
                </label>
              </div>
            </div>
            <div className="p-6 border-t flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowItemModal(false);
                  setEditingItem(null);
                  setItemForm({
                    name: '',
                    description: '',
                    price: '',
                    category: '',
                    image_url: '',
                    available: true,
                    modifier_groups: []
                  });
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveItem}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                {editingItem ? 'Update' : 'Add'} Item
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold">Add Category</h2>
            </div>
            <div className="p-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">Category Name</label>
              <input
                type="text"
                value={categoryForm.name}
                onChange={(e) => setCategoryForm({...categoryForm, name: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter category name"
              />
            </div>
            <div className="p-6 border-t flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowCategoryModal(false);
                  setCategoryForm({ name: '' });
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  // Just close modal for now - categories are auto-created when items are added
                  setShowCategoryModal(false);
                  setCategoryForm({ name: '' });
                  alert('Categories are automatically created when you add menu items with that category');
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Modifier Group Modal */}
      {showModifierGroupModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold">Add Modifier Group</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Group Name</label>
                <input
                  type="text"
                  value={modifierGroupForm.name}
                  onChange={(e) => setModifierGroupForm({...modifierGroupForm, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., Size, Toppings"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Maximum Selections</label>
                <input
                  type="number"
                  min="1"
                  value={modifierGroupForm.max_selections}
                  onChange={(e) => setModifierGroupForm({...modifierGroupForm, max_selections: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={modifierGroupForm.required}
                    onChange={(e) => setModifierGroupForm({...modifierGroupForm, required: e.target.checked})}
                    className="mr-2"
                  />
                  <span className="text-sm font-medium text-gray-700">Required selection</span>
                </label>
              </div>
            </div>
            <div className="p-6 border-t flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowModifierGroupModal(false);
                  setModifierGroupForm({
                    name: '',
                    required: false,
                    max_selections: 1
                  });
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveModifierGroup}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                Add Group
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Modifier Modal */}
      {showModifierModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold">Add Modifier</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Modifier Name</label>
                <input
                  type="text"
                  value={modifierForm.name}
                  onChange={(e) => setModifierForm({...modifierForm, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., Extra Cheese, Large"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Additional Price</label>
                <input
                  type="number"
                  step="0.01"
                  value={modifierForm.price}
                  onChange={(e) => setModifierForm({...modifierForm, price: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Modifier Group</label>
                <select
                  value={modifierForm.group_id}
                  onChange={(e) => setModifierForm({...modifierForm, group_id: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select a group</option>
                  {modifierGroups.map(group => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="p-6 border-t flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowModifierModal(false);
                  setModifierForm({
                    name: '',
                    price: '',
                    group_id: ''
                  });
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveModifier}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Add Modifier
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Main POS Interface
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
      setSelectedTable(null);
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
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white shadow-sm border-b p-4">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setCurrentView('settings')}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-800"
            >
              <span>←</span>
              <span>Back to Settings</span>
            </button>
            <h1 className="text-2xl font-bold text-gray-800">Staff Management</h1>
          </div>
        </div>
        <div className="p-6">
          <div className="bg-white p-8 rounded-lg shadow-sm border text-center">
            <span className="text-6xl mb-4 block">👥</span>
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Staff Management</h2>
            <p className="text-gray-600 mb-6">Employee management and administration interface will be implemented here.</p>
            <div className="space-y-2 text-left max-w-md mx-auto">
              <p className="text-sm text-gray-500">• Add/edit/remove employees</p>
              <p className="text-sm text-gray-500">• Manage roles and permissions</p>
              <p className="text-sm text-gray-500">• Set hourly rates and schedules</p>
              <p className="text-sm text-gray-500">• Track time and attendance</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (currentView === 'tax-settings') {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white shadow-sm border-b p-4">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setCurrentView('settings')}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-800"
            >
              <span>←</span>
              <span>Back to Settings</span>
            </button>
            <h1 className="text-2xl font-bold text-gray-800">Tax & Charges Settings</h1>
          </div>
        </div>
        <div className="p-6">
          <div className="bg-white p-8 rounded-lg shadow-sm border text-center">
            <span className="text-6xl mb-4 block">💰</span>
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Tax & Charges</h2>
            <p className="text-gray-600 mb-6">Tax rates and service charges configuration interface will be implemented here.</p>
            <div className="space-y-2 text-left max-w-md mx-auto">
              <p className="text-sm text-gray-500">• Configure tax rates and types</p>
              <p className="text-sm text-gray-500">• Set service charges and fees</p>
              <p className="text-sm text-gray-500">• Manage automatic gratuity rules</p>
              <p className="text-sm text-gray-500">• Configure discount policies</p>
            </div>
          </div>
        </div>
      </div>
    );
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

// App Component
function App() {
  return (
    <AuthProvider>
      <PrinterProvider>
        <AppContent />
      </PrinterProvider>
    </AuthProvider>
  );
}

const AppContent = () => {
  const { isAuthenticated } = useAuth();

  return (
    <div className="App">
      {isAuthenticated ? <POSInterface /> : <PinLogin />}
    </div>
  );
};

export default App;