import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
  TextInput,
  Modal,
  FlatList,
  Switch,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

const StaffManagementScreen = ({ navigation }) => {
  const { API } = useAuth();
  const [activeTab, setActiveTab] = useState('employees');
  const [employees, setEmployees] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [timeEntries, setTimeEntries] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [showAddEmployeeModal, setShowAddEmployeeModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showTimeEntryModal, setShowTimeEntryModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const [employeeForm, setEmployeeForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    role: 'employee',
    pin: '',
    active: true,
    hourly_rate: '15.00',
    hire_date: '',
    department: '',
    emergency_contact: '',
    emergency_phone: ''
  });

  const [scheduleForm, setScheduleForm] = useState({
    employee_id: '',
    day_of_week: 'monday',
    start_time: '09:00',
    end_time: '17:00',
    is_working_day: true
  });

  const [timeEntryForm, setTimeEntryForm] = useState({
    employee_id: '',
    date: new Date().toISOString().split('T')[0],
    clock_in: '',
    clock_out: '',
    break_minutes: '30',
    notes: ''
  });

  const roles = [
    { value: 'employee', label: 'Employee', permissions: ['take_orders', 'process_payments'] },
    { value: 'manager', label: 'Manager', permissions: ['take_orders', 'process_payments', 'manage_staff', 'view_reports'] },
    { value: 'admin', label: 'Admin', permissions: ['take_orders', 'process_payments', 'manage_staff', 'view_reports', 'system_settings'] }
  ];

  const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

  useEffect(() => {
    fetchEmployees();
    fetchSchedules();
    fetchTimeEntries();
  }, []);

  const fetchEmployees = async () => {
    try {
      const response = await axios.get(`${API}/auth/users`);
      setEmployees(response.data);
    } catch (error) {
      console.error('Error fetching employees:', error);
      Alert.alert('Error', 'Failed to load employees');
    }
  };

  const fetchSchedules = async () => {
    try {
      // Mock data for schedules - in real app this would be an API call
      const mockSchedules = [
        {
          id: '1',
          employee_id: '1',
          day_of_week: 'monday',
          start_time: '09:00',
          end_time: '17:00',
          is_working_day: true
        },
        {
          id: '2',
          employee_id: '1',
          day_of_week: 'tuesday',
          start_time: '09:00',
          end_time: '17:00',
          is_working_day: true
        },
        {
          id: '3',
          employee_id: '2',
          day_of_week: 'monday',
          start_time: '10:00',
          end_time: '18:00',
          is_working_day: true
        }
      ];
      setSchedules(mockSchedules);
    } catch (error) {
      console.error('Error fetching schedules:', error);
      Alert.alert('Error', 'Failed to load schedules');
    }
  };

  const fetchTimeEntries = async () => {
    try {
      // Mock data for time entries - in real app this would be an API call
      const mockTimeEntries = [
        {
          id: '1',
          employee_id: '1',
          date: '2024-01-15',
          clock_in: '09:00',
          clock_out: '17:30',
          break_minutes: 30,
          hours_worked: 8.0,
          notes: 'Regular shift'
        },
        {
          id: '2',
          employee_id: '2',
          date: '2024-01-15',
          clock_in: '10:00',
          clock_out: '18:00',
          break_minutes: 45,
          hours_worked: 7.25,
          notes: 'Covered lunch rush'
        }
      ];
      setTimeEntries(mockTimeEntries);
    } catch (error) {
      console.error('Error fetching time entries:', error);
      Alert.alert('Error', 'Failed to load time entries');
    }
  };

  const filteredEmployees = employees.filter(employee => {
    const matchesSearch = employee.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         employee.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'all' || employee.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  // Employee Functions
  const handleAddEmployee = async () => {
    if (!employeeForm.full_name || !employeeForm.email || !employeeForm.pin) {
      Alert.alert('Required Fields', 'Name, email, and PIN are required');
      return;
    }

    if (employeeForm.pin.length !== 4) {
      Alert.alert('Invalid PIN', 'PIN must be exactly 4 digits');
      return;
    }

    try {
      const employeeData = {
        ...employeeForm,
        hourly_rate: parseFloat(employeeForm.hourly_rate) || 15.00
      };

      if (editingEmployee) {
        await axios.put(`${API}/auth/users/${editingEmployee.id}`, employeeData);
        Alert.alert('Success', 'Employee updated successfully');
      } else {
        await axios.post(`${API}/auth/register`, employeeData);
        Alert.alert('Success', 'Employee added successfully');
      }

      setShowAddEmployeeModal(false);
      setEditingEmployee(null);
      resetEmployeeForm();
      fetchEmployees();
    } catch (error) {
      console.error('Error saving employee:', error);
      Alert.alert('Error', error.response?.data?.detail || 'Failed to save employee');
    }
  };

  const handleEditEmployee = (employee) => {
    setEmployeeForm({
      full_name: employee.full_name,
      email: employee.email,
      phone: employee.phone || '',
      role: employee.role,
      pin: '',
      active: employee.active,
      hourly_rate: employee.hourly_rate?.toString() || '15.00',
      hire_date: employee.hire_date || '',
      department: employee.department || '',
      emergency_contact: employee.emergency_contact || '',
      emergency_phone: employee.emergency_phone || ''
    });
    setEditingEmployee(employee);
    setShowAddEmployeeModal(true);
  };

  const handleDeleteEmployee = (employee) => {
    Alert.alert(
      'Delete Employee',
      `Are you sure you want to delete ${employee.full_name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await axios.delete(`${API}/auth/users/${employee.id}`);
              Alert.alert('Success', 'Employee deleted successfully');
              fetchEmployees();
            } catch (error) {
              console.error('Error deleting employee:', error);
              Alert.alert('Error', 'Failed to delete employee');
            }
          }
        }
      ]
    );
  };

  const toggleEmployeeStatus = async (employee) => {
    try {
      await axios.put(`${API}/auth/users/${employee.id}`, {
        active: !employee.active
      });
      fetchEmployees();
    } catch (error) {
      console.error('Error updating employee status:', error);
      Alert.alert('Error', 'Failed to update employee status');
    }
  };

  const resetEmployeeForm = () => {
    setEmployeeForm({
      full_name: '',
      email: '',
      phone: '',
      role: 'employee',
      pin: '',
      active: true,
      hourly_rate: '15.00',
      hire_date: '',
      department: '',
      emergency_contact: '',
      emergency_phone: ''
    });
  };

  // Schedule Functions
  const handleSaveSchedule = async () => {
    if (!scheduleForm.employee_id) {
      Alert.alert('Required Field', 'Please select an employee');
      return;
    }

    try {
      const scheduleData = {
        ...scheduleForm,
        id: editingSchedule ? editingSchedule.id : Date.now().toString()
      };

      if (editingSchedule) {
        setSchedules(prev => prev.map(s => s.id === editingSchedule.id ? scheduleData : s));
        Alert.alert('Success', 'Schedule updated successfully');
      } else {
        setSchedules(prev => [...prev, scheduleData]);
        Alert.alert('Success', 'Schedule added successfully');
      }

      setShowScheduleModal(false);
      setEditingSchedule(null);
      setScheduleForm({
        employee_id: '',
        day_of_week: 'monday',
        start_time: '09:00',
        end_time: '17:00',
        is_working_day: true
      });
    } catch (error) {
      console.error('Error saving schedule:', error);
      Alert.alert('Error', 'Failed to save schedule');
    }
  };

  // Time Entry Functions
  const handleSaveTimeEntry = async () => {
    if (!timeEntryForm.employee_id || !timeEntryForm.clock_in) {
      Alert.alert('Required Fields', 'Employee and clock in time are required');
      return;
    }

    try {
      const hoursWorked = calculateHours(timeEntryForm.clock_in, timeEntryForm.clock_out, timeEntryForm.break_minutes);
      const timeEntryData = {
        ...timeEntryForm,
        hours_worked: hoursWorked,
        break_minutes: parseInt(timeEntryForm.break_minutes) || 0,
        id: Date.now().toString()
      };

      setTimeEntries(prev => [...prev, timeEntryData]);
      Alert.alert('Success', 'Time entry added successfully');

      setShowTimeEntryModal(false);
      setTimeEntryForm({
        employee_id: '',
        date: new Date().toISOString().split('T')[0],
        clock_in: '',
        clock_out: '',
        break_minutes: '30',
        notes: ''
      });
    } catch (error) {
      console.error('Error saving time entry:', error);
      Alert.alert('Error', 'Failed to save time entry');
    }
  };

  const calculateHours = (clockIn, clockOut, breakMinutes) => {
    if (!clockIn || !clockOut) return 0;
    
    const start = new Date(`2000-01-01T${clockIn}`);
    const end = new Date(`2000-01-01T${clockOut}`);
    const diffMs = end - start;
    const diffHours = diffMs / (1000 * 60 * 60);
    const breakHours = (breakMinutes || 0) / 60;
    
    return Math.max(0, diffHours - breakHours);
  };

  // Utility Functions
  const getRoleColor = (role) => {
    switch (role) {
      case 'manager': return '#7c3aed';
      case 'admin': return '#dc2626';
      case 'employee': return '#2563eb';
      default: return '#6b7280';
    }
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case 'manager': return 'admin-panel-settings';
      case 'admin': return 'security';
      case 'employee': return 'person';
      default: return 'person';
    }
  };

  const getEmployeeName = (employeeId) => {
    const employee = employees.find(emp => emp.id === employeeId);
    return employee ? employee.full_name : 'Unknown Employee';
  };

  const getEmployeeSchedule = (employeeId) => {
    return schedules.filter(schedule => schedule.employee_id === employeeId);
  };

  const getEmployeeTimeEntries = (employeeId) => {
    return timeEntries.filter(entry => entry.employee_id === employeeId);
  };

  // Render Functions
  const renderEmployeeCard = ({ item: employee }) => (
    <View style={styles.employeeCard}>
      <View style={styles.employeeHeader}>
        <View style={styles.employeeInfo}>
          <View style={styles.employeeNameRow}>
            <Text style={styles.employeeName}>{employee.full_name}</Text>
            <View style={[
              styles.statusIndicator,
              { backgroundColor: employee.active ? '#10b981' : '#dc2626' }
            ]} />
          </View>
          <Text style={styles.employeeEmail}>{employee.email}</Text>
          {employee.phone && (
            <Text style={styles.employeePhone}>{employee.phone}</Text>
          )}
          {employee.department && (
            <Text style={styles.employeeDepartment}>{employee.department}</Text>
          )}
        </View>
        <View style={styles.employeeActions}>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => handleEditEmployee(employee)}
          >
            <Icon name="edit" size={16} color="#2563eb" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDeleteEmployee(employee)}
          >
            <Icon name="delete" size={16} color="#dc2626" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.employeeDetails}>
        <View style={[styles.roleBadge, { backgroundColor: getRoleColor(employee.role) }]}>
          <Icon name={getRoleIcon(employee.role)} size={16} color="white" />
          <Text style={styles.roleText}>{employee.role.toUpperCase()}</Text>
        </View>
        
        <View style={styles.employeeStats}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>PIN</Text>
            <Text style={styles.statValue}>••••</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Rate</Text>
            <Text style={styles.statValue}>${employee.hourly_rate || 15}/hr</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Status</Text>
            <TouchableOpacity onPress={() => toggleEmployeeStatus(employee)}>
              <Text style={[
                styles.statValue,
                { color: employee.active ? '#10b981' : '#dc2626' }
              ]}>
                {employee.active ? 'Active' : 'Inactive'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );

  const renderScheduleItem = ({ item: schedule }) => (
    <View style={styles.scheduleCard}>
      <View style={styles.scheduleHeader}>
        <Text style={styles.scheduleName}>{getEmployeeName(schedule.employee_id)}</Text>
        <Text style={styles.scheduleDay}>{schedule.day_of_week.charAt(0).toUpperCase() + schedule.day_of_week.slice(1)}</Text>
      </View>
      <View style={styles.scheduleDetails}>
        {schedule.is_working_day ? (
          <Text style={styles.scheduleTime}>
            {schedule.start_time} - {schedule.end_time}
          </Text>
        ) : (
          <Text style={styles.scheduleOff}>Day Off</Text>
        )}
      </View>
    </View>
  );

  const renderTimeEntry = ({ item: entry }) => (
    <View style={styles.timeEntryCard}>
      <View style={styles.timeEntryHeader}>
        <Text style={styles.timeEntryName}>{getEmployeeName(entry.employee_id)}</Text>
        <Text style={styles.timeEntryDate}>{entry.date}</Text>
      </View>
      <View style={styles.timeEntryDetails}>
        <Text style={styles.timeEntryTime}>
          {entry.clock_in} - {entry.clock_out || 'Still working'}
        </Text>
        <Text style={styles.timeEntryHours}>
          {entry.hours_worked} hours
        </Text>
      </View>
      {entry.notes && (
        <Text style={styles.timeEntryNotes}>{entry.notes}</Text>
      )}
    </View>
  );

  const renderRoleCard = ({ item: role }) => (
    <View style={styles.roleCard}>
      <View style={styles.roleHeader}>
        <Text style={styles.roleName}>{role.label}</Text>
        <View style={[styles.roleIndicator, { backgroundColor: getRoleColor(role.value) }]} />
      </View>
      <View style={styles.rolePermissions}>
        <Text style={styles.permissionsTitle}>Permissions:</Text>
        {role.permissions.map((permission, index) => (
          <Text key={index} style={styles.permissionItem}>• {permission.replace('_', ' ')}</Text>
        ))}
      </View>
      <View style={styles.roleStats}>
        <Text style={styles.roleCount}>
          {employees.filter(emp => emp.role === role.value).length} employees
        </Text>
      </View>
    </View>
  );

  const activeEmployees = employees.filter(emp => emp.active);
  const inactiveEmployees = employees.filter(emp => !emp.active);
  const managersCount = employees.filter(emp => emp.role === 'manager').length;
  const employeesCount = employees.filter(emp => emp.role === 'employee').length;
  const clockedInCount = 0; // This would come from real-time data

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Staff Management</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => {
            switch (activeTab) {
              case 'employees':
                setShowAddEmployeeModal(true);
                break;
              case 'schedules':
                setShowScheduleModal(true);
                break;
              case 'timesheet':
                setShowTimeEntryModal(true);
                break;
            }
          }}
        >
          <Icon name="add" size={24} color="white" />
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{employees.length}</Text>
          <Text style={styles.statLabel}>Total Staff</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{clockedInCount}</Text>
          <Text style={styles.statLabel}>Clocked In</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{activeEmployees.length}</Text>
          <Text style={styles.statLabel}>Active</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{managersCount}</Text>
          <Text style={styles.statLabel}>Managers</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        {[
          { key: 'employees', label: 'Employees', icon: 'people' },
          { key: 'schedules', label: 'Schedules', icon: 'schedule' },
          { key: 'timesheet', label: 'Time & Attendance', icon: 'access-time' },
          { key: 'permissions', label: 'Roles & Permissions', icon: 'security' }
        ].map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[
              styles.tab,
              activeTab === tab.key && styles.activeTab
            ]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Icon 
              name={tab.icon} 
              size={16} 
              color={activeTab === tab.key ? '#2563eb' : '#6b7280'} 
            />
            <Text style={[
              styles.tabText,
              activeTab === tab.key && styles.activeTabText
            ]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Search and Filter for Employees Tab */}
      {activeTab === 'employees' && (
        <View style={styles.searchContainer}>
          <View style={styles.searchBox}>
            <Icon name="search" size={20} color="#6b7280" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search employees..."
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
          <View style={styles.filterContainer}>
            <Text style={styles.filterLabel}>Role:</Text>
            <View style={styles.filterButtons}>
              {['all', ...roles.map(r => r.value)].map(roleValue => (
                <TouchableOpacity
                  key={roleValue}
                  style={[
                    styles.filterButton,
                    roleFilter === roleValue && styles.filterButtonActive
                  ]}
                  onPress={() => setRoleFilter(roleValue)}
                >
                  <Text style={[
                    styles.filterButtonText,
                    roleFilter === roleValue && styles.filterButtonTextActive
                  ]}>
                    {roleValue === 'all' ? 'All' : roleValue.charAt(0).toUpperCase() + roleValue.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      )}

      {/* Content */}
      <ScrollView style={styles.content}>
        {activeTab === 'employees' && (
          <FlatList
            data={filteredEmployees}
            renderItem={renderEmployeeCard}
            keyExtractor={item => item.id}
            scrollEnabled={false}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Icon name="people" size={64} color="#d1d5db" />
                <Text style={styles.emptyStateText}>
                  {searchQuery || roleFilter !== 'all' ? 'No employees found' : 'No employees yet'}
                </Text>
                {!searchQuery && roleFilter === 'all' && (
                  <TouchableOpacity 
                    style={styles.emptyAddButton} 
                    onPress={() => setShowAddEmployeeModal(true)}
                  >
                    <Text style={styles.emptyAddButtonText}>Add First Employee</Text>
                  </TouchableOpacity>
                )}
              </View>
            }
          />
        )}

        {activeTab === 'schedules' && (
          <FlatList
            data={schedules}
            renderItem={renderScheduleItem}
            keyExtractor={item => item.id}
            scrollEnabled={false}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Icon name="schedule" size={64} color="#d1d5db" />
                <Text style={styles.emptyStateText}>No schedules configured</Text>
                <TouchableOpacity 
                  style={styles.emptyAddButton} 
                  onPress={() => setShowScheduleModal(true)}
                >
                  <Text style={styles.emptyAddButtonText}>Add First Schedule</Text>
                </TouchableOpacity>
              </View>
            }
          />
        )}

        {activeTab === 'timesheet' && (
          <FlatList
            data={timeEntries}
            renderItem={renderTimeEntry}
            keyExtractor={item => item.id}
            scrollEnabled={false}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Icon name="access-time" size={64} color="#d1d5db" />
                <Text style={styles.emptyStateText}>No time entries recorded</Text>
                <TouchableOpacity 
                  style={styles.emptyAddButton} 
                  onPress={() => setShowTimeEntryModal(true)}
                >
                  <Text style={styles.emptyAddButtonText}>Add First Time Entry</Text>
                </TouchableOpacity>
              </View>
            }
          />
        )}

        {activeTab === 'permissions' && (
          <FlatList
            data={roles}
            renderItem={renderRoleCard}
            keyExtractor={item => item.value}
            scrollEnabled={false}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Icon name="security" size={64} color="#d1d5db" />
                <Text style={styles.emptyStateText}>No roles configured</Text>
              </View>
            }
          />
        )}
      </ScrollView>

      {/* Add/Edit Employee Modal */}
      <Modal
        visible={showAddEmployeeModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {editingEmployee ? 'Edit Employee' : 'Add Employee'}
            </Text>
            <TouchableOpacity onPress={() => {
              setShowAddEmployeeModal(false);
              setEditingEmployee(null);
              resetEmployeeForm();
            }}>
              <Icon name="close" size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.form}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Full Name *</Text>
                <TextInput
                  style={styles.textInput}
                  value={employeeForm.full_name}
                  onChangeText={(text) => setEmployeeForm({...employeeForm, full_name: text})}
                  placeholder="Enter full name"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Email *</Text>
                <TextInput
                  style={styles.textInput}
                  value={employeeForm.email}
                  onChangeText={(text) => setEmployeeForm({...employeeForm, email: text})}
                  placeholder="Enter email address"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Phone</Text>
                <TextInput
                  style={styles.textInput}
                  value={employeeForm.phone}
                  onChangeText={(text) => setEmployeeForm({...employeeForm, phone: text})}
                  placeholder="Enter phone number"
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Department</Text>
                <TextInput
                  style={styles.textInput}
                  value={employeeForm.department}
                  onChangeText={(text) => setEmployeeForm({...employeeForm, department: text})}
                  placeholder="e.g., Kitchen, Front of House"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Role *</Text>
                <View style={styles.roleSelector}>
                  {roles.map(role => (
                    <TouchableOpacity
                      key={role.value}
                      style={[
                        styles.roleButton,
                        employeeForm.role === role.value && styles.roleButtonSelected
                      ]}
                      onPress={() => setEmployeeForm({...employeeForm, role: role.value})}
                    >
                      <Icon 
                        name={getRoleIcon(role.value)} 
                        size={20} 
                        color={employeeForm.role === role.value ? 'white' : '#6b7280'} 
                      />
                      <Text style={[
                        styles.roleButtonText,
                        employeeForm.role === role.value && styles.roleButtonTextSelected
                      ]}>
                        {role.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>PIN (4 digits) *</Text>
                <TextInput
                  style={styles.textInput}
                  value={employeeForm.pin}
                  onChangeText={(text) => setEmployeeForm({...employeeForm, pin: text})}
                  placeholder="Enter 4-digit PIN"
                  keyboardType="numeric"
                  maxLength={4}
                  secureTextEntry
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Hourly Rate ($)</Text>
                <TextInput
                  style={styles.textInput}
                  value={employeeForm.hourly_rate}
                  onChangeText={(text) => setEmployeeForm({...employeeForm, hourly_rate: text})}
                  placeholder="15.00"
                  keyboardType="decimal-pad"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Hire Date</Text>
                <TextInput
                  style={styles.textInput}
                  value={employeeForm.hire_date}
                  onChangeText={(text) => setEmployeeForm({...employeeForm, hire_date: text})}
                  placeholder="YYYY-MM-DD"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Emergency Contact</Text>
                <TextInput
                  style={styles.textInput}
                  value={employeeForm.emergency_contact}
                  onChangeText={(text) => setEmployeeForm({...employeeForm, emergency_contact: text})}
                  placeholder="Emergency contact name"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Emergency Phone</Text>
                <TextInput
                  style={styles.textInput}
                  value={employeeForm.emergency_phone}
                  onChangeText={(text) => setEmployeeForm({...employeeForm, emergency_phone: text})}
                  placeholder="Emergency contact phone"
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.inputGroup}>
                <View style={styles.switchRow}>
                  <Text style={styles.inputLabel}>Active Employee</Text>
                  <Switch
                    value={employeeForm.active}
                    onValueChange={(value) => setEmployeeForm({...employeeForm, active: value})}
                  />
                </View>
              </View>

              <TouchableOpacity style={styles.saveButton} onPress={handleAddEmployee}>
                <Text style={styles.saveButtonText}>
                  {editingEmployee ? 'Update Employee' : 'Add Employee'}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Add Schedule Modal */}
      <Modal
        visible={showScheduleModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {editingSchedule ? 'Edit Schedule' : 'Add Schedule'}
            </Text>
            <TouchableOpacity onPress={() => {
              setShowScheduleModal(false);
              setEditingSchedule(null);
              setScheduleForm({
                employee_id: '',
                day_of_week: 'monday',
                start_time: '09:00',
                end_time: '17:00',
                is_working_day: true
              });
            }}>
              <Icon name="close" size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.form}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Employee *</Text>
                <View style={styles.pickerContainer}>
                  {employees.map(employee => (
                    <TouchableOpacity
                      key={employee.id}
                      style={[
                        styles.pickerOption,
                        scheduleForm.employee_id === employee.id && styles.pickerOptionSelected
                      ]}
                      onPress={() => setScheduleForm({...scheduleForm, employee_id: employee.id})}
                    >
                      <Text style={[
                        styles.pickerOptionText,
                        scheduleForm.employee_id === employee.id && styles.pickerOptionTextSelected
                      ]}>
                        {employee.full_name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Day of Week *</Text>
                <View style={styles.daySelector}>
                  {daysOfWeek.map(day => (
                    <TouchableOpacity
                      key={day}
                      style={[
                        styles.dayButton,
                        scheduleForm.day_of_week === day && styles.dayButtonSelected
                      ]}
                      onPress={() => setScheduleForm({...scheduleForm, day_of_week: day})}
                    >
                      <Text style={[
                        styles.dayButtonText,
                        scheduleForm.day_of_week === day && styles.dayButtonTextSelected
                      ]}>
                        {day.charAt(0).toUpperCase() + day.slice(1, 3)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.inputGroup}>
                <View style={styles.switchRow}>
                  <Text style={styles.inputLabel}>Working Day</Text>
                  <Switch
                    value={scheduleForm.is_working_day}
                    onValueChange={(value) => setScheduleForm({...scheduleForm, is_working_day: value})}
                  />
                </View>
              </View>

              {scheduleForm.is_working_day && (
                <>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Start Time</Text>
                    <TextInput
                      style={styles.textInput}
                      value={scheduleForm.start_time}
                      onChangeText={(text) => setScheduleForm({...scheduleForm, start_time: text})}
                      placeholder="09:00"
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>End Time</Text>
                    <TextInput
                      style={styles.textInput}
                      value={scheduleForm.end_time}
                      onChangeText={(text) => setScheduleForm({...scheduleForm, end_time: text})}
                      placeholder="17:00"
                    />
                  </View>
                </>
              )}

              <TouchableOpacity style={styles.saveButton} onPress={handleSaveSchedule}>
                <Text style={styles.saveButtonText}>
                  {editingSchedule ? 'Update Schedule' : 'Add Schedule'}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Add Time Entry Modal */}
      <Modal
        visible={showTimeEntryModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add Time Entry</Text>
            <TouchableOpacity onPress={() => {
              setShowTimeEntryModal(false);
              setTimeEntryForm({
                employee_id: '',
                date: new Date().toISOString().split('T')[0],
                clock_in: '',
                clock_out: '',
                break_minutes: '30',
                notes: ''
              });
            }}>
              <Icon name="close" size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.form}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Employee *</Text>
                <View style={styles.pickerContainer}>
                  {employees.map(employee => (
                    <TouchableOpacity
                      key={employee.id}
                      style={[
                        styles.pickerOption,
                        timeEntryForm.employee_id === employee.id && styles.pickerOptionSelected
                      ]}
                      onPress={() => setTimeEntryForm({...timeEntryForm, employee_id: employee.id})}
                    >
                      <Text style={[
                        styles.pickerOptionText,
                        timeEntryForm.employee_id === employee.id && styles.pickerOptionTextSelected
                      ]}>
                        {employee.full_name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Date</Text>
                <TextInput
                  style={styles.textInput}
                  value={timeEntryForm.date}
                  onChangeText={(text) => setTimeEntryForm({...timeEntryForm, date: text})}
                  placeholder="YYYY-MM-DD"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Clock In Time *</Text>
                <TextInput
                  style={styles.textInput}
                  value={timeEntryForm.clock_in}
                  onChangeText={(text) => setTimeEntryForm({...timeEntryForm, clock_in: text})}
                  placeholder="09:00"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Clock Out Time</Text>
                <TextInput
                  style={styles.textInput}
                  value={timeEntryForm.clock_out}
                  onChangeText={(text) => setTimeEntryForm({...timeEntryForm, clock_out: text})}
                  placeholder="17:00"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Break Minutes</Text>
                <TextInput
                  style={styles.textInput}
                  value={timeEntryForm.break_minutes}
                  onChangeText={(text) => setTimeEntryForm({...timeEntryForm, break_minutes: text})}
                  placeholder="30"
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Notes</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  value={timeEntryForm.notes}
                  onChangeText={(text) => setTimeEntryForm({...timeEntryForm, notes: text})}
                  placeholder="Optional notes"
                  multiline
                  numberOfLines={3}
                />
              </View>

              <TouchableOpacity style={styles.saveButton} onPress={handleSaveTimeEntry}>
                <Text style={styles.saveButtonText}>Add Time Entry</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  addButton: {
    backgroundColor: '#2563eb',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tab: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 8,
    marginHorizontal: 1,
  },
  activeTab: {
    backgroundColor: '#eff6ff',
  },
  tabText: {
    fontSize: 10,
    color: '#6b7280',
    marginTop: 4,
    fontWeight: '600',
    textAlign: 'center',
  },
  activeTabText: {
    color: '#2563eb',
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: '#1f2937',
  },
  filterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginRight: 12,
  },
  filterButtons: {
    flexDirection: 'row',
    flex: 1,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    marginRight: 8,
  },
  filterButtonActive: {
    backgroundColor: '#2563eb',
  },
  filterButtonText: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '600',
  },
  filterButtonTextActive: {
    color: 'white',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  employeeCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  employeeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  employeeInfo: {
    flex: 1,
  },
  employeeNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  employeeName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    marginRight: 8,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  employeeEmail: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 2,
  },
  employeePhone: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 2,
  },
  employeeDepartment: {
    fontSize: 14,
    color: '#6b7280',
    fontStyle: 'italic',
  },
  employeeActions: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  editButton: {
    backgroundColor: '#eff6ff',
    borderRadius: 16,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  deleteButton: {
    backgroundColor: '#fef2f2',
    borderRadius: 16,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  employeeDetails: {
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    paddingTop: 12,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  roleText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  employeeStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  scheduleCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  scheduleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  scheduleName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  scheduleDay: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '600',
  },
  scheduleDetails: {
    marginTop: 4,
  },
  scheduleTime: {
    fontSize: 14,
    color: '#059669',
    fontWeight: '600',
  },
  scheduleOff: {
    fontSize: 14,
    color: '#dc2626',
    fontWeight: '600',
  },
  timeEntryCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  timeEntryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  timeEntryName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  timeEntryDate: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '600',
  },
  timeEntryDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  timeEntryTime: {
    fontSize: 14,
    color: '#059669',
    fontWeight: '600',
  },
  timeEntryHours: {
    fontSize: 14,
    color: '#7c3aed',
    fontWeight: '600',
  },
  timeEntryNotes: {
    fontSize: 14,
    color: '#6b7280',
    fontStyle: 'italic',
  },
  roleCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  roleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  roleName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  roleIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  rolePermissions: {
    marginBottom: 12,
  },
  permissionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  permissionItem: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  roleStats: {
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    paddingTop: 12,
  },
  roleCount: {
    fontSize: 14,
    color: '#059669',
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 16,
    marginBottom: 24,
  },
  emptyAddButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyAddButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  form: {
    paddingVertical: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#d1d5db',
    color: '#1f2937',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  roleSelector: {
    gap: 8,
  },
  roleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 8,
  },
  roleButtonSelected: {
    backgroundColor: '#2563eb',
  },
  roleButtonText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '600',
  },
  roleButtonTextSelected: {
    color: 'white',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pickerContainer: {
    gap: 8,
  },
  pickerOption: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
  },
  pickerOptionSelected: {
    backgroundColor: '#2563eb',
  },
  pickerOptionText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '600',
  },
  pickerOptionTextSelected: {
    color: 'white',
  },
  daySelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dayButton: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 45,
    alignItems: 'center',
  },
  dayButtonSelected: {
    backgroundColor: '#2563eb',
  },
  dayButtonText: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '600',
  },
  dayButtonTextSelected: {
    color: 'white',
  },
  saveButton: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default StaffManagementScreen;