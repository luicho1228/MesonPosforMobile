import React, { useState, useEffect } from 'react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Menu Management Component
const MenuManagementComponent = ({ onBack }) => {
  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [modifierGroups, setModifierGroups] = useState([]);
  const [modifiers, setModifiers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('items');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showItemModal, setShowItemModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showModifierModal, setShowModifierModal] = useState(false);
  const [showModifierGroupModal, setShowModifierGroupModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [editingModifier, setEditingModifier] = useState(null);
  const [editingModifierGroup, setEditingModifierGroup] = useState(null);

  const [itemForm, setItemForm] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
    image_url: '',
    available: true,
    modifier_groups: []
  });

  const [categoryForm, setCategoryForm] = useState({
    name: ''
  });
  
  const [editingCategory, setEditingCategory] = useState(null);

  const [modifierForm, setModifierForm] = useState({
    name: '',
    price: '',
    group_id: ''
  });

  const [modifierGroupForm, setModifierGroupForm] = useState({
    name: '',
    required: false,
    max_selections: 1
  });

  useEffect(() => {
    fetchMenuData();
  }, []);

  const fetchMenuData = async () => {
    try {
      setLoading(true);
      const [itemsRes, categoriesRes, modifierGroupsRes, modifiersRes] = await Promise.all([
        axios.get(`${API}/menu/items`),
        axios.get(`${API}/menu/categories`),
        axios.get(`${API}/menu/modifier-groups`),
        axios.get(`${API}/menu/modifiers`)
      ]);

      setMenuItems(itemsRes.data);
      setCategories(categoriesRes.data);
      setModifierGroups(modifierGroupsRes.data);
      setModifiers(modifiersRes.data);
    } catch (error) {
      console.error('Error fetching menu data:', error);
      alert('Failed to load menu data');
    } finally {
      setLoading(false);
    }
  };

  // Menu Item Functions
  const handleAddItem = async () => {
    if (!itemForm.name || !itemForm.price || !itemForm.category) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      const itemData = {
        ...itemForm,
        price: parseFloat(itemForm.price)
      };

      const response = await axios.post(`${API}/menu/items`, itemData);
      setMenuItems([...menuItems, response.data]);
      setShowItemModal(false);
      resetItemForm();
      alert('Menu item added successfully');
    } catch (error) {
      console.error('Error adding menu item:', error);
      alert(error.response?.data?.detail || 'Failed to add menu item');
    }
  };

  const handleEditItem = (item) => {
    setEditingItem(item);
    setItemForm({
      name: item.name,
      description: item.description || '',
      price: item.price.toString(),
      category: item.category,
      image_url: item.image_url || '',
      available: item.available !== false,
      modifier_groups: item.modifier_groups || []
    });
    setShowItemModal(true);
  };

  const handleUpdateItem = async () => {
    if (!itemForm.name || !itemForm.price || !itemForm.category) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      const itemData = {
        ...itemForm,
        price: parseFloat(itemForm.price)
      };

      const response = await axios.put(`${API}/menu/items/${editingItem.id}`, itemData);
      setMenuItems(menuItems.map(item => item.id === editingItem.id ? response.data : item));
      setShowItemModal(false);
      setEditingItem(null);
      resetItemForm();
      alert('Menu item updated successfully');
    } catch (error) {
      console.error('Error updating menu item:', error);
      alert(error.response?.data?.detail || 'Failed to update menu item');
    }
  };

  const handleDeleteItem = async (item) => {
    if (window.confirm(`Are you sure you want to delete "${item.name}"?`)) {
      try {
        await axios.delete(`${API}/menu/items/${item.id}`);
        setMenuItems(menuItems.filter(i => i.id !== item.id));
        alert('Menu item deleted successfully');
      } catch (error) {
        console.error('Error deleting menu item:', error);
        alert(error.response?.data?.detail || 'Failed to delete menu item');
      }
    }
  };

  const resetItemForm = () => {
    setItemForm({
      name: '',
      description: '',
      price: '',
      category: '',
      image_url: '',
      available: true,
      modifier_groups: []
    });
  };

  // Category Functions
  const handleAddCategory = async () => {
    if (!categoryForm.name) {
      alert('Please enter a category name');
      return;
    }

    try {
      const response = await axios.post(`${API}/menu/categories`, categoryForm);
      setCategories([...categories, response.data]);
      setShowCategoryModal(false);
      resetCategoryForm();
      alert('Category added successfully');
    } catch (error) {
      console.error('Error adding category:', error);
      alert(error.response?.data?.detail || 'Failed to add category');
    }
  };

  const handleEditCategory = (category) => {
    setEditingCategory(category);
    setCategoryForm({ name: category.name });
    setShowCategoryModal(true);
  };

  const handleUpdateCategory = async () => {
    if (!categoryForm.name) {
      alert('Please enter a category name');
      return;
    }

    try {
      const response = await axios.put(`${API}/menu/categories/${editingCategory.id}`, categoryForm);
      setCategories(categories.map(cat => cat.id === editingCategory.id ? response.data : cat));
      setShowCategoryModal(false);
      setEditingCategory(null);
      resetCategoryForm();
      alert('Category updated successfully');
    } catch (error) {
      console.error('Error updating category:', error);
      alert(error.response?.data?.detail || 'Failed to update category');
    }
  };

  const handleDeleteCategory = async (category) => {
    if (window.confirm(`Are you sure you want to delete the "${category.name}" category?`)) {
      try {
        await axios.delete(`${API}/menu/categories/${category.id}`);
        setCategories(categories.filter(c => c.id !== category.id));
        alert('Category deleted successfully');
      } catch (error) {
        console.error('Error deleting category:', error);
        alert(error.response?.data?.detail || 'Failed to delete category');
      }
    }
  };

  const resetCategoryForm = () => {
    setCategoryForm({ name: '' });
  };

  // Modifier Group Functions
  const handleAddModifierGroup = async () => {
    if (!modifierGroupForm.name) {
      alert('Please enter a modifier group name');
      return;
    }

    try {
      const response = await axios.post(`${API}/menu/modifier-groups`, modifierGroupForm);
      setModifierGroups([...modifierGroups, response.data]);
      setShowModifierGroupModal(false);
      resetModifierGroupForm();
      alert('Modifier group added successfully');
    } catch (error) {
      console.error('Error adding modifier group:', error);
      alert(error.response?.data?.detail || 'Failed to add modifier group');
    }
  };

  const handleEditModifierGroup = (group) => {
    setEditingModifierGroup(group);
    setModifierGroupForm({
      name: group.name,
      required: group.required || false,
      max_selections: group.max_selections || 1
    });
    setShowModifierGroupModal(true);
  };

  const handleUpdateModifierGroup = async () => {
    if (!modifierGroupForm.name) {
      alert('Please enter a modifier group name');
      return;
    }

    try {
      const response = await axios.put(`${API}/menu/modifier-groups/${editingModifierGroup.id}`, modifierGroupForm);
      setModifierGroups(modifierGroups.map(group => group.id === editingModifierGroup.id ? response.data : group));
      setShowModifierGroupModal(false);
      setEditingModifierGroup(null);
      resetModifierGroupForm();
      alert('Modifier group updated successfully');
    } catch (error) {
      console.error('Error updating modifier group:', error);
      alert(error.response?.data?.detail || 'Failed to update modifier group');
    }
  };

  const handleDeleteModifierGroup = async (group) => {
    const groupModifiers = modifiers.filter(mod => mod.group_id === group.id);
    if (groupModifiers.length > 0) {
      if (!window.confirm(`This group has ${groupModifiers.length} modifiers. Deleting it will also delete all its modifiers. Continue?`)) {
        return;
      }
    }

    if (window.confirm(`Are you sure you want to delete the "${group.name}" modifier group?`)) {
      try {
        await axios.delete(`${API}/menu/modifier-groups/${group.id}`);
        setModifierGroups(modifierGroups.filter(g => g.id !== group.id));
        setModifiers(modifiers.filter(mod => mod.group_id !== group.id));
        alert('Modifier group deleted successfully');
      } catch (error) {
        console.error('Error deleting modifier group:', error);
        alert(error.response?.data?.detail || 'Failed to delete modifier group');
      }
    }
  };

  const resetModifierGroupForm = () => {
    setModifierGroupForm({
      name: '',
      required: false,
      max_selections: 1
    });
  };

  // Modifier Functions
  const handleAddModifier = async () => {
    if (!modifierForm.name || !modifierForm.price || !modifierForm.group_id) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      const modifierData = {
        ...modifierForm,
        price: parseFloat(modifierForm.price)
      };

      const response = await axios.post(`${API}/menu/modifiers`, modifierData);
      setModifiers([...modifiers, response.data]);
      setShowModifierModal(false);
      resetModifierForm();
      alert('Modifier added successfully');
    } catch (error) {
      console.error('Error adding modifier:', error);
      alert(error.response?.data?.detail || 'Failed to add modifier');
    }
  };

  const handleEditModifier = (modifier) => {
    setEditingModifier(modifier);
    setModifierForm({
      name: modifier.name,
      price: modifier.price.toString(),
      group_id: modifier.group_id
    });
    setShowModifierModal(true);
  };

  const handleUpdateModifier = async () => {
    if (!modifierForm.name || !modifierForm.price || !modifierForm.group_id) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      const modifierData = {
        ...modifierForm,
        price: parseFloat(modifierForm.price)
      };

      const response = await axios.put(`${API}/menu/modifiers/${editingModifier.id}`, modifierData);
      setModifiers(modifiers.map(mod => mod.id === editingModifier.id ? response.data : mod));
      setShowModifierModal(false);
      setEditingModifier(null);
      resetModifierForm();
      alert('Modifier updated successfully');
    } catch (error) {
      console.error('Error updating modifier:', error);
      alert(error.response?.data?.detail || 'Failed to update modifier');
    }
  };

  const handleDeleteModifier = async (modifier) => {
    if (window.confirm(`Are you sure you want to delete "${modifier.name}"?`)) {
      try {
        await axios.delete(`${API}/menu/modifiers/${modifier.id}`);
        setModifiers(modifiers.filter(m => m.id !== modifier.id));
        alert('Modifier deleted successfully');
      } catch (error) {
        console.error('Error deleting modifier:', error);
        alert(error.response?.data?.detail || 'Failed to delete modifier');
      }
    }
  };

  const resetModifierForm = () => {
    setModifierForm({
      name: '',
      price: '',
      group_id: ''
    });
  };

  // Filter Functions
  const filteredItems = menuItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getModifiersByGroup = (groupId) => {
    return modifiers.filter(modifier => modifier.group_id === groupId);
  };

  const getModifierGroupName = (groupId) => {
    const group = modifierGroups.find(g => g.id === groupId);
    return group ? group.name : 'Unknown Group';
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600"></div>
          <span className="ml-3 text-lg text-gray-600">Loading menu data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-4">
          <button
            onClick={onBack}
            className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
          >
            ← Back
          </button>
          <h3 className="text-xl font-bold text-gray-800">Menu Management</h3>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex space-x-8">
          {[
            { id: 'items', label: 'Menu Items', count: menuItems.length },
            { id: 'categories', label: 'Categories', count: categories.length },
            { id: 'modifierGroups', label: 'Modifier Groups', count: modifierGroups.length },
            { id: 'modifiers', label: 'Modifiers', count: modifiers.length }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </nav>
      </div>

      {/* Menu Items Tab */}
      {activeTab === 'items' && (
        <div>
          {/* Controls */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Search menu items..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Categories</option>
                {categories.map(category => (
                  <option key={category.id} value={category.name}>{category.name}</option>
                ))}
              </select>
            </div>
            <button
              onClick={() => setShowItemModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              Add Item
            </button>
          </div>

          {/* Items Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredItems.map((item) => (
              <div key={item.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-800 mb-1">{item.name}</h4>
                    <p className="text-sm text-gray-600 mb-2">{item.description}</p>
                    <p className="text-lg font-bold text-green-600">${item.price.toFixed(2)}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`inline-block w-3 h-3 rounded-full ${item.available ? 'bg-green-500' : 'bg-red-500'}`}></span>
                  </div>
                </div>

                <div className="text-xs text-gray-500 mb-3">
                  <p>Category: {item.category}</p>
                  {item.modifier_groups && item.modifier_groups.length > 0 && (
                    <p>Modifiers: {item.modifier_groups.length} group(s)</p>
                  )}
                </div>

                <div className="flex space-x-2">
                  <button
                    onClick={() => handleEditItem(item)}
                    className="flex-1 bg-blue-600 text-white py-1 px-3 rounded text-sm hover:bg-blue-700"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteItem(item)}
                    className="bg-red-600 text-white py-1 px-3 rounded text-sm hover:bg-red-700"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>

          {filteredItems.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No menu items found</p>
            </div>
          )}
        </div>
      )}

      {/* Categories Tab */}
      {activeTab === 'categories' && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <h4 className="text-lg font-semibold">Categories</h4>
            <button
              onClick={() => setShowCategoryModal(true)}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
            >
              Add Category
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map((category) => {
              const itemCount = menuItems.filter(item => item.category === category.name).length;
              return (
                <div key={category.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-center">
                    <div>
                      <h5 className="font-semibold text-gray-800">{category.name}</h5>
                      <p className="text-sm text-gray-600">{itemCount} items</p>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEditCategory(category)}
                        className="bg-blue-600 text-white py-1 px-3 rounded text-sm hover:bg-blue-700"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteCategory(category)}
                        className="bg-red-600 text-white py-1 px-3 rounded text-sm hover:bg-red-700"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {categories.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No categories found</p>
            </div>
          )}
        </div>
      )}

      {/* Modifier Groups Tab */}
      {activeTab === 'modifierGroups' && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <h4 className="text-lg font-semibold">Modifier Groups</h4>
            <button
              onClick={() => setShowModifierGroupModal(true)}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
            >
              Add Modifier Group
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {modifierGroups.map((group) => {
              const groupModifiers = getModifiersByGroup(group.id);
              return (
                <div key={group.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h5 className="font-semibold text-gray-800">{group.name}</h5>
                      <div className="text-sm text-gray-600 space-y-1">
                        <p>Required: {group.required ? 'Yes' : 'No'}</p>
                        <p>Max Selections: {group.max_selections}</p>
                        <p>Modifiers: {groupModifiers.length}</p>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEditModifierGroup(group)}
                        className="bg-blue-600 text-white py-1 px-3 rounded text-sm hover:bg-blue-700"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteModifierGroup(group)}
                        className="bg-red-600 text-white py-1 px-3 rounded text-sm hover:bg-red-700"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>

                  {groupModifiers.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <p className="text-xs font-medium text-gray-600 mb-2">Modifiers in this group:</p>
                      <div className="space-y-1">
                        {groupModifiers.slice(0, 3).map((modifier) => (
                          <div key={modifier.id} className="flex justify-between text-xs text-gray-500">
                            <span>{modifier.name}</span>
                            <span>${modifier.price.toFixed(2)}</span>
                          </div>
                        ))}
                        {groupModifiers.length > 3 && (
                          <p className="text-xs text-gray-400">+{groupModifiers.length - 3} more</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {modifierGroups.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No modifier groups found</p>
            </div>
          )}
        </div>
      )}

      {/* Modifiers Tab */}
      {activeTab === 'modifiers' && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <h4 className="text-lg font-semibold">Modifiers</h4>
            <button
              onClick={() => setShowModifierModal(true)}
              className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700"
            >
              Add Modifier
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {modifiers.map((modifier) => (
              <div key={modifier.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start">
                  <div>
                    <h5 className="font-semibold text-gray-800">{modifier.name}</h5>
                    <p className="text-lg font-bold text-green-600">${modifier.price.toFixed(2)}</p>
                    <p className="text-sm text-gray-600">Group: {getModifierGroupName(modifier.group_id)}</p>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEditModifier(modifier)}
                      className="bg-blue-600 text-white py-1 px-3 rounded text-sm hover:bg-blue-700"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteModifier(modifier)}
                      className="bg-red-600 text-white py-1 px-3 rounded text-sm hover:bg-red-700"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {modifiers.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No modifiers found</p>
            </div>
          )}
        </div>
      )}

      {/* Add/Edit Item Modal */}
      {showItemModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">{editingItem ? 'Edit Menu Item' : 'Add New Menu Item'}</h3>
              <button
                onClick={() => {
                  setShowItemModal(false);
                  setEditingItem(null);
                  resetItemForm();
                }}
                className="text-gray-500 hover:text-gray-700 text-xl"
              >
                ×
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Name *</label>
                <input
                  type="text"
                  value={itemForm.name}
                  onChange={(e) => setItemForm({...itemForm, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Price *</label>
                <input
                  type="number"
                  step="0.01"
                  value={itemForm.price}
                  onChange={(e) => setItemForm({...itemForm, price: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Category *</label>
                <select
                  value={itemForm.category}
                  onChange={(e) => setItemForm({...itemForm, category: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Category</option>
                  {categories.map(category => (
                    <option key={category.id} value={category.name}>{category.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Image URL</label>
                <input
                  type="url"
                  value={itemForm.image_url}
                  onChange={(e) => setItemForm({...itemForm, image_url: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  value={itemForm.description}
                  onChange={(e) => setItemForm({...itemForm, description: e.target.value})}
                  rows="3"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="md:col-span-2">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={itemForm.available}
                    onChange={(e) => setItemForm({...itemForm, available: e.target.checked})}
                    className="mr-2"
                  />
                  <label className="text-sm font-medium text-gray-700">Available for ordering</label>
                </div>
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowItemModal(false);
                  setEditingItem(null);
                  resetItemForm();
                }}
                className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={editingItem ? handleUpdateItem : handleAddItem}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700"
              >
                {editingItem ? 'Update Item' : 'Add Item'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">{editingCategory ? 'Edit Category' : 'Add New Category'}</h3>
              <button
                onClick={() => {
                  setShowCategoryModal(false);
                  setEditingCategory(null);
                  resetCategoryForm();
                }}
                className="text-gray-500 hover:text-gray-700 text-xl"
              >
                ×
              </button>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Category Name *</label>
              <input
                type="text"
                value={categoryForm.name}
                onChange={(e) => setCategoryForm({...categoryForm, name: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowCategoryModal(false);
                  setEditingCategory(null);
                  resetCategoryForm();
                }}
                className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={editingCategory ? handleUpdateCategory : handleAddCategory}
                className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700"
              >
                {editingCategory ? 'Update Category' : 'Add Category'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Modifier Group Modal */}
      {showModifierGroupModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">{editingModifierGroup ? 'Edit Modifier Group' : 'Add New Modifier Group'}</h3>
              <button
                onClick={() => {
                  setShowModifierGroupModal(false);
                  setEditingModifierGroup(null);
                  resetModifierGroupForm();
                }}
                className="text-gray-500 hover:text-gray-700 text-xl"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Group Name *</label>
                <input
                  type="text"
                  value={modifierGroupForm.name}
                  onChange={(e) => setModifierGroupForm({...modifierGroupForm, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Max Selections</label>
                <input
                  type="number"
                  min="1"
                  value={modifierGroupForm.max_selections}
                  onChange={(e) => setModifierGroupForm({...modifierGroupForm, max_selections: parseInt(e.target.value)})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={modifierGroupForm.required}
                    onChange={(e) => setModifierGroupForm({...modifierGroupForm, required: e.target.checked})}
                    className="mr-2"
                  />
                  <label className="text-sm font-medium text-gray-700">Required selection</label>
                </div>
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowModifierGroupModal(false);
                  setEditingModifierGroup(null);
                  resetModifierGroupForm();
                }}
                className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={editingModifierGroup ? handleUpdateModifierGroup : handleAddModifierGroup}
                className="flex-1 bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700"
              >
                {editingModifierGroup ? 'Update Group' : 'Add Group'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Modifier Modal */}
      {showModifierModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">{editingModifier ? 'Edit Modifier' : 'Add New Modifier'}</h3>
              <button
                onClick={() => {
                  setShowModifierModal(false);
                  setEditingModifier(null);
                  resetModifierForm();
                }}
                className="text-gray-500 hover:text-gray-700 text-xl"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Modifier Name *</label>
                <input
                  type="text"
                  value={modifierForm.name}
                  onChange={(e) => setModifierForm({...modifierForm, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Price *</label>
                <input
                  type="number"
                  step="0.01"
                  value={modifierForm.price}
                  onChange={(e) => setModifierForm({...modifierForm, price: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Modifier Group *</label>
                <select
                  value={modifierForm.group_id}
                  onChange={(e) => setModifierForm({...modifierForm, group_id: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Group</option>
                  {modifierGroups.map(group => (
                    <option key={group.id} value={group.id}>{group.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowModifierModal(false);
                  setEditingModifier(null);
                  resetModifierForm();
                }}
                className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={editingModifier ? handleUpdateModifier : handleAddModifier}
                className="flex-1 bg-orange-600 text-white py-2 px-4 rounded-lg hover:bg-orange-700"
              >
                {editingModifier ? 'Update Modifier' : 'Add Modifier'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MenuManagementComponent;