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

// Helper function to get order age color
const getOrderAgeColor = (createdAt) => {
  const now = new Date();
  const orderTime = new Date(createdAt);
  const minutesAgo = Math.floor((now - orderTime) / (1000 * 60));
  
  if (minutesAgo >= 45) return 'bg-red-100 border-red-500 text-red-800';
  if (minutesAgo >= 30) return 'bg-orange-100 border-orange-500 text-orange-800';
  if (minutesAgo >= 20) return 'bg-yellow-100 border-yellow-500 text-yellow-800';
  return 'bg-white border-gray-200';
};

// Active Orders Component
const ActiveOrders = ({ onOrderClick, refreshTrigger }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActiveOrders();
    const interval = setInterval(fetchActiveOrders, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [refreshTrigger]);

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
      pending: 'bg-yellow-500',
      confirmed: 'bg-blue-500',
      preparing: 'bg-orange-500',
      ready: 'bg-green-500',
      out_for_delivery: 'bg-purple-500'
    };
    return colors[status] || 'bg-gray-500';
  };

  const getNextStatus = (currentStatus) => {
    const progression = {
      pending: 'confirmed',
      confirmed: 'preparing',
      preparing: 'ready',
      ready: 'out_for_delivery',
      out_for_delivery: 'delivered'
    };
    return progression[currentStatus];
  };

  const getNextStatusLabel = (currentStatus) => {
    const labels = {
      pending: 'Confirm',
      confirmed: 'Start Prep',
      preparing: 'Ready',
      ready: 'Out for Delivery',
      out_for_delivery: 'Delivered'
    };
    return labels[currentStatus];
  };

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
      <h3 className="text-xl font-bold text-gray-800 mb-6">Active Orders</h3>
      
      {orders.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>No active orders</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {orders.map((order) => (
            <div
              key={order.id}
              className={`border-2 rounded-xl p-4 cursor-pointer transition-all hover:shadow-md ${getOrderAgeColor(order.created_at)}`}
              onClick={() => onOrderClick(order)}
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h4 className="font-bold text-lg">{order.order_number}</h4>
                  <p className="text-sm text-gray-600">
                    {new Date(order.created_at).toLocaleTimeString()}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`inline-block w-3 h-3 rounded-full ${getStatusColor(order.status)}`}></span>
                  <span className="text-xs font-medium capitalize">
                    {order.status.replace('_', ' ')}
                  </span>
                </div>
              </div>

              <div className="mb-3">
                <p className="text-sm font-medium">
                  {order.order_type.replace('_', ' ').toUpperCase()}
                  {order.table_number && ` - Table ${order.table_number}`}
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
                {getNextStatus(order.status) && (
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
          ))}
        </div>
      )}
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
  const [selectedTable, setSelectedTable] = useState(null);
  const [availableTables, setAvailableTables] = useState([]);

  useEffect(() => {
    fetchTables();
  }, []);

  const fetchTables = async () => {
    try {
      const response = await axios.get(`${API}/tables`);
      setTables(response.data);
      setAvailableTables(response.data.filter(t => t.status === 'available'));
    } catch (error) {
      console.error('Error fetching tables:', error);
    }
  };

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
      setShowMoveModal(false);
      alert('Order moved successfully!');
    } catch (error) {
      alert(error.response?.data?.detail || 'Error moving order');
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

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-bold text-gray-800">Table Management</h3>
        
        {/* Action Buttons */}
        <div className="flex space-x-2">
          {occupiedTables.length > 0 && (
            <>
              <button
                onClick={() => {
                  if (occupiedTables.length === 1) {
                    setSelectedTable(occupiedTables[0]);
                    setShowMoveModal(true);
                  } else {
                    alert('Please select a specific table to move');
                  }
                }}
                className="bg-purple-600 text-white px-3 py-1 rounded-lg text-sm hover:bg-purple-700"
              >
                Move Order
              </button>
              
              <button
                onClick={() => {
                  const tableToUpdate = occupiedTables[0];
                  if (occupiedTables.length === 1) {
                    updateTableStatus(tableToUpdate.id, 'problem');
                  } else {
                    alert('Please select a specific table');
                  }
                }}
                className="bg-red-600 text-white px-3 py-1 rounded-lg text-sm hover:bg-red-700"
              >
                Mark Problem
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

      {/* Move Table Modal */}
      {showMoveModal && selectedTable && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-bold mb-4">Move Table {selectedTable.number}</h3>
            
            <div className="grid grid-cols-3 gap-2 mb-4">
              {availableTables.map((table) => (
                <button
                  key={table.id}
                  onClick={() => moveTableOrder(selectedTable.id, table.id)}
                  className="bg-green-100 border-2 border-green-500 text-green-800 p-3 rounded-lg hover:bg-green-200"
                >
                  Table {table.number}
                </button>
              ))}
            </div>

            {availableTables.length === 0 && (
              <p className="text-center text-gray-500 py-4">No available tables</p>
            )}

            <button
              onClick={() => setShowMoveModal(false)}
              className="w-full bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400"
            >
              Cancel
            </button>
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
          <div className="flex space-x-4">
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
            onClick={handlePayment}
            className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700"
            disabled={processing || (paymentMethod === 'cash' && (!cashReceived || parseFloat(cashReceived) < order.total))}
          >
            {processing ? 'Processing...' : 'Process Payment'}
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
const NewOrder = ({ selectedTable, editingOrder, onBack }) => {
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
    address: ''
  });
  const [orderType, setOrderType] = useState(selectedTable ? 'dine_in' : 'takeout');
  const [tip, setTip] = useState(0);
  const [showModifierModal, setShowModifierModal] = useState(false);
  const [selectedMenuItem, setSelectedMenuItem] = useState(null);
  const [selectedModifiers, setSelectedModifiers] = useState({});
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showRemovalModal, setShowRemovalModal] = useState(false);
  const [removalItemIndex, setRemovalItemIndex] = useState(null);

  useEffect(() => {
    if (editingOrder) {
      loadExistingOrder();
    }
    fetchMenuItems();
    fetchCategories();
    fetchModifierData();
  }, [editingOrder]);

  const loadExistingOrder = async () => {
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
        loadExistingOrder(); // Reload order
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
        delivery_instructions: ''
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
      order = await createOrUpdateOrder();
      if (!order) return;
    }

    try {
      await axios.post(`${API}/orders/${order.id}/send`);
      alert('Order sent successfully!');
      onBack();
    } catch (error) {
      alert(error.response?.data?.detail || 'Error sending order');
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
            {editingOrder ? `Edit Order - Table ${editingOrder.number}` : 
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

          {/* Customer Info for Delivery */}
          {orderType === 'delivery' && (
            <div className="mb-6 bg-white rounded-xl p-4">
              <h3 className="font-bold text-lg mb-4">Customer Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <input
                  type="text"
                  placeholder="Customer Name"
                  value={customerInfo.name}
                  onChange={(e) => setCustomerInfo({...customerInfo, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="tel"
                  placeholder="Phone Number"
                  value={customerInfo.phone}
                  onChange={(e) => setCustomerInfo({...customerInfo, phone: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="text"
                  placeholder="Address"
                  value={customerInfo.address}
                  onChange={(e) => setCustomerInfo({...customerInfo, address: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
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
            
            {selectedMenuItem.modifier_groups.map(groupId => {
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
            })}
            
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
            <p><strong>Time:</strong> {new Date(order.created_at).toLocaleString()}</p>
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
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const { user, logout } = useAuth();

  const handleNewOrder = (table = null) => {
    setSelectedTable(table);
    setEditingOrder(null);
    setCurrentView('new-order');
  };

  const handleTableSelect = (table) => {
    if (table.status === 'available') {
      // Start new order for available table
      setSelectedTable(table);
      setEditingOrder(null);
    } else if (table.status === 'occupied') {
      // Edit existing order for occupied table
      setEditingOrder(table);
      setSelectedTable(null);
    }
    setCurrentView('new-order');
  };

  const handleOrderClick = (order) => {
    setSelectedOrder(order);
  };

  const handleBackToMain = () => {
    setCurrentView('main');
    setSelectedTable(null);
    setEditingOrder(null);
    // Trigger refresh of active orders when returning to main view
    setRefreshTrigger(prev => prev + 1);
  };

  if (currentView === 'new-order') {
    return (
      <NewOrder 
        selectedTable={selectedTable}
        editingOrder={editingOrder}
        onBack={handleBackToMain}
      />
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
        </div>

        {/* Active Orders */}
        <ActiveOrders onOrderClick={handleOrderClick} refreshTrigger={refreshTrigger} />

        {/* Table Management */}
        <TableManagement onTableSelect={handleTableSelect} />
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <OrderDetailModal 
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
        />
      )}
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