import React, { useState, useEffect } from 'react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const TableSettingsComponent = ({ onBack }) => {
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('management');
  const [showAddTableModal, setShowAddTableModal] = useState(false);
  const [showBulkAddModal, setShowBulkAddModal] = useState(false);
  const [showEditTableModal, setShowEditTableModal] = useState(false);
  const [editingTable, setEditingTable] = useState(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [statusChangeTable, setStatusChangeTable] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [tableToDelete, setTableToDelete] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Bulk delete states
  const [selectedTables, setSelectedTables] = useState([]);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);

  const [newTableForm, setNewTableForm] = useState({
    capacity: '',
    status: 'available',
    name: ''
  });

  const [bulkAddForm, setBulkAddForm] = useState({
    count: '',
    startNumber: '',
    capacity: '',
    namePrefix: ''
  });

  useEffect(() => {
    fetchTables();
  }, []);

  const fetchTables = async () => {
    try {
      const response = await axios.get(`${API}/tables`);
      setTables(response.data);
    } catch (error) {
      console.error('Error fetching tables:', error);
      alert('Failed to load tables');
    } finally {
      setLoading(false);
    }
  };

  const handleAddTable = async () => {
    if (!newTableForm.capacity) {
      alert('Please enter table capacity');
      return;
    }

    try {
      const tableData = {
        capacity: parseInt(newTableForm.capacity),
        status: newTableForm.status,
        name: newTableForm.name || '' // Send empty string if no name provided
      };

      const response = await axios.post(`${API}/tables`, tableData);
      setTables(prev => [...prev, response.data]);
      setShowAddTableModal(false);
      setNewTableForm({ capacity: '', status: 'available', name: '' });
      alert('Table added successfully');
    } catch (error) {
      console.error('Error adding table:', error);
      alert('Failed to add table: ' + (error.response?.data?.detail || error.message));
    }
  };

  const handleBulkAdd = async () => {
    if (!bulkAddForm.count || !bulkAddForm.capacity) {
      alert('Please enter number of tables and capacity');
      return;
    }

    try {
      const bulkData = {
        count: parseInt(bulkAddForm.count),
        start_number: parseInt(bulkAddForm.startNumber) || 1,
        capacity: parseInt(bulkAddForm.capacity),
        name_prefix: bulkAddForm.namePrefix || ''
      };

      const response = await axios.post(`${API}/tables/bulk`, bulkData);
      await fetchTables(); // Refresh the table list
      setShowBulkAddModal(false);
      setBulkAddForm({ count: '', startNumber: '', capacity: '', namePrefix: '' });
      alert(`${bulkData.count} tables added successfully`);
    } catch (error) {
      console.error('Error bulk adding tables:', error);
      alert('Failed to add tables: ' + (error.response?.data?.detail || error.message));
    }
  };

  const handleEditTable = async () => {
    if (!editingTable || !editingTable.capacity) {
      alert('Please enter table capacity');
      return;
    }

    try {
      const tableData = {
        capacity: parseInt(editingTable.capacity),
        status: editingTable.status,
        name: editingTable.name || ''
      };

      const response = await axios.put(`${API}/tables/${editingTable.id}`, tableData);
      setTables(prev => prev.map(table => 
        table.id === editingTable.id ? response.data : table
      ));
      setShowEditTableModal(false);
      setEditingTable(null);
      alert('Table updated successfully');
    } catch (error) {
      console.error('Error updating table:', error);
      alert('Failed to update table: ' + (error.response?.data?.detail || error.message));
    }
  };

  const handleStatusChange = async () => {
    if (!statusChangeTable) return;

    try {
      const response = await axios.put(`${API}/tables/${statusChangeTable.table.id}`, {
        ...statusChangeTable.table,
        status: statusChangeTable.newStatus
      });
      
      setTables(prev => prev.map(table => 
        table.id === statusChangeTable.table.id ? response.data : table
      ));
      setShowStatusModal(false);
      setStatusChangeTable(null);
      alert('Table status updated successfully');
    } catch (error) {
      console.error('Error updating table status:', error);
      alert('Failed to update table status: ' + (error.response?.data?.detail || error.message));
    }
  };

  const handleDeleteTable = async () => {
    if (!tableToDelete) return;

    try {
      await axios.delete(`${API}/tables/${tableToDelete.id}`);
      setTables(prev => prev.filter(table => table.id !== tableToDelete.id));
      setShowDeleteModal(false);
      setTableToDelete(null);
      alert('Table deleted successfully');
    } catch (error) {
      console.error('Error deleting table:', error);
      alert('Failed to delete table: ' + (error.response?.data?.detail || error.message));
    }
  };

  // Bulk delete functions
  const handleBulkDelete = async () => {
    if (selectedTables.length === 0) {
      alert('Please select tables to delete');
      return;
    }

    try {
      // Delete all selected tables
      const deletePromises = selectedTables.map(tableId => 
        axios.delete(`${API}/tables/${tableId}`)
      );

      await Promise.all(deletePromises);

      // Update local state after successful deletion
      setTables(prev => prev.filter(table => !selectedTables.includes(table.id)));
      setSelectedTables([]);
      setShowBulkDeleteModal(false);
      
      alert(`${selectedTables.length} tables deleted successfully`);
    } catch (error) {
      console.error('Error deleting tables:', error);
      alert('Failed to delete some tables: ' + (error.response?.data?.detail || error.message));
    }
  };

  const handleSelectAll = () => {
    if (selectedTables.length === filteredTables.length) {
      setSelectedTables([]);
    } else {
      setSelectedTables(filteredTables.map(table => table.id));
    }
  };

  const handleTableSelect = (tableId) => {
    setSelectedTables(prev => 
      prev.includes(tableId) ? prev.filter(id => id !== tableId) : [...prev, tableId]
    );
  };

  const clearSelections = () => {
    setSelectedTables([]);
  };

  const getTableDisplayName = (table) => {
    if (table.name && table.name.trim()) {
      return table.name;
    }
    return `Table ${table.number || table.id}`;
  };

  const filteredTables = tables.filter(table => {
    const matchesSearch = getTableDisplayName(table)
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || table.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    totalTables: tables.length,
    available: tables.filter(t => t.status === 'available').length,
    occupied: tables.filter(t => t.status === 'occupied').length,
    cleaning: tables.filter(t => t.status === 'cleaning').length,
    reserved: tables.filter(t => t.status === 'reserved').length,
    totalSeats: tables.reduce((sum, table) => sum + (table.capacity || 0), 0)
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading table settings...</p>
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
        </div>
      </div>

      {/* Stats Dashboard */}
      <div className="bg-white border-b p-6">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.totalTables}</div>
            <div className="text-sm text-gray-600">Total Tables</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{stats.available}</div>
            <div className="text-sm text-gray-600">Available</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{stats.occupied}</div>
            <div className="text-sm text-gray-600">Occupied</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">{stats.cleaning}</div>
            <div className="text-sm text-gray-600">Cleaning</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{stats.reserved}</div>
            <div className="text-sm text-gray-600">Reserved</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-indigo-600">{stats.totalSeats}</div>
            <div className="text-sm text-gray-600">Total Seats</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b">
        <div className="flex space-x-8 px-6">
          {[
            { id: 'management', name: 'Table Management', icon: '🪑' },
            { id: 'layout', name: 'Layout View', icon: '🏢' },
            { id: 'status', name: 'Status Control', icon: '📊' }
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
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Table Management</h2>
              <div className="flex space-x-3">
                {selectedTables.length > 0 && (
                  <>
                    <span className="text-sm text-gray-600 py-2">
                      {selectedTables.length} selected
                    </span>
                    <button
                      onClick={clearSelections}
                      className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 text-sm"
                    >
                      Clear Selection
                    </button>
                    <button
                      onClick={() => setShowBulkDeleteModal(true)}
                      className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 flex items-center space-x-2"
                    >
                      <span>🗑️</span>
                      <span>Delete Selected ({selectedTables.length})</span>
                    </button>
                  </>
                )}
                <button
                  onClick={() => setShowBulkAddModal(true)}
                  className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 flex items-center space-x-2"
                >
                  <span>+</span>
                  <span>Bulk Add Tables</span>
                </button>
                <button
                  onClick={() => setShowAddTableModal(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
                >
                  <span>+</span>
                  <span>Add Single Table</span>
                </button>
              </div>
            </div>

            {/* Filters */}
            <div className="flex space-x-4 items-center bg-gray-50 p-4 rounded-lg">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Search tables..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">All Status</option>
                  <option value="available">Available</option>
                  <option value="occupied">Occupied</option>
                  <option value="cleaning">Cleaning</option>
                  <option value="reserved">Reserved</option>
                </select>
              </div>
            </div>

            {/* Multi-select controls */}
            {filteredTables.length > 0 && (
              <div className="bg-gray-50 p-4 rounded-lg flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={selectedTables.length === filteredTables.length && filteredTables.length > 0}
                      onChange={handleSelectAll}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium">Select All</span>
                  </label>
                  <span className="text-sm text-gray-600">
                    {selectedTables.length} of {filteredTables.length} tables selected
                  </span>
                </div>
              </div>
            )}

            {/* Tables Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredTables.map(table => (
                <div key={table.id} className={`bg-white border rounded-lg p-4 hover:shadow-md transition-shadow ${selectedTables.includes(table.id) ? 'ring-2 ring-blue-500 bg-blue-50' : ''}`}>
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-start space-x-3">
                      <input
                        type="checkbox"
                        checked={selectedTables.includes(table.id)}
                        onChange={() => handleTableSelect(table.id)}
                        className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <div>
                        <h3 className="font-semibold text-lg text-gray-800">
                          {getTableDisplayName(table)}
                        </h3>
                        <p className="text-sm text-gray-600">Capacity: {table.capacity} guests</p>
                        {table.current_order_id && (
                          <p className="text-xs text-blue-600 mt-1">Order: {table.current_order_id.slice(0, 8)}...</p>
                        )}
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      table.status === 'available' ? 'bg-green-100 text-green-800' :
                      table.status === 'occupied' ? 'bg-red-100 text-red-800' :
                      table.status === 'cleaning' ? 'bg-yellow-100 text-yellow-800' :
                      table.status === 'reserved' ? 'bg-purple-100 text-purple-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {table.status}
                    </span>
                  </div>

                  <div className="flex space-x-2">
                    <button
                      onClick={() => {
                        const newStatus = table.status === 'available' ? 'occupied' : 'available';
                        setStatusChangeTable({ table, newStatus });
                        setShowStatusModal(true);
                      }}
                      className={`flex-1 px-3 py-1 rounded text-xs font-medium ${
                        table.status === 'available'
                          ? 'bg-red-50 text-red-600 hover:bg-red-100'
                          : 'bg-green-50 text-green-600 hover:bg-green-100'
                      }`}
                    >
                      {table.status === 'available' ? 'Set Occupied' : 'Set Available'}
                    </button>
                    <button
                      onClick={() => {
                        setEditingTable({ ...table, capacity: table.capacity.toString() });
                        setShowEditTableModal(true);
                      }}
                      className="flex-1 bg-blue-50 text-blue-600 px-3 py-1 rounded text-xs font-medium hover:bg-blue-100"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        setTableToDelete(table);
                        setShowDeleteModal(true);
                      }}
                      className="bg-gray-50 text-gray-600 px-3 py-1 rounded text-xs font-medium hover:bg-gray-100"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {filteredTables.length === 0 && (
              <div className="text-center py-12">
                <span className="text-6xl mb-4 block">🪑</span>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {tables.length === 0 ? 'No tables configured' : 'No tables found'}
                </h3>
                <p className="text-gray-500 mb-4">
                  {tables.length === 0 
                    ? 'Add your first table to get started' 
                    : 'Try adjusting your search or filter criteria'
                  }
                </p>
                {tables.length === 0 && (
                  <button
                    onClick={() => setShowAddTableModal(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                  >
                    Add Table
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Layout View Tab */}
        {activeTab === 'layout' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Restaurant Layout</h2>
              <div className="flex space-x-3">
                <button className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">
                  Grid View
                </button>
                <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                  Floor Plan
                </button>
              </div>
            </div>

            {/* Grid View */}
            <div className="bg-white border rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Grid View</h3>
              <div className="grid grid-cols-6 md:grid-cols-10 lg:grid-cols-15 gap-2">
                {tables.map(table => (
                  <div
                    key={table.id}
                    className={`aspect-square border-2 rounded-lg flex flex-col items-center justify-center text-xs p-1 cursor-pointer ${
                      table.status === 'available' ? 'border-green-500 bg-green-50 text-green-700' :
                      table.status === 'occupied' ? 'border-red-500 bg-red-50 text-red-700' :
                      table.status === 'cleaning' ? 'border-yellow-500 bg-yellow-50 text-yellow-700' :
                      table.status === 'reserved' ? 'border-purple-500 bg-purple-50 text-purple-700' :
                      'border-gray-500 bg-gray-50 text-gray-700'
                    }`}
                    title={`${getTableDisplayName(table)} - ${table.status} - Capacity: ${table.capacity}`}
                  >
                    <span className="font-semibold text-center leading-tight">
                      {table.name || `T${table.number || table.id.slice(-2)}`}
                    </span>
                    <span className="text-xs">{table.capacity}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Floor Plan Designer */}
            <div className="bg-white border rounded-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Floor Plan Designer</h3>
                <span className="text-sm text-gray-500">Coming Soon</span>
              </div>
              <div className="bg-gray-100 rounded-lg p-8 text-center">
                <span className="text-4xl mb-2 block">🏗️</span>
                <p className="text-gray-600">Interactive floor plan designer will be available soon</p>
              </div>
            </div>
          </div>
        )}

        {/* Status Control Tab */}
        {activeTab === 'status' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">Bulk Status Management</h2>
            
            {/* Quick Actions */}
            <div className="bg-white border rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <button className="bg-green-600 text-white p-4 rounded-lg hover:bg-green-700 text-center">
                  <div className="text-2xl mb-2">✅</div>
                  <div className="font-medium">Set All Available</div>
                  <div className="text-sm opacity-90">{tables.length} tables</div>
                </button>
                <button className="bg-yellow-600 text-white p-4 rounded-lg hover:bg-yellow-700 text-center">
                  <div className="text-2xl mb-2">🧹</div>
                  <div className="font-medium">Mark for Cleaning</div>
                  <div className="text-sm opacity-90">All occupied</div>
                </button>
                <button className="bg-purple-600 text-white p-4 rounded-lg hover:bg-purple-700 text-center">
                  <div className="text-2xl mb-2">📋</div>
                  <div className="font-medium">Reserve Tables</div>
                  <div className="text-sm opacity-90">Bulk reserve</div>
                </button>
                <button className="bg-blue-600 text-white p-4 rounded-lg hover:bg-blue-700 text-center">
                  <div className="text-2xl mb-2">📊</div>
                  <div className="font-medium">Status Report</div>
                  <div className="text-sm opacity-90">Generate report</div>
                </button>
              </div>
            </div>

            {/* Status Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                { status: 'available', color: 'green', icon: '✅', label: 'Available Tables' },
                { status: 'occupied', color: 'red', icon: '🔴', label: 'Occupied Tables' },
                { status: 'cleaning', color: 'yellow', icon: '🧹', label: 'Cleaning Required' },
                { status: 'reserved', color: 'purple', icon: '📋', label: 'Reserved Tables' }
              ].map(statusType => {
                const statusTables = tables.filter(t => t.status === statusType.status);
                return (
                  <div key={statusType.status} className="bg-white border rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-2">
                        <span className="text-2xl">{statusType.icon}</span>
                        <div>
                          <h3 className="font-semibold">{statusType.label}</h3>
                          <p className="text-sm text-gray-600">{statusTables.length} tables</p>
                        </div>
                      </div>
                      <span className={`text-2xl font-bold text-${statusType.color}-600`}>
                        {statusTables.length}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {statusTables.slice(0, 5).map(table => (
                        <div key={table.id} className="flex justify-between items-center text-sm">
                          <span>{getTableDisplayName(table)}</span>
                          <span className="text-gray-500">Cap: {table.capacity}</span>
                        </div>
                      ))}
                      {statusTables.length > 5 && (
                        <div className="text-sm text-gray-500 text-center pt-2">
                          +{statusTables.length - 5} more tables
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Add Table Modal */}
      {showAddTableModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold">Add New Table</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Table Name (Optional)
                </label>
                <input
                  type="text"
                  value={newTableForm.name}
                  onChange={(e) => setNewTableForm({...newTableForm, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., VIP Table, Patio 1, etc."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Capacity *
                </label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={newTableForm.capacity}
                  onChange={(e) => setNewTableForm({...newTableForm, capacity: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="4"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Initial Status
                </label>
                <select
                  value={newTableForm.status}
                  onChange={(e) => setNewTableForm({...newTableForm, status: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="available">Available</option>
                  <option value="cleaning">Cleaning</option>
                  <option value="reserved">Reserved</option>
                </select>
              </div>
            </div>
            <div className="p-6 border-t flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowAddTableModal(false);
                  setNewTableForm({ capacity: '', status: 'available', name: '' });
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

      {/* Bulk Add Modal */}
      {showBulkAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold">Bulk Add Tables</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Number of Tables *
                </label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={bulkAddForm.count}
                  onChange={(e) => setBulkAddForm({...bulkAddForm, count: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="10"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name Prefix (Optional)
                </label>
                <input
                  type="text"
                  value={bulkAddForm.namePrefix}
                  onChange={(e) => setBulkAddForm({...bulkAddForm, namePrefix: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., Patio, Main"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Will create: {bulkAddForm.namePrefix ? `${bulkAddForm.namePrefix} 1, ${bulkAddForm.namePrefix} 2, ...` : 'Table 1, Table 2, ...'}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Number
                </label>
                <input
                  type="number"
                  min="1"
                  value={bulkAddForm.startNumber}
                  onChange={(e) => setBulkAddForm({...bulkAddForm, startNumber: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Capacity (for all tables) *
                </label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={bulkAddForm.capacity}
                  onChange={(e) => setBulkAddForm({...bulkAddForm, capacity: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="4"
                />
              </div>
            </div>
            <div className="p-6 border-t flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowBulkAddModal(false);
                  setBulkAddForm({ count: '', startNumber: '', capacity: '', namePrefix: '' });
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkAdd}
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
              >
                Add {bulkAddForm.count || 0} Tables
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
              <h2 className="text-xl font-semibold">Edit Table</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Table Name
                </label>
                <input
                  type="text"
                  value={editingTable.name || ''}
                  onChange={(e) => setEditingTable({...editingTable, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., VIP Table, Patio 1, etc."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Capacity *
                </label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={editingTable.capacity}
                  onChange={(e) => setEditingTable({...editingTable, capacity: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={editingTable.status}
                  onChange={(e) => setEditingTable({...editingTable, status: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="available">Available</option>
                  <option value="occupied">Occupied</option>
                  <option value="cleaning">Cleaning</option>
                  <option value="reserved">Reserved</option>
                </select>
              </div>
            </div>
            <div className="p-6 border-t flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowEditTableModal(false);
                  setEditingTable(null);
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleEditTable}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Update Table
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Status Change Confirmation Modal */}
      {showStatusModal && statusChangeTable && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold">Change Table Status</h2>
            </div>
            <div className="p-6">
              <p className="text-gray-700">
                Are you sure you want to change <strong>{getTableDisplayName(statusChangeTable.table)}</strong> 
                from <span className="font-medium">{statusChangeTable.table.status}</span> to 
                <span className="font-medium"> {statusChangeTable.newStatus}</span>?
              </p>
            </div>
            <div className="p-6 border-t flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowStatusModal(false);
                  setStatusChangeTable(null);
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleStatusChange}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Change Status
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && tableToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold text-red-600">Delete Table</h2>
            </div>
            <div className="p-6">
              <p className="text-gray-700">
                Are you sure you want to delete <strong>{getTableDisplayName(tableToDelete)}</strong>? 
                This action cannot be undone.
              </p>
              {tableToDelete.status === 'occupied' && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-red-700 text-sm">
                    ⚠️ Warning: This table is currently occupied. Deleting it may affect active orders.
                  </p>
                </div>
              )}
            </div>
            <div className="p-6 border-t flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setTableToDelete(null);
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteTable}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Delete Table
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Confirmation Modal */}
      {showBulkDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold text-red-600">Delete Multiple Tables</h2>
            </div>
            <div className="p-6">
              <p className="text-gray-700 mb-4">
                Are you sure you want to delete <strong>{selectedTables.length}</strong> selected tables? 
                This action cannot be undone.
              </p>
              
              <div className="bg-gray-50 rounded-lg p-4 max-h-40 overflow-y-auto">
                <p className="text-sm font-medium text-gray-700 mb-2">Tables to be deleted:</p>
                <ul className="space-y-1">
                  {selectedTables.map(tableId => {
                    const table = tables.find(t => t.id === tableId);
                    return table ? (
                      <li key={tableId} className="text-sm text-gray-600 flex justify-between">
                        <span>• {getTableDisplayName(table)}</span>
                        {table.status === 'occupied' && (
                          <span className="text-red-600 text-xs">⚠️ Occupied</span>
                        )}
                      </li>
                    ) : null;
                  })}
                </ul>
              </div>

              {selectedTables.some(id => {
                const table = tables.find(t => t.id === id);
                return table?.status === 'occupied';
              }) && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-red-700 text-sm">
                    ⚠️ Warning: Some selected tables are currently occupied. Deleting them will automatically cancel their orders.
                  </p>
                </div>
              )}
            </div>
            <div className="p-6 border-t flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowBulkDeleteModal(false);
                  setSelectedTables([]);
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Delete {selectedTables.length} Tables
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TableSettingsComponent;