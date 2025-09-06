import React, { useState, useEffect } from 'react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Table display name utility function  
const getTableDisplayName = (table) => {
  if (table && table.name && table.name.trim()) {
    return table.name;
  }
  return table ? `Table ${table.number || 'Unknown'}` : 'Unknown Table';
};

// Enhanced Table Merge Modal Component
const TableMergeModal = ({ occupiedTable, currentCart, currentOrderInfo, onConfirmMerge, onCancel }) => {
  const [existingOrder, setExistingOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [merging, setMerging] = useState(false);

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
  
  // Estimate taxes and charges for merged order
  const estimatedTax = mergedTotal * 0.0825; // More accurate tax rate
  const estimatedServiceCharges = mergedTotal > 50 ? mergedTotal * 0.03 : 0; // Service charge for large orders
  const finalTotal = mergedTotal + estimatedTax + estimatedServiceCharges + (currentOrderInfo.tip || 0);

  const handleMerge = async () => {
    setMerging(true);
    try {
      await onConfirmMerge();
    } catch (error) {
      console.error('Error merging orders:', error);
      alert('Failed to merge orders. Please try again.');
    } finally {
      setMerging(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl p-6 max-w-4xl w-full">
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600 mx-auto mb-4"></div>
            <p className="text-lg text-gray-600">Loading existing order details...</p>
            <p className="text-sm text-gray-400 mt-2">Fetching information for {occupiedTable?.name || `Table ${occupiedTable?.number}`}</p>
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
              <span>Estimated Tax (8.25%):</span>
              <span>${estimatedTax.toFixed(2)}</span>
            </div>
            {estimatedServiceCharges > 0 && (
              <div className="flex justify-between">
                <span>Service Charges:</span>
                <span>${estimatedServiceCharges.toFixed(2)}</span>
              </div>
            )}
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
          <div className="mt-3 p-2 bg-green-100 rounded text-sm text-green-700">
            <strong>💡 Note:</strong> These are estimated amounts. Final totals will be calculated dynamically when the merge is completed.
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
            disabled={merging}
            className="flex-1 bg-gray-300 text-gray-700 py-3 px-6 rounded-lg font-medium hover:bg-gray-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handleMerge}
            disabled={currentCart.length === 0 || merging}
            className={`flex-1 py-3 px-6 rounded-lg font-medium transition-colors disabled:cursor-not-allowed ${
              currentCart.length === 0 || merging
                ? 'bg-gray-300 text-gray-500'
                : 'bg-red-600 text-white hover:bg-red-700'
            }`}
          >
            {merging ? (
              <div className="flex items-center justify-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Merging Orders...</span>
              </div>
            ) : currentCart.length === 0 ? (
              'No Items to Merge'
            ) : (
              `Confirm Merge with ${occupiedTable?.name || `Table ${occupiedTable?.number}`}`
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TableMergeModal;