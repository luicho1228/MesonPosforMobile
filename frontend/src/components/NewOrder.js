import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { usePrinter } from '../PrinterContext';
import { parseBackendTimestamp, formatLocalDate, formatLocalTime, formatLocalDateTime, getTimeElapsed, getOrderAgeColor } from '../utils/dateUtils';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Helper function to get table display name
const getTableDisplayName = (table) => {
  if (!table) return 'Unknown Table';
  
  if (table.name && table.name.trim()) {
    return table.name.trim();
  }
  
  return `Table ${table.number || table.id || 'Unknown'}`;
};

// New Order Component
const NewOrder = ({ selectedTable, editingOrder, editingActiveOrder, onBack, fromTableManagement = false }) => {
  const { printOrderReceipt, connected, openPrinterManager } = usePrinter();
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
    address: '',
    apartment: '',
    city: '',
    state: '',
    zip_code: ''
  });
  
  // Add party size for gratuity calculations
  const [partySize, setPartySize] = useState(1);
  
  // Tax & Charges state - needed for calculateTotal function
  const [taxRates, setTaxRates] = useState([]);
  const [serviceCharges, setServiceCharges] = useState([]);
  const [gratuityRules, setGratuityRules] = useState([]);
  const [discountPolicies, setDiscountPolicies] = useState([]);

  const updateOrderTableAssignment = async (orderId, tableId) => {
    try {
      await axios.put(`${API}/orders/${orderId}/table`, { table_id: tableId });
      alert('Table assigned successfully!');
    } catch (error) {
      console.error('Error assigning table to order:', error);
      alert('Failed to assign table to order');
    }
  };

  const cancelEmptyOrder = async () => {
    try {
      // Cancel the empty order using correct POST endpoint
      await axios.post(`${API}/orders/${emptyOrderData.id}/cancel`, {
        reason: 'empty_order',
        notes: 'Order cancelled because all items were removed'
      });
      
      alert('Order cancelled successfully');
      setShowEmptyOrderModal(false);
      setEmptyOrderData(null);
      
      // Navigate back to main screen or active orders
      if (onBack) {
        onBack();
      }
      
      // If editing from table management, also refresh tables
      if (editingOrder && fromTableManagement) {
        // Force refresh of table management when we go back
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      }
    } catch (error) {
      console.error('Error cancelling empty order:', error);
      alert(`Failed to cancel order: ${error.response?.data?.detail || error.message}`);
    }
  };

  const resetCustomerInfo = () => {
    setCustomerInfo({ name: '', phone: '', address: '', apartment: '' });
    setShowCustomerInfo(false);
  };

  const [showCustomerInfo, setShowCustomerInfo] = useState(false);
  const [orderType, setOrderType] = useState(fromTableManagement ? 'dine_in' : (selectedTable ? 'dine_in' : 'takeout'));
  const [tip, setTip] = useState(0);
  const [showModifierModal, setShowModifierModal] = useState(false);
  const [selectedMenuItem, setSelectedMenuItem] = useState(null);
  const [selectedModifiers, setSelectedModifiers] = useState({});
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showRemovalModal, setShowRemovalModal] = useState(false);
  const [removalItemIndex, setRemovalItemIndex] = useState(null);
  const [orderNotes, setOrderNotes] = useState('');
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showCustomerSelectionModal, setShowCustomerSelectionModal] = useState(false);
  const [existingCustomers, setExistingCustomers] = useState([]);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [showTableModal, setShowTableModal] = useState(false);
  const [assignedTable, setAssignedTable] = useState(selectedTable || null);
  const [tables, setTables] = useState([]);
  const [showTableMergeModal, setShowTableMergeModal] = useState(false);
  const [occupiedTableToMerge, setOccupiedTableToMerge] = useState(null);
  const [existingTableOrder, setExistingTableOrder] = useState(null);
  const [showEmptyOrderModal, setShowEmptyOrderModal] = useState(false);
  const [emptyOrderData, setEmptyOrderData] = useState(null);
  const [appliedDiscountIds, setAppliedDiscountIds] = useState([]);
  const [showChargeManagementModal, setShowChargeManagementModal] = useState(false);
  const [availableDiscounts, setAvailableDiscounts] = useState([]);
  const [availableServiceCharges, setAvailableServiceCharges] = useState([]);
  const [showTableAssignmentWarning, setShowTableAssignmentWarning] = useState(false);
  const [conflictingTable, setConflictingTable] = useState(null);

  // Continue with all the component functions...
  // This will be completed in the next steps due to size constraints

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Component JSX will go here */}
      <div>NewOrder Component - Content being migrated...</div>
    </div>
  );
};

export default NewOrder;