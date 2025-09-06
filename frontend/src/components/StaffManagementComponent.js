import React, { useState, useEffect } from 'react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Staff Management Component
const StaffManagementComponent = ({ onBack }) => {
  const [staff, setStaff] = useState([]);
  const [timeEntries, setTimeEntries] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('employees');
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [showAddEmployeeModal, setShowAddEmployeeModal] = useState(false);
  const [showEditEmployeeModal, setShowEditEmployeeModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showTimeEntryModal, setShowTimeEntryModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  const [employeeForm, setEmployeeForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    role: 'employee',
    pin: '',
    hourly_rate: '15.00',
    active: true,
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
    { value: 'supervisor', label: 'Supervisor', permissions: ['take_orders', 'process_payments', 'manage_tables', 'view_reports'] },
    { value: 'manager', label: 'Manager', permissions: ['take_orders', 'process_payments', 'manage_tables', 'view_reports', 'manage_staff', 'manage_menu'] },
    { value: 'admin', label: 'Admin', permissions: ['all'] }
  ];

  const days = [
    { value: 'monday', label: 'Monday' },
    { value: 'tuesday', label: 'Tuesday' },
    { value: 'wednesday', label: 'Wednesday' },
    { value: 'thursday', label: 'Thursday' },
    { value: 'friday', label: 'Friday' },
    { value: 'saturday', label: 'Saturday' },
    { value: 'sunday', label: 'Sunday' }
  ];

  useEffect(() => {
    fetchStaffData();
  }, []);

  const fetchStaffData = async () => {
    try {
      const [staffResponse, timeResponse, scheduleResponse] = await Promise.all([
        axios.get(`${API}/staff`),
        axios.get(`${API}/time/entries`),
        axios.get(`${API}/staff/schedules`)
      ]);
      
      setStaff(staffResponse.data);
      setTimeEntries(timeResponse.data);
      setSchedules(scheduleResponse.data);
    } catch (error) {
      console.error('Error fetching staff data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddEmployee = async () => {
    try {
      const response = await axios.post(`${API}/staff`, employeeForm);
      setStaff([...staff, response.data]);
      setShowAddEmployeeModal(false);
      resetEmployeeForm();
      alert('Employee added successfully!');
    } catch (error) {
      alert(error.response?.data?.detail || 'Error adding employee');
    }
  };

  const handleEditEmployee = async () => {
    try {
      const response = await axios.put(`${API}/staff/${editingEmployee.id}`, employeeForm);
      setStaff(staff.map(emp => emp.id === editingEmployee.id ? response.data : emp));
      setShowEditEmployeeModal(false);
      setEditingEmployee(null);
      resetEmployeeForm();
      alert('Employee updated successfully!');
    } catch (error) {
      alert(error.response?.data?.detail || 'Error updating employee');
    }
  };

  const handleDeleteEmployee = async (employeeId) => {
    if (window.confirm('Are you sure you want to delete this employee?')) {
      try {
        await axios.delete(`${API}/staff/${employeeId}`);
        setStaff(staff.filter(emp => emp.id !== employeeId));
        alert('Employee deleted successfully!');
      } catch (error) {
        alert(error.response?.data?.detail || 'Error deleting employee');
      }
    }
  };

  const handleAddSchedule = async () => {
    try {
      const response = await axios.post(`${API}/staff/schedules`, scheduleForm);
      setSchedules([...schedules, response.data]);
      setShowScheduleModal(false);
      resetScheduleForm();
      alert('Schedule added successfully!');
    } catch (error) {
      alert(error.response?.data?.detail || 'Error adding schedule');
    }
  };

  const handleAddTimeEntry = async () => {
    try {
      const response = await axios.post(`${API}/time/entries`, timeEntryForm);
      setTimeEntries([...timeEntries, response.data]);
      setShowTimeEntryModal(false);
      resetTimeEntryForm();
      alert('Time entry added successfully!');
    } catch (error) {
      alert(error.response?.data?.detail || 'Error adding time entry');
    }
  };

  const resetEmployeeForm = () => {
    setEmployeeForm({
      full_name: '',
      email: '',
      phone: '',
      role: 'employee',
      pin: '',
      hourly_rate: '15.00',
      active: true,
      hire_date: '',
      department: '',
      emergency_contact: '',
      emergency_phone: ''
    });
  };

  const resetScheduleForm = () => {
    setScheduleForm({
      employee_id: '',
      day_of_week: 'monday',
      start_time: '09:00',
      end_time: '17:00',
      is_working_day: true
    });
  };

  const resetTimeEntryForm = () => {
    setTimeEntryForm({
      employee_id: '',
      date: new Date().toISOString().split('T')[0],
      clock_in: '',
      clock_out: '',
      break_minutes: '30',
      notes: ''
    });
  };

  const openEditModal = (employee) => {
    setEditingEmployee(employee);
    setEmployeeForm({ ...employee });
    setShowEditEmployeeModal(true);
  };

  const filteredStaff = staff.filter(employee => {
    const matchesSearch = employee.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         employee.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'all' || employee.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const getEmployeeSchedule = (employeeId) => {
    return schedules.filter(schedule => schedule.employee_id === employeeId);
  };

  const getEmployeeTimeEntries = (employeeId, dateRange = 7) => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - dateRange);
    
    return timeEntries
      .filter(entry => entry.employee_id === employeeId)
      .filter(entry => new Date(entry.date) >= cutoffDate)
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  };

  const calculateTotalHours = (employeeId, days = 7) => {
    const entries = getEmployeeTimeEntries(employeeId, days);
    return entries.reduce((total, entry) => {
      if (entry.clock_in && entry.clock_out) {
        const clockIn = new Date(`${entry.date}T${entry.clock_in}`);
        const clockOut = new Date(`${entry.date}T${entry.clock_out}`);
        const hours = (clockOut - clockIn) / (1000 * 60 * 60);
        return total + Math.max(0, hours - (entry.break_minutes || 0) / 60);
      }
      return total;
    }, 0);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600"></div>
          <span className="ml-3 text-lg text-gray-600">Loading staff data...</span>
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
          <h3 className="text-xl font-bold text-gray-800">Staff Management</h3>
        </div>
        
        <button
          onClick={() => setShowAddEmployeeModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Add Employee
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex space-x-8">
          {[
            { id: 'employees', label: 'Employees', count: staff.length },
            { id: 'schedules', label: 'Schedules', count: schedules.length },
            { id: 'timesheet', label: 'Timesheet', count: timeEntries.length }
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

      {/* Employees Tab */}
      {activeTab === 'employees' && (
        <div>
          {/* Search and Filter Controls */}
          <div className="flex items-center space-x-4 mb-6">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search employees..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Roles</option>
              {roles.map(role => (
                <option key={role.value} value={role.value}>{role.label}</option>
              ))}
            </select>
          </div>

          {/* Employee List */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredStaff.map((employee) => (
              <div key={employee.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="font-semibold text-gray-800">{employee.full_name}</h4>
                    <p className="text-sm text-gray-600">{employee.role.charAt(0).toUpperCase() + employee.role.slice(1)}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`inline-block w-3 h-3 rounded-full ${employee.active ? 'bg-green-500' : 'bg-red-500'}`}></span>
                    <span className="text-xs text-gray-500">{employee.active ? 'Active' : 'Inactive'}</span>
                  </div>
                </div>

                <div className="space-y-1 text-sm text-gray-600 mb-4">
                  <p>📧 {employee.email}</p>
                  <p>📱 {employee.phone}</p>
                  <p>💰 ${employee.hourly_rate}/hr</p>
                  {employee.hire_date && (
                    <p>📅 Hired: {new Date(employee.hire_date).toLocaleDateString()}</p>
                  )}
                </div>

                <div className="text-xs text-gray-500 mb-3">
                  <p>Hours (7 days): {calculateTotalHours(employee.id).toFixed(1)}h</p>
                </div>

                <div className="flex space-x-2">
                  <button
                    onClick={() => openEditModal(employee)}
                    className="flex-1 bg-blue-600 text-white py-1 px-3 rounded text-sm hover:bg-blue-700"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => setSelectedEmployee(employee)}
                    className="flex-1 bg-green-600 text-white py-1 px-3 rounded text-sm hover:bg-green-700"
                  >
                    View
                  </button>
                  <button
                    onClick={() => handleDeleteEmployee(employee.id)}
                    className="bg-red-600 text-white py-1 px-3 rounded text-sm hover:bg-red-700"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>

          {filteredStaff.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No employees found matching your criteria</p>
            </div>
          )}
        </div>
      )}

      {/* Schedules Tab */}
      {activeTab === 'schedules' && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <h4 className="text-lg font-semibold">Employee Schedules</h4>
            <button
              onClick={() => setShowScheduleModal(true)}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
            >
              Add Schedule
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {staff.map((employee) => {
              const employeeSchedules = getEmployeeSchedule(employee.id);
              return (
                <div key={employee.id} className="border border-gray-200 rounded-lg p-4">
                  <h5 className="font-semibold text-gray-800 mb-3">{employee.full_name}</h5>
                  {employeeSchedules.length === 0 ? (
                    <p className="text-gray-500 text-sm">No schedule set</p>
                  ) : (
                    <div className="space-y-2">
                      {employeeSchedules.map((schedule) => (
                        <div key={schedule.id} className="flex justify-between items-center text-sm">
                          <span className="font-medium">{schedule.day_of_week.charAt(0).toUpperCase() + schedule.day_of_week.slice(1)}</span>
                          <span>{schedule.is_working_day ? `${schedule.start_time} - ${schedule.end_time}` : 'Off'}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Timesheet Tab */}
      {activeTab === 'timesheet' && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <h4 className="text-lg font-semibold">Time Entries</h4>
            <button
              onClick={() => setShowTimeEntryModal(true)}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
            >
              Add Time Entry
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Clock In</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Clock Out</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Break (min)</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Hours</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Notes</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {timeEntries.slice(0, 50).map((entry) => {
                  const employee = staff.find(emp => emp.id === entry.employee_id);
                  let totalHours = 0;
                  if (entry.clock_in && entry.clock_out) {
                    const clockIn = new Date(`${entry.date}T${entry.clock_in}`);
                    const clockOut = new Date(`${entry.date}T${entry.clock_out}`);
                    totalHours = Math.max(0, (clockOut - clockIn) / (1000 * 60 * 60) - (entry.break_minutes || 0) / 60);
                  }
                  
                  return (
                    <tr key={entry.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {employee?.full_name || 'Unknown'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(entry.date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {entry.clock_in || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {entry.clock_out || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {entry.break_minutes || '0'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {totalHours > 0 ? totalHours.toFixed(2) : '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {entry.notes || '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {timeEntries.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No time entries found</p>
            </div>
          )}
        </div>
      )}

      {/* Add Employee Modal */}
      {showAddEmployeeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">Add New Employee</h3>
              <button
                onClick={() => setShowAddEmployeeModal(false)}
                className="text-gray-500 hover:text-gray-700 text-xl"
              >
                ×
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Full Name *</label>
                <input
                  type="text"
                  value={employeeForm.full_name}
                  onChange={(e) => setEmployeeForm({...employeeForm, full_name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <input
                  type="email"
                  value={employeeForm.email}
                  onChange={(e) => setEmployeeForm({...employeeForm, email: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                <input
                  type="tel"
                  value={employeeForm.phone}
                  onChange={(e) => setEmployeeForm({...employeeForm, phone: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                <select
                  value={employeeForm.role}
                  onChange={(e) => setEmployeeForm({...employeeForm, role: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {roles.map(role => (
                    <option key={role.value} value={role.value}>{role.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">PIN *</label>
                <input
                  type="text"
                  value={employeeForm.pin}
                  onChange={(e) => setEmployeeForm({...employeeForm, pin: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="4-digit PIN"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Hourly Rate</label>
                <input
                  type="number"
                  step="0.01"
                  value={employeeForm.hourly_rate}
                  onChange={(e) => setEmployeeForm({...employeeForm, hourly_rate: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Hire Date</label>
                <input
                  type="date"
                  value={employeeForm.hire_date}
                  onChange={(e) => setEmployeeForm({...employeeForm, hire_date: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Department</label>
                <input
                  type="text"
                  value={employeeForm.department}
                  onChange={(e) => setEmployeeForm({...employeeForm, department: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Emergency Contact</label>
                <input
                  type="text"
                  value={employeeForm.emergency_contact}
                  onChange={(e) => setEmployeeForm({...employeeForm, emergency_contact: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Emergency Phone</label>
                <input
                  type="tel"
                  value={employeeForm.emergency_phone}
                  onChange={(e) => setEmployeeForm({...employeeForm, emergency_phone: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="md:col-span-2">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={employeeForm.active}
                    onChange={(e) => setEmployeeForm({...employeeForm, active: e.target.checked})}
                    className="mr-2"
                  />
                  <label className="text-sm font-medium text-gray-700">Active Employee</label>
                </div>
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowAddEmployeeModal(false)}
                className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={handleAddEmployee}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700"
              >
                Add Employee
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Employee Modal */}
      {showEditEmployeeModal && editingEmployee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">Edit Employee</h3>
              <button
                onClick={() => setShowEditEmployeeModal(false)}
                className="text-gray-500 hover:text-gray-700 text-xl"
              >
                ×
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Full Name *</label>
                <input
                  type="text"
                  value={employeeForm.full_name}
                  onChange={(e) => setEmployeeForm({...employeeForm, full_name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <input
                  type="email"
                  value={employeeForm.email}
                  onChange={(e) => setEmployeeForm({...employeeForm, email: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                <input
                  type="tel"
                  value={employeeForm.phone}
                  onChange={(e) => setEmployeeForm({...employeeForm, phone: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                <select
                  value={employeeForm.role}
                  onChange={(e) => setEmployeeForm({...employeeForm, role: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {roles.map(role => (
                    <option key={role.value} value={role.value}>{role.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Hourly Rate</label>
                <input
                  type="number"
                  step="0.01"
                  value={employeeForm.hourly_rate}
                  onChange={(e) => setEmployeeForm({...employeeForm, hourly_rate: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Department</label>
                <input
                  type="text"
                  value={employeeForm.department}
                  onChange={(e) => setEmployeeForm({...employeeForm, department: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="md:col-span-2">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={employeeForm.active}
                    onChange={(e) => setEmployeeForm({...employeeForm, active: e.target.checked})}
                    className="mr-2"
                  />
                  <label className="text-sm font-medium text-gray-700">Active Employee</label>
                </div>
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowEditEmployeeModal(false)}
                className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={handleEditEmployee}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700"
              >
                Update Employee
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Schedule Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">Add Schedule</h3>
              <button
                onClick={() => setShowScheduleModal(false)}
                className="text-gray-500 hover:text-gray-700 text-xl"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Employee</label>
                <select
                  value={scheduleForm.employee_id}
                  onChange={(e) => setScheduleForm({...scheduleForm, employee_id: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Employee</option>
                  {staff.map(employee => (
                    <option key={employee.id} value={employee.id}>{employee.full_name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Day of Week</label>
                <select
                  value={scheduleForm.day_of_week}
                  onChange={(e) => setScheduleForm({...scheduleForm, day_of_week: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {days.map(day => (
                    <option key={day.value} value={day.value}>{day.label}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Start Time</label>
                  <input
                    type="time"
                    value={scheduleForm.start_time}
                    onChange={(e) => setScheduleForm({...scheduleForm, start_time: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">End Time</label>
                  <input
                    type="time"
                    value={scheduleForm.end_time}
                    onChange={(e) => setScheduleForm({...scheduleForm, end_time: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={scheduleForm.is_working_day}
                    onChange={(e) => setScheduleForm({...scheduleForm, is_working_day: e.target.checked})}
                    className="mr-2"
                  />
                  <label className="text-sm font-medium text-gray-700">Working Day</label>
                </div>
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowScheduleModal(false)}
                className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={handleAddSchedule}
                className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700"
              >
                Add Schedule
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Time Entry Modal */}
      {showTimeEntryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">Add Time Entry</h3>
              <button
                onClick={() => setShowTimeEntryModal(false)}
                className="text-gray-500 hover:text-gray-700 text-xl"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Employee</label>
                <select
                  value={timeEntryForm.employee_id}
                  onChange={(e) => setTimeEntryForm({...timeEntryForm, employee_id: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Employee</option>
                  {staff.map(employee => (
                    <option key={employee.id} value={employee.id}>{employee.full_name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                <input
                  type="date"
                  value={timeEntryForm.date}
                  onChange={(e) => setTimeEntryForm({...timeEntryForm, date: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Clock In</label>
                  <input
                    type="time"
                    value={timeEntryForm.clock_in}
                    onChange={(e) => setTimeEntryForm({...timeEntryForm, clock_in: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Clock Out</label>
                  <input
                    type="time"
                    value={timeEntryForm.clock_out}
                    onChange={(e) => setTimeEntryForm({...timeEntryForm, clock_out: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Break Minutes</label>
                <input
                  type="number"
                  value={timeEntryForm.break_minutes}
                  onChange={(e) => setTimeEntryForm({...timeEntryForm, break_minutes: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                <textarea
                  value={timeEntryForm.notes}
                  onChange={(e) => setTimeEntryForm({...timeEntryForm, notes: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows="3"
                />
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowTimeEntryModal(false)}
                className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={handleAddTimeEntry}
                className="flex-1 bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700"
              >
                Add Entry
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Employee Detail Modal */}
      {selectedEmployee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">Employee Details - {selectedEmployee.full_name}</h3>
              <button
                onClick={() => setSelectedEmployee(null)}
                className="text-gray-500 hover:text-gray-700 text-xl"
              >
                ×
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Employee Info */}
              <div className="space-y-4">
                <h4 className="font-semibold text-gray-800">Basic Information</h4>
                <div className="space-y-2 text-sm">
                  <p><strong>Email:</strong> {selectedEmployee.email}</p>
                  <p><strong>Phone:</strong> {selectedEmployee.phone}</p>
                  <p><strong>Role:</strong> {selectedEmployee.role.charAt(0).toUpperCase() + selectedEmployee.role.slice(1)}</p>
                  <p><strong>Hourly Rate:</strong> ${selectedEmployee.hourly_rate}/hr</p>
                  <p><strong>Department:</strong> {selectedEmployee.department || 'N/A'}</p>
                  <p><strong>Hire Date:</strong> {selectedEmployee.hire_date ? new Date(selectedEmployee.hire_date).toLocaleDateString() : 'N/A'}</p>
                  <p><strong>Status:</strong> <span className={selectedEmployee.active ? 'text-green-600' : 'text-red-600'}>{selectedEmployee.active ? 'Active' : 'Inactive'}</span></p>
                </div>
              </div>

              {/* Recent Time Entries */}
              <div className="space-y-4">
                <h4 className="font-semibold text-gray-800">Recent Time Entries (7 days)</h4>
                <div className="space-y-2">
                  {getEmployeeTimeEntries(selectedEmployee.id, 7).slice(0, 5).map((entry) => (
                    <div key={entry.id} className="text-sm bg-gray-50 p-2 rounded">
                      <div className="flex justify-between">
                        <span>{new Date(entry.date).toLocaleDateString()}</span>
                        <span>{entry.clock_in} - {entry.clock_out || 'Active'}</span>
                      </div>
                    </div>
                  ))}
                  {getEmployeeTimeEntries(selectedEmployee.id, 7).length === 0 && (
                    <p className="text-gray-500 text-sm">No recent time entries</p>
                  )}
                </div>
                <div className="text-sm font-medium">
                  Total Hours (7 days): {calculateTotalHours(selectedEmployee.id, 7).toFixed(1)}h
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffManagementComponent;