import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { formatLocalDate, formatLocalTime, getTimeElapsed } from '../utils/dateUtils';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Phone number formatter utility
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

// Customer Detail Modal Component
const CustomerDetailModal = ({ customer, stats, orders, onClose, onEdit }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-6 max-w-4xl w-full max-h-96 overflow-y-auto">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">{customer.name}</h2>
            <p className="text-gray-600">{formatPhoneNumber(customer.phone)}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Customer Information */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Contact Information</h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-gray-500">Name</label>
                <p className="font-medium">{customer.name}</p>
              </div>
              <div>
                <label className="text-sm text-gray-500">Phone</label>
                <p className="font-medium">{formatPhoneNumber(customer.phone)}</p>
              </div>
              {customer.address && (
                <div>
                  <label className="text-sm text-gray-500">Address</label>
                  <p className="font-medium">{customer.address}</p>
                  {customer.apartment && (
                    <p className="text-gray-600">{customer.apartment}</p>
                  )}
                  {(customer.city || customer.state || customer.zip_code) && (
                    <p className="text-gray-600">
                      {customer.city ? customer.city + ', ' : ''}
                      {customer.state ? customer.state + ' ' : ''}
                      {customer.zip_code}
                    </p>
                  )}
                </div>
              )}
              <div>
                <label className="text-sm text-gray-500">Customer Since</label>
                <p className="font-medium">{formatLocalDate(customer.created_at)}</p>
              </div>
            </div>
          </div>

          {/* Order Statistics */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Order Statistics</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-2xl font-bold text-blue-600">{stats?.total_orders || 0}</p>
                <p className="text-sm text-blue-600">Total Orders</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-2xl font-bold text-green-600">${stats?.total_spent?.toFixed(2) || '0.00'}</p>
                <p className="text-sm text-green-600">Total Spent</p>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <p className="text-2xl font-bold text-purple-600">${stats?.average_order?.toFixed(2) || '0.00'}</p>
                <p className="text-sm text-purple-600">Average Order</p>
              </div>
              <div className="bg-orange-50 p-4 rounded-lg">
                <p className="text-2xl font-bold text-orange-600">{stats?.last_order_days || 'N/A'}</p>
                <p className="text-sm text-orange-600">Days Since Last Order</p>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Orders */}
        <div className="mt-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Recent Orders</h3>
          {orders && orders.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left">Order #</th>
                    <th className="px-4 py-2 text-left">Date</th>
                    <th className="px-4 py-2 text-left">Total</th>
                    <th className="px-4 py-2 text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.slice(0, 5).map(order => (
                    <tr key={order.id} className="border-b border-gray-200">
                      <td className="px-4 py-2 font-medium">{order.order_number}</td>
                      <td className="px-4 py-2">{formatLocalDate(order.created_at)}</td>
                      <td className="px-4 py-2">${order.total.toFixed(2)}</td>
                      <td className="px-4 py-2">
                        <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs capitalize">
                          {order.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">No orders found</p>
          )}
        </div>

        <div className="flex space-x-3 mt-6">
          <button
            onClick={() => onEdit && onEdit(customer)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Edit Customer
          </button>
          <button
            onClick={onClose}
            className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400"
          >
            Close
          </button>
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
    address: customer.address || '',
    apartment: customer.apartment || '',
    city: customer.city || '',
    state: customer.state || '',
    zip_code: customer.zip_code || ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(customer.id, formData);
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-6 max-w-md w-full">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-800">Edit Customer</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => handleChange('address', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
              placeholder="Street Address"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Apartment/Unit</label>
            <input
              type="text"
              value={formData.apartment}
              onChange={(e) => handleChange('apartment', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
              placeholder="Apt, Suite, Unit"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => handleChange('city', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
              <input
                type="text"
                value={formData.state}
                onChange={(e) => handleChange('state', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                maxLength="2"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ZIP Code</label>
            <input
              type="text"
              value={formData.zip_code}
              onChange={(e) => handleChange('zip_code', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
              maxLength="10"
            />
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="submit"
              className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700"
            >
              Save Changes
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Main Customer Management Component - extracted from App.js without changes
const CustomerManagement = ({ onBack }) => {
  const [customers, setCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerStats, setCustomerStats] = useState(null);
  const [customerOrders, setCustomerOrders] = useState([]);
  const [editingCustomer, setEditingCustomer] = useState(null);

  useEffect(() => {
    fetchCustomers();
  }, []);

  useEffect(() => {
    if (searchTerm) {
      const filtered = customers.filter(customer => 
        customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.phone.includes(searchTerm)
      );
      setFilteredCustomers(filtered);
    } else {
      setFilteredCustomers(customers);
    }
  }, [customers, searchTerm]);

  const fetchCustomers = async () => {
    try {
      const response = await axios.get(`${API}/customers`);
      setCustomers(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching customers:', error);
      setLoading(false);
    }
  };

  const handleCustomerClick = async (customer) => {
    setSelectedCustomer(customer);
    
    try {
      // Fetch customer statistics and recent orders
      const [statsResponse, ordersResponse] = await Promise.all([
        axios.get(`${API}/customers/${customer.id}/stats`),
        axios.get(`${API}/customers/${customer.id}/orders`)
      ]);
      
      setCustomerStats(statsResponse.data);
      setCustomerOrders(ordersResponse.data);
      setShowCustomerModal(true);
    } catch (error) {
      console.error('Error fetching customer details:', error);
      // Show modal even if we can't fetch stats
      setShowCustomerModal(true);
    }
  };

  const handleSaveCustomer = async (customerId, formData) => {
    try {
      await axios.put(`${API}/customers/${customerId}`, formData);
      await fetchCustomers(); // Refresh the customer list
      setEditingCustomer(null);
      alert('Customer updated successfully');
    } catch (error) {
      console.error('Error updating customer:', error);
      alert('Failed to update customer');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Customer Management</h1>
            <p className="text-gray-600 mt-1">Manage customer information and view order history</p>
          </div>
          <button
            onClick={onBack}
            className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
          >
            ← Back to Dashboard
          </button>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search customers by name or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
              />
            </div>
            <button
              onClick={fetchCustomers}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
            >
              Refresh
            </button>
          </div>
        </div>

        {/* Customers Table */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-800">
              Customers ({filteredCustomers.length})
            </h2>
          </div>
          
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading customers...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Address</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Order</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredCustomers.map(customer => (
                    <tr key={customer.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{customer.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{formatPhoneNumber(customer.phone)}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {customer.address ? (
                            <>
                              {customer.address}
                              {customer.apartment && <><br/>{customer.apartment}</>}
                              {(customer.city || customer.state) && (
                                <><br/>{customer.city}{customer.city && customer.state ? ', ' : ''}{customer.state} {customer.zip_code}</>
                              )}
                            </>
                          ) : (
                            <span className="text-gray-400">No address</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">
                          {customer.last_order_date ? getTimeElapsed(customer.last_order_date) : 'No orders'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => handleCustomerClick(customer)}
                          className="text-blue-600 hover:text-blue-900 mr-3"
                        >
                          View
                        </button>
                        <button
                          onClick={() => setEditingCustomer(customer)}
                          className="text-green-600 hover:text-green-900"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
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
          onEdit={(customer) => {
            setEditingCustomer(customer);
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

export default CustomerManagement;