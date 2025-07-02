import React, { useState, useEffect, useContext, createContext } from 'react';
import axios from 'axios';
import './App.css';

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
          onEdit={() => {
            setEditingCustomer(selectedCustomer);
            setShowCustomerModal(false);
          }}
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
  const [selectedTableForCancel, setSelectedTableForCancel] = useState(null);

  useEffect(() => {
    fetchTables();
  }, []);



  const updateTableStatus = async (tableId, status) => {
    try {
      await axios.put(`${API}/tables/${tableId}`, { status });
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
                  if (occupiedTables.length === 1) {
                    setSelectedTableForCancel(occupiedTables[0]);
                    setShowCancelTableModal(true);
                  } else {
                    alert('Please select a specific table');
                  }
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
      
      {/* Cancel Table Modal */}
      {showCancelTableModal && selectedTableForCancel && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-bold mb-4 text-red-600">Cancel Table</h3>
            
            <p className="mb-4">
              Are you sure you want to cancel Table {selectedTableForCancel.number}? 
              This will cancel the associated order and free up the table.
            </p>
            
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowCancelTableModal(false);
                  setSelectedTableForCancel(null);
                }}
                className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  try {
                    // Cancel the order associated with this table
                    if (selectedTableForCancel.current_order_id) {
                      await axios.post(`${API}/orders/${selectedTableForCancel.current_order_id}/cancel`, {
                        reason: 'table_cancelled',
                        notes: `Table ${selectedTableForCancel.number} cancelled via table management`
                      });
                    }
                    
                    // Free the table
                    await updateTableStatus(selectedTableForCancel.id, 'available');
                    
                    setShowCancelTableModal(false);
                    setSelectedTableForCancel(null);
                    alert('Table cancelled successfully');
                  } catch (error) {
                    console.error('Error cancelling table:', error);
                    alert('Error cancelling table');
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
      
      alert(`Payment successful! ${paymentMethod === 'cash' ? `Change: $${response.data.change_amount.toFixed(2)}` : ''}`);
      onPaymentComplete();
      onClose();
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
const NewOrder = ({ selectedTable, editingOrder, editingActiveOrder, onBack }) => {
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
  const [orderType, setOrderType] = useState(selectedTable ? 'dine_in' : 'takeout');
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
  const [assignedTable, setAssignedTable] = useState(null);
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
        table_id: selectedTable?.id || null,
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

  const printReceipt = () => {
    // In a real implementation, this would interface with a receipt printer
    const receiptData = {
      order: currentOrder || { items: cart, ...calculateTotal() },
      customer: customerInfo,
      timestamp: new Date().toLocaleString()
    };
    
    console.log('Printing receipt:', receiptData);
    alert('Receipt sent to printer');
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

          {/* Table Selection for Dine In */}
          {orderType === 'dine_in' && (
            <div className="mb-6 bg-white rounded-xl p-4">
              <h3 className="font-bold text-lg mb-4">Select Table</h3>
              {selectedTable ? (
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div>
                    <span className="font-medium">Table {selectedTable.number}</span>
                    <span className="text-sm text-gray-600 ml-2">({selectedTable.status})</span>
                  </div>
                  <button
                    onClick={() => setShowTableModal(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium"
                  >
                    Change Table
                  </button>
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

          {/* Table Selection for Dine In */}
          {orderType === 'dine_in' && (
            <div className="mb-6 bg-white rounded-xl p-4">
              <h3 className="font-bold text-lg mb-4">Select Table</h3>
              {selectedTable ? (
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div>
                    <span className="font-medium">Table {selectedTable.number}</span>
                    <span className="text-sm text-gray-600 ml-2">({selectedTable.status})</span>
                  </div>
                  <button
                    onClick={() => setShowTableModal(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium"
                  >
                    Change Table
                  </button>
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
    </div>
  );
};

// Order Detail Modal
const OrderDetailModal = ({ order, onClose }) => {
  if (!order) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-6 max-w-lg w-full max-h-96 overflow-y-auto">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-xl font-bold">Order {order.order_number}</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-xl"
          >
            ×
          </button>
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
          </div>
        </div>
      </div>
    </div>
  );
};

// Main POS Interface
const POSInterface = () => {
  const [currentView, setCurrentView] = useState('main');
  const [selectedTable, setSelectedTable] = useState(null);
  const [editingOrder, setEditingOrder] = useState(null);
  const [editingActiveOrder, setEditingActiveOrder] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const { user, logout } = useAuth();

  const handleNewOrder = (table = null) => {
    setSelectedTable(table);
    setEditingOrder(null);
    setEditingActiveOrder(null);
    setCurrentView('new-order');
  };

  const handleTableSelect = (table) => {
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

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-white shadow-sm border-b p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-800">Restaurant POS</h1>
          <div className="flex items-center space-x-4">
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
        <div className="flex space-x-4">
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
      <AppContent />
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