import React from 'react';
import { usePrinter } from '../PrinterContext';
import { formatLocalDateTime } from '../utils/dateUtils';

// Order Detail Modal Component
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
            {order.service_charges > 0 && (
              <div className="flex justify-between text-sm text-blue-600">
                <span>Service Charges:</span>
                <span>${order.service_charges.toFixed(2)}</span>
              </div>
            )}
            {order.discounts > 0 && (
              <div className="flex justify-between text-sm text-red-600">
                <span>Discounts:</span>
                <span>-${order.discounts.toFixed(2)}</span>
              </div>
            )}
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

export default OrderDetailModal;