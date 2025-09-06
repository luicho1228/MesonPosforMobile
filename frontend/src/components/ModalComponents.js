import React, { useState } from 'react';
import axios from 'axios';
import { usePrinter } from '../PrinterContext';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Payment Modal Component
export const PaymentModal = ({ isOpen, order, onClose, onPaymentComplete }) => {
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [cashReceived, setCashReceived] = useState('');
  const [emailReceipt, setEmailReceipt] = useState('');
  const [printReceipt, setPrintReceipt] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [showPrintButton, setShowPrintButton] = useState(false);
  const [paidOrder, setPaidOrder] = useState(null);
  const { printOrderReceipt, connected, openPrinterManager } = usePrinter();

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
      
      // Store the paid order for printing
      const orderWithPayment = {
        ...order,
        payment_method: paymentMethod,
        change_amount: response.data.change_amount || 0,
        paid_at: new Date().toISOString()
      };
      setPaidOrder(orderWithPayment);
      
      alert(`Payment successful! ${paymentMethod === 'cash' ? `Change: $${response.data.change_amount.toFixed(2)}` : ''}`);
      
      // Auto-print if enabled and printer connected
      if (printReceipt && connected) {
        try {
          await printOrderReceipt(orderWithPayment);
        } catch (error) {
          console.error('Auto-print failed:', error);
        }
      }
      
      // Show print button option for a few seconds
      if (printReceipt) {
        setShowPrintButton(true);
        setTimeout(() => setShowPrintButton(false), 10000); // Hide after 10 seconds
      }
      
      setTimeout(() => {
        onPaymentComplete();
        onClose();
        setShowPrintButton(false);
        setPaidOrder(null);
      }, showPrintButton ? 3000 : 1000);
      
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

  const handlePrintReceipt = async () => {
    if (paidOrder) {
      try {
        await printOrderReceipt(paidOrder);
      } catch (error) {
        alert('Print failed. Please check printer connection.');
      }
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
          
          {/* Printer Status */}
          {printReceipt && (
            <div className="mb-2 p-2 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="text-xs">
                  <span className="font-medium">Printer: </span>
                  <span className={connected ? 'text-green-600' : 'text-red-600'}>
                    {connected ? 'Connected' : 'Not Connected'}
                  </span>
                </div>
                {!connected && (
                  <button
                    onClick={openPrinterManager}
                    className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700"
                  >
                    Setup
                  </button>
                )}
              </div>
            </div>
          )}
          
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

        {/* Print Receipt Button (shows after payment) */}
        {showPrintButton && paidOrder && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm text-green-700">Payment successful!</span>
              <button
                onClick={handlePrintReceipt}
                className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
              >
                🖨️ Print Receipt
              </button>
            </div>
          </div>
        )}

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
export const ItemRemovalModal = ({ isOpen, onClose, onRemove }) => {
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