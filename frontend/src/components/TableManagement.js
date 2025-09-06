import React, { useState, useEffect } from 'react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Table display name utility function
const getTableDisplayName = (table) => {
  if (table && table.name && table.name.trim()) {
    return table.name;
  }
  return table ? 'Unknown Table' : 'Unknown Table';
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

export default TableManagement;