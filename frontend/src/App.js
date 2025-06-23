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

  const login = async (username, password) => {
    try {
      const response = await axios.post(`${API}/auth/login`, { username, password });
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

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    delete axios.defaults.headers.common['Authorization'];
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user }}>
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

// Login Component
const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const result = await login(username, password);
    if (!result.success) {
      setError(result.error);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">
          Restaurant POS Login
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          {error && (
            <div className="text-red-600 text-sm">{error}</div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
        <div className="mt-4 text-center text-sm text-gray-600">
          Demo credentials: admin/admin123 (you'll need to register first)
        </div>
      </div>
    </div>
  );
};

// Dashboard Component
const Dashboard = () => {
  const [stats, setStats] = useState({
    today_orders: 0,
    today_revenue: 0,
    pending_orders: 0,
    active_employees: 0
  });
  const { user } = useAuth();

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API}/dashboard/stats`);
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-700 mb-2">Today's Orders</h3>
        <p className="text-3xl font-bold text-blue-600">{stats.today_orders}</p>
      </div>
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-700 mb-2">Today's Revenue</h3>
        <p className="text-3xl font-bold text-green-600">${stats.today_revenue.toFixed(2)}</p>
      </div>
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-700 mb-2">Pending Orders</h3>
        <p className="text-3xl font-bold text-orange-600">{stats.pending_orders}</p>
      </div>
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-700 mb-2">Active Staff</h3>
        <p className="text-3xl font-bold text-purple-600">{stats.active_employees}</p>
      </div>
    </div>
  );
};

// Menu Manager Component
const MenuManager = () => {
  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
    image_url: '',
    available: true
  });

  useEffect(() => {
    fetchMenuItems();
    fetchCategories();
  }, []);

  const fetchMenuItems = async () => {
    try {
      const response = await axios.get(`${API}/menu/items/all`);
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = {
        ...formData,
        price: parseFloat(formData.price)
      };

      if (editingItem) {
        await axios.put(`${API}/menu/items/${editingItem.id}`, data);
      } else {
        await axios.post(`${API}/menu/items`, data);
      }

      setFormData({
        name: '',
        description: '',
        price: '',
        category: '',
        image_url: '',
        available: true
      });
      setShowAddForm(false);
      setEditingItem(null);
      fetchMenuItems();
      fetchCategories();
    } catch (error) {
      console.error('Error saving menu item:', error);
    }
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      description: item.description,
      price: item.price.toString(),
      category: item.category,
      image_url: item.image_url,
      available: item.available
    });
    setShowAddForm(true);
  };

  const handleDelete = async (itemId) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      try {
        await axios.delete(`${API}/menu/items/${itemId}`);
        fetchMenuItems();
      } catch (error) {
        console.error('Error deleting menu item:', error);
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Menu Manager</h2>
        <button
          onClick={() => setShowAddForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
        >
          Add Item
        </button>
      </div>

      {showAddForm && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4">
            {editingItem ? 'Edit Item' : 'Add New Item'}
          </h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Price</label>
              <input
                type="number"
                step="0.01"
                value={formData.price}
                onChange={(e) => setFormData({...formData, price: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <input
                type="text"
                value={formData.category}
                onChange={(e) => setFormData({...formData, category: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Image URL</label>
              <input
                type="url"
                value={formData.image_url}
                onChange={(e) => setFormData({...formData, image_url: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows="3"
              />
            </div>
            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.available}
                  onChange={(e) => setFormData({...formData, available: e.target.checked})}
                  className="mr-2"
                />
                Available
              </label>
            </div>
            <div className="md:col-span-2 flex space-x-4">
              <button
                type="submit"
                className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
              >
                {editingItem ? 'Update' : 'Add'} Item
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  setEditingItem(null);
                  setFormData({
                    name: '',
                    description: '',
                    price: '',
                    category: '',
                    image_url: '',
                    available: true
                  });
                }}
                className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {menuItems.map((item) => (
          <div key={item.id} className="bg-white rounded-lg shadow-md p-4">
            {item.image_url && (
              <img 
                src={item.image_url} 
                alt={item.name}
                className="w-full h-48 object-cover rounded-md mb-4"
              />
            )}
            <h3 className="text-lg font-semibold text-gray-800">{item.name}</h3>
            <p className="text-gray-600 text-sm mb-2">{item.description}</p>
            <p className="text-lg font-bold text-green-600">${item.price.toFixed(2)}</p>
            <p className="text-sm text-gray-500 mb-4">Category: {item.category}</p>
            <div className="flex items-center justify-between">
              <span className={`px-2 py-1 rounded-full text-xs ${
                item.available ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {item.available ? 'Available' : 'Unavailable'}
              </span>
              <div className="space-x-2">
                <button
                  onClick={() => handleEdit(item)}
                  className="text-blue-600 hover:text-blue-800 text-sm"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(item.id)}
                  className="text-red-600 hover:text-red-800 text-sm"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Order Management Component
const OrderManagement = () => {
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const response = await axios.get(`${API}/orders`);
      setOrders(response.data);
    } catch (error) {
      console.error('Error fetching orders:', error);
    }
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      await axios.put(`${API}/orders/${orderId}/status`, { status: newStatus });
      fetchOrders();
    } catch (error) {
      console.error('Error updating order status:', error);
    }
  };

  const filteredOrders = orders.filter(order => {
    if (filter === 'all') return true;
    return order.status === filter;
  });

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-blue-100 text-blue-800',
      preparing: 'bg-orange-100 text-orange-800',
      ready: 'bg-green-100 text-green-800',
      out_for_delivery: 'bg-purple-100 text-purple-800',
      delivered: 'bg-gray-100 text-gray-800',
      cancelled: 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Order Management</h2>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Orders</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="preparing">Preparing</option>
          <option value="ready">Ready</option>
          <option value="out_for_delivery">Out for Delivery</option>
          <option value="delivered">Delivered</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredOrders.map((order) => (
          <div key={order.id} className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-800">
                  Order #{order.order_number}
                </h3>
                <p className="text-sm text-gray-600">
                  {new Date(order.created_at).toLocaleString()}
                </p>
              </div>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
                {order.status.replace('_', ' ').toUpperCase()}
              </span>
            </div>

            <div className="mb-4">
              <p className="text-sm text-gray-600">
                <strong>Customer:</strong> {order.customer_name || 'Walk-in'}
              </p>
              {order.customer_phone && (
                <p className="text-sm text-gray-600">
                  <strong>Phone:</strong> {order.customer_phone}
                </p>
              )}
              <p className="text-sm text-gray-600">
                <strong>Type:</strong> {order.order_type.replace('_', ' ').toUpperCase()}
              </p>
            </div>

            <div className="mb-4">
              <h4 className="font-medium text-gray-800 mb-2">Items:</h4>
              {order.items.map((item, index) => (
                <div key={index} className="flex justify-between text-sm">
                  <span>{item.quantity}x Item</span>
                  <span>${(item.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>

            <div className="border-t pt-4 mb-4">
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
              <div className="flex justify-between font-semibold">
                <span>Total:</span>
                <span>${order.total.toFixed(2)}</span>
              </div>
            </div>

            <div className="flex space-x-2">
              {order.status === 'pending' && (
                <button
                  onClick={() => updateOrderStatus(order.id, 'confirmed')}
                  className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                >
                  Confirm
                </button>
              )}
              {order.status === 'confirmed' && (
                <button
                  onClick={() => updateOrderStatus(order.id, 'preparing')}
                  className="bg-orange-600 text-white px-3 py-1 rounded text-sm hover:bg-orange-700"
                >
                  Start Preparing
                </button>
              )}
              {order.status === 'preparing' && (
                <button
                  onClick={() => updateOrderStatus(order.id, 'ready')}
                  className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                >
                  Mark Ready
                </button>
              )}
              {order.status === 'ready' && order.order_type === 'delivery' && (
                <button
                  onClick={() => updateOrderStatus(order.id, 'out_for_delivery')}
                  className="bg-purple-600 text-white px-3 py-1 rounded text-sm hover:bg-purple-700"
                >
                  Out for Delivery
                </button>
              )}
              {order.status === 'out_for_delivery' && (
                <button
                  onClick={() => updateOrderStatus(order.id, 'delivered')}
                  className="bg-gray-600 text-white px-3 py-1 rounded text-sm hover:bg-gray-700"
                >
                  Mark Delivered
                </button>
              )}
              {['pending', 'confirmed'].includes(order.status) && (
                <button
                  onClick={() => updateOrderStatus(order.id, 'cancelled')}
                  className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// New Order Component
const NewOrder = () => {
  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [cart, setCart] = useState([]);
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    phone: '',
    address: ''
  });
  const [orderType, setOrderType] = useState('dine_in');
  const [tip, setTip] = useState(0);

  useEffect(() => {
    fetchMenuItems();
    fetchCategories();
  }, []);

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

  const addToCart = (item) => {
    const existingItem = cart.find(cartItem => cartItem.menu_item_id === item.id);
    if (existingItem) {
      setCart(cart.map(cartItem =>
        cartItem.menu_item_id === item.id
          ? { ...cartItem, quantity: cartItem.quantity + 1 }
          : cartItem
      ));
    } else {
      setCart([...cart, {
        menu_item_id: item.id,
        name: item.name,
        price: item.price,
        quantity: 1,
        modifiers: [],
        special_instructions: ''
      }]);
    }
  };

  const updateCartItem = (itemId, field, value) => {
    setCart(cart.map(item =>
      item.menu_item_id === itemId ? { ...item, [field]: value } : item
    ));
  };

  const removeFromCart = (itemId) => {
    setCart(cart.filter(item => item.menu_item_id !== itemId));
  };

  const calculateTotal = () => {
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const tax = subtotal * 0.08;
    return {
      subtotal,
      tax,
      total: subtotal + tax + tip
    };
  };

  const submitOrder = async () => {
    if (cart.length === 0) {
      alert('Please add items to your order');
      return;
    }

    try {
      const orderData = {
        customer_name: customerInfo.name,
        customer_phone: customerInfo.phone,
        customer_address: customerInfo.address,
        items: cart.map(item => ({
          menu_item_id: item.menu_item_id,
          quantity: item.quantity,
          price: item.price,
          modifiers: item.modifiers,
          special_instructions: item.special_instructions
        })),
        order_type: orderType,
        tip: tip,
        delivery_address: orderType === 'delivery' ? customerInfo.address : '',
        delivery_instructions: ''
      };

      await axios.post(`${API}/orders`, orderData);
      
      // Reset form
      setCart([]);
      setCustomerInfo({ name: '', phone: '', address: '' });
      setTip(0);
      
      alert('Order placed successfully!');
    } catch (error) {
      console.error('Error placing order:', error);
      alert('Error placing order. Please try again.');
    }
  };

  const filteredItems = selectedCategory === 'all' 
    ? menuItems 
    : menuItems.filter(item => item.category === selectedCategory);

  const { subtotal, tax, total } = calculateTotal();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Menu Items */}
      <div className="lg:col-span-2 space-y-6">
        <h2 className="text-2xl font-bold text-gray-800">New Order</h2>
        
        {/* Category Filter */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-4 py-2 rounded-md ${
              selectedCategory === 'all' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            All
          </button>
          {categories.map(category => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-md ${
                selectedCategory === category 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Menu Items Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredItems.map(item => (
            <div key={item.id} className="bg-white rounded-lg shadow-md p-4">
              {item.image_url && (
                <img 
                  src={item.image_url} 
                  alt={item.name}
                  className="w-full h-32 object-cover rounded-md mb-3"
                />
              )}
              <h3 className="font-semibold text-gray-800">{item.name}</h3>
              <p className="text-sm text-gray-600 mb-2">{item.description}</p>
              <div className="flex justify-between items-center">
                <span className="text-lg font-bold text-green-600">
                  ${item.price.toFixed(2)}
                </span>
                <button
                  onClick={() => addToCart(item)}
                  className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                >
                  Add to Cart
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Order Summary */}
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow-md p-4">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Order Summary</h3>
          
          {/* Order Type */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Order Type</label>
            <select
              value={orderType}
              onChange={(e) => setOrderType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="dine_in">Dine In</option>
              <option value="takeout">Takeout</option>
              <option value="delivery">Delivery</option>
              <option value="phone_order">Phone Order</option>
            </select>
          </div>

          {/* Customer Info */}
          <div className="space-y-3 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name</label>
              <input
                type="text"
                value={customerInfo.name}
                onChange={(e) => setCustomerInfo({...customerInfo, name: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input
                type="tel"
                value={customerInfo.phone}
                onChange={(e) => setCustomerInfo({...customerInfo, phone: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            {(orderType === 'delivery' || orderType === 'phone_order') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <textarea
                  value={customerInfo.address}
                  onChange={(e) => setCustomerInfo({...customerInfo, address: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows="3"
                />
              </div>
            )}
          </div>

          {/* Cart Items */}
          <div className="space-y-3 mb-4">
            {cart.map(item => (
              <div key={item.menu_item_id} className="flex justify-between items-center border-b pb-2">
                <div className="flex-1">
                  <p className="font-medium">{item.name}</p>
                  <div className="flex items-center space-x-2 mt-1">
                    <button
                      onClick={() => updateCartItem(item.menu_item_id, 'quantity', Math.max(1, item.quantity - 1))}
                      className="text-red-600 hover:text-red-800"
                    >
                      -
                    </button>
                    <span className="text-sm">{item.quantity}</span>
                    <button
                      onClick={() => updateCartItem(item.menu_item_id, 'quantity', item.quantity + 1)}
                      className="text-green-600 hover:text-green-800"
                    >
                      +
                    </button>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium">${(item.price * item.quantity).toFixed(2)}</p>
                  <button
                    onClick={() => removeFromCart(item.menu_item_id)}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Tip */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Tip ($)</label>
            <input
              type="number"
              step="0.01"
              value={tip}
              onChange={(e) => setTip(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Total */}
          <div className="border-t pt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span>Subtotal:</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Tax (8%):</span>
              <span>${tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Tip:</span>
              <span>${tip.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-bold text-lg border-t pt-2">
              <span>Total:</span>
              <span>${total.toFixed(2)}</span>
            </div>
          </div>

          <button
            onClick={submitOrder}
            className="w-full bg-green-600 text-white py-3 px-4 rounded-md hover:bg-green-700 mt-4"
          >
            Place Order
          </button>
        </div>
      </div>
    </div>
  );
};

// Time Clock Component
const TimeClock = () => {
  const [timeEntries, setTimeEntries] = useState([]);
  const [currentEntry, setCurrentEntry] = useState(null);
  const { user } = useAuth();

  useEffect(() => {
    fetchTimeEntries();
    checkCurrentEntry();
  }, []);

  const fetchTimeEntries = async () => {
    try {
      const response = await axios.get(`${API}/time/entries`);
      setTimeEntries(response.data);
    } catch (error) {
      console.error('Error fetching time entries:', error);
    }
  };

  const checkCurrentEntry = () => {
    const today = new Date().toISOString().split('T')[0];
    const todayEntry = timeEntries.find(entry => 
      entry.date === today && !entry.clock_out
    );
    setCurrentEntry(todayEntry);
  };

  const clockIn = async () => {
    try {
      const response = await axios.post(`${API}/time/clock-in`);
      alert('Clocked in successfully!');
      fetchTimeEntries();
    } catch (error) {
      alert(error.response?.data?.detail || 'Error clocking in');
    }
  };

  const clockOut = async () => {
    try {
      const response = await axios.post(`${API}/time/clock-out`);
      alert(`Clocked out successfully! Total hours: ${response.data.total_hours.toFixed(2)}`);
      fetchTimeEntries();
      setCurrentEntry(null);
    } catch (error) {
      alert(error.response?.data?.detail || 'Error clocking out');
    }
  };

  useEffect(() => {
    checkCurrentEntry();
  }, [timeEntries]);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Time Clock</h2>
      
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="text-center mb-6">
          <p className="text-lg text-gray-600 mb-2">
            Welcome, {user?.full_name || user?.username}
          </p>
          <p className="text-2xl font-bold text-gray-800">
            {new Date().toLocaleString()}
          </p>
        </div>

        <div className="flex justify-center space-x-4">
          {!currentEntry ? (
            <button
              onClick={clockIn}
              className="bg-green-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-green-700"
            >
              Clock In
            </button>
          ) : (
            <button
              onClick={clockOut}
              className="bg-red-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-red-700"
            >
              Clock Out
            </button>
          )}
        </div>

        {currentEntry && (
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Clocked in at: {new Date(currentEntry.clock_in).toLocaleString()}
            </p>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Recent Time Entries</h3>
        <div className="overflow-x-auto">
          <table className="w-full table-auto">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-2 text-left">Date</th>
                <th className="px-4 py-2 text-left">Clock In</th>
                <th className="px-4 py-2 text-left">Clock Out</th>
                <th className="px-4 py-2 text-left">Total Hours</th>
                <th className="px-4 py-2 text-left">Overtime</th>
              </tr>
            </thead>
            <tbody>
              {timeEntries.slice(0, 10).map(entry => (
                <tr key={entry.id} className="border-b">
                  <td className="px-4 py-2">{entry.date}</td>
                  <td className="px-4 py-2">
                    {new Date(entry.clock_in).toLocaleTimeString()}
                  </td>
                  <td className="px-4 py-2">
                    {entry.clock_out ? new Date(entry.clock_out).toLocaleTimeString() : 'In Progress'}
                  </td>
                  <td className="px-4 py-2">{entry.total_hours.toFixed(2)}</td>
                  <td className="px-4 py-2">{entry.overtime_hours.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// Main App Component
const MainApp = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const { user, logout } = useAuth();

  const navigation = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'new-order', label: 'New Order', icon: '🛒' },
    { id: 'orders', label: 'Orders', icon: '📋' },
    { id: 'menu', label: 'Menu', icon: '🍽️' },
    { id: 'time-clock', label: 'Time Clock', icon: '⏰' },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'new-order':
        return <NewOrder />;
      case 'orders':
        return <OrderManagement />;
      case 'menu':
        return <MenuManager />;
      case 'time-clock':
        return <TimeClock />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold text-gray-900">Restaurant POS</h1>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                Welcome, {user?.full_name || user?.username}
              </span>
              <button
                onClick={logout}
                className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <nav className="w-64 bg-white shadow-sm min-h-screen">
          <div className="p-4">
            <ul className="space-y-2">
              {navigation.map((item) => (
                <li key={item.id}>
                  <button
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center px-4 py-2 text-left rounded-md transition-colors ${
                      activeTab === item.id
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <span className="mr-3">{item.icon}</span>
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </nav>

        {/* Main Content */}
        <main className="flex-1 p-8">
          {renderContent()}
        </main>
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
      {isAuthenticated ? <MainApp /> : <Login />}
    </div>
  );
};

export default App;