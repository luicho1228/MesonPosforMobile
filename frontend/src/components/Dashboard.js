import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useApp } from '../contexts/AppContext';
import { useApi } from '../hooks/useApi';
import { formatCurrency, getOrderStatusColor } from '../utils/orderUtils';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const { navigateTo } = useApp();
  const { get, loading } = useApi();
  
  const [activeOrders, setActiveOrders] = useState([]);
  const [stats, setStats] = useState({
    todayOrders: 0,
    todayRevenue: 0,
    activeOrdersCount: 0,
    availableTables: 0
  });

  useEffect(() => {
    fetchActiveOrders();
    fetchDashboardStats();
  }, []);

  const fetchActiveOrders = async () => {
    const result = await get('/orders?status=pending,confirmed,preparing,ready&limit=10');
    if (result.success) {
      setActiveOrders(result.data);
    }
  };

  const fetchDashboardStats = async () => {
    const ordersResult = await get('/orders/stats/today');
    const tablesResult = await get('/tables?status=available');
    
    if (ordersResult.success) {
      setStats(prev => ({
        ...prev,
        todayOrders: ordersResult.data.count || 0,
        todayRevenue: ordersResult.data.revenue || 0
      }));
    }

    if (tablesResult.success) {
      setStats(prev => ({
        ...prev,
        availableTables: tablesResult.data.length || 0
      }));
    }
  };

  const handleOrderClick = (order) => {
    navigateTo('new-order', { editingActiveOrder: order });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="px-6 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">El Meson POS</h1>
            <p className="text-gray-600">Welcome back, {user?.name || 'User'}</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <p className="text-sm text-gray-500">Role</p>
              <p className="font-medium text-gray-800 capitalize">{user?.role || 'Staff'}</p>
            </div>
            <button
              onClick={logout}
              className="bg-red-100 text-red-700 px-4 py-2 rounded-lg hover:bg-red-200 transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Today's Orders</p>
                <p className="text-2xl font-bold text-gray-800">{stats.todayOrders}</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-full">
                <span className="text-blue-600 text-xl">📋</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Today's Revenue</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(stats.todayRevenue)}</p>
              </div>
              <div className="bg-green-100 p-3 rounded-full">
                <span className="text-green-600 text-xl">💰</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Active Orders</p>
                <p className="text-2xl font-bold text-orange-600">{activeOrders.length}</p>
              </div>
              <div className="bg-orange-100 p-3 rounded-full">
                <span className="text-orange-600 text-xl">🔥</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Available Tables</p>
                <p className="text-2xl font-bold text-purple-600">{stats.availableTables}</p>
              </div>
              <div className="bg-purple-100 p-3 rounded-full">
                <span className="text-purple-600 text-xl">🪑</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <button
            onClick={() => navigateTo('new-order')}
            className="bg-green-600 text-white p-6 rounded-lg hover:bg-green-700 transition-colors"
          >
            <div className="text-center">
              <span className="text-3xl mb-2 block">➕</span>
              <span className="text-lg font-semibold">New Order</span>
            </div>
          </button>

          <button
            onClick={() => navigateTo('active-orders')}
            className="bg-blue-600 text-white p-6 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <div className="text-center">
              <span className="text-3xl mb-2 block">📋</span>
              <span className="text-lg font-semibold">Active Orders</span>
            </div>
          </button>

          <button
            onClick={() => navigateTo('table-management')}
            className="bg-purple-600 text-white p-6 rounded-lg hover:bg-purple-700 transition-colors"
          >
            <div className="text-center">
              <span className="text-3xl mb-2 block">🪑</span>
              <span className="text-lg font-semibold">Tables</span>
            </div>
          </button>

          <button
            onClick={() => navigateTo('settings')}
            className="bg-gray-600 text-white p-6 rounded-lg hover:bg-gray-700 transition-colors"
          >
            <div className="text-center">
              <span className="text-3xl mb-2 block">⚙️</span>
              <span className="text-lg font-semibold">Settings</span>
            </div>
          </button>
        </div>

        {/* Active Orders Table */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-800">Recent Active Orders</h2>
          </div>
          
          {loading ? (
            <div className="p-6 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-500 mt-2">Loading orders...</p>
            </div>
          ) : activeOrders.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              <p>No active orders at the moment</p>
              <button
                onClick={() => navigateTo('new-order')}
                className="mt-2 text-blue-600 hover:text-blue-800"
              >
                Create your first order →
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {activeOrders.map(order => (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{order.order_number}</div>
                        {order.table_name && (
                          <div className="text-sm text-gray-500">{order.table_name}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{order.customer_name || 'Walk-in'}</div>
                        {order.customer_phone && (
                          <div className="text-sm text-gray-500">{order.customer_phone}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 capitalize">
                          {order.order_type.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-${getOrderStatusColor(order.status)}-100 text-${getOrderStatusColor(order.status)}-800 capitalize`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(order.total)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(order.created_at).toLocaleTimeString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => handleOrderClick(order)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          View
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
    </div>
  );
};

export default Dashboard;