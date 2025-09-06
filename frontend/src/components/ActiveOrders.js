import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { formatLocalTime, getTimeElapsed, getOrderAgeColor } from '../utils/dateUtils';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

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

// Table display name utility function
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
                  {order.discounts > 0 && (
                    <div className="flex justify-between text-red-600">
                      <span>Discounts:</span>
                      <span>-${order.discounts.toFixed(2)}</span>
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

export default ActiveOrders;