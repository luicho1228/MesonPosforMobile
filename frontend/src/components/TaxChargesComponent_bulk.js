import React, { useState, useEffect } from 'react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

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
  
  // Bulk delete states
  const [selectedTaxes, setSelectedTaxes] = useState([]);
  const [selectedCharges, setSelectedCharges] = useState([]);
  const [selectedGratuities, setSelectedGratuities] = useState([]);
  const [selectedDiscounts, setSelectedDiscounts] = useState([]);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [bulkDeleteType, setBulkDeleteType] = useState('');

  // ... (keeping all the existing form states and helper functions)
  const [taxForm, setTaxForm] = useState({
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

  const [chargeForm, setChargeForm] = useState({
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

  const [gratuityForm, setGratuityForm] = useState({
    name: '',
    type: 'percentage',
    amount: '',
    description: '',
    trigger_condition: 'party_size',
    party_size_min: '6',
    order_amount_min: '',
    applies_to_order_types: [],
    auto_apply: true,
    customer_can_modify: true,
    active: true
  });

  const [discountForm, setDiscountForm] = useState({
    name: '',
    type: 'percentage',
    amount: '',
    description: '',
    category: 'general',
    conditions: [],
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

  // Helper data
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

  useEffect(() => {
    fetchTaxChargesData();
  }, []);

  const fetchTaxChargesData = async () => {
    try {
      setLoading(true);
      
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
      setTaxRates(getDefaultTaxRates());
      setServiceCharges(getDefaultServiceCharges());
      setGratuityRules(getDefaultGratuityRules());
      setDiscountPolicies(getDefaultDiscountPolicies());
      alert('Failed to load tax and charges configuration from server. Using default settings.');
    } finally {
      setLoading(false);
    }
  };

  // Default data functions (keeping existing ones)
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
    }
  ];

  // Bulk delete functions
  const handleBulkDelete = async () => {
    const selectedItems = getSelectedItems();
    if (selectedItems.length === 0) {
      alert('Please select items to delete');
      return;
    }

    try {
      const deletePromises = selectedItems.map(async (item) => {
        let endpoint = '';
        switch (bulkDeleteType) {
          case 'taxes':
            endpoint = `${API}/tax-charges/tax-rates/${item.id}`;
            break;
          case 'charges':
            endpoint = `${API}/tax-charges/service-charges/${item.id}`;
            break;
          case 'gratuity':
            endpoint = `${API}/tax-charges/gratuity-rules/${item.id}`;
            break;
          case 'discounts':
            endpoint = `${API}/tax-charges/discount-policies/${item.id}`;
            break;
          default:
            throw new Error('Invalid type');
        }
        
        return axios.delete(endpoint);
      });

      await Promise.all(deletePromises);

      // Update local state after successful deletion
      switch (bulkDeleteType) {
        case 'taxes':
          setTaxRates(prev => prev.filter(item => !selectedTaxes.includes(item.id)));
          setSelectedTaxes([]);
          break;
        case 'charges':
          setServiceCharges(prev => prev.filter(item => !selectedCharges.includes(item.id)));
          setSelectedCharges([]);
          break;
        case 'gratuity':
          setGratuityRules(prev => prev.filter(item => !selectedGratuities.includes(item.id)));
          setSelectedGratuities([]);
          break;
        case 'discounts':
          setDiscountPolicies(prev => prev.filter(item => !selectedDiscounts.includes(item.id)));
          setSelectedDiscounts([]);
          break;
      }

      setShowBulkDeleteModal(false);
      setBulkDeleteType('');
      alert(`${selectedItems.length} items deleted successfully`);
      
      // Notify parent component of data changes
      if (onDataChange) {
        onDataChange();
      }
    } catch (error) {
      console.error('Error deleting items:', error);
      alert('Failed to delete some items: ' + (error.response?.data?.detail || error.message));
    }
  };

  const getSelectedItems = () => {
    switch (bulkDeleteType) {
      case 'taxes':
        return taxRates.filter(item => selectedTaxes.includes(item.id));
      case 'charges':
        return serviceCharges.filter(item => selectedCharges.includes(item.id));
      case 'gratuity':
        return gratuityRules.filter(item => selectedGratuities.includes(item.id));
      case 'discounts':
        return discountPolicies.filter(item => selectedDiscounts.includes(item.id));
      default:
        return [];
    }
  };

  const handleSelectAll = (type) => {
    switch (type) {
      case 'taxes':
        if (selectedTaxes.length === taxRates.length) {
          setSelectedTaxes([]);
        } else {
          setSelectedTaxes(taxRates.map(item => item.id));
        }
        break;
      case 'charges':
        if (selectedCharges.length === serviceCharges.length) {
          setSelectedCharges([]);
        } else {
          setSelectedCharges(serviceCharges.map(item => item.id));
        }
        break;
      case 'gratuity':
        if (selectedGratuities.length === gratuityRules.length) {
          setSelectedGratuities([]);
        } else {
          setSelectedGratuities(gratuityRules.map(item => item.id));
        }
        break;
      case 'discounts':
        if (selectedDiscounts.length === discountPolicies.length) {
          setSelectedDiscounts([]);
        } else {
          setSelectedDiscounts(discountPolicies.map(item => item.id));
        }
        break;
    }
  };

  const handleItemSelect = (type, id) => {
    switch (type) {
      case 'taxes':
        setSelectedTaxes(prev => 
          prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        );
        break;
      case 'charges':
        setSelectedCharges(prev => 
          prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        );
        break;
      case 'gratuity':
        setSelectedGratuities(prev => 
          prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        );
        break;
      case 'discounts':
        setSelectedDiscounts(prev => 
          prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        );
        break;
    }
  };

  const clearSelections = (type) => {
    switch (type) {
      case 'taxes':
        setSelectedTaxes([]);
        break;
      case 'charges':
        setSelectedCharges([]);
        break;
      case 'gratuity':
        setSelectedGratuities([]);
        break;
      case 'discounts':
        setSelectedDiscounts([]);
        break;
    }
  };

  // Individual delete function (keeping existing)
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
        
        // Notify parent component of data changes
        if (onDataChange) {
          onDataChange();
        }
      } catch (error) {
        console.error('Error deleting item:', error);
        alert('Failed to delete item: ' + (error.response?.data?.detail || error.message));
      }
    }
  };

  // Component for rendering item cards with bulk selection
  const renderItemCard = (item, type, displayType) => {
    const getSelectedArray = () => {
      switch (type) {
        case 'taxes': return selectedTaxes;
        case 'charges': return selectedCharges;
        case 'gratuity': return selectedGratuities;
        case 'discounts': return selectedDiscounts;
        default: return [];
      }
    };

    const selectedArray = getSelectedArray();
    const isSelected = selectedArray.includes(item.id);

    return (
      <div key={item.id} className={`bg-white border rounded-lg p-6 ${isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : ''}`}>
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-start space-x-3">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => handleItemSelect(type, item.id)}
              className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <div>
              <h3 className="font-semibold text-lg text-gray-800">{item.name}</h3>
              <p className="text-sm text-gray-600">{item.description}</p>
            </div>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => toggleActive(displayType, item.id)}
              className={`px-2 py-1 rounded text-xs font-medium ${
                item.active 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              {item.active ? 'Active' : 'Inactive'}
            </button>
          </div>
        </div>

        {/* Item details based on type */}
        <div className="space-y-2 mb-4">
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">
              {type === 'taxes' ? 'Rate:' : 'Amount:'}
            </span>
            <span className="text-sm font-medium">
              {type === 'taxes' ? 
                (item.type === 'percentage' ? `${item.rate}%` : `$${item.rate}`) :
                (item.type === 'percentage' ? `${item.amount}%` : 
                 item.type === 'per_person' ? `$${item.amount}/person` : 
                 `$${item.amount}`)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Type:</span>
            <span className="text-sm font-medium">{item.type}</span>
          </div>
          {item.category && (
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Category:</span>
              <span className="text-sm font-medium">{item.category}</span>
            </div>
          )}
        </div>

        <div className="flex space-x-2">
          <button
            onClick={() => handleEdit(displayType, item)}
            className="flex-1 bg-blue-50 text-blue-600 px-3 py-2 rounded text-sm font-medium hover:bg-blue-100"
          >
            Edit
          </button>
          <button
            onClick={() => handleDelete(displayType, item.id)}
            className="flex-1 bg-red-50 text-red-600 px-3 py-2 rounded text-sm font-medium hover:bg-red-100"
          >
            Delete
          </button>
        </div>
      </div>
    );
  };

  // Placeholder edit function
  const handleEdit = (type, item) => {
    alert(`Edit ${type} functionality - ${item.name}`);
  };

  // Placeholder toggle active function
  const toggleActive = (type, id) => {
    alert(`Toggle active functionality for ${type} - ${id}`);
  };

  // Stats calculation
  const stats = {
    activeTaxes: taxRates.filter(tax => tax.active).length,
    totalTaxRate: taxRates
      .filter(tax => tax.active && tax.type === 'percentage')
      .reduce((total, tax) => total + tax.rate, 0),
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
              <div className="flex space-x-3">
                {selectedTaxes.length > 0 && (
                  <>
                    <span className="text-sm text-gray-600 py-2">
                      {selectedTaxes.length} selected
                    </span>
                    <button
                      onClick={() => clearSelections('taxes')}
                      className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 text-sm"
                    >
                      Clear Selection
                    </button>
                    <button
                      onClick={() => {
                        setBulkDeleteType('taxes');
                        setShowBulkDeleteModal(true);
                      }}
                      className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 flex items-center space-x-2"
                    >
                      <span>🗑️</span>
                      <span>Delete Selected ({selectedTaxes.length})</span>
                    </button>
                  </>
                )}
                <button
                  onClick={() => setShowTaxModal(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
                >
                  <span>+</span>
                  <span>Add Tax Rate</span>
                </button>
              </div>
            </div>

            {/* Multi-select controls */}
            {taxRates.length > 0 && (
              <div className="bg-gray-50 p-4 rounded-lg flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={selectedTaxes.length === taxRates.length && taxRates.length > 0}
                      onChange={() => handleSelectAll('taxes')}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium">Select All</span>
                  </label>
                  <span className="text-sm text-gray-600">
                    {selectedTaxes.length} of {taxRates.length} items selected
                  </span>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {taxRates.map(tax => renderItemCard(tax, 'taxes', 'tax'))}
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
              <div className="flex space-x-3">
                {selectedCharges.length > 0 && (
                  <>
                    <span className="text-sm text-gray-600 py-2">
                      {selectedCharges.length} selected
                    </span>
                    <button
                      onClick={() => clearSelections('charges')}
                      className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 text-sm"
                    >
                      Clear Selection
                    </button>
                    <button
                      onClick={() => {
                        setBulkDeleteType('charges');
                        setShowBulkDeleteModal(true);
                      }}
                      className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 flex items-center space-x-2"
                    >
                      <span>🗑️</span>
                      <span>Delete Selected ({selectedCharges.length})</span>
                    </button>
                  </>
                )}
                <button
                  onClick={() => setShowChargeModal(true)}
                  className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 flex items-center space-x-2"
                >
                  <span>+</span>
                  <span>Add Service Charge</span>
                </button>
              </div>
            </div>

            {/* Multi-select controls */}
            {serviceCharges.length > 0 && (
              <div className="bg-gray-50 p-4 rounded-lg flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={selectedCharges.length === serviceCharges.length && serviceCharges.length > 0}
                      onChange={() => handleSelectAll('charges')}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium">Select All</span>
                  </label>
                  <span className="text-sm text-gray-600">
                    {selectedCharges.length} of {serviceCharges.length} items selected
                  </span>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {serviceCharges.map(charge => renderItemCard(charge, 'charges', 'charge'))}
            </div>

            {serviceCharges.length === 0 && (
              <div className="text-center py-12">
                <span className="text-6xl mb-4 block">💳</span>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No service charges configured</h3>
                <p className="text-gray-500 mb-4">Add your first service charge to get started</p>
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
              <h2 className="text-xl font-semibold">Gratuity Rules</h2>
              <div className="flex space-x-3">
                {selectedGratuities.length > 0 && (
                  <>
                    <span className="text-sm text-gray-600 py-2">
                      {selectedGratuities.length} selected
                    </span>
                    <button
                      onClick={() => clearSelections('gratuity')}
                      className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 text-sm"
                    >
                      Clear Selection
                    </button>
                    <button
                      onClick={() => {
                        setBulkDeleteType('gratuity');
                        setShowBulkDeleteModal(true);
                      }}
                      className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 flex items-center space-x-2"
                    >
                      <span>🗑️</span>
                      <span>Delete Selected ({selectedGratuities.length})</span>
                    </button>
                  </>
                )}
                <button
                  onClick={() => setShowGratuityModal(true)}
                  className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 flex items-center space-x-2"
                >
                  <span>+</span>
                  <span>Add Gratuity Rule</span>
                </button>
              </div>
            </div>

            {/* Multi-select controls */}
            {gratuityRules.length > 0 && (
              <div className="bg-gray-50 p-4 rounded-lg flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={selectedGratuities.length === gratuityRules.length && gratuityRules.length > 0}
                      onChange={() => handleSelectAll('gratuity')}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium">Select All</span>
                  </label>
                  <span className="text-sm text-gray-600">
                    {selectedGratuities.length} of {gratuityRules.length} items selected
                  </span>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {gratuityRules.map(rule => renderItemCard(rule, 'gratuity', 'gratuity'))}
            </div>

            {gratuityRules.length === 0 && (
              <div className="text-center py-12">
                <span className="text-6xl mb-4 block">🎯</span>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No gratuity rules configured</h3>
                <p className="text-gray-500 mb-4">Add your first gratuity rule to get started</p>
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
              <div className="flex space-x-3">
                {selectedDiscounts.length > 0 && (
                  <>
                    <span className="text-sm text-gray-600 py-2">
                      {selectedDiscounts.length} selected
                    </span>
                    <button
                      onClick={() => clearSelections('discounts')}
                      className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 text-sm"
                    >
                      Clear Selection
                    </button>
                    <button
                      onClick={() => {
                        setBulkDeleteType('discounts');
                        setShowBulkDeleteModal(true);
                      }}
                      className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 flex items-center space-x-2"
                    >
                      <span>🗑️</span>
                      <span>Delete Selected ({selectedDiscounts.length})</span>
                    </button>
                  </>
                )}
                <button
                  onClick={() => setShowDiscountModal(true)}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center space-x-2"
                >
                  <span>+</span>
                  <span>Add Discount Policy</span>
                </button>
              </div>
            </div>

            {/* Multi-select controls */}
            {discountPolicies.length > 0 && (
              <div className="bg-gray-50 p-4 rounded-lg flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={selectedDiscounts.length === discountPolicies.length && discountPolicies.length > 0}
                      onChange={() => handleSelectAll('discounts')}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium">Select All</span>
                  </label>
                  <span className="text-sm text-gray-600">
                    {selectedDiscounts.length} of {discountPolicies.length} items selected
                  </span>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {discountPolicies.map(discount => renderItemCard(discount, 'discounts', 'discount'))}
            </div>

            {discountPolicies.length === 0 && (
              <div className="text-center py-12">
                <span className="text-6xl mb-4 block">🏷️</span>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No discount policies configured</h3>
                <p className="text-gray-500 mb-4">Add your first discount policy to get started</p>
                <button
                  onClick={() => setShowDiscountModal(true)}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                >
                  Add Discount Policy
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bulk Delete Confirmation Modal */}
      {showBulkDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold text-red-600">Delete Multiple Items</h2>
            </div>
            <div className="p-6">
              <p className="text-gray-700 mb-4">
                Are you sure you want to delete <strong>{getSelectedItems().length}</strong> selected {bulkDeleteType}? 
                This action cannot be undone.
              </p>
              
              <div className="bg-gray-50 rounded-lg p-4 max-h-40 overflow-y-auto">
                <p className="text-sm font-medium text-gray-700 mb-2">Items to be deleted:</p>
                <ul className="space-y-1">
                  {getSelectedItems().map(item => (
                    <li key={item.id} className="text-sm text-gray-600">• {item.name}</li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="p-6 border-t flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowBulkDeleteModal(false);
                  setBulkDeleteType('');
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Delete {getSelectedItems().length} Items
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaxChargesComponent;