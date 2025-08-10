import React, { useState, useEffect, useContext, createContext, useRef } from 'react';
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
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
const formatPhoneNumber = (phone) => {
  if (!phone) return 'Not provided';
  
  // Remove all non-digit characters
  const digitsOnly = phone.replace(/\D/g, '');
  
  // Format as (555)555-5555 if we have 10 digits
  if (digitsOnly.length === 10) {
    return `(${digitsOnly.slice(0, 3)})${digitsOnly.slice(3, 6)}-${digitsOnly.slice(6)}`;
  }
  
  // Return original if not 10 digits
  return phone;
};

const CustomerDetailModal = ({ customer, stats, orders, onClose, onEdit }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-6 max-w-4xl w-full max-h-96 overflow-y-auto">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="text-xl font-bold text-gray-800">{customer.name}</h3>
            <p className="text-gray-600">{formatPhoneNumber(customer.phone)}</p>
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
              <p><span className="font-medium">Apartment:</span> {customer.apartment || 'Not provided'}</p>
              <p><span className="font-medium">City:</span> {customer.city || 'Not provided'}</p>
              <p><span className="font-medium">State:</span> {customer.state || 'Not provided'}</p>
              <p><span className="font-medium">ZIP Code:</span> {customer.zip_code || 'Not provided'}</p>
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
    city: customer.city || '',
    state: customer.state || '',
    zip_code: customer.zip_code || '',
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
        city: customer.city || prev.city,
        state: customer.state || prev.state,
        zip_code: customer.zip_code || prev.zip_code,
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
          city: matchingCustomer.city || prev.city,
          state: matchingCustomer.state || prev.state,
          zip_code: matchingCustomer.zip_code || prev.zip_code,
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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => handleChange('city', e.target.value)}
                placeholder="City"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
              <input
                type="text"
                value={formData.state}
                onChange={(e) => handleChange('state', e.target.value)}
                placeholder="State"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ZIP Code</label>
              <input
                type="text"
                value={formData.zip_code}
                onChange={(e) => handleChange('zip_code', e.target.value)}
                placeholder="ZIP Code"
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
                              <div className="text-gray-500">{getOrderTableDisplayName(order)}</div>
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
        await axios.post(`${API}/orders/${orderId}/cancel`, {
          reason: 'other',
          notes: 'Order cancelled by user'
        });
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
                  {order.order_type === 'dine_in' && ` - ${getOrderTableDisplayName(order)}`}
                  {order.order_type === 'delivery' && order.customer_address && ` - ${order.customer_address.substring(0, 30)}...`}
                </p>
                {order.customer_name && (
                  <p className="text-sm text-gray-600">{order.customer_name}</p>
                )}
              </div>

              <div className="mb-3">
                {/* Order Items */}
                <div className="text-sm mb-2">
                  {order.items.slice(0, 2).map((item, index) => (
                    <div key={index} className="flex justify-between">
                      <span>{item.quantity}x {item.menu_item_name}</span>
                    </div>
                  ))}
                  {order.items.length > 2 && (
                    <p className="text-gray-500">+{order.items.length - 2} more items</p>
                  )}
                </div>
                
                {/* Tax and Charges Breakdown */}
                <div className="text-xs text-gray-600 space-y-1">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>${order.subtotal.toFixed(2)}</span>
                  </div>
                  {order.tax > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Tax:</span>
                      <span>${order.tax.toFixed(2)}</span>
                    </div>
                  )}
                  {order.service_charges > 0 && (
                    <div className="flex justify-between text-blue-600">
                      <span>Service Charges:</span>
                      <span>${order.service_charges.toFixed(2)}</span>
                    </div>
                  )}
                  {order.tip > 0 && (
                    <div className="flex justify-between text-purple-600">
                      <span>Tip:</span>
                      <span>${order.tip.toFixed(2)}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-between items-center">
                <span className="font-bold text-lg border-t pt-2">Total: ${order.total.toFixed(2)}</span>
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
  const [showDetailedMergeModal, setShowDetailedMergeModal] = useState(false);
  const [mergeSourceTable, setMergeSourceTable] = useState(null);
  const [mergeDestTable, setMergeDestTable] = useState(null);
  const [mergeSourceOrder, setMergeSourceOrder] = useState(null);
  const [mergeDestOrder, setMergeDestOrder] = useState(null);
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

  const handleDestTableSelect = async (table) => {
    setSelectedDestTable(table);
    
    if (table.status === 'occupied') {
      // Fetch orders for both tables to show detailed merge modal
      try {
        const sourceOrder = await axios.get(`${API}/orders/${selectedSourceTable.current_order_id}`);
        const destOrder = await axios.get(`${API}/orders/${table.current_order_id}`);
        
        setMergeSourceTable(selectedSourceTable);
        setMergeDestTable(table);
        setMergeSourceOrder(sourceOrder.data);
        setMergeDestOrder(destOrder.data);
        setShowDetailedMergeModal(true);
      } catch (error) {
        console.error('Error fetching orders for merge:', error);
        // Fallback to simple confirmation
        setShowMergeConfirm(true);
      }
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
              <div className="text-2xl font-bold mb-1">{getTableDisplayName(table)}</div>
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
                      {getTableDisplayName(table)}
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
                  Move {getTableDisplayName(selectedSourceTable)} to:
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
                        {getTableDisplayName(table)}
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
                        {getTableDisplayName(table)}
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
              {getTableDisplayName(selectedDestTable)} is already occupied with an order. 
              Do you want to <strong>merge</strong> the orders from {getTableDisplayName(selectedSourceTable)} 
              into {getTableDisplayName(selectedDestTable)}?
            </p>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-yellow-800">
                <strong>Note:</strong> This will combine all items from both tables into one order 
                on {getTableDisplayName(selectedDestTable)}. {getTableDisplayName(selectedSourceTable)} will become available.
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
      
      {/* Detailed Table Merge Modal */}
      {showDetailedMergeModal && mergeSourceTable && mergeDestTable && mergeSourceOrder && mergeDestOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">⚠️ Merge Table Orders</h2>
              <button
                onClick={() => setShowDetailedMergeModal(false)}
                className="text-gray-500 hover:text-gray-700 text-xl"
              >
                ×
              </button>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <div className="flex items-center space-x-2">
                <span className="text-yellow-600 text-lg">⚠️</span>
                <p className="text-yellow-800 font-medium">
                  Moving {getTableDisplayName(mergeSourceTable)} order to {getTableDisplayName(mergeDestTable)} (occupied). 
                  Orders will be merged together.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* Source Order */}
              <div className="bg-orange-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-orange-800 mb-3">{getTableDisplayName(mergeSourceTable)} Order</h3>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {mergeSourceOrder.items?.length > 0 ? (
                    mergeSourceOrder.items.map((item, index) => (
                      <div key={index} className="flex justify-between items-center py-2 border-b border-orange-200">
                        <div>
                          <span className="font-medium">{item.menu_item_name}</span>
                          <span className="text-sm text-orange-600 ml-2">x{item.quantity}</span>
                        </div>
                        <span className="font-medium">${(item.price * item.quantity).toFixed(2)}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-orange-600 italic">No items found</p>
                  )}
                </div>
                <div className="border-t border-orange-200 pt-2 mt-2">
                  <div className="flex justify-between font-bold text-orange-800">
                    <span>Order Subtotal:</span>
                    <span>${mergeSourceOrder.subtotal?.toFixed(2) || '0.00'}</span>
                  </div>
                </div>
              </div>

              {/* Destination Order */}
              <div className="bg-blue-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-blue-800 mb-3">{getTableDisplayName(mergeDestTable)} Order</h3>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {mergeDestOrder.items?.length > 0 ? (
                    mergeDestOrder.items.map((item, index) => (
                      <div key={index} className="flex justify-between items-center py-2 border-b border-blue-200">
                        <div>
                          <span className="font-medium">{item.menu_item_name}</span>
                          <span className="text-sm text-blue-600 ml-2">x{item.quantity}</span>
                        </div>
                        <span className="font-medium">${(item.price * item.quantity).toFixed(2)}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-blue-600 italic">No items found</p>
                  )}
                </div>
                <div className="border-t border-blue-200 pt-2 mt-2">
                  <div className="flex justify-between font-bold text-blue-800">
                    <span>Order Subtotal:</span>
                    <span>${mergeDestOrder.subtotal?.toFixed(2) || '0.00'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Merged Total Preview */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <h3 className="text-lg font-semibold text-green-800 mb-3">📊 Merged Order Total</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Combined Subtotal:</span>
                  <span>${((mergeSourceOrder.subtotal || 0) + (mergeDestOrder.subtotal || 0)).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Estimated Tax (8%):</span>
                  <span>${(((mergeSourceOrder.subtotal || 0) + (mergeDestOrder.subtotal || 0)) * 0.08).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold text-green-800 border-t border-green-300 pt-2">
                  <span>Final Total:</span>
                  <span>${(((mergeSourceOrder.subtotal || 0) + (mergeDestOrder.subtotal || 0)) * 1.08).toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-4">
              <button
                onClick={() => setShowDetailedMergeModal(false)}
                className="flex-1 bg-gray-300 text-gray-700 py-3 px-6 rounded-lg font-medium hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  mergeTableOrders(mergeSourceTable.id, mergeDestTable.id);
                  setShowDetailedMergeModal(false);
                }}
                className="flex-1 bg-orange-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-orange-700 transition-colors"
              >
                Confirm Merge Tables
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
                    <div className="text-xl font-bold">{getTableDisplayName(table)}</div>
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
                  return table ? getTableDisplayName(table) : '';
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
                          notes: `${getTableDisplayName(table)} cancelled via table management`
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
    apartment: '',
    city: '',
    state: '',
    zip_code: ''
  });
  
  // Add party size for gratuity calculations
  const [partySize, setPartySize] = useState(1);
  
  // Tax & Charges state - needed for calculateTotal function
  const [taxRates, setTaxRates] = useState([]);
  const [serviceCharges, setServiceCharges] = useState([]);
  const [gratuityRules, setGratuityRules] = useState([]);
  const [discountPolicies, setDiscountPolicies] = useState([]);

  const updateOrderTableAssignment = async (orderId, tableId) => {
    try {
      await axios.put(`${API}/orders/${orderId}/table`, { table_id: tableId });
      alert('Table assigned successfully!');
    } catch (error) {
      console.error('Error assigning table to order:', error);
      alert('Failed to assign table to order');
    }
  };

  const cancelEmptyOrder = async () => {
    try {
      // Cancel the empty order using correct POST endpoint
      await axios.post(`${API}/orders/${emptyOrderData.id}/cancel`, {
        reason: 'empty_order',
        notes: 'Order cancelled because all items were removed'
      });
      
      alert('Order cancelled successfully');
      setShowEmptyOrderModal(false);
      setEmptyOrderData(null);
      
      // Navigate back to main screen or active orders
      if (onBack) {
        onBack();
      }
      
      // If editing from table management, also refresh tables
      if (editingOrder && fromTableManagement) {
        // Force refresh of table management when we go back
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      }
    } catch (error) {
      console.error('Error cancelling empty order:', error);
      alert(`Failed to cancel order: ${error.response?.data?.detail || error.message}`);
    }
  };

  const resetCustomerInfo = () => {
    setCustomerInfo({ name: '', phone: '', address: '', apartment: '' });
    setShowCustomerInfo(false);
  };

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
  const [showCustomerSelectionModal, setShowCustomerSelectionModal] = useState(false);
  const [existingCustomers, setExistingCustomers] = useState([]);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [showTableModal, setShowTableModal] = useState(false);
  const [assignedTable, setAssignedTable] = useState(selectedTable || null);
  const [tables, setTables] = useState([]);
  const [showTableMergeModal, setShowTableMergeModal] = useState(false);
  const [occupiedTableToMerge, setOccupiedTableToMerge] = useState(null);
  const [existingTableOrder, setExistingTableOrder] = useState(null);
  const [showEmptyOrderModal, setShowEmptyOrderModal] = useState(false);
  const [emptyOrderData, setEmptyOrderData] = useState(null);

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
    fetchTaxChargesData(); // Load tax and charges data for dynamic calculation
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
        address: order.customer_address,
        apartment: order.customer_apartment || '',
        city: order.customer_city || '',
        state: order.customer_state || '',
        zip_code: order.customer_zip_code || ''
      });
      setOrderType(order.order_type);
      
      // If order has a table assigned, set the assigned table state
      if (order.table_id) {
        const tableResponse = await axios.get(`${API}/tables`);
        const tables = tableResponse.data;
        const assignedTableData = tables.find(table => table.id === order.table_id);
        if (assignedTableData) {
          setAssignedTable(assignedTableData);
        }
      }
    } catch (error) {
      console.error('Error loading existing order:', error);
    }
  };

  const loadActiveOrder = async () => {
    const order = editingActiveOrder;
    
    setCurrentOrder(order);
    setCart(order.items);
    
    // Try to get complete customer information if order fields are incomplete
    let customerInfoData = {
      name: order.customer_name,
      phone: order.customer_phone,
      address: order.customer_address,
      apartment: order.customer_apartment || '',
      city: order.customer_city || '',
      state: order.customer_state || '',
      zip_code: order.customer_zip_code || ''
    };
    
    // If customer ID exists but some fields are missing, try to fetch complete customer data
    if (order.customer_id && (!order.customer_apartment && !order.customer_city && !order.customer_state && !order.customer_zip_code)) {
      try {
        const customerResponse = await axios.get(`${API}/customers/${order.customer_id}`);
        const customerData = customerResponse.data;
        
        // Update customer info with complete data from customer record
        customerInfoData = {
          name: customerData.name || order.customer_name,
          phone: customerData.phone || order.customer_phone,
          address: customerData.address || order.customer_address,
          apartment: customerData.apartment || order.customer_apartment || '',
          city: customerData.city || order.customer_city || '',
          state: customerData.state || order.customer_state || '',
          zip_code: customerData.zip_code || order.customer_zip_code || ''
        };
      } catch (error) {
        // Continue with order data if customer lookup fails (customer may not exist)
        console.log('Customer record not found, using order data');
      }
    }
    
    setCustomerInfo(customerInfoData);
    setOrderType(order.order_type);
    
    // Show customer info section if this is a delivery/takeout order with customer data
    if ((order.order_type === 'delivery' || order.order_type === 'takeout' || order.order_type === 'phone_order') && 
        (order.customer_name || order.customer_phone || order.customer_address)) {
      setShowCustomerInfo(true);
    }
    
    // If order has a table assigned (check both table_id and table_number)
    if (order.table_id || order.table_number) {
      try {
        const tableResponse = await axios.get(`${API}/tables`);
        const tables = tableResponse.data;
        
        // Try to find table by table_id first, then by table_number
        let assignedTableData = null;
        if (order.table_id) {
          assignedTableData = tables.find(table => table.id === order.table_id);
        }
        
        if (!assignedTableData && order.table_number) {
          assignedTableData = tables.find(table => table.number === order.table_number);
        }
        
        if (assignedTableData) {
          setAssignedTable(assignedTableData);
        }
      } catch (error) {
        console.error('Error loading assigned table:', error);
      }
    } else {
      // Clear assigned table if order has no table
      setAssignedTable(null);
    }
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

  const fetchExistingCustomers = async () => {
    try {
      const response = await axios.get(`${API}/customers`);
      setExistingCustomers(response.data);
    } catch (error) {
      console.error('Error fetching customers:', error);
      setExistingCustomers([]);
    }
  };

  const handleSelectExistingCustomer = (customer) => {
    setCustomerInfo({
      name: customer.name,
      phone: customer.phone,
      address: customer.address,
      apartment: customer.apartment || '',
      city: customer.city || '',
      state: customer.state || '',
      zip_code: customer.zip_code || ''
    });
    setShowCustomerInfo(true);
    setShowCustomerSelectionModal(false);
    setCustomerSearchQuery('');
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

  const fetchTaxChargesData = async () => {
    try {
      // Fetch all tax and charges data from backend APIs
      const [taxRatesRes, serviceChargesRes, gratuityRulesRes, discountPoliciesRes] = await Promise.all([
        axios.get(`${API}/tax-charges/tax-rates`),
        axios.get(`${API}/tax-charges/service-charges`),
        axios.get(`${API}/tax-charges/gratuity-rules`),
        axios.get(`${API}/tax-charges/discount-policies`)
      ]);
      
      setTaxRates(taxRatesRes.data.length > 0 ? taxRatesRes.data : getDefaultTaxRates());
      setServiceCharges(serviceChargesRes.data.length > 0 ? serviceChargesRes.data : getDefaultServiceCharges());
      setGratuityRules(gratuityRulesRes.data.length > 0 ? gratuityRulesRes.data : getDefaultGratuityRules());
      setDiscountPolicies(discountPoliciesRes.data.length > 0 ? discountPoliciesRes.data : getDefaultDiscountPolicies());
      
    } catch (error) {
      console.error('Error fetching tax/charges data:', error);
      // Fallback to default data if API fails
      setTaxRates(getDefaultTaxRates());
      setServiceCharges(getDefaultServiceCharges());
      setGratuityRules(getDefaultGratuityRules());
      setDiscountPolicies(getDefaultDiscountPolicies());
      console.log('Using default tax and charges settings');
    }
  };

  const getDefaultTaxRates = () => [
    {
      id: crypto.randomUUID(),
      name: 'NYC Sales Tax',
      type: 'percentage',
      rate: 8.25,
      description: 'New York City Sales Tax',
      category: 'sales',
      applies_to: 'subtotal',
      jurisdiction: 'city',
      tax_id: 'NYC-ST-001',
      active: true,
      inclusive: false
    },
    {
      id: crypto.randomUUID(),
      name: 'State Tax',
      type: 'percentage',
      rate: 4.0,
      description: 'New York State Tax',
      category: 'sales',
      applies_to: 'subtotal',
      jurisdiction: 'state',
      tax_id: 'NYS-ST-001',
      active: true,
      inclusive: false
    }
  ];

  const getDefaultServiceCharges = () => [
    {
      id: crypto.randomUUID(),
      name: 'Large Party Service Charge',
      type: 'percentage',
      amount: 18,
      description: 'Automatic service charge for parties of 6 or more',
      applies_to: 'subtotal',
      conditions: ['party_size'],
      party_size_threshold: '6',
      order_types: ['dine_in'],
      active: true,
      mandatory: true
    },
    {
      id: crypto.randomUUID(),
      name: 'Delivery Fee',
      type: 'fixed',
      amount: 3.50,
      description: 'Standard delivery fee',
      applies_to: 'subtotal',
      conditions: ['order_type'],
      order_types: ['delivery'],
      active: true,
      mandatory: true
    }
  ];

  const getDefaultGratuityRules = () => [
    {
      id: crypto.randomUUID(),
      name: 'Automatic Gratuity - Large Parties',
      type: 'percentage',
      amount: 20,
      description: 'Automatic 20% gratuity for parties of 8+',
      trigger_condition: 'party_size',
      party_size_min: '8',
      applies_to_order_types: ['dine_in'],
      auto_apply: true,
      customer_can_modify: true,
      active: true
    },
    {
      id: crypto.randomUUID(),
      name: 'High-Value Order Gratuity',
      type: 'percentage',
      amount: 15,
      description: 'Suggested 15% gratuity for orders over $200',
      trigger_condition: 'order_amount',
      order_amount_min: '200',
      applies_to_order_types: ['dine_in', 'delivery'],
      auto_apply: false,
      customer_can_modify: true,
      active: true
    }
  ];

  const getDefaultDiscountPolicies = () => [
    {
      id: crypto.randomUUID(),
      name: 'Employee Discount',
      type: 'percentage',
      amount: 25,
      description: '25% discount for staff members',
      category: 'employee',
      conditions: ['requires_code'],
      discount_code: 'STAFF25',
      stackable: false,
      active: true,
      max_uses_per_day: '50'
    },
    {
      id: crypto.randomUUID(),
      name: 'Senior Citizen Discount',
      type: 'percentage',
      amount: 10,
      description: '10% discount for seniors (65+)',
      category: 'senior',
      conditions: ['time_based'],
      valid_days: ['monday', 'tuesday', 'wednesday', 'thursday'],
      valid_hours_start: '14:00',
      valid_hours_end: '17:00',
      stackable: true,
      active: true
    }
  ];

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
        
        // Reload the order properly based on source
        if (editingActiveOrder) {
          // Refresh from server for active order
          const response = await axios.get(`${API}/orders/${currentOrder.id}`);
          const updatedOrder = response.data;
          setCurrentOrder(updatedOrder);
          setCart(updatedOrder.items);
          
          // Check if order is now empty and show warning modal
          if (updatedOrder.items.length === 0) {
            setEmptyOrderData(updatedOrder);
            setShowEmptyOrderModal(true);
          }
        } else if (editingOrder) {
          // Reload existing table order and check if empty
          const response = await axios.get(`${API}/orders/${editingOrder.current_order_id}`);
          const updatedOrder = response.data;
          setCurrentOrder(updatedOrder);
          setCart(updatedOrder.items);
          
          // Check if order is now empty and show warning modal
          if (updatedOrder.items.length === 0) {
            setEmptyOrderData(updatedOrder);
            setShowEmptyOrderModal(true);
          }
        }
      } catch (error) {
        console.error('Error removing item from order:', error);
        alert('Failed to remove item from order');
      }
    } else {
      // Remove from cart
      const newCart = cart.filter((_, i) => i !== removalItemIndex);
      setCart(newCart);
    }
  };

  const calculateTotal = () => {
    const subtotal = cart.reduce((sum, item) => sum + item.total_price, 0);
    
    // Filter taxes and service charges based on order type
    // Include items that either:
    // 1. Have empty applies_to_order_types/order_types array (apply to all order types)
    // 2. Have the current order_type in their applies_to_order_types/order_types array
    const activeTaxRates = taxRates.filter(tax => {
      if (!tax.active) return false;
      
      // If applies_to_order_types is empty or doesn't exist, apply to all order types
      if (!tax.applies_to_order_types || tax.applies_to_order_types.length === 0) {
        return true;
      }
      
      // Otherwise, check if current order type is included
      return tax.applies_to_order_types.includes(orderType);
    });
    
    const activeServiceCharges = serviceCharges.filter(charge => {
      if (!charge.active) return false;
      
      // If applies_to_order_types is empty or doesn't exist, apply to all order types
      if (!charge.applies_to_order_types || charge.applies_to_order_types.length === 0) {
        return true;
      }
      
      // Otherwise, check if current order type is included
      return charge.applies_to_order_types.includes(orderType);
    });
    
    const activeGratuityRules = gratuityRules.filter(gratuity => {
      if (!gratuity.active) return false;
      
      // If applies_to_order_types is empty or doesn't exist, apply to all order types
      if (!gratuity.applies_to_order_types || gratuity.applies_to_order_types.length === 0) {
        return true;
      }
      
      // Otherwise, check if current order type is included
      return gratuity.applies_to_order_types.includes(orderType);
    });
    
    const activeDiscountPolicies = discountPolicies.filter(discount => discount.active);
    
    // Calculate taxes
    let totalTaxes = 0;
    const taxBreakdown = [];
    for (const tax of activeTaxRates) {
      let taxAmount = 0;
      if (tax.type === 'percentage') {
        taxAmount = subtotal * (tax.rate / 100);
      } else if (tax.type === 'fixed') {
        taxAmount = tax.rate;
      }
      taxBreakdown.push({
        name: tax.name,
        type: 'tax',
        amount: taxAmount,
        rate: tax.rate,
        taxType: tax.type
      });
      totalTaxes += taxAmount;
    }

    // Calculate service charges
    let totalServiceCharges = 0;
    const serviceChargeBreakdown = [];
    for (const charge of activeServiceCharges) {
      let chargeAmount = 0;
      if (charge.type === 'percentage') {
        chargeAmount = subtotal * (charge.amount / 100);
      } else if (charge.type === 'fixed') {
        chargeAmount = charge.amount;
      }
      serviceChargeBreakdown.push({
        name: charge.name,
        type: 'service_charge',
        amount: chargeAmount,
        rate: charge.amount,
        chargeType: charge.type
      });
      totalServiceCharges += chargeAmount;
    }

    // Calculate gratuity based on rules
    let totalGratuity = 0;
    const gratuityBreakdown = [];
    for (const gratuity of activeGratuityRules) {
      // Check minimum order amount
      if (gratuity.minimum_order_amount > 0 && subtotal < gratuity.minimum_order_amount) {
        continue;
      }
      
      // Check maximum order amount
      if (gratuity.maximum_order_amount > 0 && subtotal > gratuity.maximum_order_amount) {
        continue;
      }
      
      // Check party size
      if (gratuity.party_size_minimum > 0 && partySize < gratuity.party_size_minimum) {
        continue;
      }
      
      // Calculate gratuity amount
      let gratuityAmount = 0;
      if (gratuity.type === 'percentage') {
        gratuityAmount = subtotal * (gratuity.amount / 100);
      } else if (gratuity.type === 'fixed') {
        gratuityAmount = gratuity.amount;
      }
      
      gratuityBreakdown.push({
        name: gratuity.name,
        type: 'gratuity',
        amount: gratuityAmount,
        rate: gratuity.amount,
        gratuityType: gratuity.type,
        conditions: {
          minimum_order: gratuity.minimum_order_amount,
          maximum_order: gratuity.maximum_order_amount,
          party_size_min: gratuity.party_size_minimum
        }
      });
      totalGratuity += gratuityAmount;
    }

    // Calculate discounts (for now, just add to breakdown but don't auto-apply)
    const discountBreakdown = [];
    // Note: Discount policies could be applied based on conditions, codes, etc.
    // For now, we'll just prepare the breakdown structure

    return {
      subtotal,
      taxes: totalTaxes,
      serviceCharges: totalServiceCharges,
      gratuity: totalGratuity,
      discounts: 0, // Manual discounts can still be added separately
      total: subtotal + totalTaxes + totalServiceCharges + totalGratuity,
      breakdown: {
        taxes: taxBreakdown,
        serviceCharges: serviceChargeBreakdown,
        gratuity: gratuityBreakdown,
        discounts: discountBreakdown
      }
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
        party_size: partySize,
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
        party_size: partySize,
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
      const totals = calculateTotal();
      const orderData = currentOrder || {
        ...totals,
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


  const [orderTotals, setOrderTotals] = useState({
    subtotal: 0,
    taxes: 0,
    serviceCharges: 0,
    gratuity: 0,
    discounts: 0,
    total: 0,
    breakdown: {
      taxes: [],
      serviceCharges: [],
      gratuity: [],
      discounts: []
    }
  });

  // Update totals when cart changes
  useEffect(() => {
    if (cart.length > 0) {
      console.log('🔍 DEBUG: Updating totals for cart:', cart);
      
      // Always calculate detailed breakdown dynamically to show specific tax names
      const totals = calculateTotal();
      console.log('🔍 DEBUG: Calculated totals with detailed breakdown:', totals);
      setOrderTotals(totals);
    } else {
      setOrderTotals({
        subtotal: 0,
        taxes: 0,
        serviceCharges: 0,
        gratuity: 0,
        discounts: 0,
        total: 0,
        breakdown: {
          taxes: [],
          serviceCharges: [],
          gratuity: [],
          discounts: []
        }
      });
    }
  }, [cart, currentOrder, editingActiveOrder, editingOrder, taxRates, serviceCharges, gratuityRules, discountPolicies, orderType]);

  const filteredItems = selectedCategory === 'all' 
    ? menuItems 
    : menuItems.filter(item => item.category === selectedCategory);

  const { subtotal, taxes, serviceCharges: serviceChargesTotal, gratuity, discounts, total, breakdown } = orderTotals;

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
            {editingOrder ? `Edit ${getTableDisplayName(editingOrder)} Order` : 
             editingActiveOrder ? `Edit Order ${editingActiveOrder.order_number}` :
             selectedTable ? `New Order - ${getTableDisplayName(selectedTable)}` : 'New Order'}
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

          {/* Table Selection for Dine In - Don't show when from table management */}
          {orderType === 'dine_in' && !fromTableManagement && (
            <div className="mb-6 bg-white rounded-xl p-4">
              <h3 className="font-bold text-lg mb-4">Selected Table</h3>
              
              {/* DEBUG INFO */}
              {process.env.NODE_ENV === 'development' && (
                <div className="mb-4 p-2 bg-gray-100 text-xs">
                  <div>DEBUG: assignedTable = {assignedTable ? JSON.stringify(assignedTable) : 'null'}</div>
                  <div>DEBUG: editingActiveOrder = {editingActiveOrder ? 'true' : 'false'}</div>
                  <div>DEBUG: currentOrder.table_id = {currentOrder?.table_id || 'undefined'}</div>
                  <div>DEBUG: currentOrder.table_number = {currentOrder?.table_number || 'undefined'}</div>
                </div>
              )}
              
              {assignedTable ? (
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div>
                    <span className="font-medium">{getTableDisplayName(assignedTable)}</span>
                    <span className="text-sm text-gray-600 ml-2">({assignedTable.status})</span>
                  </div>
                  {!fromTableManagement && !editingActiveOrder && (
                    <button
                      onClick={() => setShowTableModal(true)}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium"
                    >
                      Change Table
                    </button>
                  )}
                  {editingActiveOrder && (
                    <span className="text-sm text-green-600 font-medium">
                      (Assigned Table)
                    </span>
                  )}
                </div>
              ) : editingActiveOrder && currentOrder && currentOrder.table_id ? (
                // Active order already has table assigned
                <div className="text-center bg-green-50 border border-green-200 rounded-lg p-3">
                  <span className="text-green-700 font-medium">
                    Table {currentOrder.table_number} (Already Assigned)
                  </span>
                </div>
              ) : !fromTableManagement ? (
                <div className="text-center">
                  <button
                    onClick={() => setShowTableModal(true)}
                    className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 text-lg font-medium"
                  >
                    Choose Table
                  </button>
                </div>
              ) : (
                // When from table management, show loading or table info
                <div className="text-center bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <span className="text-blue-700 font-medium">
                    Table Management Mode - Loading...
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Customer Info for Delivery */}
          {orderType === 'delivery' && (
            <div className="mb-6 bg-white rounded-xl p-4">
              {!showCustomerInfo ? (
                // Show customer selection options initially
                <div className="text-center">
                  <h3 className="font-semibold text-lg mb-4 text-gray-700">Customer Information</h3>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <button
                      onClick={() => {
                        fetchExistingCustomers();
                        setShowCustomerSelectionModal(true);
                      }}
                      className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 text-lg font-medium flex items-center justify-center"
                    >
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      Select Existing Customer
                    </button>
                    <button
                      onClick={() => setShowCustomerModal(true)}
                      className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 text-lg font-medium flex items-center justify-center"
                    >
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      Add New Customer
                    </button>
                  </div>
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
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Party Size</label>
                      <input
                        type="number"
                        min="1"
                        max="50"
                        placeholder="Number of people"
                        value={partySize}
                        onChange={(e) => setPartySize(parseInt(e.target.value) || 1)}
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

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                      <input
                        type="text"
                        placeholder="City"
                        value={customerInfo.city}
                        onChange={(e) => setCustomerInfo({...customerInfo, city: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                      <input
                        type="text"
                        placeholder="State"
                        value={customerInfo.state}
                        onChange={(e) => setCustomerInfo({...customerInfo, state: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">ZIP Code</label>
                      <input
                        type="text"
                        placeholder="ZIP Code"
                        value={customerInfo.zip_code}
                        onChange={(e) => setCustomerInfo({...customerInfo, zip_code: e.target.value})}
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
            
            {/* Tax Breakdown */}
            {breakdown.taxes.map((tax, index) => (
              <div key={index} className="flex justify-between text-sm text-gray-600">
                <span>{tax.name} ({tax.taxType === 'percentage' ? `${tax.rate}%` : `$${tax.rate}`}):</span>
                <span>${tax.amount.toFixed(2)}</span>
              </div>
            ))}
            
            {/* Service Charges Breakdown */}
            {breakdown.serviceCharges.map((charge, index) => (
              <div key={index} className="flex justify-between text-sm text-blue-600">
                <span>{charge.name} ({charge.chargeType === 'percentage' ? `${charge.rate}%` : `$${charge.rate}`}):</span>
                <span>${charge.amount.toFixed(2)}</span>
              </div>
            ))}
            
            {/* Gratuity Breakdown */}
            {breakdown.gratuity.map((tip, index) => (
              <div key={index} className="flex justify-between text-sm text-green-600">
                <span>{tip.name} ({tip.gratuityType === 'percentage' ? `${tip.rate}%` : `$${tip.rate}`}):</span>
                <span>${tip.amount.toFixed(2)}</span>
              </div>
            ))}
            
            {/* Discount Breakdown */}
            {breakdown.discounts.map((discount, index) => (
              <div key={index} className="flex justify-between text-sm text-red-600">
                <span>{discount.name} ({discount.discountType === 'percentage' ? `${discount.rate}%` : `$${discount.rate}`}):</span>
                <span>-${discount.amount.toFixed(2)}</span>
              </div>
            ))}
            
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
        order={currentOrder || { ...orderTotals, id: 'temp' }}
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
                apartment: newCustomer.apartment || '',
                city: newCustomer.city || '',
                state: newCustomer.state || '',
                zip_code: newCustomer.zip_code || ''
              });
              
              // Show customer info section
              setShowCustomerInfo(true);
              setShowCustomerModal(false);
            } catch (error) {
              console.error('Error creating customer:', error);
              alert('Failed to create customer');
            }
          }}
          onClose={() => setShowCustomerModal(false)}
        />
      )}

      {/* Customer Selection Modal */}
      {showCustomerSelectionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Select Existing Customer</h2>
                <button
                  onClick={() => setShowCustomerSelectionModal(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>
            </div>
            
            <div className="p-6">
              {/* Search Bar */}
              <div className="mb-4">
                <input
                  type="text"
                  placeholder="Search customers by name or phone..."
                  value={customerSearchQuery}
                  onChange={(e) => setCustomerSearchQuery(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Customer List */}
              <div className="max-h-96 overflow-y-auto">
                {existingCustomers
                  .filter(customer => 
                    customer.name.toLowerCase().includes(customerSearchQuery.toLowerCase()) ||
                    customer.phone.includes(customerSearchQuery)
                  )
                  .length === 0 ? (
                  <div className="text-center py-8">
                    <span className="text-gray-500">
                      {customerSearchQuery ? 'No customers found matching your search.' : 'No customers found.'}
                    </span>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3">
                    {existingCustomers
                      .filter(customer => 
                        customer.name.toLowerCase().includes(customerSearchQuery.toLowerCase()) ||
                        customer.phone.includes(customerSearchQuery)
                      )
                      .map(customer => (
                        <div
                          key={customer.id}
                          onClick={() => handleSelectExistingCustomer(customer)}
                          className="p-4 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 cursor-pointer transition-colors"
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <h3 className="font-medium text-gray-900">{customer.name}</h3>
                              <p className="text-sm text-gray-600">{customer.phone}</p>
                              {customer.address && (
                                <p className="text-sm text-gray-500">
                                  {customer.apartment && `${customer.apartment} `}
                                  {customer.address}
                                  {customer.city && `, ${customer.city}`}
                                  {customer.state && `, ${customer.state}`}
                                  {customer.zip_code && ` ${customer.zip_code}`}
                                </p>
                              )}
                            </div>
                            <div className="text-right">
                              {customer.total_orders > 0 && (
                                <div className="text-xs text-gray-500">
                                  {customer.total_orders} orders • ${customer.total_spent?.toFixed(2) || '0.00'}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    }
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 border-t bg-gray-50">
              <div className="flex justify-between">
                <button
                  onClick={() => {
                    setShowCustomerSelectionModal(false);
                    setShowCustomerModal(true);
                  }}
                  className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
                >
                  Add New Customer
                </button>
                <button
                  onClick={() => setShowCustomerSelectionModal(false)}
                  className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
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
                      // Show table merge modal for occupied table
                      setOccupiedTableToMerge(table);
                      setShowTableMergeModal(true);
                    } else {
                      // Assign available table
                      setAssignedTable(table);
                      setShowTableModal(false);
                      
                      // If editing an active order, update the table assignment in database
                      if (editingActiveOrder && currentOrder) {
                        updateOrderTableAssignment(currentOrder.id, table.id);
                      }
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
                  <div className="text-lg font-bold">{getTableDisplayName(table)}</div>
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

      {/* Table Merge Modal */}
      {showTableMergeModal && occupiedTableToMerge && (
        <TableMergeModal
          occupiedTable={occupiedTableToMerge}
          currentCart={cart}
          currentOrderInfo={{
            orderType,
            customerInfo,
            orderNotes,
            tip
          }}
          onConfirmMerge={async () => {
            try {
              // Close table selection modal first
              setShowTableModal(false);
              
              // Check if we have items in cart to merge
              if (cart.length === 0) {
                alert('No items in cart to merge');
                setShowTableMergeModal(false);
                return;
              }

              // First, create an order with current cart items
              const orderData = {
                customer_name: customerInfo.name,
                customer_phone: customerInfo.phone,
                customer_address: customerInfo.address,
                customer_apartment: customerInfo.apartment,
                customer_city: customerInfo.city,
                customer_state: customerInfo.state,
                customer_zip_code: customerInfo.zip_code,
                order_type: orderType,
                table_number: occupiedTableToMerge.number,
                items: cart.map(item => ({
                  menu_item_id: item.menu_item_id || item.id,
                  menu_item_name: item.menu_item_name || item.name,
                  quantity: item.quantity,
                  price: item.base_price || item.price,
                  modifiers: item.modifiers || item.selectedModifiers || []
                })),
                tip: tip,
                order_notes: orderNotes,
                status: 'pending'
              };

              // Calculate totals
              const subtotal = cart.reduce((sum, item) => sum + (item.total_price || item.price * item.quantity || 0), 0);
              orderData.subtotal = subtotal;

              // Create temporary order
              const tempOrderResponse = await axios.post(`${API}/orders`, orderData);
              const tempOrderId = tempOrderResponse.data.id;

              // Send to kitchen to get order ID that can be merged  
              await axios.put(`${API}/orders/${tempOrderId}/status`, { status: 'confirmed' });

              // Create a temporary table assignment for the new order
              // We need to assign this order to a temporary table so the merge API can work
              const tempTableResponse = await axios.post(`${API}/tables`, {
                number: 9999, // Temporary table number
                capacity: 1,
                status: 'occupied',
                current_order_id: tempOrderId
              });
              const tempTableId = tempTableResponse.data.id;

              // Now merge the temporary table with the occupied table
              await axios.post(`${API}/tables/${tempTableId}/merge`, {
                new_table_id: occupiedTableToMerge.id
              });

              // Clean up the temporary table
              await axios.delete(`${API}/tables/${tempTableId}`);

              alert(`Order successfully merged with ${getTableDisplayName(occupiedTableToMerge)}!`);
              
              // Clear cart and reset form
              setCart([]);
              setCustomerInfo({ name: '', phone: '', address: '', apartment: '' });
              setOrderNotes('');
              setTip(0);
              setAssignedTable(occupiedTableToMerge);
              setShowTableMergeModal(false);
              
            } catch (error) {
              console.error('Error merging orders:', error);
              alert(error.response?.data?.detail || 'Failed to merge orders');
            }
          }}
          onCancel={() => {
            setShowTableMergeModal(false);
            setOccupiedTableToMerge(null);
          }}
        />
      )}

      {/* Empty Order Warning Modal */}
      {showEmptyOrderModal && emptyOrderData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100 mb-4">
                <span className="text-yellow-600 text-2xl">⚠️</span>
              </div>
              
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Order is Now Empty
              </h3>
              
              <p className="text-sm text-gray-500 mb-6">
                You've removed all items from Order #{emptyOrderData.order_number}. 
                What would you like to do with this empty order?
              </p>
              
              <div className="flex flex-col space-y-3">
                <button
                  onClick={cancelEmptyOrder}
                  className="w-full bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-colors font-medium"
                >
                  Cancel Order
                </button>
                
                <button
                  onClick={() => {
                    setShowEmptyOrderModal(false);
                    setEmptyOrderData(null);
                  }}
                  className="w-full bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400 transition-colors font-medium"
                >
                  Keep Order (Add Items Later)
                </button>
              </div>
              
              <div className="mt-4 text-xs text-gray-400">
                Order Info: {emptyOrderData.order_type === 'dine_in' ? getOrderTableDisplayName(emptyOrderData) : emptyOrderData.order_type}
                {emptyOrderData.customer_name && ` • ${emptyOrderData.customer_name}`}
              </div>
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

// Table Merge Modal Component
const TableMergeModal = ({ occupiedTable, currentCart, currentOrderInfo, onConfirmMerge, onCancel }) => {
  const [existingOrder, setExistingOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchExistingOrder = async () => {
      if (occupiedTable?.current_order_id) {
        try {
          const response = await axios.get(`${API}/orders/${occupiedTable.current_order_id}`);
          setExistingOrder(response.data);
        } catch (error) {
          console.error('Error fetching existing order:', error);
        }
      }
      setLoading(false);
    };
    fetchExistingOrder();
  }, [occupiedTable]);

  const currentCartTotal = currentCart.reduce((sum, item) => sum + (item.total_price || item.price || 0), 0);
  const existingOrderTotal = existingOrder?.subtotal || 0;
  const mergedTotal = currentCartTotal + existingOrderTotal;
  const estimatedTax = mergedTotal * 0.08;
  const finalTotal = mergedTotal + estimatedTax + (currentOrderInfo.tip || 0);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl p-6 max-w-4xl w-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p>Loading existing order details...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">⚠️ Merge Orders - {getTableDisplayName(occupiedTable)}</h2>
          <button
            onClick={onCancel}
            className="text-gray-500 hover:text-gray-700 text-xl"
          >
            ×
          </button>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <div className="flex items-center space-x-2">
            <span className="text-yellow-600 text-lg">⚠️</span>
            <p className="text-yellow-800 font-medium">
              {getTableDisplayName(occupiedTable)} already has an active order. Your current cart items will be merged with the existing order.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Current Cart */}
          <div className="bg-blue-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-blue-800 mb-3">Your Current Cart</h3>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {currentCart.length > 0 ? (
                currentCart.map((item, index) => (
                  <div key={index} className="flex justify-between items-center py-2 border-b border-blue-200">
                    <div>
                      <span className="font-medium">{item.menu_item_name || item.name}</span>
                      <span className="text-sm text-blue-600 ml-2">x{item.quantity}</span>
                    </div>
                    <span className="font-medium">${(item.total_price || item.price * item.quantity || 0).toFixed(2)}</span>
                  </div>
                ))
              ) : (
                <p className="text-blue-600 italic">No items in cart</p>
              )}
            </div>
            <div className="border-t border-blue-200 pt-2 mt-2">
              <div className="flex justify-between font-bold text-blue-800">
                <span>Cart Subtotal:</span>
                <span>${currentCartTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Existing Order */}
          <div className="bg-orange-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-orange-800 mb-3">Existing Table Order</h3>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {existingOrder?.items?.length > 0 ? (
                existingOrder.items.map((item, index) => (
                  <div key={index} className="flex justify-between items-center py-2 border-b border-orange-200">
                    <div>
                      <span className="font-medium">{item.menu_item_name}</span>
                      <span className="text-sm text-orange-600 ml-2">x{item.quantity}</span>
                    </div>
                    <span className="font-medium">${(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))
              ) : (
                <p className="text-orange-600 italic">No items found</p>
              )}
            </div>
            <div className="border-t border-orange-200 pt-2 mt-2">
              <div className="flex justify-between font-bold text-orange-800">
                <span>Existing Subtotal:</span>
                <span>${existingOrderTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Merged Total Preview */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <h3 className="text-lg font-semibold text-green-800 mb-3">📊 Merged Order Total</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Combined Subtotal:</span>
              <span>${mergedTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Estimated Tax (8%):</span>
              <span>${estimatedTax.toFixed(2)}</span>
            </div>
            {currentOrderInfo.tip > 0 && (
              <div className="flex justify-between">
                <span>Tip:</span>
                <span>${currentOrderInfo.tip.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-bold text-green-800 border-t border-green-300 pt-2">
              <span>Final Total:</span>
              <span>${finalTotal.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Order Information */}
        {(currentOrderInfo.customerInfo.name || currentOrderInfo.orderNotes) && (
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Additional Information</h3>
            {currentOrderInfo.customerInfo.name && (
              <p><strong>Customer:</strong> {currentOrderInfo.customerInfo.name}</p>
            )}
            {currentOrderInfo.orderNotes && (
              <p><strong>Notes:</strong> {currentOrderInfo.orderNotes}</p>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex space-x-4">
          <button
            onClick={onCancel}
            className="flex-1 bg-gray-300 text-gray-700 py-3 px-6 rounded-lg font-medium hover:bg-gray-400 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirmMerge}
            disabled={currentCart.length === 0}
            className={`flex-1 py-3 px-6 rounded-lg font-medium transition-colors ${
              currentCart.length === 0
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-red-600 text-white hover:bg-red-700'
            }`}
          >
            {currentCart.length === 0 ? 'No Items to Merge' : `Confirm Merge with ${getTableDisplayName(occupiedTable)}`}
          </button>
        </div>
      </div>
    </div>
  );
};

// Tax & Charges Component
const TaxChargesComponent = ({ onBack }) => {
  const [taxRates, setTaxRates] = useState([]);
  const [serviceCharges, setServiceCharges] = useState([]);
  const [gratuityRules, setGratuityRules] = useState([]);
  const [discountPolicies, setDiscountPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('taxes');
  const [showTaxModal, setShowTaxModal] = useState(false);
  const [showChargeModal, setShowChargeModal] = useState(false);
  const [showGratuityModal, setShowGratuityModal] = useState(false);
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  const [taxForm, setTaxForm] = useState({
    name: '',
    type: 'percentage', // percentage, fixed, compound
    rate: '',
    description: '',
    category: 'sales', // sales, luxury, service
    applies_to: 'subtotal', // subtotal, total
    jurisdiction: '', // city, state, federal
    tax_id: '',
    applies_to_order_types: [], // NEW: which order types this tax applies to
    active: true,
    inclusive: false // tax included in price vs added
  });

  const [chargeForm, setChargeForm] = useState({
    name: '',
    type: 'percentage', // percentage, fixed, per_person
    amount: '',
    description: '',
    applies_to: 'subtotal', // subtotal, total_with_tax
    conditions: [], // minimum_order, party_size, order_type
    minimum_amount: '',
    maximum_amount: '', // New field for maximum order amount
    party_size_threshold: '',
    order_types: [],
    active: true,
    mandatory: false
  });

  const [gratuityForm, setGratuityForm] = useState({
    name: '',
    type: 'percentage', // percentage, fixed
    amount: '',
    description: '',
    trigger_condition: 'party_size', // party_size, order_amount, manual
    party_size_min: '6',
    order_amount_min: '',
    applies_to_order_types: [],
    auto_apply: true,
    customer_can_modify: true,
    active: true
  });

  const [discountForm, setDiscountForm] = useState({
    name: '',
    type: 'percentage', // percentage, fixed, buy_one_get_one
    amount: '',
    description: '',
    category: 'general', // general, employee, senior, student, military
    conditions: [], // minimum_order, specific_items, time_based
    minimum_order_amount: '',
    valid_days: [],
    valid_hours_start: '',
    valid_hours_end: '',
    max_uses_per_day: '',
    requires_code: false,
    discount_code: '',
    stackable: false,
    active: true,
    expiry_date: ''
  });

  const taxTypes = [
    { value: 'percentage', label: 'Percentage', description: 'Calculated as % of amount' },
    { value: 'fixed', label: 'Fixed Amount', description: 'Fixed dollar amount' },
    { value: 'compound', label: 'Compound', description: 'Tax calculated on tax-inclusive amount' }
  ];

  const taxCategories = [
    { value: 'sales', label: 'Sales Tax', description: 'Standard sales tax' },
    { value: 'luxury', label: 'Luxury Tax', description: 'Tax on luxury items' },
    { value: 'service', label: 'Service Tax', description: 'Tax on services' },
    { value: 'vat', label: 'VAT', description: 'Value Added Tax' }
  ];

  const chargeTypes = [
    { value: 'percentage', label: 'Percentage', description: '% of order amount' },
    { value: 'fixed', label: 'Fixed Amount', description: 'Fixed dollar amount' },
    { value: 'per_person', label: 'Per Person', description: 'Amount per person' }
  ];

  const orderTypes = ['dine_in', 'takeout', 'delivery', 'phone_order'];
  const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

  useEffect(() => {
    fetchTaxChargesData();
  }, []);

  const fetchTaxChargesData = async () => {
    try {
      setLoading(true);
      
      // Fetch all tax and charges data from backend APIs
      const [taxRatesRes, serviceChargesRes, gratuityRulesRes, discountPoliciesRes] = await Promise.all([
        axios.get(`${API}/tax-charges/tax-rates`),
        axios.get(`${API}/tax-charges/service-charges`),
        axios.get(`${API}/tax-charges/gratuity-rules`),
        axios.get(`${API}/tax-charges/discount-policies`)
      ]);
      
      setTaxRates(taxRatesRes.data.length > 0 ? taxRatesRes.data : getDefaultTaxRates());
      setServiceCharges(serviceChargesRes.data.length > 0 ? serviceChargesRes.data : getDefaultServiceCharges());
      setGratuityRules(gratuityRulesRes.data.length > 0 ? gratuityRulesRes.data : getDefaultGratuityRules());
      setDiscountPolicies(discountPoliciesRes.data.length > 0 ? discountPoliciesRes.data : getDefaultDiscountPolicies());
      
    } catch (error) {
      console.error('Error fetching tax/charges data:', error);
      // Fallback to default data if API fails
      setTaxRates(getDefaultTaxRates());
      setServiceCharges(getDefaultServiceCharges());
      setGratuityRules(getDefaultGratuityRules());
      setDiscountPolicies(getDefaultDiscountPolicies());
      alert('Failed to load tax and charges configuration from server. Using default settings.');
    } finally {
      setLoading(false);
    }
  };

  // Remove the old localStorage save function - now using individual API calls

  const getDefaultTaxRates = () => [
    {
      id: crypto.randomUUID(),
      name: 'NYC Sales Tax',
      type: 'percentage',
      rate: 8.25,
      description: 'New York City Sales Tax',
      category: 'sales',
      applies_to: 'subtotal',
      jurisdiction: 'city',
      tax_id: 'NYC-ST-001',
      active: true,
      inclusive: false
    },
    {
      id: crypto.randomUUID(),
      name: 'State Tax',
      type: 'percentage',
      rate: 4.0,
      description: 'New York State Tax',
      category: 'sales',
      applies_to: 'subtotal',
      jurisdiction: 'state',
      tax_id: 'NYS-ST-001',
      active: true,
      inclusive: false
    }
  ];

  const getDefaultServiceCharges = () => [
    {
      id: crypto.randomUUID(),
      name: 'Large Party Service Charge',
      type: 'percentage',
      amount: 18,
      description: 'Automatic service charge for parties of 6 or more',
      applies_to: 'subtotal',
      conditions: ['party_size'],
      party_size_threshold: '6',
      order_types: ['dine_in'],
      active: true,
      mandatory: true
    },
    {
      id: crypto.randomUUID(),
      name: 'Delivery Fee',
      type: 'fixed',
      amount: 3.50,
      description: 'Standard delivery fee',
      applies_to: 'subtotal',
      conditions: ['order_type'],
      order_types: ['delivery'],
      active: true,
      mandatory: true
    }
  ];

  const getDefaultGratuityRules = () => [
    {
      id: crypto.randomUUID(),
      name: 'Automatic Gratuity - Large Parties',
      type: 'percentage',
      amount: 20,
      description: 'Automatic 20% gratuity for parties of 8+',
      trigger_condition: 'party_size',
      party_size_min: '8',
      applies_to_order_types: ['dine_in'],
      auto_apply: true,
      customer_can_modify: true,
      active: true
    },
    {
      id: crypto.randomUUID(),
      name: 'High-Value Order Gratuity',
      type: 'percentage',
      amount: 15,
      description: 'Suggested 15% gratuity for orders over $200',
      trigger_condition: 'order_amount',
      order_amount_min: '200',
      applies_to_order_types: ['dine_in', 'delivery'],
      auto_apply: false,
      customer_can_modify: true,
      active: true
    }
  ];

  const getDefaultDiscountPolicies = () => [
    {
      id: crypto.randomUUID(),
      name: 'Employee Discount',
      type: 'percentage',
      amount: 25,
      description: '25% discount for staff members',
      category: 'employee',
      conditions: ['requires_code'],
      discount_code: 'STAFF25',
      stackable: false,
      active: true,
      max_uses_per_day: '50'
    },
    {
      id: crypto.randomUUID(),
      name: 'Senior Citizen Discount',
      type: 'percentage',
      amount: 10,
      description: '10% discount for seniors (65+)',
      category: 'senior',
      conditions: ['time_based'],
      valid_days: ['monday', 'tuesday', 'wednesday', 'thursday'],
      valid_hours_start: '14:00',
      valid_hours_end: '17:00',
      stackable: true,
      active: true
    }
  ];

  const handleSaveTax = async () => {
    if (!taxForm.name || !taxForm.rate) {
      alert('Please fill in tax name and rate');
      return;
    }

    const rate = parseFloat(taxForm.rate);
    if (isNaN(rate) || rate < 0) {
      alert('Please enter a valid tax rate');
      return;
    }

    const taxData = {
      name: taxForm.name,
      description: taxForm.description,
      rate: rate,
      type: taxForm.type,
      category: taxForm.category,
      applies_to: taxForm.applies_to,
      jurisdiction: taxForm.jurisdiction,
      tax_id: taxForm.tax_id,
      applies_to_order_types: taxForm.applies_to_order_types || [], // FIX: Include order type selection
      active: taxForm.active,
      inclusive: taxForm.inclusive
    };

    try {
      if (editingItem) {
        // Update existing tax rate
        const response = await axios.put(`${API}/tax-charges/tax-rates/${editingItem.id}`, taxData);
        setTaxRates(prev => prev.map(item => 
          item.id === editingItem.id ? response.data : item
        ));
        alert('Tax rate updated successfully');
      } else {
        // Create new tax rate
        const response = await axios.post(`${API}/tax-charges/tax-rates`, taxData);
        setTaxRates(prev => [...prev, response.data]);
        alert('Tax rate added successfully');
      }

      setShowTaxModal(false);
      setEditingItem(null);
      resetTaxForm();
    } catch (error) {
      console.error('Error saving tax rate:', error);
      alert('Failed to save tax rate: ' + (error.response?.data?.detail || error.message));
    }
  };

  const handleSaveCharge = async () => {
    if (!chargeForm.name || !chargeForm.amount) {
      alert('Please fill in charge name and amount');
      return;
    }

    const amount = parseFloat(chargeForm.amount);
    if (isNaN(amount) || amount < 0) {
      alert('Please enter a valid charge amount');
      return;
    }

    const chargeData = {
      name: chargeForm.name,
      description: chargeForm.description,
      amount: amount,
      type: chargeForm.type,
      applies_to: chargeForm.applies_to,
      conditions: chargeForm.conditions,
      minimum_order_amount: parseFloat(chargeForm.minimum_amount) || 0,
      maximum_order_amount: parseFloat(chargeForm.maximum_amount) || 0,
      party_size_threshold: parseInt(chargeForm.party_size_threshold) || 0,
      applies_to_order_types: chargeForm.order_types || [], // FIX: Use correct backend field name
      active: chargeForm.active,
      mandatory: chargeForm.mandatory
    };

    try {
      if (editingItem) {
        // Update existing service charge
        const response = await axios.put(`${API}/tax-charges/service-charges/${editingItem.id}`, chargeData);
        setServiceCharges(prev => prev.map(item => 
          item.id === editingItem.id ? response.data : item
        ));
        alert('Service charge updated successfully');
      } else {
        // Create new service charge
        const response = await axios.post(`${API}/tax-charges/service-charges`, chargeData);
        setServiceCharges(prev => [...prev, response.data]);
        alert('Service charge added successfully');
      }

      setShowChargeModal(false);
      setEditingItem(null);
      resetChargeForm();
    } catch (error) {
      console.error('Error saving service charge:', error);
      alert('Failed to save service charge: ' + (error.response?.data?.detail || error.message));
    }
  };

  const handleSaveGratuity = async () => {
    if (!gratuityForm.name || !gratuityForm.amount) {
      alert('Please fill in gratuity name and amount');
      return;
    }

    const amount = parseFloat(gratuityForm.amount);
    if (isNaN(amount) || amount < 0) {
      alert('Please enter a valid gratuity amount');
      return;
    }

    const gratuityData = {
      name: gratuityForm.name,
      description: gratuityForm.description,
      amount: amount,
      type: gratuityForm.type,
      minimum_order_amount: parseFloat(gratuityForm.order_amount_min) || 0,
      maximum_order_amount: 0, // Currently not exposed in UI
      party_size_minimum: parseInt(gratuityForm.party_size_min) || 0,
      applies_to_order_types: gratuityForm.applies_to_order_types || [],
      active: gratuityForm.active
    };

    try {
      if (editingItem) {
        // Update existing gratuity rule
        const response = await axios.put(`${API}/tax-charges/gratuity-rules/${editingItem.id}`, gratuityData);
        setGratuityRules(prev => prev.map(item => 
          item.id === editingItem.id ? response.data : item
        ));
        alert('Gratuity rule updated successfully');
      } else {
        // Create new gratuity rule
        const response = await axios.post(`${API}/tax-charges/gratuity-rules`, gratuityData);
        setGratuityRules(prev => [...prev, response.data]);
        alert('Gratuity rule added successfully');
      }

      setShowGratuityModal(false);
      setEditingItem(null);
      resetGratuityForm();
    } catch (error) {
      console.error('Error saving gratuity rule:', error);
      alert('Failed to save gratuity rule: ' + (error.response?.data?.detail || error.message));
    }
  };

  const handleSaveDiscount = async () => {
    if (!discountForm.name || !discountForm.amount) {
      alert('Please fill in discount name and amount');
      return;
    }

    const amount = parseFloat(discountForm.amount);
    if (isNaN(amount) || amount < 0) {
      alert('Please enter a valid discount amount');
      return;
    }

    const discountData = {
      name: discountForm.name,
      description: discountForm.description,
      amount: amount,
      type: discountForm.type,
      category: discountForm.category,
      conditions: discountForm.conditions,
      minimum_order_amount: parseFloat(discountForm.minimum_order_amount) || 0,
      valid_days: discountForm.valid_days,
      valid_hours_start: discountForm.valid_hours_start,
      valid_hours_end: discountForm.valid_hours_end,
      max_uses_per_day: parseInt(discountForm.max_uses_per_day) || 0,
      requires_code: discountForm.requires_code,
      discount_code: discountForm.discount_code,
      stackable: discountForm.stackable,
      active: discountForm.active,
      expiry_date: discountForm.expiry_date
    };

    try {
      if (editingItem) {
        // Update existing discount policy
        const response = await axios.put(`${API}/tax-charges/discount-policies/${editingItem.id}`, discountData);
        setDiscountPolicies(prev => prev.map(item => 
          item.id === editingItem.id ? response.data : item
        ));
        alert('Discount policy updated successfully');
      } else {
        // Create new discount policy
        const response = await axios.post(`${API}/tax-charges/discount-policies`, discountData);
        setDiscountPolicies(prev => [...prev, response.data]);
        alert('Discount policy added successfully');
      }

      setShowDiscountModal(false);
      setEditingItem(null);
      resetDiscountForm();
    } catch (error) {
      console.error('Error saving discount policy:', error);
      alert('Failed to save discount policy: ' + (error.response?.data?.detail || error.message));
    }
  };

  const handleEditTax = (tax) => {
    setTaxForm({
      name: tax.name,
      type: tax.type,
      rate: tax.rate.toString(),
      description: tax.description || '',
      category: tax.category,
      applies_to: tax.applies_to,
      jurisdiction: tax.jurisdiction || '',
      tax_id: tax.tax_id || '',
      applies_to_order_types: tax.applies_to_order_types || [], // Handle new field with default empty array
      active: tax.active,
      inclusive: tax.inclusive || false
    });
    setEditingItem(tax);
    setShowTaxModal(true);
  };

  const handleEditCharge = (charge) => {
    setChargeForm({
      name: charge.name,
      type: charge.type,
      amount: charge.amount.toString(),
      description: charge.description || '',
      applies_to: charge.applies_to,
      conditions: charge.conditions || [],
      minimum_amount: charge.minimum_order_amount ? charge.minimum_order_amount.toString() : '',
      maximum_amount: charge.maximum_order_amount ? charge.maximum_order_amount.toString() : '',
      party_size_threshold: charge.party_size_threshold || '',
      order_types: charge.applies_to_order_types || [], // FIX: Map from backend field name
      active: charge.active,
      mandatory: charge.mandatory || false
    });
    setEditingItem(charge);
    setShowChargeModal(true);
  };

  const handleEditGratuity = (gratuity) => {
    setGratuityForm({
      name: gratuity.name,
      type: gratuity.type,
      amount: gratuity.amount.toString(),
      description: gratuity.description || '',
      trigger_condition: gratuity.trigger_condition || 'party_size',
      party_size_min: gratuity.party_size_minimum ? gratuity.party_size_minimum.toString() : '8',
      order_amount_min: gratuity.minimum_order_amount ? gratuity.minimum_order_amount.toString() : '',
      applies_to_order_types: gratuity.applies_to_order_types || [],
      auto_apply: gratuity.auto_apply || true,
      customer_can_modify: gratuity.customer_can_modify || true,
      active: gratuity.active
    });
    setEditingItem(gratuity);
    setShowGratuityModal(true);
  };

  const handleEditDiscount = (discount) => {
    setDiscountForm({
      name: discount.name,
      type: discount.type,
      amount: discount.amount.toString(),
      description: discount.description || '',
      category: discount.category,
      conditions: discount.conditions || [],
      minimum_order_amount: discount.minimum_order_amount || '',
      valid_days: discount.valid_days || [],
      valid_hours_start: discount.valid_hours_start || '',
      valid_hours_end: discount.valid_hours_end || '',
      max_uses_per_day: discount.max_uses_per_day || '',
      requires_code: discount.requires_code || false,
      discount_code: discount.discount_code || '',
      stackable: discount.stackable || false,
      active: discount.active,
      expiry_date: discount.expiry_date || ''
    });
    setEditingItem(discount);
    setShowDiscountModal(true);
  };

  const handleDelete = async (type, id) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      try {
        let endpoint = '';
        switch (type) {
          case 'tax':
            endpoint = `${API}/tax-charges/tax-rates/${id}`;
            break;
          case 'charge':
            endpoint = `${API}/tax-charges/service-charges/${id}`;
            break;
          case 'gratuity':
            endpoint = `${API}/tax-charges/gratuity-rules/${id}`;
            break;
          case 'discount':
            endpoint = `${API}/tax-charges/discount-policies/${id}`;
            break;
          default:
            throw new Error('Invalid type');
        }

        await axios.delete(endpoint);

        // Update local state after successful deletion
        switch (type) {
          case 'tax':
            setTaxRates(prev => prev.filter(item => item.id !== id));
            break;
          case 'charge':
            setServiceCharges(prev => prev.filter(item => item.id !== id));
            break;
          case 'gratuity':
            setGratuityRules(prev => prev.filter(item => item.id !== id));
            break;
          case 'discount':
            setDiscountPolicies(prev => prev.filter(item => item.id !== id));
            break;
        }

        alert('Item deleted successfully');
      } catch (error) {
        console.error('Error deleting item:', error);
        alert('Failed to delete item: ' + (error.response?.data?.detail || error.message));
      }
    }
  };

  const toggleActive = async (type, id) => {
    try {
      let endpoint = '';
      let currentItem = null;
      
      // Find the current item and determine endpoint
      switch (type) {
        case 'tax':
          currentItem = taxRates.find(item => item.id === id);
          endpoint = `${API}/tax-charges/tax-rates/${id}`;
          break;
        case 'charge':
          currentItem = serviceCharges.find(item => item.id === id);
          endpoint = `${API}/tax-charges/service-charges/${id}`;
          break;
        case 'gratuity':
          currentItem = gratuityRules.find(item => item.id === id);
          endpoint = `${API}/tax-charges/gratuity-rules/${id}`;
          break;
        case 'discount':
          currentItem = discountPolicies.find(item => item.id === id);
          endpoint = `${API}/tax-charges/discount-policies/${id}`;
          break;
        default:
          throw new Error('Invalid type');
      }

      if (!currentItem) {
        throw new Error('Item not found');
      }

      // Update the item with toggled active status
      const updatedItem = { ...currentItem, active: !currentItem.active };
      const response = await axios.put(endpoint, updatedItem);

      // Update local state with response data
      switch (type) {
        case 'tax':
          setTaxRates(prev => prev.map(item => 
            item.id === id ? response.data : item
          ));
          break;
        case 'charge':
          setServiceCharges(prev => prev.map(item => 
            item.id === id ? response.data : item
          ));
          break;
        case 'gratuity':
          setGratuityRules(prev => prev.map(item => 
            item.id === id ? response.data : item
          ));
          break;
        case 'discount':
          setDiscountPolicies(prev => prev.map(item => 
            item.id === id ? response.data : item
          ));
          break;
      }

    } catch (error) {
      console.error('Error toggling active status:', error);
      alert('Failed to update status: ' + (error.response?.data?.detail || error.message));
    }
  };

  const resetTaxForm = () => {
    setTaxForm({
      name: '',
      type: 'percentage',
      rate: '',
      description: '',
      category: 'sales',
      applies_to: 'subtotal',
      jurisdiction: '',
      tax_id: '',
      applies_to_order_types: [],
      active: true,
      inclusive: false
    });
  };

  const resetChargeForm = () => {
    setChargeForm({
      name: '',
      type: 'percentage',
      amount: '',
      description: '',
      applies_to: 'subtotal',
      conditions: [],
      minimum_amount: '',
      maximum_amount: '',
      party_size_threshold: '',
      order_types: [],
      active: true,
      mandatory: false
    });
  };

  const resetGratuityForm = () => {
    setGratuityForm({
      name: '',
      type: 'percentage',
      amount: '',
      description: '',
      trigger_condition: 'party_size',
      party_size_min: '8',
      order_amount_min: '',
      applies_to_order_types: [],
      auto_apply: true,
      customer_can_modify: true,
      active: true
    });
  };

  const resetDiscountForm = () => {
    setDiscountForm({
      name: '',
      type: 'percentage',
      amount: '',
      description: '',
      active: true
    });
  };

  const calculateTotalTaxRate = () => {
    return taxRates
      .filter(tax => tax.active && tax.type === 'percentage')
      .reduce((total, tax) => total + tax.rate, 0);
  };

  const stats = {
    activeTaxes: taxRates.filter(tax => tax.active).length,
    totalTaxRate: calculateTotalTaxRate(),
    activeCharges: serviceCharges.filter(charge => charge.active).length,
    activeGratuityRules: gratuityRules.filter(rule => rule.active).length,
    activeDiscounts: discountPolicies.filter(discount => discount.active).length
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading tax and charges configuration...</p>
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
            <h1 className="text-2xl font-bold text-gray-800">Tax & Charges Settings</h1>
          </div>
        </div>
      </div>

      {/* Stats Dashboard */}
      <div className="bg-white border-b p-6">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.activeTaxes}</div>
            <div className="text-sm text-gray-600">Active Taxes</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{stats.totalTaxRate.toFixed(2)}%</div>
            <div className="text-sm text-gray-600">Total Tax Rate</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{stats.activeCharges}</div>
            <div className="text-sm text-gray-600">Service Charges</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">{stats.activeGratuityRules}</div>
            <div className="text-sm text-gray-600">Gratuity Rules</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{stats.activeDiscounts}</div>
            <div className="text-sm text-gray-600">Discount Policies</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b">
        <div className="flex space-x-8 px-6">
          {[
            { id: 'taxes', name: 'Tax Rates', icon: '💰' },
            { id: 'charges', name: 'Service Charges', icon: '💳' },
            { id: 'gratuity', name: 'Gratuity Rules', icon: '🎯' },
            { id: 'discounts', name: 'Discount Policies', icon: '🏷️' }
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
        {/* Tax Rates Tab */}
        {activeTab === 'taxes' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Tax Rates Configuration</h2>
              <button
                onClick={() => setShowTaxModal(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
              >
                <span>+</span>
                <span>Add Tax Rate</span>
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {taxRates.map(tax => (
                <div key={tax.id} className="bg-white border rounded-lg p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-semibold text-lg text-gray-800">{tax.name}</h3>
                      <p className="text-sm text-gray-600">{tax.description}</p>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => toggleActive('tax', tax.id)}
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          tax.active 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {tax.active ? 'Active' : 'Inactive'}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Rate:</span>
                      <span className="text-sm font-medium">
                        {tax.type === 'percentage' ? `${tax.rate}%` : `$${tax.rate}`}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Type:</span>
                      <span className="text-sm font-medium">{tax.type}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Category:</span>
                      <span className="text-sm font-medium">{tax.category}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Applies to:</span>
                      <span className="text-sm font-medium">{tax.applies_to}</span>
                    </div>
                    {tax.jurisdiction && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Jurisdiction:</span>
                        <span className="text-sm font-medium">{tax.jurisdiction}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEditTax(tax)}
                      className="flex-1 bg-blue-50 text-blue-600 px-3 py-2 rounded text-sm font-medium hover:bg-blue-100"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete('tax', tax.id)}
                      className="flex-1 bg-red-50 text-red-600 px-3 py-2 rounded text-sm font-medium hover:bg-red-100"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {taxRates.length === 0 && (
              <div className="text-center py-12">
                <span className="text-6xl mb-4 block">💰</span>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No tax rates configured</h3>
                <p className="text-gray-500 mb-4">Add your first tax rate to get started</p>
                <button
                  onClick={() => setShowTaxModal(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                  Add Tax Rate
                </button>
              </div>
            )}
          </div>
        )}

        {/* Service Charges Tab */}
        {activeTab === 'charges' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Service Charges & Fees</h2>
              <button
                onClick={() => setShowChargeModal(true)}
                className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 flex items-center space-x-2"
              >
                <span>+</span>
                <span>Add Service Charge</span>
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {serviceCharges.map(charge => (
                <div key={charge.id} className="bg-white border rounded-lg p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="font-semibold text-lg text-gray-800">{charge.name}</h3>
                        {charge.mandatory && (
                          <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded text-xs font-medium">
                            Mandatory
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">{charge.description}</p>
                    </div>
                    <button
                      onClick={() => toggleActive('charge', charge.id)}
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        charge.active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {charge.active ? 'Active' : 'Inactive'}
                    </button>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Amount:</span>
                      <span className="text-sm font-medium">
                        {charge.type === 'percentage' ? `${charge.amount}%` : 
                         charge.type === 'per_person' ? `$${charge.amount}/person` : 
                         `$${charge.amount}`}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Applies to:</span>
                      <span className="text-sm font-medium">{charge.applies_to}</span>
                    </div>
                    {charge.conditions?.includes('party_size') && charge.party_size_threshold && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Min Party Size:</span>
                        <span className="text-sm font-medium">{charge.party_size_threshold}+ people</span>
                      </div>
                    )}
                    {charge.order_types?.length > 0 && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Order Types:</span>
                        <span className="text-sm font-medium">{charge.order_types.join(', ')}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEditCharge(charge)}
                      className="flex-1 bg-purple-50 text-purple-600 px-3 py-2 rounded text-sm font-medium hover:bg-purple-100"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete('charge', charge.id)}
                      className="flex-1 bg-red-50 text-red-600 px-3 py-2 rounded text-sm font-medium hover:bg-red-100"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {serviceCharges.length === 0 && (
              <div className="text-center py-12">
                <span className="text-6xl mb-4 block">💳</span>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No service charges configured</h3>
                <p className="text-gray-500 mb-4">Add service charges and fees</p>
                <button
                  onClick={() => setShowChargeModal(true)}
                  className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
                >
                  Add Service Charge
                </button>
              </div>
            )}
          </div>
        )}

        {/* Gratuity Rules Tab */}
        {activeTab === 'gratuity' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Automatic Gratuity Rules</h2>
              <button
                onClick={() => setShowGratuityModal(true)}
                className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 flex items-center space-x-2"
              >
                <span>+</span>
                <span>Add Gratuity Rule</span>
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {gratuityRules.map(rule => (
                <div key={rule.id} className="bg-white border rounded-lg p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="font-semibold text-lg text-gray-800">{rule.name}</h3>
                        {rule.auto_apply && (
                          <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-medium">
                            Auto-Apply
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">{rule.description}</p>
                    </div>
                    <button
                      onClick={() => toggleActive('gratuity', rule.id)}
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        rule.active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {rule.active ? 'Active' : 'Inactive'}
                    </button>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Amount:</span>
                      <span className="text-sm font-medium">
                        {rule.type === 'percentage' ? `${rule.amount}%` : `$${rule.amount}`}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Trigger:</span>
                      <span className="text-sm font-medium">
                        {rule.trigger_condition === 'party_size' ? `${rule.party_size_min}+ people` :
                         rule.trigger_condition === 'order_amount' ? `$${rule.order_amount_min}+ order` :
                         'Manual'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Customer can modify:</span>
                      <span className="text-sm font-medium">{rule.customer_can_modify ? 'Yes' : 'No'}</span>
                    </div>
                    {rule.applies_to_order_types?.length > 0 && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Order Types:</span>
                        <span className="text-sm font-medium">{rule.applies_to_order_types.join(', ')}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEditGratuity(rule)}
                      className="flex-1 bg-orange-50 text-orange-600 px-3 py-2 rounded text-sm font-medium hover:bg-orange-100"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete('gratuity', rule.id)}
                      className="flex-1 bg-red-50 text-red-600 px-3 py-2 rounded text-sm font-medium hover:bg-red-100"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {gratuityRules.length === 0 && (
              <div className="text-center py-12">
                <span className="text-6xl mb-4 block">🎯</span>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No gratuity rules configured</h3>
                <p className="text-gray-500 mb-4">Set up automatic gratuity rules</p>
                <button
                  onClick={() => setShowGratuityModal(true)}
                  className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700"
                >
                  Add Gratuity Rule
                </button>
              </div>
            )}
          </div>
        )}

        {/* Discount Policies Tab */}
        {activeTab === 'discounts' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Discount Policies</h2>
              <button
                onClick={() => setShowDiscountModal(true)}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 flex items-center space-x-2"
              >
                <span>+</span>
                <span>Add Discount</span>
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {discountPolicies.map(discount => (
                <div key={discount.id} className="bg-white border rounded-lg p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="font-semibold text-lg text-gray-800">{discount.name}</h3>
                        {discount.stackable && (
                          <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium">
                            Stackable
                          </span>
                        )}
                        {discount.requires_code && (
                          <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs font-medium">
                            Code Required
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">{discount.description}</p>
                    </div>
                    <button
                      onClick={() => toggleActive('discount', discount.id)}
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        discount.active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {discount.active ? 'Active' : 'Inactive'}
                    </button>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Discount:</span>
                      <span className="text-sm font-medium">
                        {discount.type === 'percentage' ? `${discount.amount}%` : `$${discount.amount}`}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Category:</span>
                      <span className="text-sm font-medium">{discount.category}</span>
                    </div>
                    {discount.discount_code && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Code:</span>
                        <span className="text-sm font-medium font-mono">{discount.discount_code}</span>
                      </div>
                    )}
                    {discount.valid_days?.length > 0 && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Valid Days:</span>
                        <span className="text-sm font-medium">{discount.valid_days.join(', ')}</span>
                      </div>
                    )}
                    {discount.valid_hours_start && discount.valid_hours_end && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Valid Hours:</span>
                        <span className="text-sm font-medium">
                          {discount.valid_hours_start} - {discount.valid_hours_end}
                        </span>
                      </div>
                    )}
                    {discount.max_uses_per_day && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Daily Limit:</span>
                        <span className="text-sm font-medium">{discount.max_uses_per_day} uses</span>
                      </div>
                    )}
                  </div>

                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEditDiscount(discount)}
                      className="flex-1 bg-red-50 text-red-600 px-3 py-2 rounded text-sm font-medium hover:bg-red-100"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete('discount', discount.id)}
                      className="flex-1 bg-gray-50 text-gray-600 px-3 py-2 rounded text-sm font-medium hover:bg-gray-100"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {discountPolicies.length === 0 && (
              <div className="text-center py-12">
                <span className="text-6xl mb-4 block">🏷️</span>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No discount policies configured</h3>
                <p className="text-gray-500 mb-4">Create discount policies for your restaurant</p>
                <button
                  onClick={() => setShowDiscountModal(true)}
                  className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
                >
                  Add Discount Policy
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add Tax Modal */}
      {showTaxModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-screen overflow-y-auto">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold">
                {editingItem ? 'Edit Tax Rate' : 'Add Tax Rate'}
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tax Name *</label>
                  <input
                    type="text"
                    value={taxForm.name}
                    onChange={(e) => setTaxForm({...taxForm, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., Sales Tax, VAT"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tax Rate *</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={taxForm.rate}
                      onChange={(e) => setTaxForm({...taxForm, rate: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      placeholder="8.25"
                    />
                    <span className="absolute right-3 top-2 text-gray-500">
                      {taxForm.type === 'percentage' ? '%' : '$'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tax Type</label>
                  <select
                    value={taxForm.type}
                    onChange={(e) => setTaxForm({...taxForm, type: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    {taxTypes.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select
                    value={taxForm.category}
                    onChange={(e) => setTaxForm({...taxForm, category: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    {taxCategories.map(category => (
                      <option key={category.value} value={category.value}>{category.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={taxForm.description}
                  onChange={(e) => setTaxForm({...taxForm, description: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  rows="2"
                  placeholder="Tax description"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Applies To</label>
                  <select
                    value={taxForm.applies_to}
                    onChange={(e) => setTaxForm({...taxForm, applies_to: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="subtotal">Subtotal</option>
                    <option value="total">Total with other taxes</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Jurisdiction</label>
                  <input
                    type="text"
                    value={taxForm.jurisdiction}
                    onChange={(e) => setTaxForm({...taxForm, jurisdiction: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., City, State, Federal"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tax ID</label>
                <input
                  type="text"
                  value={taxForm.tax_id}
                  onChange={(e) => setTaxForm({...taxForm, tax_id: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Tax identification number"
                />
              </div>

              {/* Order Type Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Apply Tax To</label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="tax-application"
                      checked={(taxForm.applies_to_order_types || []).length === 0}
                      onChange={() => setTaxForm({...taxForm, applies_to_order_types: []})}
                      className="mr-2"
                    />
                    <span className="text-sm font-medium text-gray-700">All Order Types</span>
                    <span className="text-xs text-gray-500 ml-2">(Dine-in, Takeout, Delivery, Phone Orders)</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="tax-application"
                      checked={(taxForm.applies_to_order_types || []).length > 0}
                      onChange={() => {
                        if ((taxForm.applies_to_order_types || []).length === 0) {
                          setTaxForm({...taxForm, applies_to_order_types: ['dine_in']});
                        }
                      }}
                      className="mr-2"
                    />
                    <span className="text-sm font-medium text-gray-700">Specific Order Types Only</span>
                  </label>
                </div>
                
                {/* Order Type Checkboxes - Only show when "Specific Order Types" is selected */}
                {(taxForm.applies_to_order_types || []).length > 0 && (
                  <div className="mt-3 ml-6 space-y-2 bg-gray-50 p-3 rounded-md">
                    <p className="text-sm font-medium text-gray-600 mb-2">Select which order types this tax applies to:</p>
                    {orderTypes.map(type => (
                      <label key={type} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={(taxForm.applies_to_order_types || []).includes(type)}
                          onChange={(e) => {
                            const currentTypes = taxForm.applies_to_order_types || [];
                            if (e.target.checked) {
                              setTaxForm({
                                ...taxForm, 
                                applies_to_order_types: [...currentTypes, type]
                              });
                            } else {
                              setTaxForm({
                                ...taxForm, 
                                applies_to_order_types: currentTypes.filter(t => t !== type)
                              });
                            }
                          }}
                          className="mr-2"
                        />
                        <span className="text-sm text-gray-700 capitalize">
                          {type.replace('_', '-')}
                          {type === 'dine_in' && ' (Restaurant)'}
                          {type === 'takeout' && ' (To-Go)'}
                          {type === 'delivery' && ' (Delivery)'}
                          {type === 'phone_order' && ' (Phone)'}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex space-x-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={taxForm.active}
                    onChange={(e) => setTaxForm({...taxForm, active: e.target.checked})}
                    className="mr-2"
                  />
                  <span className="text-sm font-medium text-gray-700">Active</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={taxForm.inclusive}
                    onChange={(e) => setTaxForm({...taxForm, inclusive: e.target.checked})}
                    className="mr-2"
                  />
                  <span className="text-sm font-medium text-gray-700">Tax Inclusive (included in item prices)</span>
                </label>
              </div>
            </div>
            <div className="p-6 border-t flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowTaxModal(false);
                  setEditingItem(null);
                  resetTaxForm();
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveTax}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                {editingItem ? 'Update' : 'Add'} Tax Rate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Additional modals for charges, gratuity, and discounts would go here - similar structure */}
      {/* I'll implement the key ones to keep the response manageable */}

      {/* Add Service Charge Modal */}
      {showChargeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-screen overflow-y-auto">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold">
                {editingItem ? 'Edit Service Charge' : 'Add Service Charge'}
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Charge Name *</label>
                  <input
                    type="text"
                    value={chargeForm.name}
                    onChange={(e) => setChargeForm({...chargeForm, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., Service Charge, Delivery Fee"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount *</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={chargeForm.amount}
                      onChange={(e) => setChargeForm({...chargeForm, amount: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      placeholder="18.00"
                    />
                    <span className="absolute right-3 top-2 text-gray-500">
                      {chargeForm.type === 'percentage' ? '%' : chargeForm.type === 'per_person' ? '/person' : '$'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Charge Type</label>
                  <select
                    value={chargeForm.type}
                    onChange={(e) => setChargeForm({...chargeForm, type: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    {chargeTypes.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Applies To</label>
                  <select
                    value={chargeForm.applies_to}
                    onChange={(e) => setChargeForm({...chargeForm, applies_to: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="subtotal">Subtotal</option>
                    <option value="total_with_tax">Total with Tax</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={chargeForm.description}
                  onChange={(e) => setChargeForm({...chargeForm, description: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  rows="2"
                  placeholder="Charge description"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Conditions</label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={chargeForm.conditions.includes('party_size')}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setChargeForm({...chargeForm, conditions: [...chargeForm.conditions, 'party_size']});
                        } else {
                          setChargeForm({...chargeForm, conditions: chargeForm.conditions.filter(c => c !== 'party_size')});
                        }
                      }}
                      className="mr-2"
                    />
                    <span className="text-sm">Apply based on party size</span>
                  </label>
                  {chargeForm.conditions.includes('party_size') && (
                    <input
                      type="number"
                      min="1"
                      value={chargeForm.party_size_threshold}
                      onChange={(e) => setChargeForm({...chargeForm, party_size_threshold: e.target.value})}
                      className="ml-6 w-24 px-2 py-1 border border-gray-300 rounded text-sm"
                      placeholder="6"
                    />
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Apply Service Charge To</label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="charge-application"
                      checked={chargeForm.order_types.length === 0}
                      onChange={() => setChargeForm({...chargeForm, order_types: []})}
                      className="mr-2"
                    />
                    <span className="text-sm font-medium text-gray-700">All Order Types</span>
                    <span className="text-xs text-gray-500 ml-2">(Dine-in, Takeout, Delivery, Phone Orders)</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="charge-application"
                      checked={chargeForm.order_types.length > 0}
                      onChange={() => {
                        if (chargeForm.order_types.length === 0) {
                          setChargeForm({...chargeForm, order_types: ['dine_in']});
                        }
                      }}
                      className="mr-2"
                    />
                    <span className="text-sm font-medium text-gray-700">Specific Order Types Only</span>
                  </label>
                </div>
                
                {/* Order Type Checkboxes - Only show when "Specific Order Types" is selected */}
                {chargeForm.order_types.length > 0 && (
                  <div className="mt-3 ml-6 space-y-2 bg-gray-50 p-3 rounded-md">
                    <p className="text-sm font-medium text-gray-600 mb-2">Select which order types this charge applies to:</p>
                    {orderTypes.map(type => (
                      <label key={type} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={chargeForm.order_types.includes(type)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setChargeForm({...chargeForm, order_types: [...chargeForm.order_types, type]});
                            } else {
                              setChargeForm({...chargeForm, order_types: chargeForm.order_types.filter(t => t !== type)});
                            }
                          }}
                          className="mr-2"
                        />
                        <span className="text-sm text-gray-700 capitalize">
                          {type.replace('_', '-')}
                          {type === 'dine_in' && ' (Restaurant)'}
                          {type === 'takeout' && ' (To-Go)'}
                          {type === 'delivery' && ' (Delivery)'}
                          {type === 'phone_order' && ' (Phone)'}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex space-x-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={chargeForm.active}
                    onChange={(e) => setChargeForm({...chargeForm, active: e.target.checked})}
                    className="mr-2"
                  />
                  <span className="text-sm font-medium text-gray-700">Active</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={chargeForm.mandatory}
                    onChange={(e) => setChargeForm({...chargeForm, mandatory: e.target.checked})}
                    className="mr-2"
                  />
                  <span className="text-sm font-medium text-gray-700">Mandatory (cannot be removed)</span>
                </label>
              </div>
            </div>
            <div className="p-6 border-t flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowChargeModal(false);
                  setEditingItem(null);
                  resetChargeForm();
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveCharge}
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
              >
                {editingItem ? 'Update' : 'Add'} Service Charge
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Gratuity Rule Modal */}
      {showGratuityModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-screen overflow-y-auto">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold">
                {editingItem ? 'Edit Gratuity Rule' : 'Add Gratuity Rule'}
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Rule Name *</label>
                  <input
                    type="text"
                    value={gratuityForm.name}
                    onChange={(e) => setGratuityForm({...gratuityForm, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., Large Party Gratuity"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount *</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={gratuityForm.amount}
                      onChange={(e) => setGratuityForm({...gratuityForm, amount: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      placeholder="20.00"
                    />
                    <span className="absolute right-3 top-2 text-gray-500">
                      {gratuityForm.type === 'percentage' ? '%' : '$'}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={gratuityForm.description}
                  onChange={(e) => setGratuityForm({...gratuityForm, description: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  rows="2"
                  placeholder="Gratuity rule description"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Trigger Condition</label>
                  <select
                    value={gratuityForm.trigger_condition}
                    onChange={(e) => setGratuityForm({...gratuityForm, trigger_condition: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="party_size">Party Size</option>
                    <option value="order_amount">Order Amount</option>
                    <option value="manual">Manual Only</option>
                  </select>
                </div>
                <div>
                  {gratuityForm.trigger_condition === 'party_size' ? (
                    <>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Minimum Party Size</label>
                      <input
                        type="number"
                        min="1"
                        value={gratuityForm.party_size_min}
                        onChange={(e) => setGratuityForm({...gratuityForm, party_size_min: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        placeholder="6"
                      />
                    </>
                  ) : gratuityForm.trigger_condition === 'order_amount' ? (
                    <>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Minimum Order Amount</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={gratuityForm.order_amount_min}
                        onChange={(e) => setGratuityForm({...gratuityForm, order_amount_min: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        placeholder="200.00"
                      />
                    </>
                  ) : null}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Applies to Order Types</label>
                <div className="grid grid-cols-2 gap-2">
                  {orderTypes.map(type => (
                    <label key={type} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={gratuityForm.applies_to_order_types.includes(type)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setGratuityForm({...gratuityForm, applies_to_order_types: [...gratuityForm.applies_to_order_types, type]});
                          } else {
                            setGratuityForm({...gratuityForm, applies_to_order_types: gratuityForm.applies_to_order_types.filter(t => t !== type)});
                          }
                        }}
                        className="mr-2"
                      />
                      <span className="text-sm">{type.replace('_', ' ')}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex space-x-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={gratuityForm.auto_apply}
                    onChange={(e) => setGratuityForm({...gratuityForm, auto_apply: e.target.checked})}
                    className="mr-2"
                  />
                  <span className="text-sm font-medium text-gray-700">Auto-apply when conditions are met</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={gratuityForm.customer_can_modify}
                    onChange={(e) => setGratuityForm({...gratuityForm, customer_can_modify: e.target.checked})}
                    className="mr-2"
                  />
                  <span className="text-sm font-medium text-gray-700">Customer can modify amount</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={gratuityForm.active}
                    onChange={(e) => setGratuityForm({...gratuityForm, active: e.target.checked})}
                    className="mr-2"
                  />
                  <span className="text-sm font-medium text-gray-700">Active</span>
                </label>
              </div>
            </div>
            <div className="p-6 border-t flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowGratuityModal(false);
                  setEditingItem(null);
                  resetGratuityForm();
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveGratuity}
                className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700"
              >
                {editingItem ? 'Update' : 'Add'} Gratuity Rule
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Discount Policy Modal */}
      {showDiscountModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-screen overflow-y-auto">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold">
                {editingItem ? 'Edit Discount Policy' : 'Add Discount Policy'}
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Discount Name *</label>
                  <input
                    type="text"
                    value={discountForm.name}
                    onChange={(e) => setDiscountForm({...discountForm, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., Employee Discount"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Discount Amount *</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={discountForm.amount}
                      onChange={(e) => setDiscountForm({...discountForm, amount: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      placeholder="25.00"
                    />
                    <span className="absolute right-3 top-2 text-gray-500">
                      {discountForm.type === 'percentage' ? '%' : '$'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Discount Type</label>
                  <select
                    value={discountForm.type}
                    onChange={(e) => setDiscountForm({...discountForm, type: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="percentage">Percentage</option>
                    <option value="fixed">Fixed Amount</option>
                    <option value="buy_one_get_one">Buy One Get One</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select
                    value={discountForm.category}
                    onChange={(e) => setDiscountForm({...discountForm, category: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="general">General</option>
                    <option value="employee">Employee</option>
                    <option value="senior">Senior Citizen</option>
                    <option value="student">Student</option>
                    <option value="military">Military</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={discountForm.description}
                  onChange={(e) => setDiscountForm({...discountForm, description: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  rows="2"
                  placeholder="Discount description"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Minimum Order Amount</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={discountForm.minimum_order_amount}
                    onChange={(e) => setDiscountForm({...discountForm, minimum_order_amount: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="50.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Daily Usage Limit</label>
                  <input
                    type="number"
                    min="1"
                    value={discountForm.max_uses_per_day}
                    onChange={(e) => setDiscountForm({...discountForm, max_uses_per_day: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="50"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={discountForm.requires_code}
                    onChange={(e) => setDiscountForm({...discountForm, requires_code: e.target.checked})}
                    className="mr-2"
                  />
                  <span className="text-sm font-medium text-gray-700">Requires discount code</span>
                </label>
                {discountForm.requires_code && (
                  <input
                    type="text"
                    value={discountForm.discount_code}
                    onChange={(e) => setDiscountForm({...discountForm, discount_code: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="DISCOUNT CODE"
                  />
                )}
              </div>

              <div className="flex space-x-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={discountForm.stackable}
                    onChange={(e) => setDiscountForm({...discountForm, stackable: e.target.checked})}
                    className="mr-2"
                  />
                  <span className="text-sm font-medium text-gray-700">Stackable with other discounts</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={discountForm.active}
                    onChange={(e) => setDiscountForm({...discountForm, active: e.target.checked})}
                    className="mr-2"
                  />
                  <span className="text-sm font-medium text-gray-700">Active</span>
                </label>
              </div>
            </div>
            <div className="p-6 border-t flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowDiscountModal(false);
                  setEditingItem(null);
                  resetDiscountForm();
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveDiscount}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                {editingItem ? 'Update' : 'Add'} Discount Policy
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

// Staff Management Component
const StaffManagementComponent = ({ onBack }) => {
  const [staff, setStaff] = useState([]);
  const [timeEntries, setTimeEntries] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('employees');
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [showAddEmployeeModal, setShowAddEmployeeModal] = useState(false);
  const [showEditEmployeeModal, setShowEditEmployeeModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showTimeEntryModal, setShowTimeEntryModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  const [employeeForm, setEmployeeForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    role: 'employee',
    pin: '',
    hourly_rate: '15.00',
    active: true,
    hire_date: '',
    department: '',
    emergency_contact: '',
    emergency_phone: ''
  });

  const [scheduleForm, setScheduleForm] = useState({
    employee_id: '',
    day_of_week: 'monday',
    start_time: '09:00',
    end_time: '17:00',
    is_working_day: true
  });

  const [timeEntryForm, setTimeEntryForm] = useState({
    employee_id: '',
    date: new Date().toISOString().split('T')[0],
    clock_in: '',
    clock_out: '',
    break_minutes: '30',
    notes: ''
  });

  const roles = [
    { value: 'employee', label: 'Employee', permissions: ['take_orders', 'process_payments'] },
    { value: 'manager', label: 'Manager', permissions: ['take_orders', 'process_payments', 'manage_staff', 'view_reports', 'manage_inventory'] },
    { value: 'admin', label: 'Admin', permissions: ['all'] }
  ];

  const departments = ['Kitchen', 'Service', 'Bar', 'Management', 'Cleaning'];
  const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

  useEffect(() => {
    fetchStaffData();
  }, []);

  const fetchStaffData = async () => {
    try {
      setLoading(true);
      const [staffRes, timeEntriesRes] = await Promise.all([
        axios.get(`${API}/auth/users`),
        // Mock time entries for now - would be real API call
        Promise.resolve({ data: generateMockTimeEntries() })
      ]);

      setStaff(staffRes.data);
      setTimeEntries(timeEntriesRes.data);
      setSchedules(generateMockSchedules(staffRes.data));
    } catch (error) {
      console.error('Error fetching staff data:', error);
      alert('Failed to load staff data');
    } finally {
      setLoading(false);
    }
  };

  const generateMockTimeEntries = () => {
    // Generate sample time entries for the last 7 days
    const entries = [];
    const today = new Date();
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      
      entries.push({
        id: `entry-${i}`,
        employee_id: 'emp-1',
        date: date.toISOString().split('T')[0],
        clock_in: '09:00',
        clock_out: i === 0 ? null : '17:00', // Today is still clocked in
        break_minutes: 30,
        total_hours: i === 0 ? null : 7.5,
        notes: ''
      });
    }
    return entries;
  };

  const generateMockSchedules = (staffList) => {
    const schedules = [];
    staffList.forEach(employee => {
      daysOfWeek.forEach((day, index) => {
        schedules.push({
          id: `schedule-${employee.id}-${day}`,
          employee_id: employee.id,
          day_of_week: day,
          start_time: index < 5 ? '09:00' : '10:00', // Weekday vs weekend
          end_time: index < 5 ? '17:00' : '18:00',
          is_working_day: index < 6 // Sunday off
        });
      });
    });
    return schedules;
  };

  const handleAddEmployee = async () => {
    if (!employeeForm.full_name || !employeeForm.email || !employeeForm.pin) {
      alert('Please fill in all required fields (Name, Email, PIN)');
      return;
    }

    if (employeeForm.pin.length !== 4) {
      alert('PIN must be exactly 4 digits');
      return;
    }

    try {
      const employeeData = {
        full_name: employeeForm.full_name,
        email: employeeForm.email,
        phone: employeeForm.phone || '',
        role: employeeForm.role,
        pin: employeeForm.pin,
        hourly_rate: parseFloat(employeeForm.hourly_rate) || 15.00,
        active: employeeForm.active
      };

      console.log('Sending employee data:', employeeData);
      
      const response = await axios.post(`${API}/auth/register`, employeeData);
      console.log('Employee creation response:', response);
      
      alert('Employee added successfully');
      setShowAddEmployeeModal(false);
      resetEmployeeForm();
      fetchStaffData();
    } catch (error) {
      console.error('Error adding employee:', error);
      
      let errorMessage = 'Failed to add employee';
      
      if (error.response) {
        // Server responded with error status
        if (error.response.data) {
          if (typeof error.response.data === 'string') {
            errorMessage = error.response.data;
          } else if (error.response.data.detail) {
            errorMessage = error.response.data.detail;
          } else if (error.response.data.message) {
            errorMessage = error.response.data.message;
          } else {
            errorMessage = `Server error: ${error.response.status}`;
          }
        } else {
          errorMessage = `Server error: ${error.response.status}`;
        }
      } else if (error.request) {
        // Network error
        errorMessage = 'Network error: Unable to connect to server';
      } else {
        // Other error
        errorMessage = error.message || 'Unknown error occurred';
      }
      
      alert(errorMessage);
    }
  };

  const handleEditEmployee = (employee) => {
    setEmployeeForm({
      full_name: employee.full_name,
      email: employee.email,
      phone: employee.phone || '',
      role: employee.role,
      pin: '', // Don't pre-fill PIN for security
      hourly_rate: employee.hourly_rate?.toString() || '15.00',
      active: employee.active !== false,
      hire_date: employee.hire_date || '',
      department: employee.department || '',
      emergency_contact: employee.emergency_contact || '',
      emergency_phone: employee.emergency_phone || ''
    });
    setEditingEmployee(employee);
    setShowEditEmployeeModal(true);
  };

  const handleUpdateEmployee = async () => {
    if (!employeeForm.full_name || !employeeForm.email) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      const updateData = {
        full_name: employeeForm.full_name,
        email: employeeForm.email,
        phone: employeeForm.phone || '',
        role: employeeForm.role,
        hourly_rate: parseFloat(employeeForm.hourly_rate) || 15.00,
        active: employeeForm.active
      };

      if (employeeForm.pin && employeeForm.pin.length === 4) {
        updateData.pin = employeeForm.pin;
      }

      console.log('Updating employee with data:', updateData);

      const response = await axios.put(`${API}/auth/users/${editingEmployee.id}`, updateData);
      console.log('Employee update response:', response);
      
      alert('Employee updated successfully');
      setShowEditEmployeeModal(false);
      setEditingEmployee(null);
      resetEmployeeForm();
      fetchStaffData();
    } catch (error) {
      console.error('Error updating employee:', error);
      
      let errorMessage = 'Failed to update employee';
      
      if (error.response) {
        if (error.response.data) {
          if (typeof error.response.data === 'string') {
            errorMessage = error.response.data;
          } else if (error.response.data.detail) {
            errorMessage = error.response.data.detail;
          } else if (error.response.data.message) {
            errorMessage = error.response.data.message;
          } else {
            errorMessage = `Server error: ${error.response.status}`;
          }
        } else {
          errorMessage = `Server error: ${error.response.status}`;
        }
      } else if (error.request) {
        errorMessage = 'Network error: Unable to connect to server';
      } else {
        errorMessage = error.message || 'Unknown error occurred';
      }
      
      alert(errorMessage);
    }
  };

  const handleDeleteEmployee = async (employee) => {
    if (window.confirm(`Are you sure you want to delete ${employee.full_name}?`)) {
      try {
        await axios.delete(`${API}/auth/users/${employee.id}`);
        alert('Employee deleted successfully');
        fetchStaffData();
      } catch (error) {
        console.error('Error deleting employee:', error);
        alert('Failed to delete employee');
      }
    }
  };

  const handleClockInOut = async (employee) => {
    // Mock clock in/out functionality
    const today = new Date().toISOString().split('T')[0];
    const currentTime = new Date().toTimeString().slice(0, 5);
    
    const existingEntry = timeEntries.find(entry => 
      entry.employee_id === employee.id && 
      entry.date === today && 
      !entry.clock_out
    );

    if (existingEntry) {
      // Clock out
      const updatedEntries = timeEntries.map(entry => 
        entry.id === existingEntry.id 
          ? { ...entry, clock_out: currentTime, total_hours: calculateHours(entry.clock_in, currentTime) }
          : entry
      );
      setTimeEntries(updatedEntries);
      alert(`${employee.full_name} clocked out at ${currentTime}`);
    } else {
      // Clock in
      const newEntry = {
        id: `entry-${Date.now()}`,
        employee_id: employee.id,
        date: today,
        clock_in: currentTime,
        clock_out: null,
        break_minutes: 0,
        total_hours: null,
        notes: ''
      };
      setTimeEntries([...timeEntries, newEntry]);
      alert(`${employee.full_name} clocked in at ${currentTime}`);
    }
  };

  const calculateHours = (clockIn, clockOut) => {
    const [inHour, inMinute] = clockIn.split(':').map(Number);
    const [outHour, outMinute] = clockOut.split(':').map(Number);
    
    const inMinutes = inHour * 60 + inMinute;
    const outMinutes = outHour * 60 + outMinute;
    
    return ((outMinutes - inMinutes) / 60).toFixed(2);
  };

  const resetEmployeeForm = () => {
    setEmployeeForm({
      full_name: '',
      email: '',
      phone: '',
      role: 'employee',
      pin: '',
      hourly_rate: '15.00',
      active: true,
      hire_date: '',
      department: '',
      emergency_contact: '',
      emergency_phone: ''
    });
  };

  const getEmployeeStatus = (employee) => {
    const today = new Date().toISOString().split('T')[0];
    const todayEntry = timeEntries.find(entry => 
      entry.employee_id === employee.id && entry.date === today
    );

    if (todayEntry && !todayEntry.clock_out) {
      return { status: 'clocked_in', color: 'bg-green-100 text-green-800', time: todayEntry.clock_in };
    }
    if (todayEntry && todayEntry.clock_out) {
      return { status: 'clocked_out', color: 'bg-gray-100 text-gray-800', time: todayEntry.clock_out };
    }
    return { status: 'not_started', color: 'bg-yellow-100 text-yellow-800', time: null };
  };

  const getEmployeeSchedule = (employeeId) => {
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    return schedules.find(schedule => 
      schedule.employee_id === employeeId && schedule.day_of_week === today
    );
  };

  const getWeeklyHours = (employeeId) => {
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Start of week
    
    const weeklyEntries = timeEntries.filter(entry => {
      const entryDate = new Date(entry.date);
      return entry.employee_id === employeeId && 
             entryDate >= weekStart && 
             entry.total_hours;
    });
    
    return weeklyEntries.reduce((total, entry) => total + parseFloat(entry.total_hours || 0), 0);
  };

  const filteredStaff = staff.filter(employee => {
    const matchesSearch = employee.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         employee.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'all' || employee.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const staffStats = {
    total: staff.length,
    active: staff.filter(emp => emp.active !== false).length,
    managers: staff.filter(emp => emp.role === 'manager').length,
    employees: staff.filter(emp => emp.role === 'employee').length,
    clockedIn: staff.filter(emp => getEmployeeStatus(emp).status === 'clocked_in').length
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading staff data...</p>
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
            <h1 className="text-2xl font-bold text-gray-800">Staff Management</h1>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setShowAddEmployeeModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
            >
              <span>+</span>
              <span>Add Employee</span>
            </button>
          </div>
        </div>
      </div>

      {/* Stats Dashboard */}
      <div className="bg-white border-b p-6">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-800">{staffStats.total}</div>
            <div className="text-sm text-gray-600">Total Staff</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{staffStats.clockedIn}</div>
            <div className="text-sm text-gray-600">Clocked In</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{staffStats.active}</div>
            <div className="text-sm text-gray-600">Active</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{staffStats.managers}</div>
            <div className="text-sm text-gray-600">Managers</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">{staffStats.employees}</div>
            <div className="text-sm text-gray-600">Employees</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b">
        <div className="flex space-x-8 px-6">
          {[
            { id: 'employees', name: 'Employees', icon: '👥' },
            { id: 'schedules', name: 'Schedules', icon: '📅' },
            { id: 'timesheet', name: 'Time & Attendance', icon: '⏰' },
            { id: 'permissions', name: 'Roles & Permissions', icon: '🔐' }
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
        {/* Employees Tab */}
        {activeTab === 'employees' && (
          <div className="space-y-6">
            {/* Search and Filter */}
            <div className="bg-white p-4 rounded-lg border">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
                <div className="flex flex-col md:flex-row md:items-center space-y-2 md:space-y-0 md:space-x-4">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search employees..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full md:w-64 px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    />
                    <span className="absolute right-3 top-2.5 text-gray-400">🔍</span>
                  </div>
                  <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="all">All Roles</option>
                    {roles.map(role => (
                      <option key={role.value} value={role.value}>
                        {role.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="text-sm text-gray-600">
                  {filteredStaff.length} employees found
                </div>
              </div>
            </div>

            {/* Employee Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredStaff.map(employee => {
                const status = getEmployeeStatus(employee);
                const schedule = getEmployeeSchedule(employee.id);
                const weeklyHours = getWeeklyHours(employee.id);
                
                return (
                  <div key={employee.id} className="bg-white border rounded-lg p-6 hover:shadow-lg transition-shadow">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                          {employee.full_name?.charAt(0)?.toUpperCase() || 'U'}
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg text-gray-800">{employee.full_name}</h3>
                          <p className="text-sm text-gray-600">{employee.email}</p>
                        </div>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${status.color}`}>
                        {status.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Role:</span>
                        <span className="text-sm font-medium">{employee.role}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Hourly Rate:</span>
                        <span className="text-sm font-medium">${employee.hourly_rate || '15.00'}/hr</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Weekly Hours:</span>
                        <span className="text-sm font-medium">{weeklyHours.toFixed(1)}h</span>
                      </div>
                      {schedule && (
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Today's Schedule:</span>
                          <span className="text-sm font-medium">
                            {schedule.is_working_day ? `${schedule.start_time}-${schedule.end_time}` : 'Off'}
                          </span>
                        </div>
                      )}
                      {status.time && (
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">
                            {status.status === 'clocked_in' ? 'Clocked In:' : 'Clocked Out:'}
                          </span>
                          <span className="text-sm font-medium">{status.time}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleClockInOut(employee)}
                        className={`flex-1 px-3 py-2 rounded text-sm font-medium ${
                          status.status === 'clocked_in'
                            ? 'bg-red-100 text-red-700 hover:bg-red-200'
                            : 'bg-green-100 text-green-700 hover:bg-green-200'
                        }`}
                      >
                        {status.status === 'clocked_in' ? 'Clock Out' : 'Clock In'}
                      </button>
                      <button
                        onClick={() => handleEditEmployee(employee)}
                        className="px-3 py-2 bg-blue-100 text-blue-700 rounded text-sm font-medium hover:bg-blue-200"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteEmployee(employee)}
                        className="px-3 py-2 bg-red-100 text-red-700 rounded text-sm font-medium hover:bg-red-200"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {filteredStaff.length === 0 && (
              <div className="text-center py-12">
                <span className="text-6xl mb-4 block">👥</span>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No employees found</h3>
                <p className="text-gray-500 mb-4">Get started by adding your first employee</p>
                <button
                  onClick={() => setShowAddEmployeeModal(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                  Add Employee
                </button>
              </div>
            )}
          </div>
        )}

        {/* Schedules Tab */}
        {activeTab === 'schedules' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Employee Schedules</h2>
              <button
                onClick={() => setShowScheduleModal(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                Manage Schedules
              </button>
            </div>

            <div className="bg-white border rounded-lg overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Employee
                    </th>
                    {daysOfWeek.map(day => (
                      <th key={day} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {day.slice(0, 3)}
                      </th>
                    ))}
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Weekly Hours
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {staff.map(employee => {
                    const employeeSchedules = schedules.filter(s => s.employee_id === employee.id);
                    const weeklyScheduledHours = employeeSchedules
                      .filter(s => s.is_working_day)
                      .reduce((total, s) => {
                        const [startHour, startMin] = s.start_time.split(':').map(Number);
                        const [endHour, endMin] = s.end_time.split(':').map(Number);
                        const hours = (endHour * 60 + endMin - startHour * 60 - startMin) / 60;
                        return total + hours;
                      }, 0);

                    return (
                      <tr key={employee.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                              {employee.full_name?.charAt(0)?.toUpperCase() || 'U'}
                            </div>
                            <div className="ml-3">
                              <div className="text-sm font-medium text-gray-900">{employee.full_name}</div>
                              <div className="text-sm text-gray-500">{employee.role}</div>
                            </div>
                          </div>
                        </td>
                        {daysOfWeek.map(day => {
                          const daySchedule = employeeSchedules.find(s => s.day_of_week === day);
                          return (
                            <td key={day} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {daySchedule?.is_working_day ? (
                                <div className="text-center">
                                  <div className="font-medium">{daySchedule.start_time}</div>
                                  <div className="text-gray-500">to</div>
                                  <div className="font-medium">{daySchedule.end_time}</div>
                                </div>
                              ) : (
                                <div className="text-center text-gray-400">Off</div>
                              )}
                            </td>
                          );
                        })}
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {weeklyScheduledHours.toFixed(1)}h
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Time & Attendance Tab */}
        {activeTab === 'timesheet' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Time & Attendance</h2>
              <button
                onClick={() => setShowTimeEntryModal(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                Add Time Entry
              </button>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-lg border">
                <div className="text-2xl font-bold text-green-600">{staffStats.clockedIn}</div>
                <div className="text-sm text-gray-600">Currently Clocked In</div>
              </div>
              <div className="bg-white p-4 rounded-lg border">
                <div className="text-2xl font-bold text-blue-600">
                  {timeEntries.filter(e => e.date === new Date().toISOString().split('T')[0]).length}
                </div>
                <div className="text-sm text-gray-600">Today's Entries</div>
              </div>
              <div className="bg-white p-4 rounded-lg border">
                <div className="text-2xl font-bold text-purple-600">
                  {timeEntries.filter(e => e.total_hours).reduce((sum, e) => sum + parseFloat(e.total_hours), 0).toFixed(1)}h
                </div>
                <div className="text-sm text-gray-600">Total Hours This Week</div>
              </div>
              <div className="bg-white p-4 rounded-lg border">
                <div className="text-2xl font-bold text-orange-600">
                  ${(timeEntries.filter(e => e.total_hours).reduce((sum, e) => sum + parseFloat(e.total_hours), 0) * 15).toFixed(2)}
                </div>
                <div className="text-sm text-gray-600">Estimated Payroll</div>
              </div>
            </div>

            {/* Time Entries Table */}
            <div className="bg-white border rounded-lg overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Employee
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Clock In
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Clock Out
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Hours
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {timeEntries.slice(0, 20).map(entry => {
                    const employee = staff.find(emp => emp.id === entry.employee_id);
                    const isActive = !entry.clock_out;
                    
                    return (
                      <tr key={entry.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {employee?.full_name || 'Unknown Employee'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(entry.date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {entry.clock_in}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {entry.clock_out || (
                            <span className="text-green-600 font-medium">Active</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {entry.total_hours ? `${entry.total_hours}h` : (
                            <span className="text-blue-600">In Progress</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            isActive 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {isActive ? 'Clocked In' : 'Completed'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Roles & Permissions Tab */}
        {activeTab === 'permissions' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">Roles & Permissions</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {roles.map(role => {
                const roleEmployees = staff.filter(emp => emp.role === role.value);
                
                return (
                  <div key={role.value} className="bg-white border rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-800">{role.label}</h3>
                      <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm font-medium">
                        {roleEmployees.length} people
                      </span>
                    </div>
                    
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Permissions:</h4>
                      <div className="space-y-1">
                        {role.permissions.map(permission => (
                          <div key={permission} className="flex items-center text-sm">
                            <span className="text-green-500 mr-2">✓</span>
                            <span className="text-gray-600">
                              {permission.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Employees:</h4>
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {roleEmployees.map(employee => (
                          <div key={employee.id} className="text-sm text-gray-600">
                            {employee.full_name}
                          </div>
                        ))}
                        {roleEmployees.length === 0 && (
                          <div className="text-sm text-gray-400 italic">No employees with this role</div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Add Employee Modal */}
      {showAddEmployeeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-screen overflow-y-auto">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold">Add New Employee</h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    value={employeeForm.full_name}
                    onChange={(e) => setEmployeeForm({...employeeForm, full_name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter full name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                  <input
                    type="email"
                    value={employeeForm.email}
                    onChange={(e) => setEmployeeForm({...employeeForm, email: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter email"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={employeeForm.phone}
                    onChange={(e) => setEmployeeForm({...employeeForm, phone: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter phone number"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                  <select
                    value={employeeForm.department}
                    onChange={(e) => setEmployeeForm({...employeeForm, department: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select Department</option>
                    {departments.map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role *</label>
                  <select
                    value={employeeForm.role}
                    onChange={(e) => setEmployeeForm({...employeeForm, role: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    {roles.map(role => (
                      <option key={role.value} value={role.value}>{role.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">PIN (4 digits) *</label>
                  <input
                    type="password"
                    maxLength="4"
                    value={employeeForm.pin}
                    onChange={(e) => setEmployeeForm({...employeeForm, pin: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="4-digit PIN"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Hourly Rate ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={employeeForm.hourly_rate}
                    onChange={(e) => setEmployeeForm({...employeeForm, hourly_rate: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="15.00"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Hire Date</label>
                  <input
                    type="date"
                    value={employeeForm.hire_date}
                    onChange={(e) => setEmployeeForm({...employeeForm, hire_date: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div className="flex items-center">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={employeeForm.active}
                      onChange={(e) => setEmployeeForm({...employeeForm, active: e.target.checked})}
                      className="mr-2"
                    />
                    <span className="text-sm font-medium text-gray-700">Active Employee</span>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Emergency Contact</label>
                  <input
                    type="text"
                    value={employeeForm.emergency_contact}
                    onChange={(e) => setEmployeeForm({...employeeForm, emergency_contact: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Emergency contact name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Emergency Phone</label>
                  <input
                    type="tel"
                    value={employeeForm.emergency_phone}
                    onChange={(e) => setEmployeeForm({...employeeForm, emergency_phone: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Emergency contact phone"
                  />
                </div>
              </div>
            </div>
            <div className="p-6 border-t flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowAddEmployeeModal(false);
                  resetEmployeeForm();
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleAddEmployee}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Add Employee
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Employee Modal */}
      {showEditEmployeeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-screen overflow-y-auto">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold">Edit Employee</h2>
            </div>
            <div className="p-6 space-y-4">
              {/* Same form fields as Add Employee */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    value={employeeForm.full_name}
                    onChange={(e) => setEmployeeForm({...employeeForm, full_name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                  <input
                    type="email"
                    value={employeeForm.email}
                    onChange={(e) => setEmployeeForm({...employeeForm, email: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <select
                    value={employeeForm.role}
                    onChange={(e) => setEmployeeForm({...employeeForm, role: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    {roles.map(role => (
                      <option key={role.value} value={role.value}>{role.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">New PIN (4 digits)</label>
                  <input
                    type="password"
                    maxLength="4"
                    value={employeeForm.pin}
                    onChange={(e) => setEmployeeForm({...employeeForm, pin: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Leave empty to keep current"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Hourly Rate ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={employeeForm.hourly_rate}
                    onChange={(e) => setEmployeeForm({...employeeForm, hourly_rate: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={employeeForm.active}
                    onChange={(e) => setEmployeeForm({...employeeForm, active: e.target.checked})}
                    className="mr-2"
                  />
                  <span className="text-sm font-medium text-gray-700">Active Employee</span>
                </label>
              </div>
            </div>
            <div className="p-6 border-t flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowEditEmployeeModal(false);
                  setEditingEmployee(null);
                  resetEmployeeForm();
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateEmployee}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Update Employee
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Floor Plan Designer Component
const FloorPlanDesigner = ({ tables, onUpdateTablePosition, onSaveFloorPlan, onLoadFloorPlan }) => {
  const [floorPlanData, setFloorPlanData] = useState({});
  const [rooms, setRooms] = useState([]);
  const [selectedTool, setSelectedTool] = useState('select'); // select, table, room, wall
  const [draggedTable, setDraggedTable] = useState(null);
  const [selectedTable, setSelectedTable] = useState(null);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [floorPlanName, setFloorPlanName] = useState('');
  const [savedFloorPlans, setSavedFloorPlans] = useState([]);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  const canvasRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  useEffect(() => {
    loadFloorPlan();
    loadSavedFloorPlans();
  }, []);

  const loadFloorPlan = () => {
    const data = onLoadFloorPlan();
    setFloorPlanData(data.tables || {});
    setRooms(data.rooms || []);
    if (data.canvasSize) setCanvasSize(data.canvasSize);
  };

  const loadSavedFloorPlans = () => {
    try {
      const floorPlans = JSON.parse(localStorage.getItem('floorPlans') || '{}');
      setSavedFloorPlans(Object.keys(floorPlans));
    } catch (error) {
      console.error('Error loading saved floor plans:', error);
    }
  };

  const saveCurrentFloorPlan = (name) => {
    const data = {
      tables: floorPlanData,
      rooms: rooms,
      canvasSize: canvasSize,
      createdAt: new Date().toISOString()
    };
    onSaveFloorPlan(data, name);
    loadSavedFloorPlans();
  };

  const handleTableDragStart = (e, table) => {
    if (selectedTool !== 'select') return;
    setDraggedTable(table);
    setIsDragging(true);
    
    const rect = canvasRef.current.getBoundingClientRect();
    setDragStart({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  const handleTableDragEnd = (e) => {
    if (!draggedTable || !isDragging) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left - pan.x) / zoom;
    const y = (e.clientY - rect.top - pan.y) / zoom;

    const newPosition = { x: Math.max(0, x), y: Math.max(0, y) };
    
    setFloorPlanData(prev => ({
      ...prev,
      [draggedTable.id]: {
        ...prev[draggedTable.id],
        ...newPosition
      }
    }));

    onUpdateTablePosition(draggedTable.id, newPosition);
    setDraggedTable(null);
    setIsDragging(false);
  };

  const handleCanvasClick = (e) => {
    if (selectedTool === 'table') {
      // Add new table at click position
      const rect = canvasRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left - pan.x) / zoom;
      const y = (e.clientY - rect.top - pan.y) / zoom;
      // This would trigger adding a new table
      alert('Table addition from canvas coming soon - use Add Table button for now');
    }
  };

  const getTablePosition = (table) => {
    const position = floorPlanData[table.id];
    if (position) {
      return { x: position.x || 0, y: position.y || 0 };
    }
    // Default grid positioning for tables without saved positions
    const index = tables.findIndex(t => t.id === table.id);
    return {
      x: (index % 10) * 80 + 20,
      y: Math.floor(index / 10) * 80 + 20
    };
  };

  const getTableStyle = (table) => {
    const position = getTablePosition(table);
    const status = table.status;
    
    let backgroundColor = '#f3f4f6';
    let borderColor = '#d1d5db';
    
    switch (status) {
      case 'available':
        backgroundColor = '#dcfce7';
        borderColor = '#16a34a';
        break;
      case 'occupied':
        backgroundColor = '#fecaca';
        borderColor = '#dc2626';
        break;
      case 'needs_cleaning':
        backgroundColor = '#fef3c7';
        borderColor = '#d97706';
        break;
      case 'reserved':
        backgroundColor = '#dbeafe';
        borderColor = '#2563eb';
        break;
    }

    return {
      position: 'absolute',
      left: position.x * zoom + pan.x,
      top: position.y * zoom + pan.y,
      width: 60 * zoom,
      height: 60 * zoom,
      backgroundColor,
      border: `2px solid ${borderColor}`,
      borderRadius: '8px',
      cursor: selectedTool === 'select' ? 'grab' : 'default',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: `${12 * zoom}px`,
      fontWeight: 'bold',
      userSelect: 'none',
      zIndex: selectedTable?.id === table.id ? 1000 : 1,
      boxShadow: selectedTable?.id === table.id ? '0 0 0 3px rgba(59, 130, 246, 0.5)' : 'none'
    };
  };

  const exportFloorPlan = () => {
    const data = {
      tables: floorPlanData,
      rooms: rooms,
      canvasSize: canvasSize,
      exportedAt: new Date().toISOString(),
      version: '1.0'
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `floor-plan-${floorPlanName || 'default'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importFloorPlan = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        setFloorPlanData(data.tables || {});
        setRooms(data.rooms || []);
        if (data.canvasSize) setCanvasSize(data.canvasSize);
        alert('Floor plan imported successfully');
      } catch (error) {
        alert('Error importing floor plan: Invalid file format');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="bg-white border rounded-lg overflow-hidden">
      {/* Toolbar */}
      <div className="border-b p-4 bg-gray-50">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <h3 className="font-semibold text-gray-800">Floor Plan Designer</h3>
            <div className="flex bg-white border rounded-lg overflow-hidden">
              {[
                { id: 'select', icon: '👆', label: 'Select' },
                { id: 'table', icon: '🪑', label: 'Add Table' },
                { id: 'room', icon: '🏠', label: 'Add Room' },
                { id: 'wall', icon: '🧱', label: 'Add Wall' }
              ].map(tool => (
                <button
                  key={tool.id}
                  onClick={() => setSelectedTool(tool.id)}
                  className={`px-3 py-2 text-sm font-medium ${
                    selectedTool === tool.id 
                      ? 'bg-blue-600 text-white' 
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                  title={tool.label}
                >
                  {tool.icon}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Zoom Controls */}
            <div className="flex items-center space-x-2 bg-white border rounded-lg px-2 py-1">
              <button
                onClick={() => setZoom(Math.max(0.25, zoom - 0.25))}
                className="p-1 hover:bg-gray-100 rounded"
              >
                🔍-
              </button>
              <span className="text-sm font-medium">{Math.round(zoom * 100)}%</span>
              <button
                onClick={() => setZoom(Math.min(3, zoom + 0.25))}
                className="p-1 hover:bg-gray-100 rounded"
              >
                🔍+
              </button>
            </div>

            {/* Action Buttons */}
            <button
              onClick={() => setShowSaveModal(true)}
              className="bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 text-sm"
            >
              💾 Save
            </button>
            <button
              onClick={() => setShowLoadModal(true)}
              className="bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 text-sm"
            >
              📂 Load
            </button>
            <button
              onClick={() => setShowExportModal(true)}
              className="bg-purple-600 text-white px-3 py-2 rounded-lg hover:bg-purple-700 text-sm"
            >
              📤 Export
            </button>
          </div>
        </div>

        {/* Status Bar */}
        <div className="flex items-center justify-between mt-2 text-sm text-gray-600">
          <div>
            Tool: <span className="font-medium">{selectedTool.charAt(0).toUpperCase() + selectedTool.slice(1)}</span>
            {selectedTable && (
              <span className="ml-4">
                Selected: <span className="font-medium">{selectedTable.name || `Table ${selectedTable.number}`}</span>
              </span>
            )}
          </div>
          <div>
            Tables: {tables.length} | 
            Canvas: {canvasSize.width}×{canvasSize.height} | 
            Zoom: {Math.round(zoom * 100)}%
          </div>
        </div>
      </div>

      {/* Canvas */}
      <div className="relative overflow-hidden bg-gray-100" style={{ height: '600px' }}>
        <div
          ref={canvasRef}
          className="relative w-full h-full cursor-crosshair"
          onClick={handleCanvasClick}
          onMouseUp={handleTableDragEnd}
          style={{
            backgroundImage: 'radial-gradient(circle, #e5e7eb 1px, transparent 1px)',
            backgroundSize: `${20 * zoom}px ${20 * zoom}px`,
            backgroundPosition: `${pan.x}px ${pan.y}px`
          }}
        >
          {/* Grid */}
          <div className="absolute inset-0 pointer-events-none">
            {/* Grid lines could be added here for better visual guidance */}
          </div>

          {/* Rooms */}
          {rooms.map(room => (
            <div
              key={room.id}
              className="absolute border-2 border-dashed border-gray-400 bg-gray-50 bg-opacity-50 pointer-events-none"
              style={{
                left: room.x * zoom + pan.x,
                top: room.y * zoom + pan.y,
                width: room.width * zoom,
                height: room.height * zoom
              }}
            >
              <div className="absolute top-1 left-2 text-xs font-medium text-gray-600">
                {room.name}
              </div>
            </div>
          ))}

          {/* Tables */}
          {tables.map(table => (
            <div
              key={table.id}
              style={getTableStyle(table)}
              onMouseDown={(e) => handleTableDragStart(e, table)}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedTable(table);
              }}
              className="transition-all duration-200 hover:shadow-lg"
            >
              <div className="text-center leading-none">
                <div className="font-bold">
                  {table.name?.slice(0, 8) || table.number}
                </div>
                <div className="text-xs opacity-75">
                  {table.capacity} seats
                </div>
              </div>
            </div>
          ))}

          {/* Selection Indicator */}
          {selectedTable && (
            <div
              className="absolute pointer-events-none border-2 border-blue-500 border-dashed"
              style={{
                left: getTablePosition(selectedTable).x * zoom + pan.x - 2,
                top: getTablePosition(selectedTable).y * zoom + pan.y - 2,
                width: 64 * zoom,
                height: 64 * zoom,
                borderRadius: '8px'
              }}
            />
          )}
        </div>

        {/* Legend */}
        <div className="absolute bottom-4 right-4 bg-white border rounded-lg p-3 shadow-lg">
          <div className="text-sm font-medium mb-2">Status Legend</div>
          <div className="space-y-1 text-xs">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-200 border border-green-600 rounded"></div>
              <span>Available</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-red-200 border border-red-600 rounded"></div>
              <span>Occupied</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-yellow-200 border border-yellow-600 rounded"></div>
              <span>Cleaning</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-blue-200 border border-blue-600 rounded"></div>
              <span>Reserved</span>
            </div>
          </div>
        </div>
      </div>

      {/* Table Properties Panel */}
      {selectedTable && (
        <div className="border-t p-4 bg-gray-50">
          <h4 className="font-medium mb-2">Table Properties</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Name:</span>
              <div className="font-medium">{selectedTable.name || `Table ${selectedTable.number}`}</div>
            </div>
            <div>
              <span className="text-gray-600">Number:</span>
              <div className="font-medium">{selectedTable.number}</div>
            </div>
            <div>
              <span className="text-gray-600">Capacity:</span>
              <div className="font-medium">{selectedTable.capacity} seats</div>
            </div>
            <div>
              <span className="text-gray-600">Status:</span>
              <div className="font-medium">{selectedTable.status}</div>
            </div>
          </div>
        </div>
      )}

      {/* Save Floor Plan Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold">Save Floor Plan</h2>
            </div>
            <div className="p-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">Floor Plan Name</label>
              <input
                type="text"
                value={floorPlanName}
                onChange={(e) => setFloorPlanName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter floor plan name"
              />
            </div>
            <div className="p-6 border-t flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowSaveModal(false);
                  setFloorPlanName('');
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  saveCurrentFloorPlan(floorPlanName || `plan-${Date.now()}`);
                  setShowSaveModal(false);
                  setFloorPlanName('');
                }}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                Save Floor Plan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Load Floor Plan Modal */}
      {showLoadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold">Load Floor Plan</h2>
            </div>
            <div className="p-6">
              <div className="space-y-2">
                {savedFloorPlans.length === 0 ? (
                  <p className="text-gray-500">No saved floor plans found</p>
                ) : (
                  savedFloorPlans.map(planName => (
                    <button
                      key={planName}
                      onClick={() => {
                        const data = onLoadFloorPlan(planName);
                        setFloorPlanData(data.tables || {});
                        setRooms(data.rooms || []);
                        if (data.canvasSize) setCanvasSize(data.canvasSize);
                        setShowLoadModal(false);
                        alert(`Floor plan "${planName}" loaded successfully`);
                      }}
                      className="w-full text-left p-3 border rounded-lg hover:bg-gray-50"
                    >
                      <div className="font-medium">{planName}</div>
                      <div className="text-sm text-gray-500">
                        {new Date().toLocaleDateString()}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
            <div className="p-6 border-t flex justify-end space-x-3">
              <button
                onClick={() => setShowLoadModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <label className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 cursor-pointer">
                Import File
                <input
                  type="file"
                  accept=".json"
                  onChange={importFloorPlan}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Export Floor Plan Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold">Export Floor Plan</h2>
            </div>
            <div className="p-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">Export Name</label>
              <input
                type="text"
                value={floorPlanName}
                onChange={(e) => setFloorPlanName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter export filename"
              />
              <p className="text-sm text-gray-500 mt-2">
                This will download a JSON file that can be imported into another system.
              </p>
            </div>
            <div className="p-6 border-t flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowExportModal(false);
                  setFloorPlanName('');
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  exportFloorPlan();
                  setShowExportModal(false);
                  setFloorPlanName('');
                }}
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
              >
                Download Export
              </button>
            </div>
          </div>
        </div>
      )}
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
      setTables(response.data.sort((a, b) => a.name.localeCompare(b.name)));
    } catch (error) {
      console.error('Error fetching tables:', error);
      alert('Failed to load tables');
    } finally {
      setLoading(false);
    }
  };

  const handleAddTable = async () => {
    if (!tableForm.name || !tableForm.capacity) {
      alert('Please fill in table name and capacity');
      return;
    }

    const capacity = parseInt(tableForm.capacity);

    if (isNaN(capacity) || capacity <= 0) {
      alert('Please enter a valid capacity');
      return;
    }

    // Check if table name already exists
    if (tables.some(table => table.name === tableForm.name.trim())) {
      alert('Table name already exists');
      return;
    }

    try {
      await axios.post(`${API}/tables`, {
        name: tableForm.name.trim(),
        capacity: capacity
      });
      alert('Table added successfully');
      setShowAddTableModal(false);
      setTableForm({ name: '', capacity: '4' });
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
      name: table.name || '',
      capacity: table.capacity.toString()
    });
    setShowEditTableModal(true);
  };

  const handleUpdateTable = async () => {
    if (!tableForm.name || !tableForm.capacity) {
      alert('Please enter a table name and capacity');
      return;
    }

    const capacity = parseInt(tableForm.capacity);
    if (isNaN(capacity) || capacity <= 0) {
      alert('Please enter a valid capacity');
      return;
    }

    // Check if table name already exists (excluding current table)
    if (tables.some(table => table.id !== editingTable.id && table.name === tableForm.name.trim())) {
      alert('Table name already exists');
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
      setTableForm({ name: '', capacity: '4' });
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

    if (window.confirm(`Are you sure you want to delete ${getTableDisplayName(table)}?`)) {
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

  const handleUpdateTablePosition = async (tableId, position) => {
    try {
      // Update table position in the backend (we'll need to add position fields to the table model)
      // For now, we'll store positions in localStorage until backend supports it
      const floorPlans = JSON.parse(localStorage.getItem('floorPlans') || '{}');
      if (!floorPlans.default) floorPlans.default = {};
      floorPlans.default[tableId] = position;
      localStorage.setItem('floorPlans', JSON.stringify(floorPlans));
    } catch (error) {
      console.error('Error updating table position:', error);
    }
  };

  const handleSaveFloorPlan = (floorPlanData, name = 'default') => {
    try {
      const floorPlans = JSON.parse(localStorage.getItem('floorPlans') || '{}');
      floorPlans[name] = floorPlanData;
      localStorage.setItem('floorPlans', JSON.stringify(floorPlans));
      alert(`Floor plan "${name}" saved successfully`);
    } catch (error) {
      console.error('Error saving floor plan:', error);
      alert('Failed to save floor plan');
    }
  };

  const handleLoadFloorPlan = (name = 'default') => {
    try {
      const floorPlans = JSON.parse(localStorage.getItem('floorPlans') || '{}');
      return floorPlans[name] || {};
    } catch (error) {
      console.error('Error loading floor plan:', error);
      return {};
    }
  };

  const getTableDisplayName = (table) => {
    if (table.name && table.name.trim()) {
      return table.name;
    }
    return `Table ${table.number}`;
  };

  const filteredTables = tables.filter(table => {
    const matchesSearch = table.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
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
                      placeholder="Search tables by name or number..."
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
                  Simple Grid
                </button>
                <button
                  onClick={() => setSelectedLayout('floor')}
                  className={`px-4 py-2 rounded-lg ${selectedLayout === 'floor' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
                >
                  Floor Plan Designer
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
              <FloorPlanDesigner 
                tables={tables} 
                onUpdateTablePosition={handleUpdateTablePosition}
                onSaveFloorPlan={handleSaveFloorPlan}
                onLoadFloorPlan={handleLoadFloorPlan}
              />
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Table Name *</label>
                <input
                  type="text"
                  value={tableForm.name}
                  onChange={(e) => setTableForm({...tableForm, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., Table 1, Bar 1, Patio A, Outside 1"
                />
                <p className="text-xs text-gray-500 mt-1">Enter a unique name for this table</p>
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
                  setTableForm({ name: '', capacity: '4' });
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
              <h2 className="text-xl font-semibold">Edit Table: {editingTable.name}</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Table Name *</label>
                <input
                  type="text"
                  value={tableForm.name}
                  onChange={(e) => setTableForm({...tableForm, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., Table 1, Bar 1, Patio A, Outside 1"
                />
                <p className="text-xs text-gray-500 mt-1">Table name must be unique</p>
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
                  setTableForm({ name: '', capacity: '4' });
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
  
  const [editingCategory, setEditingCategory] = useState(null);

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

  const handleSaveCategory = async () => {
    if (!categoryForm.name.trim()) {
      alert('Please enter a category name');
      return;
    }

    const newCategoryName = categoryForm.name.trim();
    
    if (editingCategory) {
      // Update existing category
      if (newCategoryName === editingCategory) {
        // No change, just close modal
        setShowCategoryModal(false);
        setCategoryForm({ name: '' });
        setEditingCategory(null);
        return;
      }
      
      // Check if new name already exists
      if (categories.includes(newCategoryName)) {
        alert('A category with this name already exists');
        return;
      }
      
      try {
        // Update all menu items with the old category name to use the new name
        const itemsToUpdate = menuItems.filter(item => item.category === editingCategory);
        
        for (const item of itemsToUpdate) {
          await axios.put(`${API}/menu/items/${item.id}`, {
            ...item,
            category: newCategoryName
          });
        }
        
        // Update local state
        setMenuItems(prev => prev.map(item => 
          item.category === editingCategory 
            ? { ...item, category: newCategoryName }
            : item
        ));
        
        setCategories(prev => prev.map(cat => 
          cat === editingCategory ? newCategoryName : cat
        ));
        
        alert('Category updated successfully');
      } catch (error) {
        console.error('Error updating category:', error);
        alert('Failed to update category');
      }
    } else {
      // Add new category
      if (categories.includes(newCategoryName)) {
        alert('A category with this name already exists');
        return;
      }
      
      // Add to categories list
      setCategories(prev => [...prev, newCategoryName]);
      alert('Category added successfully. You can now assign menu items to this category.');
    }
    
    setShowCategoryModal(false);
    setCategoryForm({ name: '' });
    setEditingCategory(null);
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
                onClick={() => {
                  setCategoryForm({ name: '' });
                  setEditingCategory(null);
                  setShowCategoryModal(true);
                }}
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
                            setEditingCategory(category);
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

      {/* Add/Edit Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold">
                {editingCategory ? 'Edit Category' : 'Add Category'}
              </h2>
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
                  setEditingCategory(null);
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveCategory}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                {editingCategory ? 'Update Category' : 'Add Category'}
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
    return <TaxChargesComponent onBack={() => setCurrentView('settings')} />;
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

// Global helper function for displaying table names
const getTableDisplayName = (table) => {
  if (table && table.name && table.name.trim()) {
    return table.name;
  }
  return table ? 'Unknown Table' : 'Unknown Table';
};

// Helper function for orders - handles both table objects and table_name
const getOrderTableDisplayName = (order, tables = []) => {
  // If order has a table object with name
  if (order.table && order.table.name && order.table.name.trim()) {
    return order.table.name;
  }
  
  // If we have table_name field (new backend field), use it directly
  if (order.table_name) {
    return order.table_name;
  }
  
  // Legacy support: if we have tables array and table_number, try to find table by number and get its name
  if (order.table_number && tables.length > 0) {
    const table = tables.find(t => t.number === order.table_number);
    if (table && table.name && table.name.trim()) {
      return table.name;
    }
    return `Table ${order.table_number}`;
  }
  
  // If it's a dine-in order but no table info, show generic message
  if (order.order_type === 'dine_in') {
    return 'Table Not Assigned';
  }
  
  return 'Unknown Table';
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