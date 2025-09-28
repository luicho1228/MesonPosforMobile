import React, { useState, useEffect, useContext, createContext, useRef } from 'react';
import axios from 'axios';
import './App.css';
import { PrinterProvider, usePrinter } from './PrinterContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import PinLogin from './components/PinLogin';
import PinVerificationModal from './components/PinVerificationModal';
import CustomerManagement from './components/CustomerManagement';
import OrderHistory from './components/OrderHistory';
import ActiveOrders from './components/ActiveOrders';
import TableManagement from './components/TableManagement';
import { EmployeeStatus, ClockInOut } from './components/EmployeeComponents';
import { PaymentModal, ItemRemovalModal } from './components/ModalComponents';
import OrderDetailModal from './components/OrderDetailModal';
import TableMergeModal from './components/TableMergeModal';
import FloorPlanDesigner from './components/FloorPlanDesigner';
import StaffManagementComponent from './components/StaffManagementComponent';
import MenuManagementComponent from './components/MenuManagementComponent';
import NewOrder from './components/NewOrder';
import { parseBackendTimestamp, formatLocalDate, formatLocalTime, formatLocalDateTime, getTimeElapsed, getOrderAgeColor } from './utils/dateUtils';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Tax & Charges Component
const TaxChargesComponent = ({ onBack, onDataChange }) => {
  const [taxRates, setTaxRates] = useState([]);
  const [serviceCharges, setServiceCharges] = useState([]);
  const [gratuityRules, setGratuityRules] = useState([]);
  const [discountPolicies, setDiscountPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('taxes');
  const [showTaxModal, setShowTaxModal] = useState(false);
  const [showChargeModal, setShowChargeModal] = useState(false);
  const [showGratuityModal, setShowGratuityModal] = useState(false);
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  const [taxForm, setTaxForm] = useState({
    name: '',
    type: 'percentage', // percentage, fixed, compound
    rate: '',
    description: '',
    category: 'sales', // sales, luxury, service
    applies_to: 'subtotal', // subtotal, total
    jurisdiction: '', // city, state, federal
    tax_id: '',
    applies_to_order_types: [], // NEW: which order types this tax applies to
    active: true,
    inclusive: false // tax included in price vs added
  });

  const [chargeForm, setChargeForm] = useState({
    name: '',
    type: 'percentage', // percentage, fixed, per_person
    amount: '',
    description: '',
    applies_to: 'subtotal', // subtotal, total_with_tax
    conditions: [], // minimum_order, party_size, order_type
    minimum_amount: '',
    maximum_amount: '', // New field for maximum order amount
    party_size_threshold: '',
    order_types: [],
    active: true,
    mandatory: false
  });

  const [gratuityForm, setGratuityForm] = useState({
    name: '',
    type: 'percentage', // percentage, fixed
    amount: '',
    description: '',
    trigger_condition: 'party_size', // party_size, order_amount, manual
    party_size_min: '6',
    order_amount_min: '',
    applies_to_order_types: [],
    auto_apply: true,
    customer_can_modify: true,
    active: true
  });

  const [discountForm, setDiscountForm] = useState({
    name: '',
    type: 'percentage', // percentage, fixed, buy_one_get_one
    amount: '',
    description: '',
    category: 'general', // general, employee, senior, student, military
    conditions: [], // minimum_order, specific_items, time_based
    minimum_order_amount: '',
    valid_days: [],
    valid_hours_start: '',
    valid_hours_end: '',
    max_uses_per_day: '',
    requires_code: false,
    discount_code: '',
    stackable: false,
    active: true,
    expiry_date: ''
  });

  const taxTypes = [
    { value: 'percentage', label: 'Percentage', description: 'Calculated as % of amount' },
    { value: 'fixed', label: 'Fixed Amount', description: 'Fixed dollar amount' },
    { value: 'compound', label: 'Compound', description: 'Tax calculated on tax-inclusive amount' }
  ];

  const taxCategories = [
    { value: 'sales', label: 'Sales Tax', description: 'Standard sales tax' },
    { value: 'luxury', label: 'Luxury Tax', description: 'Tax on luxury items' },
    { value: 'service', label: 'Service Tax', description: 'Tax on services' },
    { value: 'vat', label: 'VAT', description: 'Value Added Tax' }
  ];

  const chargeTypes = [
    { value: 'percentage', label: 'Percentage', description: '% of order amount' },
    { value: 'fixed', label: 'Fixed Amount', description: 'Fixed dollar amount' },
    { value: 'per_person', label: 'Per Person', description: 'Amount per person' }
  ];

  const orderTypes = ['dine_in', 'takeout', 'delivery', 'phone_order'];
  const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

  useEffect(() => {
    fetchTaxChargesData();
  }, []);

  const fetchTaxChargesData = async () => {
    try {
      setLoading(true);
      
      // Fetch all tax and charges data from backend APIs
      const [taxRatesRes, serviceChargesRes, gratuityRulesRes, discountPoliciesRes] = await Promise.all([
        axios.get(`${API}/tax-charges/tax-rates`),
        axios.get(`${API}/tax-charges/service-charges`),
        axios.get(`${API}/tax-charges/gratuity-rules`),
        axios.get(`${API}/tax-charges/discount-policies`)
      ]);
      
      setTaxRates(taxRatesRes.data.length > 0 ? taxRatesRes.data : getDefaultTaxRates());
      setServiceCharges(serviceChargesRes.data.length > 0 ? serviceChargesRes.data : getDefaultServiceCharges());
      setGratuityRules(gratuityRulesRes.data.length > 0 ? gratuityRulesRes.data : getDefaultGratuityRules());
      setDiscountPolicies(discountPoliciesRes.data.length > 0 ? discountPoliciesRes.data : getDefaultDiscountPolicies());
      
    } catch (error) {
      console.error('Error fetching tax/charges data:', error);
      // Fallback to default data if API fails
      setTaxRates(getDefaultTaxRates());
      setServiceCharges(getDefaultServiceCharges());
      setGratuityRules(getDefaultGratuityRules());
      setDiscountPolicies(getDefaultDiscountPolicies());
      alert('Failed to load tax and charges configuration from server. Using default settings.');
    } finally {
      setLoading(false);
    }
  };

  // Remove the old localStorage save function - now using individual API calls

  const getDefaultTaxRates = () => [
    {
      id: crypto.randomUUID(),
      name: 'NYC Sales Tax',
      type: 'percentage',
      rate: 8.25,
      description: 'New York City Sales Tax',
      category: 'sales',
      applies_to: 'subtotal',
      jurisdiction: 'city',
      tax_id: 'NYC-ST-001',
      active: true,
      inclusive: false
    },
    {
      id: crypto.randomUUID(),
      name: 'State Tax',
      type: 'percentage',
      rate: 4.0,
      description: 'New York State Tax',
      category: 'sales',
      applies_to: 'subtotal',
      jurisdiction: 'state',
      tax_id: 'NYS-ST-001',
      active: true,
      inclusive: false
    }
  ];

  const getDefaultServiceCharges = () => [
    {
      id: crypto.randomUUID(),
      name: 'Large Party Service Charge',
      type: 'percentage',
      amount: 18,
      description: 'Automatic service charge for parties of 6 or more',
      applies_to: 'subtotal',
      conditions: ['party_size'],
      party_size_threshold: '6',
      order_types: ['dine_in'],
      active: true,
      mandatory: true
    },
    {
      id: crypto.randomUUID(),
      name: 'Delivery Fee',
      type: 'fixed',
      amount: 3.50,
      description: 'Standard delivery fee',
      applies_to: 'subtotal',
      conditions: ['order_type'],
      order_types: ['delivery'],
      active: true,
      mandatory: true
    }
  ];

  const getDefaultGratuityRules = () => [
    {
      id: crypto.randomUUID(),
      name: 'Automatic Gratuity - Large Parties',
      type: 'percentage',
      amount: 20,
      description: 'Automatic 20% gratuity for parties of 8+',
      trigger_condition: 'party_size',
      party_size_min: '8',
      applies_to_order_types: ['dine_in'],
      auto_apply: true,
      customer_can_modify: true,
      active: true
    },
    {
      id: crypto.randomUUID(),
      name: 'High-Value Order Gratuity',
      type: 'percentage',
      amount: 15,
      description: 'Suggested 15% gratuity for orders over $200',
      trigger_condition: 'order_amount',
      order_amount_min: '200',
      applies_to_order_types: ['dine_in', 'delivery'],
      auto_apply: false,
      customer_can_modify: true,
      active: true
    }
  ];

  const getDefaultDiscountPolicies = () => [
    {
      id: crypto.randomUUID(),
      name: 'Employee Discount',
      type: 'percentage',
      amount: 25,
      description: '25% discount for staff members',
      category: 'employee',
      conditions: ['requires_code'],
      discount_code: 'STAFF25',
      stackable: false,
      active: true,
      max_uses_per_day: '50'
    },
    {
      id: crypto.randomUUID(),
      name: 'Senior Citizen Discount',
      type: 'percentage',
      amount: 10,
      description: '10% discount for seniors (65+)',
      category: 'senior',
      conditions: ['time_based'],
      valid_days: ['monday', 'tuesday', 'wednesday', 'thursday'],
      valid_hours_start: '14:00',
      valid_hours_end: '17:00',
      stackable: true,
      active: true
    }
  ];

  const handleSaveTax = async () => {
    if (!taxForm.name || !taxForm.rate) {
      alert('Please fill in tax name and rate');
      return;
    }

    const rate = parseFloat(taxForm.rate);
    if (isNaN(rate) || rate < 0) {
      alert('Please enter a valid tax rate');
      return;
    }

    const taxData = {
      name: taxForm.name,
      description: taxForm.description,
      rate: rate,
      type: taxForm.type,
      category: taxForm.category,
      applies_to: taxForm.applies_to,
      jurisdiction: taxForm.jurisdiction,
      tax_id: taxForm.tax_id,
      applies_to_order_types: taxForm.applies_to_order_types || [], // FIX: Include order type selection
      active: taxForm.active,
      inclusive: taxForm.inclusive
    };

    try {
      if (editingItem) {
        // Update existing tax rate
        const response = await axios.put(`${API}/tax-charges/tax-rates/${editingItem.id}`, taxData);
        setTaxRates(prev => prev.map(item => 
          item.id === editingItem.id ? response.data : item
        ));
        alert('Tax rate updated successfully');
      } else {
        // Create new tax rate
        const response = await axios.post(`${API}/tax-charges/tax-rates`, taxData);
        setTaxRates(prev => [...prev, response.data]);
        alert('Tax rate added successfully');
      }

      setShowTaxModal(false);
      setEditingItem(null);
      resetTaxForm();
      
      // Notify parent component of data changes
      if (onDataChange) {
        onDataChange();
      }
    } catch (error) {
      console.error('Error saving tax rate:', error);
      alert('Failed to save tax rate: ' + (error.response?.data?.detail || error.message));
    }
  };

  const handleSaveCharge = async () => {
    if (!chargeForm.name || !chargeForm.amount) {
      alert('Please fill in charge name and amount');
      return;
    }

    const amount = parseFloat(chargeForm.amount);
    if (isNaN(amount) || amount < 0) {
      alert('Please enter a valid charge amount');
      return;
    }

    const chargeData = {
      name: chargeForm.name,
      description: chargeForm.description,
      amount: amount,
      type: chargeForm.type,
      applies_to_subtotal: chargeForm.applies_to === 'subtotal', // Convert string to boolean
      conditions: chargeForm.conditions,
      minimum_order_amount: parseFloat(chargeForm.minimum_amount) || 0,
      maximum_order_amount: parseFloat(chargeForm.maximum_amount) || 0,
      party_size_threshold: parseInt(chargeForm.party_size_threshold) || 0,
      applies_to_order_types: chargeForm.order_types || [], // FIX: Use correct backend field name
      active: chargeForm.active,
      mandatory: chargeForm.mandatory
    };

    try {
      if (editingItem) {
        // Update existing service charge
        const response = await axios.put(`${API}/tax-charges/service-charges/${editingItem.id}`, chargeData);
        setServiceCharges(prev => prev.map(item => 
          item.id === editingItem.id ? response.data : item
        ));
        alert('Service charge updated successfully');
      } else {
        // Create new service charge
        const response = await axios.post(`${API}/tax-charges/service-charges`, chargeData);
        setServiceCharges(prev => [...prev, response.data]);
        alert('Service charge added successfully');
      }

      // Refresh the data to trigger recalculation in any active orders
      await fetchTaxChargesData();
      
      // Notify parent component of data changes
      if (onDataChange) {
        onDataChange();
      }

      setShowChargeModal(false);
      setEditingItem(null);
      resetChargeForm();
    } catch (error) {
      console.error('Error saving service charge:', error);
      alert('Failed to save service charge: ' + (error.response?.data?.detail || error.message));
    }
  };

  const handleSaveGratuity = async () => {
    if (!gratuityForm.name || !gratuityForm.amount) {
      alert('Please fill in gratuity name and amount');
      return;
    }

    const amount = parseFloat(gratuityForm.amount);
    if (isNaN(amount) || amount < 0) {
      alert('Please enter a valid gratuity amount');
      return;
    }

    const gratuityData = {
      name: gratuityForm.name,
      description: gratuityForm.description,
      amount: amount,
      type: gratuityForm.type,
      minimum_order_amount: parseFloat(gratuityForm.order_amount_min) || 0,
      maximum_order_amount: 0, // Currently not exposed in UI
      party_size_minimum: parseInt(gratuityForm.party_size_min) || 0,
      applies_to_order_types: gratuityForm.applies_to_order_types || [],
      active: gratuityForm.active
    };

    try {
      if (editingItem) {
        // Update existing gratuity rule
        const response = await axios.put(`${API}/tax-charges/gratuity-rules/${editingItem.id}`, gratuityData);
        setGratuityRules(prev => prev.map(item => 
          item.id === editingItem.id ? response.data : item
        ));
        alert('Gratuity rule updated successfully');
      } else {
        // Create new gratuity rule
        const response = await axios.post(`${API}/tax-charges/gratuity-rules`, gratuityData);
        setGratuityRules(prev => [...prev, response.data]);
        alert('Gratuity rule added successfully');
      }

      setShowGratuityModal(false);
      setEditingItem(null);
      resetGratuityForm();
      
      // Notify parent component of data changes
      if (onDataChange) {
        onDataChange();
      }
    } catch (error) {
      console.error('Error saving gratuity rule:', error);
      alert('Failed to save gratuity rule: ' + (error.response?.data?.detail || error.message));
    }
  };

  const handleSaveDiscount = async () => {
    if (!discountForm.name || !discountForm.amount) {
      alert('Please fill in discount name and amount');
      return;
    }

    const amount = parseFloat(discountForm.amount);
    if (isNaN(amount) || amount < 0) {
      alert('Please enter a valid discount amount');
      return;
    }

    const discountData = {
      name: discountForm.name,
      description: discountForm.description,
      amount: amount,
      type: discountForm.type,
      category: discountForm.category,
      conditions: discountForm.conditions,
      minimum_order_amount: parseFloat(discountForm.minimum_order_amount) || 0,
      valid_days: discountForm.valid_days,
      valid_hours_start: discountForm.valid_hours_start,
      valid_hours_end: discountForm.valid_hours_end,
      max_uses_per_day: parseInt(discountForm.max_uses_per_day) || 0,
      requires_code: discountForm.requires_code,
      discount_code: discountForm.discount_code,
      stackable: discountForm.stackable,
      active: discountForm.active,
      expiry_date: discountForm.expiry_date
    };

    try {
      if (editingItem) {
        // Update existing discount policy
        const response = await axios.put(`${API}/tax-charges/discount-policies/${editingItem.id}`, discountData);
        setDiscountPolicies(prev => prev.map(item => 
          item.id === editingItem.id ? response.data : item
        ));
        alert('Discount policy updated successfully');
      } else {
        // Create new discount policy
        const response = await axios.post(`${API}/tax-charges/discount-policies`, discountData);
        setDiscountPolicies(prev => [...prev, response.data]);
        alert('Discount policy added successfully');
      }

      setShowDiscountModal(false);
      setEditingItem(null);
      resetDiscountForm();
      
      // Notify parent component of data changes
      if (onDataChange) {
        onDataChange();
      }
    } catch (error) {
      console.error('Error saving discount policy:', error);
      alert('Failed to save discount policy: ' + (error.response?.data?.detail || error.message));
    }
  };

  const handleEditTax = (tax) => {
    setTaxForm({
      name: tax.name,
      type: tax.type,
      rate: tax.rate.toString(),
      description: tax.description || '',
      category: tax.category,
      applies_to: tax.applies_to,
      jurisdiction: tax.jurisdiction || '',
      tax_id: tax.tax_id || '',
      applies_to_order_types: tax.applies_to_order_types || [], // Handle new field with default empty array
      active: tax.active,
      inclusive: tax.inclusive || false
    });
    setEditingItem(tax);
    setShowTaxModal(true);
  };

  const handleEditCharge = (charge) => {
    setChargeForm({
      name: charge.name,
      type: charge.type,
      amount: charge.amount.toString(),
      description: charge.description || '',
      applies_to: charge.applies_to_subtotal ? 'subtotal' : 'total', // Convert boolean to string
      conditions: charge.conditions || [],
      minimum_amount: charge.minimum_order_amount ? charge.minimum_order_amount.toString() : '',
      maximum_amount: charge.maximum_order_amount ? charge.maximum_order_amount.toString() : '',
      party_size_threshold: charge.party_size_threshold || '',
      order_types: charge.applies_to_order_types || [], // FIX: Map from backend field name
      active: charge.active,
      mandatory: charge.mandatory || false
    });
    setEditingItem(charge);
    setShowChargeModal(true);
  };

  const handleEditGratuity = (gratuity) => {
    setGratuityForm({
      name: gratuity.name,
      type: gratuity.type,
      amount: gratuity.amount.toString(),
      description: gratuity.description || '',
      trigger_condition: gratuity.trigger_condition || 'party_size',
      party_size_min: gratuity.party_size_minimum ? gratuity.party_size_minimum.toString() : '8',
      order_amount_min: gratuity.minimum_order_amount ? gratuity.minimum_order_amount.toString() : '',
      applies_to_order_types: gratuity.applies_to_order_types || [],
      auto_apply: gratuity.auto_apply || true,
      customer_can_modify: gratuity.customer_can_modify || true,
      active: gratuity.active
    });
    setEditingItem(gratuity);
    setShowGratuityModal(true);
  };

  const handleEditDiscount = (discount) => {
    setDiscountForm({
      name: discount.name,
      type: discount.type,
      amount: discount.amount.toString(),
      description: discount.description || '',
      category: discount.category,
      conditions: discount.conditions || [],
      minimum_order_amount: discount.minimum_order_amount || '',
      valid_days: discount.valid_days || [],
      valid_hours_start: discount.valid_hours_start || '',
      valid_hours_end: discount.valid_hours_end || '',
      max_uses_per_day: discount.max_uses_per_day || '',
      requires_code: discount.requires_code || false,
      discount_code: discount.discount_code || '',
      stackable: discount.stackable || false,
      active: discount.active,
      expiry_date: discount.expiry_date || ''
    });
    setEditingItem(discount);
    setShowDiscountModal(true);
  };

  const handleDelete = async (type, id) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      try {
        let endpoint = '';
        switch (type) {
          case 'tax':
            endpoint = `${API}/tax-charges/tax-rates/${id}`;
            break;
          case 'charge':
            endpoint = `${API}/tax-charges/service-charges/${id}`;
            break;
          case 'gratuity':
            endpoint = `${API}/tax-charges/gratuity-rules/${id}`;
            break;
          case 'discount':
            endpoint = `${API}/tax-charges/discount-policies/${id}`;
            break;
          default:
            throw new Error('Invalid type');
        }

        await axios.delete(endpoint);

        // Update local state after successful deletion
        switch (type) {
          case 'tax':
            setTaxRates(prev => prev.filter(item => item.id !== id));
            break;
          case 'charge':
            setServiceCharges(prev => prev.filter(item => item.id !== id));
            break;
          case 'gratuity':
            setGratuityRules(prev => prev.filter(item => item.id !== id));
            break;
          case 'discount':
            setDiscountPolicies(prev => prev.filter(item => item.id !== id));
            break;
        }

        alert('Item deleted successfully');
      } catch (error) {
        console.error('Error deleting item:', error);
        alert('Failed to delete item: ' + (error.response?.data?.detail || error.message));
      }
    }
  };

  const toggleActive = async (type, id) => {
    try {
      let endpoint = '';
      let currentItem = null;
      
      // Find the current item and determine endpoint
      switch (type) {
        case 'tax':
          currentItem = taxRates.find(item => item.id === id);
          endpoint = `${API}/tax-charges/tax-rates/${id}`;
          break;
        case 'charge':
          currentItem = serviceCharges.find(item => item.id === id);
          endpoint = `${API}/tax-charges/service-charges/${id}`;
          break;
        case 'gratuity':
          currentItem = gratuityRules.find(item => item.id === id);
          endpoint = `${API}/tax-charges/gratuity-rules/${id}`;
          break;
        case 'discount':
          currentItem = discountPolicies.find(item => item.id === id);
          endpoint = `${API}/tax-charges/discount-policies/${id}`;
          break;
        default:
          throw new Error('Invalid type');
      }

      if (!currentItem) {
        throw new Error('Item not found');
      }

      // Update the item with toggled active status
      const updatedItem = { ...currentItem, active: !currentItem.active };
      const response = await axios.put(endpoint, updatedItem);

      // Update local state with response data
      switch (type) {
        case 'tax':
          setTaxRates(prev => prev.map(item => 
            item.id === id ? response.data : item
          ));
          break;
        case 'charge':
          setServiceCharges(prev => prev.map(item => 
            item.id === id ? response.data : item
          ));
          break;
        case 'gratuity':
          setGratuityRules(prev => prev.map(item => 
            item.id === id ? response.data : item
          ));
          break;
        case 'discount':
          setDiscountPolicies(prev => prev.map(item => 
            item.id === id ? response.data : item
          ));
          break;
      }

    } catch (error) {
      console.error('Error toggling active status:', error);
      alert('Failed to update status: ' + (error.response?.data?.detail || error.message));
    }
  };

  const resetTaxForm = () => {
    setTaxForm({
      name: '',
      type: 'percentage',
      rate: '',
      description: '',
      category: 'sales',
      applies_to: 'subtotal',
      jurisdiction: '',
      tax_id: '',
      applies_to_order_types: [],
      active: true,
      inclusive: false
    });
  };

  const resetChargeForm = () => {
    setChargeForm({
      name: '',
      type: 'percentage',
      amount: '',
      description: '',
      applies_to: 'subtotal',
      conditions: [],
      minimum_amount: '',
      maximum_amount: '',
      party_size_threshold: '',
      order_types: [],
      active: true,
      mandatory: false
    });
  };

  const resetGratuityForm = () => {
    setGratuityForm({
      name: '',
      type: 'percentage',
      amount: '',
      description: '',
      trigger_condition: 'party_size',
      party_size_min: '8',
      order_amount_min: '',
      applies_to_order_types: [],
      auto_apply: true,
      customer_can_modify: true,
      active: true
    });
  };

  const resetDiscountForm = () => {
    setDiscountForm({
      name: '',
      type: 'percentage',
      amount: '',
      description: '',
      active: true
    });
  };

  const calculateTotalTaxRate = () => {
    return taxRates
      .filter(tax => tax.active && tax.type === 'percentage')
      .reduce((total, tax) => total + tax.rate, 0);
  };

  const stats = {
    activeTaxes: taxRates.filter(tax => tax.active).length,
    totalTaxRate: calculateTotalTaxRate(),
    activeCharges: serviceCharges.filter(charge => charge.active).length,
    activeGratuityRules: gratuityRules.filter(rule => rule.active).length,
    activeDiscounts: discountPolicies.filter(discount => discount.active).length
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading tax and charges configuration...</p>
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
            <h1 className="text-2xl font-bold text-gray-800">Tax & Charges Settings</h1>
          </div>
        </div>
      </div>

      {/* Stats Dashboard */}
      <div className="bg-white border-b p-6">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.activeTaxes}</div>
            <div className="text-sm text-gray-600">Active Taxes</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{stats.totalTaxRate.toFixed(2)}%</div>
            <div className="text-sm text-gray-600">Total Tax Rate</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{stats.activeCharges}</div>
            <div className="text-sm text-gray-600">Service Charges</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">{stats.activeGratuityRules}</div>
            <div className="text-sm text-gray-600">Gratuity Rules</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{stats.activeDiscounts}</div>
            <div className="text-sm text-gray-600">Discount Policies</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b">
        <div className="flex space-x-8 px-6">
          {[
            { id: 'taxes', name: 'Tax Rates', icon: '💰' },
            { id: 'charges', name: 'Service Charges', icon: '💳' },
            { id: 'gratuity', name: 'Gratuity Rules', icon: '🎯' },
            { id: 'discounts', name: 'Discount Policies', icon: '🏷️' }
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
        {/* Tax Rates Tab */}
        {activeTab === 'taxes' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Tax Rates Configuration</h2>
              <button
                onClick={() => setShowTaxModal(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
              >
                <span>+</span>
                <span>Add Tax Rate</span>
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {taxRates.map(tax => (
                <div key={tax.id} className="bg-white border rounded-lg p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-semibold text-lg text-gray-800">{tax.name}</h3>
                      <p className="text-sm text-gray-600">{tax.description}</p>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => toggleActive('tax', tax.id)}
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          tax.active 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {tax.active ? 'Active' : 'Inactive'}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Rate:</span>
                      <span className="text-sm font-medium">
                        {tax.type === 'percentage' ? `${tax.rate}%` : `$${tax.rate}`}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Type:</span>
                      <span className="text-sm font-medium">{tax.type}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Category:</span>
                      <span className="text-sm font-medium">{tax.category}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Applies to:</span>
                      <span className="text-sm font-medium">{tax.applies_to}</span>
                    </div>
                    {tax.jurisdiction && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Jurisdiction:</span>
                        <span className="text-sm font-medium">{tax.jurisdiction}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEditTax(tax)}
                      className="flex-1 bg-blue-50 text-blue-600 px-3 py-2 rounded text-sm font-medium hover:bg-blue-100"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete('tax', tax.id)}
                      className="flex-1 bg-red-50 text-red-600 px-3 py-2 rounded text-sm font-medium hover:bg-red-100"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {taxRates.length === 0 && (
              <div className="text-center py-12">
                <span className="text-6xl mb-4 block">💰</span>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No tax rates configured</h3>
                <p className="text-gray-500 mb-4">Add your first tax rate to get started</p>
                <button
                  onClick={() => setShowTaxModal(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                  Add Tax Rate
                </button>
              </div>
            )}
          </div>
        )}

        {/* Service Charges Tab */}
        {activeTab === 'charges' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Service Charges & Fees</h2>
              <button
                onClick={() => setShowChargeModal(true)}
                className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 flex items-center space-x-2"
              >
                <span>+</span>
                <span>Add Service Charge</span>
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {serviceCharges.map(charge => (
                <div key={charge.id} className="bg-white border rounded-lg p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="font-semibold text-lg text-gray-800">{charge.name}</h3>
                        {charge.mandatory && (
                          <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded text-xs font-medium">
                            Mandatory
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">{charge.description}</p>
                    </div>
                    <button
                      onClick={() => toggleActive('charge', charge.id)}
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        charge.active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {charge.active ? 'Active' : 'Inactive'}
                    </button>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Amount:</span>
                      <span className="text-sm font-medium">
                        {charge.type === 'percentage' ? `${charge.amount}%` : 
                         charge.type === 'per_person' ? `$${charge.amount}/person` : 
                         `$${charge.amount}`}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Applies to:</span>
                      <span className="text-sm font-medium">{charge.applies_to}</span>
                    </div>
                    {charge.conditions?.includes('party_size') && charge.party_size_threshold && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Min Party Size:</span>
                        <span className="text-sm font-medium">{charge.party_size_threshold}+ people</span>
                      </div>
                    )}
                    {charge.order_types?.length > 0 && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Order Types:</span>
                        <span className="text-sm font-medium">{charge.order_types.join(', ')}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEditCharge(charge)}
                      className="flex-1 bg-purple-50 text-purple-600 px-3 py-2 rounded text-sm font-medium hover:bg-purple-100"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete('charge', charge.id)}
                      className="flex-1 bg-red-50 text-red-600 px-3 py-2 rounded text-sm font-medium hover:bg-red-100"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {serviceCharges.length === 0 && (
              <div className="text-center py-12">
                <span className="text-6xl mb-4 block">💳</span>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No service charges configured</h3>
                <p className="text-gray-500 mb-4">Add service charges and fees</p>
                <button
                  onClick={() => setShowChargeModal(true)}
                  className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
                >
                  Add Service Charge
                </button>
              </div>
            )}
          </div>
        )}

        {/* Gratuity Rules Tab */}
        {activeTab === 'gratuity' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Automatic Gratuity Rules</h2>
              <button
                onClick={() => setShowGratuityModal(true)}
                className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 flex items-center space-x-2"
              >
                <span>+</span>
                <span>Add Gratuity Rule</span>
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {gratuityRules.map(rule => (
                <div key={rule.id} className="bg-white border rounded-lg p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="font-semibold text-lg text-gray-800">{rule.name}</h3>
                        {rule.auto_apply && (
                          <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-medium">
                            Auto-Apply
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">{rule.description}</p>
                    </div>
                    <button
                      onClick={() => toggleActive('gratuity', rule.id)}
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        rule.active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {rule.active ? 'Active' : 'Inactive'}
                    </button>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Amount:</span>
                      <span className="text-sm font-medium">
                        {rule.type === 'percentage' ? `${rule.amount}%` : `$${rule.amount}`}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Trigger:</span>
                      <span className="text-sm font-medium">
                        {rule.trigger_condition === 'party_size' ? `${rule.party_size_min}+ people` :
                         rule.trigger_condition === 'order_amount' ? `$${rule.order_amount_min}+ order` :
                         'Manual'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Customer can modify:</span>
                      <span className="text-sm font-medium">{rule.customer_can_modify ? 'Yes' : 'No'}</span>
                    </div>
                    {rule.applies_to_order_types?.length > 0 && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Order Types:</span>
                        <span className="text-sm font-medium">{rule.applies_to_order_types.join(', ')}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEditGratuity(rule)}
                      className="flex-1 bg-orange-50 text-orange-600 px-3 py-2 rounded text-sm font-medium hover:bg-orange-100"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete('gratuity', rule.id)}
                      className="flex-1 bg-red-50 text-red-600 px-3 py-2 rounded text-sm font-medium hover:bg-red-100"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {gratuityRules.length === 0 && (
              <div className="text-center py-12">
                <span className="text-6xl mb-4 block">🎯</span>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No gratuity rules configured</h3>
                <p className="text-gray-500 mb-4">Set up automatic gratuity rules</p>
                <button
                  onClick={() => setShowGratuityModal(true)}
                  className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700"
                >
                  Add Gratuity Rule
                </button>
              </div>
            )}
          </div>
        )}

        {/* Discount Policies Tab */}
        {activeTab === 'discounts' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Discount Policies</h2>
              <button
                onClick={() => setShowDiscountModal(true)}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 flex items-center space-x-2"
              >
                <span>+</span>
                <span>Add Discount</span>
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {discountPolicies.map(discount => (
                <div key={discount.id} className="bg-white border rounded-lg p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="font-semibold text-lg text-gray-800">{discount.name}</h3>
                        {discount.stackable && (
                          <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium">
                            Stackable
                          </span>
                        )}
                        {discount.requires_code && (
                          <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs font-medium">
                            Code Required
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">{discount.description}</p>
                    </div>
                    <button
                      onClick={() => toggleActive('discount', discount.id)}
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        discount.active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {discount.active ? 'Active' : 'Inactive'}
                    </button>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Discount:</span>
                      <span className="text-sm font-medium">
                        {discount.type === 'percentage' ? `${discount.amount}%` : `$${discount.amount}`}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Category:</span>
                      <span className="text-sm font-medium">{discount.category}</span>
                    </div>
                    {discount.discount_code && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Code:</span>
                        <span className="text-sm font-medium font-mono">{discount.discount_code}</span>
                      </div>
                    )}
                    {discount.valid_days?.length > 0 && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Valid Days:</span>
                        <span className="text-sm font-medium">{discount.valid_days.join(', ')}</span>
                      </div>
                    )}
                    {discount.valid_hours_start && discount.valid_hours_end && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Valid Hours:</span>
                        <span className="text-sm font-medium">
                          {discount.valid_hours_start} - {discount.valid_hours_end}
                        </span>
                      </div>
                    )}
                    {discount.max_uses_per_day && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Daily Limit:</span>
                        <span className="text-sm font-medium">{discount.max_uses_per_day} uses</span>
                      </div>
                    )}
                  </div>

                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEditDiscount(discount)}
                      className="flex-1 bg-red-50 text-red-600 px-3 py-2 rounded text-sm font-medium hover:bg-red-100"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete('discount', discount.id)}
                      className="flex-1 bg-gray-50 text-gray-600 px-3 py-2 rounded text-sm font-medium hover:bg-gray-100"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {discountPolicies.length === 0 && (
              <div className="text-center py-12">
                <span className="text-6xl mb-4 block">🏷️</span>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No discount policies configured</h3>
                <p className="text-gray-500 mb-4">Create discount policies for your restaurant</p>
                <button
                  onClick={() => setShowDiscountModal(true)}
                  className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
                >
                  Add Discount Policy
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add Tax Modal */}
      {showTaxModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-screen overflow-y-auto">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold">
                {editingItem ? 'Edit Tax Rate' : 'Add Tax Rate'}
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tax Name *</label>
                  <input
                    type="text"
                    value={taxForm.name}
                    onChange={(e) => setTaxForm({...taxForm, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., Sales Tax, VAT"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tax Rate *</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={taxForm.rate}
                      onChange={(e) => setTaxForm({...taxForm, rate: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      placeholder="8.25"
                    />
                    <span className="absolute right-3 top-2 text-gray-500">
                      {taxForm.type === 'percentage' ? '%' : '$'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tax Type</label>
                  <select
                    value={taxForm.type}
                    onChange={(e) => setTaxForm({...taxForm, type: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    {taxTypes.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select
                    value={taxForm.category}
                    onChange={(e) => setTaxForm({...taxForm, category: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    {taxCategories.map(category => (
                      <option key={category.value} value={category.value}>{category.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={taxForm.description}
                  onChange={(e) => setTaxForm({...taxForm, description: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  rows="2"
                  placeholder="Tax description"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Applies To</label>
                  <select
                    value={taxForm.applies_to}
                    onChange={(e) => setTaxForm({...taxForm, applies_to: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="subtotal">Subtotal</option>
                    <option value="total">Total with other taxes</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Jurisdiction</label>
                  <input
                    type="text"
                    value={taxForm.jurisdiction}
                    onChange={(e) => setTaxForm({...taxForm, jurisdiction: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., City, State, Federal"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tax ID</label>
                <input
                  type="text"
                  value={taxForm.tax_id}
                  onChange={(e) => setTaxForm({...taxForm, tax_id: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Tax identification number"
                />
              </div>

              {/* Order Type Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Apply Tax To</label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="tax-application"
                      checked={(taxForm.applies_to_order_types || []).length === 0}
                      onChange={() => setTaxForm({...taxForm, applies_to_order_types: []})}
                      className="mr-2"
                    />
                    <span className="text-sm font-medium text-gray-700">All Order Types</span>
                    <span className="text-xs text-gray-500 ml-2">(Dine-in, Takeout, Delivery, Phone Orders)</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="tax-application"
                      checked={(taxForm.applies_to_order_types || []).length > 0}
                      onChange={() => {
                        if ((taxForm.applies_to_order_types || []).length === 0) {
                          setTaxForm({...taxForm, applies_to_order_types: ['dine_in']});
                        }
                      }}
                      className="mr-2"
                    />
                    <span className="text-sm font-medium text-gray-700">Specific Order Types Only</span>
                  </label>
                </div>
                
                {/* Order Type Checkboxes - Only show when "Specific Order Types" is selected */}
                {(taxForm.applies_to_order_types || []).length > 0 && (
                  <div className="mt-3 ml-6 space-y-2 bg-gray-50 p-3 rounded-md">
                    <p className="text-sm font-medium text-gray-600 mb-2">Select which order types this tax applies to:</p>
                    {orderTypes.map(type => (
                      <label key={type} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={(taxForm.applies_to_order_types || []).includes(type)}
                          onChange={(e) => {
                            const currentTypes = taxForm.applies_to_order_types || [];
                            if (e.target.checked) {
                              setTaxForm({
                                ...taxForm, 
                                applies_to_order_types: [...currentTypes, type]
                              });
                            } else {
                              setTaxForm({
                                ...taxForm, 
                                applies_to_order_types: currentTypes.filter(t => t !== type)
                              });
                            }
                          }}
                          className="mr-2"
                        />
                        <span className="text-sm text-gray-700 capitalize">
                          {type.replace('_', '-')}
                          {type === 'dine_in' && ' (Restaurant)'}
                          {type === 'takeout' && ' (To-Go)'}
                          {type === 'delivery' && ' (Delivery)'}
                          {type === 'phone_order' && ' (Phone)'}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex space-x-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={taxForm.active}
                    onChange={(e) => setTaxForm({...taxForm, active: e.target.checked})}
                    className="mr-2"
                  />
                  <span className="text-sm font-medium text-gray-700">Active</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={taxForm.inclusive}
                    onChange={(e) => setTaxForm({...taxForm, inclusive: e.target.checked})}
                    className="mr-2"
                  />
                  <span className="text-sm font-medium text-gray-700">Tax Inclusive (included in item prices)</span>
                </label>
              </div>
            </div>
            <div className="p-6 border-t flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowTaxModal(false);
                  setEditingItem(null);
                  resetTaxForm();
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveTax}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                {editingItem ? 'Update' : 'Add'} Tax Rate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Additional modals for charges, gratuity, and discounts would go here - similar structure */}
      {/* I'll implement the key ones to keep the response manageable */}

      {/* Add Service Charge Modal */}
      {showChargeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-screen overflow-y-auto">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold">
                {editingItem ? 'Edit Service Charge' : 'Add Service Charge'}
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Charge Name *</label>
                  <input
                    type="text"
                    value={chargeForm.name}
                    onChange={(e) => setChargeForm({...chargeForm, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., Service Charge, Delivery Fee"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount *</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={chargeForm.amount}
                      onChange={(e) => setChargeForm({...chargeForm, amount: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      placeholder="18.00"
                    />
                    <span className="absolute right-3 top-2 text-gray-500">
                      {chargeForm.type === 'percentage' ? '%' : chargeForm.type === 'per_person' ? '/person' : '$'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Charge Type</label>
                  <select
                    value={chargeForm.type}
                    onChange={(e) => setChargeForm({...chargeForm, type: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    {chargeTypes.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Applies To</label>
                  <select
                    value={chargeForm.applies_to}
                    onChange={(e) => setChargeForm({...chargeForm, applies_to: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="subtotal">Subtotal</option>
                    <option value="total_with_tax">Total with Tax</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={chargeForm.description}
                  onChange={(e) => setChargeForm({...chargeForm, description: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  rows="2"
                  placeholder="Charge description"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Conditions</label>
                <div className="space-y-3">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={chargeForm.conditions.includes('party_size')}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setChargeForm({...chargeForm, conditions: [...chargeForm.conditions, 'party_size']});
                        } else {
                          setChargeForm({...chargeForm, conditions: chargeForm.conditions.filter(c => c !== 'party_size')});
                        }
                      }}
                      className="mr-2"
                    />
                    <span className="text-sm">Apply based on party size</span>
                  </label>
                  {chargeForm.conditions.includes('party_size') && (
                    <div className="ml-6">
                      <label className="block text-xs text-gray-500 mb-1">Minimum party size</label>
                      <input
                        type="number"
                        min="1"
                        value={chargeForm.party_size_threshold}
                        onChange={(e) => setChargeForm({...chargeForm, party_size_threshold: e.target.value})}
                        className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
                        placeholder="6"
                      />
                    </div>
                  )}
                  
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={chargeForm.conditions.includes('order_cost')}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setChargeForm({...chargeForm, conditions: [...chargeForm.conditions, 'order_cost']});
                        } else {
                          setChargeForm({...chargeForm, conditions: chargeForm.conditions.filter(c => c !== 'order_cost')});
                        }
                      }}
                      className="mr-2"
                    />
                    <span className="text-sm">Apply based on order total cost</span>
                  </label>
                  {chargeForm.conditions.includes('order_cost') && (
                    <div className="ml-6 space-y-2">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Minimum order amount ($)</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={chargeForm.minimum_amount}
                          onChange={(e) => setChargeForm({...chargeForm, minimum_amount: e.target.value})}
                          className="w-32 px-2 py-1 border border-gray-300 rounded text-sm"
                          placeholder="25.00"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Maximum order amount ($) - optional</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={chargeForm.maximum_amount}
                          onChange={(e) => setChargeForm({...chargeForm, maximum_amount: e.target.value})}
                          className="w-32 px-2 py-1 border border-gray-300 rounded text-sm"
                          placeholder="100.00"
                        />
                        <p className="text-xs text-gray-400 mt-1">Leave empty for no maximum</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Apply Service Charge To</label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="charge-application"
                      checked={chargeForm.order_types.length === 0}
                      onChange={() => setChargeForm({...chargeForm, order_types: []})}
                      className="mr-2"
                    />
                    <span className="text-sm font-medium text-gray-700">All Order Types</span>
                    <span className="text-xs text-gray-500 ml-2">(Dine-in, Takeout, Delivery, Phone Orders)</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="charge-application"
                      checked={chargeForm.order_types.length > 0}
                      onChange={() => {
                        if (chargeForm.order_types.length === 0) {
                          setChargeForm({...chargeForm, order_types: ['dine_in']});
                        }
                      }}
                      className="mr-2"
                    />
                    <span className="text-sm font-medium text-gray-700">Specific Order Types Only</span>
                  </label>
                </div>
                
                {/* Order Type Checkboxes - Only show when "Specific Order Types" is selected */}
                {chargeForm.order_types.length > 0 && (
                  <div className="mt-3 ml-6 space-y-2 bg-gray-50 p-3 rounded-md">
                    <p className="text-sm font-medium text-gray-600 mb-2">Select which order types this charge applies to:</p>
                    {orderTypes.map(type => (
                      <label key={type} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={chargeForm.order_types.includes(type)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setChargeForm({...chargeForm, order_types: [...chargeForm.order_types, type]});
                            } else {
                              setChargeForm({...chargeForm, order_types: chargeForm.order_types.filter(t => t !== type)});
                            }
                          }}
                          className="mr-2"
                        />
                        <span className="text-sm text-gray-700 capitalize">
                          {type.replace('_', '-')}
                          {type === 'dine_in' && ' (Restaurant)'}
                          {type === 'takeout' && ' (To-Go)'}
                          {type === 'delivery' && ' (Delivery)'}
                          {type === 'phone_order' && ' (Phone)'}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex space-x-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={chargeForm.active}
                    onChange={(e) => setChargeForm({...chargeForm, active: e.target.checked})}
                    className="mr-2"
                  />
                  <span className="text-sm font-medium text-gray-700">Active</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={chargeForm.mandatory}
                    onChange={(e) => setChargeForm({...chargeForm, mandatory: e.target.checked})}
                    className="mr-2"
                  />
                  <span className="text-sm font-medium text-gray-700">Mandatory (cannot be removed)</span>
                </label>
              </div>
            </div>
            <div className="p-6 border-t flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowChargeModal(false);
                  setEditingItem(null);
                  resetChargeForm();
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveCharge}
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
              >
                {editingItem ? 'Update' : 'Add'} Service Charge
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Gratuity Rule Modal */}
      {showGratuityModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-screen overflow-y-auto">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold">
                {editingItem ? 'Edit Gratuity Rule' : 'Add Gratuity Rule'}
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Rule Name *</label>
                  <input
                    type="text"
                    value={gratuityForm.name}
                    onChange={(e) => setGratuityForm({...gratuityForm, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., Large Party Gratuity"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount *</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={gratuityForm.amount}
                      onChange={(e) => setGratuityForm({...gratuityForm, amount: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      placeholder="20.00"
                    />
                    <span className="absolute right-3 top-2 text-gray-500">
                      {gratuityForm.type === 'percentage' ? '%' : '$'}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={gratuityForm.description}
                  onChange={(e) => setGratuityForm({...gratuityForm, description: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  rows="2"
                  placeholder="Gratuity rule description"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Trigger Condition</label>
                  <select
                    value={gratuityForm.trigger_condition}
                    onChange={(e) => setGratuityForm({...gratuityForm, trigger_condition: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="party_size">Party Size</option>
                    <option value="order_amount">Order Amount</option>
                    <option value="manual">Manual Only</option>
                  </select>
                </div>
                <div>
                  {gratuityForm.trigger_condition === 'party_size' ? (
                    <>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Minimum Party Size</label>
                      <input
                        type="number"
                        min="1"
                        value={gratuityForm.party_size_min}
                        onChange={(e) => setGratuityForm({...gratuityForm, party_size_min: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        placeholder="6"
                      />
                    </>
                  ) : gratuityForm.trigger_condition === 'order_amount' ? (
                    <>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Minimum Order Amount</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={gratuityForm.order_amount_min}
                        onChange={(e) => setGratuityForm({...gratuityForm, order_amount_min: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        placeholder="200.00"
                      />
                    </>
                  ) : null}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Applies to Order Types</label>
                <div className="grid grid-cols-2 gap-2">
                  {orderTypes.map(type => (
                    <label key={type} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={gratuityForm.applies_to_order_types.includes(type)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setGratuityForm({...gratuityForm, applies_to_order_types: [...gratuityForm.applies_to_order_types, type]});
                          } else {
                            setGratuityForm({...gratuityForm, applies_to_order_types: gratuityForm.applies_to_order_types.filter(t => t !== type)});
                          }
                        }}
                        className="mr-2"
                      />
                      <span className="text-sm">{type.replace('_', ' ')}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex space-x-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={gratuityForm.auto_apply}
                    onChange={(e) => setGratuityForm({...gratuityForm, auto_apply: e.target.checked})}
                    className="mr-2"
                  />
                  <span className="text-sm font-medium text-gray-700">Auto-apply when conditions are met</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={gratuityForm.customer_can_modify}
                    onChange={(e) => setGratuityForm({...gratuityForm, customer_can_modify: e.target.checked})}
                    className="mr-2"
                  />
                  <span className="text-sm font-medium text-gray-700">Customer can modify amount</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={gratuityForm.active}
                    onChange={(e) => setGratuityForm({...gratuityForm, active: e.target.checked})}
                    className="mr-2"
                  />
                  <span className="text-sm font-medium text-gray-700">Active</span>
                </label>
              </div>
            </div>
            <div className="p-6 border-t flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowGratuityModal(false);
                  setEditingItem(null);
                  resetGratuityForm();
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveGratuity}
                className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700"
              >
                {editingItem ? 'Update' : 'Add'} Gratuity Rule
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Discount Policy Modal */}
      {showDiscountModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-screen overflow-y-auto">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold">
                {editingItem ? 'Edit Discount Policy' : 'Add Discount Policy'}
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Discount Name *</label>
                  <input
                    type="text"
                    value={discountForm.name}
                    onChange={(e) => setDiscountForm({...discountForm, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., Employee Discount"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Discount Amount *</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={discountForm.amount}
                      onChange={(e) => setDiscountForm({...discountForm, amount: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      placeholder="25.00"
                    />
                    <span className="absolute right-3 top-2 text-gray-500">
                      {discountForm.type === 'percentage' ? '%' : '$'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Discount Type</label>
                  <select
                    value={discountForm.type}
                    onChange={(e) => setDiscountForm({...discountForm, type: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="percentage">Percentage</option>
                    <option value="fixed">Fixed Amount</option>
                    <option value="buy_one_get_one">Buy One Get One</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select
                    value={discountForm.category}
                    onChange={(e) => setDiscountForm({...discountForm, category: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="general">General</option>
                    <option value="employee">Employee</option>
                    <option value="senior">Senior Citizen</option>
                    <option value="student">Student</option>
                    <option value="military">Military</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={discountForm.description}
                  onChange={(e) => setDiscountForm({...discountForm, description: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  rows="2"
                  placeholder="Discount description"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Minimum Order Amount</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={discountForm.minimum_order_amount}
                    onChange={(e) => setDiscountForm({...discountForm, minimum_order_amount: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="50.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Daily Usage Limit</label>
                  <input
                    type="number"
                    min="1"
                    value={discountForm.max_uses_per_day}
                    onChange={(e) => setDiscountForm({...discountForm, max_uses_per_day: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="50"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={discountForm.requires_code}
                    onChange={(e) => setDiscountForm({...discountForm, requires_code: e.target.checked})}
                    className="mr-2"
                  />
                  <span className="text-sm font-medium text-gray-700">Requires discount code</span>
                </label>
                {discountForm.requires_code && (
                  <input
                    type="text"
                    value={discountForm.discount_code}
                    onChange={(e) => setDiscountForm({...discountForm, discount_code: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="DISCOUNT CODE"
                  />
                )}
              </div>

              <div className="flex space-x-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={discountForm.stackable}
                    onChange={(e) => setDiscountForm({...discountForm, stackable: e.target.checked})}
                    className="mr-2"
                  />
                  <span className="text-sm font-medium text-gray-700">Stackable with other discounts</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={discountForm.active}
                    onChange={(e) => setDiscountForm({...discountForm, active: e.target.checked})}
                    className="mr-2"
                  />
                  <span className="text-sm font-medium text-gray-700">Active</span>
                </label>
              </div>
            </div>
            <div className="p-6 border-t flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowDiscountModal(false);
                  setEditingItem(null);
                  resetDiscountForm();
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveDiscount}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                {editingItem ? 'Update' : 'Add'} Discount Policy
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};





// Table Settings Component
const TableSettingsComponent = ({ onBack }) => {
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('management');
  const [showAddTableModal, setShowAddTableModal] = useState(false);
  const [showBulkAddModal, setShowBulkAddModal] = useState(false);
  const [showEditTableModal, setShowEditTableModal] = useState(false);
  const [editingTable, setEditingTable] = useState(null);
  const [selectedLayout, setSelectedLayout] = useState('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [tableForm, setTableForm] = useState({
    name: '',
    capacity: '4'
  });

  const [bulkAddForm, setBulkAddForm] = useState({
    startNumber: '',
    endNumber: '',
    namePrefix: '',
    capacity: '4'
  });

  const tableStatuses = [
    { value: 'available', label: 'Available', color: 'bg-green-100 text-green-800', icon: '✅' },
    { value: 'occupied', label: 'Occupied', color: 'bg-red-100 text-red-800', icon: '🔴' },
    { value: 'needs_cleaning', label: 'Needs Cleaning', color: 'bg-yellow-100 text-yellow-800', icon: '🧹' },
    { value: 'reserved', label: 'Reserved', color: 'bg-blue-100 text-blue-800', icon: '📅' }
  ];

  useEffect(() => {
    fetchTables();
  }, []);

  const fetchTables = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/tables`);
      setTables(response.data.sort((a, b) => a.name.localeCompare(b.name)));
    } catch (error) {
      console.error('Error fetching tables:', error);
      alert('Failed to load tables');
    } finally {
      setLoading(false);
    }
  };

  const handleAddTable = async () => {
    if (!tableForm.name || !tableForm.capacity) {
      alert('Please fill in table name and capacity');
      return;
    }

    const capacity = parseInt(tableForm.capacity);

    if (isNaN(capacity) || capacity <= 0) {
      alert('Please enter a valid capacity');
      return;
    }

    // Check if table name already exists
    if (tables.some(table => table.name === tableForm.name.trim())) {
      alert('Table name already exists');
      return;
    }

    try {
      await axios.post(`${API}/tables`, {
        name: tableForm.name.trim(),
        capacity: capacity
      });
      alert('Table added successfully');
      setShowAddTableModal(false);
      setTableForm({ name: '', capacity: '4' });
      fetchTables();
    } catch (error) {
      console.error('Error adding table:', error);
      alert(error.response?.data?.detail || 'Failed to add table');
    }
  };

  const handleBulkAdd = async () => {
    if (!bulkAddForm.startNumber || !bulkAddForm.endNumber || !bulkAddForm.capacity) {
      alert('Please fill in start number, end number, and capacity');
      return;
    }

    const startNum = parseInt(bulkAddForm.startNumber);
    const endNum = parseInt(bulkAddForm.endNumber);
    const capacity = parseInt(bulkAddForm.capacity);

    if (isNaN(startNum) || isNaN(endNum) || isNaN(capacity)) {
      alert('Please enter valid numbers');
      return;
    }

    if (startNum > endNum) {
      alert('Start number must be less than or equal to end number');
      return;
    }

    if (endNum - startNum > 50) {
      alert('Cannot add more than 50 tables at once');
      return;
    }

    try {
      const existingNumbers = tables.map(t => t.number);
      const tablesToAdd = [];
      
      for (let i = startNum; i <= endNum; i++) {
        if (!existingNumbers.includes(i)) {
          const tableName = bulkAddForm.namePrefix ? 
            `${bulkAddForm.namePrefix} ${i}` : '';
          tablesToAdd.push({ 
            number: i, 
            name: tableName,
            capacity: capacity 
          });
        }
      }

      if (tablesToAdd.length === 0) {
        alert('All table numbers in this range already exist');
        return;
      }

      // Add tables one by one
      for (const table of tablesToAdd) {
        await axios.post(`${API}/tables`, table);
      }

      alert(`Successfully added ${tablesToAdd.length} tables`);
      setShowBulkAddModal(false);
      setBulkAddForm({ startNumber: '', endNumber: '', namePrefix: '', capacity: '4' });
      fetchTables();
    } catch (error) {
      console.error('Error bulk adding tables:', error);
      alert('Failed to add some tables');
      fetchTables(); // Refresh to show which ones were added
    }
  };

  const handleEditTable = (table) => {
    setEditingTable(table);
    setTableForm({
      name: table.name || '',
      capacity: table.capacity.toString()
    });
    setShowEditTableModal(true);
  };

  const handleUpdateTable = async () => {
    if (!tableForm.name || !tableForm.capacity) {
      alert('Please enter a table name and capacity');
      return;
    }

    const capacity = parseInt(tableForm.capacity);
    if (isNaN(capacity) || capacity <= 0) {
      alert('Please enter a valid capacity');
      return;
    }

    // Check if table name already exists (excluding current table)
    if (tables.some(table => table.id !== editingTable.id && table.name === tableForm.name.trim())) {
      alert('Table name already exists');
      return;
    }

    try {
      await axios.put(`${API}/tables/${editingTable.id}`, {
        name: tableForm.name.trim(),
        capacity: capacity,
        status: editingTable.status,
        current_order_id: editingTable.current_order_id
      });
      
      alert('Table updated successfully');
      setShowEditTableModal(false);
      setEditingTable(null);
      setTableForm({ name: '', capacity: '4' });
      fetchTables();
    } catch (error) {
      console.error('Error updating table:', error);
      alert('Failed to update table');
    }
  };

  const handleDeleteTable = async (table) => {
    if (table.status === 'occupied' && table.current_order_id) {
      alert('Cannot delete table with active order. Please clear the order first.');
      return;
    }

    if (window.confirm(`Are you sure you want to delete ${getTableDisplayName(table)}?`)) {
      try {
        await axios.delete(`${API}/tables/${table.id}`);
        alert('Table deleted successfully');
        fetchTables();
      } catch (error) {
        console.error('Error deleting table:', error);
        alert('Failed to delete table');
      }
    }
  };

  const handleStatusChange = async (table, newStatus) => {
    try {
      await axios.put(`${API}/tables/${table.id}`, {
        status: newStatus,
        current_order_id: newStatus === 'available' ? null : table.current_order_id
      });
      fetchTables();
    } catch (error) {
      console.error('Error updating table status:', error);
      alert('Failed to update table status');
    }
  };

  const getStatusInfo = (status) => {
    return tableStatuses.find(s => s.value === status) || tableStatuses[0];
  };

  const handleUpdateTablePosition = async (tableId, position) => {
    try {
      // Update table position in the backend (we'll need to add position fields to the table model)
      // For now, we'll store positions in localStorage until backend supports it
      const floorPlans = JSON.parse(localStorage.getItem('floorPlans') || '{}');
      if (!floorPlans.default) floorPlans.default = {};
      floorPlans.default[tableId] = position;
      localStorage.setItem('floorPlans', JSON.stringify(floorPlans));
    } catch (error) {
      console.error('Error updating table position:', error);
    }
  };

  const handleSaveFloorPlan = (floorPlanData, name = 'default') => {
    try {
      const floorPlans = JSON.parse(localStorage.getItem('floorPlans') || '{}');
      floorPlans[name] = floorPlanData;
      localStorage.setItem('floorPlans', JSON.stringify(floorPlans));
      alert(`Floor plan "${name}" saved successfully`);
    } catch (error) {
      console.error('Error saving floor plan:', error);
      alert('Failed to save floor plan');
    }
  };

  const handleLoadFloorPlan = (name = 'default') => {
    try {
      const floorPlans = JSON.parse(localStorage.getItem('floorPlans') || '{}');
      return floorPlans[name] || {};
    } catch (error) {
      console.error('Error loading floor plan:', error);
      return {};
    }
  };

  const getTableDisplayName = (table) => {
    if (table.name && table.name.trim()) {
      return table.name;
    }
    return `Table ${table.number}`;
  };

  const filteredTables = tables.filter(table => {
    const matchesSearch = table.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         table.capacity.toString().includes(searchQuery) ||
                         searchQuery === '';
    const matchesStatus = statusFilter === 'all' || table.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const tableStats = {
    total: tables.length,
    available: tables.filter(t => t.status === 'available').length,
    occupied: tables.filter(t => t.status === 'occupied').length,
    needsCleaning: tables.filter(t => t.status === 'needs_cleaning').length,
    reserved: tables.filter(t => t.status === 'reserved').length,
    totalCapacity: tables.reduce((sum, t) => sum + t.capacity, 0)
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading tables...</p>
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
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setShowBulkAddModal(true)}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center space-x-2"
            >
              <span>+</span>
              <span>Bulk Add</span>
            </button>
            <button
              onClick={() => setShowAddTableModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
            >
              <span>+</span>
              <span>Add Table</span>
            </button>
          </div>
        </div>
      </div>

      {/* Stats Dashboard */}
      <div className="bg-white border-b p-6">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-800">{tableStats.total}</div>
            <div className="text-sm text-gray-600">Total Tables</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{tableStats.available}</div>
            <div className="text-sm text-gray-600">Available</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{tableStats.occupied}</div>
            <div className="text-sm text-gray-600">Occupied</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">{tableStats.needsCleaning}</div>
            <div className="text-sm text-gray-600">Cleaning</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{tableStats.reserved}</div>
            <div className="text-sm text-gray-600">Reserved</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{tableStats.totalCapacity}</div>
            <div className="text-sm text-gray-600">Total Seats</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b">
        <div className="flex space-x-8 px-6">
          {[
            { id: 'management', name: 'Table Management', icon: '🪑' },
            { id: 'layout', name: 'Layout View', icon: '🗂️' },
            { id: 'status', name: 'Status Control', icon: '⚙️' }
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
            {/* Search and Filter */}
            <div className="bg-white p-4 rounded-lg border">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
                <div className="flex flex-col md:flex-row md:items-center space-y-2 md:space-y-0 md:space-x-4">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search tables by name or number..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full md:w-64 px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    />
                    <span className="absolute right-3 top-2.5 text-gray-400">🔍</span>
                  </div>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="all">All Status</option>
                    {tableStatuses.map(status => (
                      <option key={status.value} value={status.value}>
                        {status.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="text-sm text-gray-600">
                  {filteredTables.length} tables found
                </div>
              </div>
            </div>

            {/* Tables Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredTables.map(table => {
                const statusInfo = getStatusInfo(table.status);
                return (
                  <div key={table.id} className="bg-white border rounded-lg p-4 hover:shadow-lg transition-shadow">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="text-lg font-bold text-gray-800">{getTableDisplayName(table)}</h3>
                        <p className="text-sm text-gray-600">{table.capacity} seats</p>
                        {table.name && table.name.trim() && (
                          <p className="text-xs text-gray-500">#{table.number}</p>
                        )}
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
                        {statusInfo.icon} {statusInfo.label}
                      </span>
                    </div>
                    
                    {table.current_order_id && (
                      <div className="mb-3 p-2 bg-orange-50 rounded text-sm">
                        <span className="text-orange-800">Order: {table.current_order_id.slice(-8)}</span>
                      </div>
                    )}

                    <div className="space-y-2">
                      <select
                        value={table.status}
                        onChange={(e) => handleStatusChange(table, e.target.value)}
                        className="w-full px-3 py-1 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                      >
                        {tableStatuses.map(status => (
                          <option key={status.value} value={status.value}>
                            {status.label}
                          </option>
                        ))}
                      </select>
                      
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEditTable(table)}
                          className="flex-1 bg-blue-50 text-blue-600 px-3 py-2 rounded text-sm font-medium hover:bg-blue-100"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteTable(table)}
                          className="flex-1 bg-red-50 text-red-600 px-3 py-2 rounded text-sm font-medium hover:bg-red-100"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {filteredTables.length === 0 && (
              <div className="text-center py-12">
                <span className="text-6xl mb-4 block">🪑</span>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No tables found</h3>
                <p className="text-gray-500 mb-4">Get started by adding your first table</p>
                <div className="flex justify-center space-x-4">
                  <button
                    onClick={() => setShowAddTableModal(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                  >
                    Add Single Table
                  </button>
                  <button
                    onClick={() => setShowBulkAddModal(true)}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                  >
                    Bulk Add Tables
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Layout View Tab */}
        {activeTab === 'layout' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Restaurant Layout</h2>
              <div className="flex space-x-2">
                <button
                  onClick={() => setSelectedLayout('grid')}
                  className={`px-4 py-2 rounded-lg ${selectedLayout === 'grid' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
                >
                  Simple Grid
                </button>
                <button
                  onClick={() => setSelectedLayout('floor')}
                  className={`px-4 py-2 rounded-lg ${selectedLayout === 'floor' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
                >
                  Floor Plan Designer
                </button>
              </div>
            </div>

            {selectedLayout === 'grid' && (
              <div className="bg-white border rounded-lg p-6">
                <div className="grid grid-cols-8 gap-4">
                  {tables.map(table => {
                    const statusInfo = getStatusInfo(table.status);
                    return (
                      <div
                        key={table.id}
                        className={`aspect-square border-2 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:shadow-lg transition-all ${
                          table.status === 'available' ? 'border-green-300 bg-green-50' :
                          table.status === 'occupied' ? 'border-red-300 bg-red-50' :
                          table.status === 'needs_cleaning' ? 'border-yellow-300 bg-yellow-50' :
                          'border-blue-300 bg-blue-50'
                        }`}
                        title={`${getTableDisplayName(table)} - ${statusInfo.label} - ${table.capacity} seats`}
                      >
                        <div className="text-sm font-bold text-center px-1">
                          {table.name && table.name.trim() ? table.name : table.number}
                        </div>
                        <div className="text-xs">{table.capacity} seats</div>
                        <div className="text-lg">{statusInfo.icon}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {selectedLayout === 'floor' && (
              <FloorPlanDesigner 
                tables={tables} 
                onUpdateTablePosition={handleUpdateTablePosition}
                onSaveFloorPlan={handleSaveFloorPlan}
                onLoadFloorPlan={handleLoadFloorPlan}
              />
            )}
          </div>
        )}

        {/* Status Control Tab */}
        {activeTab === 'status' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">Bulk Status Management</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {tableStatuses.map(status => {
                const tablesWithStatus = tables.filter(t => t.status === status.value);
                return (
                  <div key={status.value} className="bg-white border rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">{status.icon}</span>
                        <div>
                          <h3 className="font-semibold text-gray-800">{status.label}</h3>
                          <p className="text-sm text-gray-600">{tablesWithStatus.length} tables</p>
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${status.color}`}>
                        {tablesWithStatus.length}
                      </span>
                    </div>
                    
                    <div className="space-y-2">
                      {tablesWithStatus.slice(0, 5).map(table => (
                        <div key={table.id} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                          <span className="font-medium">{getTableDisplayName(table)}</span>
                          <span className="text-sm text-gray-600">{table.capacity} seats</span>
                        </div>
                      ))}
                      {tablesWithStatus.length > 5 && (
                        <div className="text-sm text-gray-500 text-center pt-2">
                          +{tablesWithStatus.length - 5} more tables
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="bg-white border rounded-lg p-6">
              <h3 className="font-semibold text-gray-800 mb-4">Quick Actions</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <button
                  onClick={() => {
                    if (window.confirm('Mark all available tables as needs cleaning?')) {
                      tables.filter(t => t.status === 'available').forEach(table => {
                        handleStatusChange(table, 'needs_cleaning');
                      });
                    }
                  }}
                  className="bg-yellow-50 text-yellow-700 border border-yellow-200 px-4 py-3 rounded-lg hover:bg-yellow-100"
                >
                  Mark All for Cleaning
                </button>
                <button
                  onClick={() => {
                    if (window.confirm('Mark all cleaning tables as available?')) {
                      tables.filter(t => t.status === 'needs_cleaning').forEach(table => {
                        handleStatusChange(table, 'available');
                      });
                    }
                  }}
                  className="bg-green-50 text-green-700 border border-green-200 px-4 py-3 rounded-lg hover:bg-green-100"
                >
                  Clean All Done
                </button>
                <button
                  onClick={() => {
                    if (window.confirm('Clear all reservations?')) {
                      tables.filter(t => t.status === 'reserved').forEach(table => {
                        handleStatusChange(table, 'available');
                      });
                    }
                  }}
                  className="bg-blue-50 text-blue-700 border border-blue-200 px-4 py-3 rounded-lg hover:bg-blue-100"
                >
                  Clear Reservations
                </button>
                <button
                  onClick={fetchTables}
                  className="bg-gray-50 text-gray-700 border border-gray-200 px-4 py-3 rounded-lg hover:bg-gray-100"
                >
                  Refresh Status
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add Single Table Modal */}
      {showAddTableModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold">Add New Table</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Table Name *</label>
                <input
                  type="text"
                  value={tableForm.name}
                  onChange={(e) => setTableForm({...tableForm, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., Table 1, Bar 1, Patio A, Outside 1"
                />
                <p className="text-xs text-gray-500 mt-1">Enter a unique name for this table</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Capacity (seats) *</label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={tableForm.capacity}
                  onChange={(e) => setTableForm({...tableForm, capacity: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Number of seats"
                />
              </div>
            </div>
            <div className="p-6 border-t flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowAddTableModal(false);
                  setTableForm({ name: '', capacity: '4' });
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

      {/* Bulk Add Tables Modal */}
      {showBulkAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold">Bulk Add Tables</h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Number *</label>
                  <input
                    type="number"
                    min="1"
                    value={bulkAddForm.startNumber}
                    onChange={(e) => setBulkAddForm({...bulkAddForm, startNumber: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., 1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Number *</label>
                  <input
                    type="number"
                    min="1"
                    value={bulkAddForm.endNumber}
                    onChange={(e) => setBulkAddForm({...bulkAddForm, endNumber: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., 20"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name Prefix (Optional)</label>
                <input
                  type="text"
                  value={bulkAddForm.namePrefix}
                  onChange={(e) => setBulkAddForm({...bulkAddForm, namePrefix: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., Bar, Patio, VIP"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Will create names like "Bar 1", "Bar 2", etc. Leave empty for "Table [number]"
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Default Capacity *</label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={bulkAddForm.capacity}
                  onChange={(e) => setBulkAddForm({...bulkAddForm, capacity: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Default seats per table"
                />
              </div>
              {bulkAddForm.startNumber && bulkAddForm.endNumber && (
                <div className="bg-blue-50 p-3 rounded">
                  <p className="text-sm text-blue-800">
                    This will create {Math.max(0, parseInt(bulkAddForm.endNumber) - parseInt(bulkAddForm.startNumber) + 1)} tables
                    {bulkAddForm.namePrefix ? 
                      ` named "${bulkAddForm.namePrefix} ${bulkAddForm.startNumber}" through "${bulkAddForm.namePrefix} ${bulkAddForm.endNumber}"` :
                      ` (Tables ${bulkAddForm.startNumber} - ${bulkAddForm.endNumber})`
                    }
                  </p>
                </div>
              )}
            </div>
            <div className="p-6 border-t flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowBulkAddModal(false);
                  setBulkAddForm({ startNumber: '', endNumber: '', namePrefix: '', capacity: '4' });
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkAdd}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                Add Tables
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
              <h2 className="text-xl font-semibold">Edit Table: {editingTable.name}</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Table Name *</label>
                <input
                  type="text"
                  value={tableForm.name}
                  onChange={(e) => setTableForm({...tableForm, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., Table 1, Bar 1, Patio A, Outside 1"
                />
                <p className="text-xs text-gray-500 mt-1">Table name must be unique</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Capacity (seats) *</label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={tableForm.capacity}
                  onChange={(e) => setTableForm({...tableForm, capacity: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Number of seats"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Current Status</label>
                <div className={`px-3 py-2 border rounded-md ${getStatusInfo(editingTable.status).color}`}>
                  {getStatusInfo(editingTable.status).icon} {getStatusInfo(editingTable.status).label}
                </div>
              </div>
            </div>
            <div className="p-6 border-t flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowEditTableModal(false);
                  setEditingTable(null);
                  setTableForm({ name: '', capacity: '4' });
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateTable}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Update Table
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};



// Main POS Interface
const POSInterface = () => {
  const [currentView, setCurrentView] = useState('main');
  const [assignedTable, setAssignedTable] = useState(null);
  const [editingOrder, setEditingOrder] = useState(null);
  const [editingActiveOrder, setEditingActiveOrder] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedTable, setSelectedTable] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [fromTableManagement, setFromTableManagement] = useState(false);
  
  const { user, logout } = useAuth();
  const { connected, openPrinterManager } = usePrinter();

  const handleNewOrder = (table = null) => {
    setSelectedTable(table);
    setEditingOrder(null);
    setEditingActiveOrder(null);
    setFromTableManagement(false);
    setCurrentView('new-order');
  };

  const handleTableSelect = (table) => {
    setFromTableManagement(true);
    if (table.status === 'available') {
      // Start new order for available table
      setSelectedTable(table);
      setEditingOrder(null);
      setEditingActiveOrder(null);
    } else if (table.status === 'occupied') {
      // Edit existing order for occupied table
      setEditingOrder(table);
      setSelectedTable(table); // Pass the table so NewOrder can use it for assignedTable
      setEditingActiveOrder(null);
    }
    setCurrentView('new-order');
  };

  const handleOrderClick = (order) => {
    // Instead of showing modal, go to order editing
    setEditingActiveOrder(order);
    setSelectedTable(null);
    setEditingOrder(null);
    setCurrentView('new-order');
  };

  const handleBackToMain = () => {
    setCurrentView('main');
    setSelectedTable(null);
    setEditingOrder(null);
    setEditingActiveOrder(null);
    // Trigger refresh of active orders when returning to main view
    setRefreshTrigger(prev => prev + 1);
  };

  const handleOrderHistory = () => {
    setCurrentView('order-history');
  };

  const handleTableManagement = () => {
    setCurrentView('table-management');
  };

  if (currentView === 'new-order') {
    return (
      <NewOrder 
        selectedTable={selectedTable}
        editingOrder={editingOrder}
        editingActiveOrder={editingActiveOrder}
        onBack={handleBackToMain}
        fromTableManagement={fromTableManagement}
      />
    );
  }

  if (currentView === 'order-history') {
    return (
      <OrderHistory onBack={handleBackToMain} />
    );
  }

  if (currentView === 'customerManagement') {
    return (
      <CustomerManagement onBack={handleBackToMain} />
    );
  }

  if (currentView === 'table-management') {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow-sm border-b p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={handleBackToMain}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-800"
              >
                <span>←</span>
                <span>Back</span>
              </button>
              <h1 className="text-2xl font-bold text-gray-800">Table Management</h1>
            </div>
          </div>
        </div>

        <div className="p-6">
          <TableManagement onTableSelect={handleTableSelect} />
        </div>
      </div>
    );
  }

  if (currentView === 'settings') {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow-sm border-b p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={handleBackToMain}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-800"
              >
                <span>←</span>
                <span>Back</span>
              </button>
              <h1 className="text-2xl font-bold text-gray-800">Settings</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                Welcome, {user?.full_name} ({user?.role})
              </span>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Settings Sections */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Menu Management */}
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center space-x-3 mb-4">
                <span className="text-2xl">🍽️</span>
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">Menu Management</h3>
                  <p className="text-sm text-gray-600">Manage menu items, categories, prices & modifiers</p>
                </div>
              </div>
              <button 
                onClick={() => setCurrentView('menu-management')}
                className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Manage Menu
              </button>
            </div>

            {/* Table Settings */}
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center space-x-3 mb-4">
                <span className="text-2xl">🪑</span>
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">Table Settings</h3>
                  <p className="text-sm text-gray-600">Configure tables, capacity & layout</p>
                </div>
              </div>
              <button 
                onClick={() => setCurrentView('table-settings')}
                className="w-full bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
              >
                Configure Tables
              </button>
            </div>

            {/* Staff Management - Manager Only */}
            {user?.role === 'manager' && (
              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <div className="flex items-center space-x-3 mb-4">
                  <span className="text-2xl">👥</span>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800">Staff Management</h3>
                    <p className="text-sm text-gray-600">Manage employees, roles & permissions</p>
                  </div>
                </div>
                <button 
                  onClick={() => setCurrentView('staff-management')}
                  className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                >
                  Manage Staff
                </button>
              </div>
            )}

            {/* Tax & Charges - Manager Only */}
            {user?.role === 'manager' && (
              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <div className="flex items-center space-x-3 mb-4">
                  <span className="text-2xl">💰</span>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800">Tax & Charges</h3>
                    <p className="text-sm text-gray-600">Configure tax rates, service charges & fees</p>
                  </div>
                </div>
                <button 
                  onClick={() => setCurrentView('tax-settings')}
                  className="w-full bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors"
                >
                  Configure Tax & Charges
                </button>
              </div>
            )}

            {/* System Settings */}
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center space-x-3 mb-4">
                <span className="text-2xl">🖨️</span>
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">Printer Settings</h3>
                  <p className="text-sm text-gray-600">{connected ? 'Printer Connected' : 'Setup Printer'}</p>
                </div>
              </div>
              <button 
                onClick={openPrinterManager}
                className={`w-full px-4 py-2 rounded-lg transition-colors ${
                  connected 
                    ? 'bg-green-600 text-white hover:bg-green-700' 
                    : 'bg-red-600 text-white hover:bg-red-700'
                }`}
              >
                {connected ? 'Manage Printer' : 'Setup Printer'}
              </button>
            </div>

            {/* User Profile */}
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center space-x-3 mb-4">
                <span className="text-2xl">👤</span>
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">User Profile</h3>
                  <p className="text-sm text-gray-600">{user?.full_name} ({user?.role})</p>
                </div>
              </div>
              <button 
                onClick={() => alert('User profile editing coming soon')}
                className="w-full bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
              >
                Edit Profile
              </button>
            </div>

          </div>

          {/* Quick Actions */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Quick Actions</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <button
                onClick={() => setCurrentView('new-order')}
                className="flex flex-col items-center space-y-2 p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
              >
                <span className="text-2xl">🛒</span>
                <span className="text-sm font-medium">New Order</span>
              </button>
              <button
                onClick={() => setCurrentView('order-history')}
                className="flex flex-col items-center space-y-2 p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
              >
                <span className="text-2xl">📋</span>
                <span className="text-sm font-medium">Order History</span>
              </button>
              <button
                onClick={() => setCurrentView('table-management')}
                className="flex flex-col items-center space-y-2 p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
              >
                <span className="text-2xl">🪑</span>
                <span className="text-sm font-medium">Tables</span>
              </button>
              <button
                onClick={() => setCurrentView('customerManagement')}
                className="flex flex-col items-center space-y-2 p-4 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors"
              >
                <span className="text-2xl">👥</span>
                <span className="text-sm font-medium">Customers</span>
              </button>
            </div>
          </div>

          {/* System Information */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">System Information</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-600">Restaurant:</span>
                <p>El Meson Restaurant</p>
              </div>
              <div>
                <span className="font-medium text-gray-600">Address:</span>
                <p>3517 Broadway</p>
              </div>
              <div>
                <span className="font-medium text-gray-600">Phone:</span>
                <p>929-321-9679</p>
              </div>
              <div>
                <span className="font-medium text-gray-600">System:</span>
                <p>POS Web v1.0.0</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Add placeholder management screens
  if (currentView === 'menu-management') {
    return <MenuManagementComponent onBack={() => setCurrentView('settings')} />;
  }

  if (currentView === 'table-settings') {
    return <TableSettingsComponent onBack={() => setCurrentView('settings')} />;
  }

  if (currentView === 'staff-management') {
    return <StaffManagementComponent onBack={() => setCurrentView('settings')} />;
  }

  if (currentView === 'tax-settings') {
    return <TaxChargesComponent 
      onBack={() => setCurrentView('settings')} 
      onDataChange={() => {
        // Trigger a refresh for any active NewOrder components
        localStorage.setItem('taxChargesDataChanged', Date.now().toString());
      }}
    />;
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-white shadow-sm border-b p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-800">Restaurant POS</h1>
          <div className="flex items-center space-x-4">
            {/* Printer Status */}
            <button
              onClick={openPrinterManager}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                connected 
                  ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                  : 'bg-red-100 text-red-700 hover:bg-red-200'
              }`}
            >
              <span>🖨️</span>
              <span>{connected ? 'Printer Connected' : 'Setup Printer'}</span>
            </button>

            {/* Settings Button */}
            <button
              onClick={() => setCurrentView('settings')}
              className="flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors bg-blue-100 text-blue-700 hover:bg-blue-200"
            >
              <span>⚙️</span>
              <span>Settings</span>
            </button>
            
            <span className="text-sm text-gray-600">
              Welcome, {user?.full_name} ({user?.role})
            </span>
            {user?.role === 'manager' && <EmployeeStatus />}
            <ClockInOut />
            <button
              onClick={logout}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Quick Actions */}
        <div className="flex space-x-4 flex-wrap">
          <button
            onClick={() => handleNewOrder()}
            className="bg-blue-600 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:bg-blue-700 transition-colors shadow-lg"
          >
            + New Order
          </button>
          
          <button
            onClick={handleOrderHistory}
            className="bg-purple-600 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:bg-purple-700 transition-colors shadow-lg"
          >
            📋 Order History
          </button>
          
          <button
            onClick={handleTableManagement}
            className="bg-green-600 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:bg-green-700 transition-colors shadow-lg"
          >
            🏓 Table Management
          </button>
          
          <button
            onClick={() => setCurrentView('customerManagement')}
            className="bg-purple-600 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:bg-purple-700 transition-colors shadow-lg"
          >
            👥 Customer Management
          </button>
          
          <button
            onClick={openPrinterManager}
            className={`px-8 py-4 rounded-xl text-lg font-semibold transition-colors shadow-lg ${
              connected 
                ? 'bg-green-600 text-white hover:bg-green-700' 
                : 'bg-orange-600 text-white hover:bg-orange-700'
            }`}
          >
            🖨️ Printer Manager
          </button>
        </div>

        {/* Active Orders */}
        <ActiveOrders onOrderClick={handleOrderClick} refreshTrigger={refreshTrigger} />
      </div>
    </div>
  );
};

// Global helper function for displaying table names
const getTableDisplayName = (table) => {
  if (table && table.name && table.name.trim()) {
    return table.name;
  }
  return table ? 'Unknown Table' : 'Unknown Table';
};

// Helper function for orders - handles both table objects and table_name
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

// App Component
function App() {
  return (
    <AuthProvider>
      <PrinterProvider>
        <AppContent />
      </PrinterProvider>
    </AuthProvider>
  );
}

const AppContent = () => {
  const { isAuthenticated } = useAuth();

  return (
    <div className="App">
      {isAuthenticated ? <POSInterface /> : <PinLogin />}
    </div>
  );
};

export default App;