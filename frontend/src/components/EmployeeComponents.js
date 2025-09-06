import React, { useState, useEffect } from 'react';
import axios from 'axios';
import PinVerificationModal from './PinVerificationModal';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Employee Status Component
export const EmployeeStatus = () => {
  const [activeEmployees, setActiveEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (showModal) {
      fetchActiveEmployees();
    }
  }, [showModal]);

  const fetchActiveEmployees = async () => {
    try {
      const response = await axios.get(`${API}/time/active-employees`);
      setActiveEmployees(response.data.active_employees);
    } catch (error) {
      console.error('Error fetching active employees:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
      >
        Employee Status
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full max-h-96 overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">Active Employees</h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-500 hover:text-gray-700 text-xl"
              >
                ×
              </button>
            </div>

            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : activeEmployees.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No employees currently clocked in</p>
            ) : (
              <div className="space-y-3">
                {activeEmployees.map((employee) => (
                  <div key={employee.user_id} className="bg-gray-50 rounded-lg p-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium">{employee.full_name}</h4>
                        <p className="text-sm text-gray-600">
                          Clocked in: {new Date(employee.clock_in_time).toLocaleTimeString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-green-600">
                          {employee.active_hours.toFixed(1)}h
                        </p>
                        <p className="text-xs text-gray-500">Active</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

// Clock In/Out Component
export const ClockInOut = () => {
  const [isClockingIn, setIsClockingIn] = useState(false);
  const [isClockingOut, setIsClockingOut] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [clockAction, setClockAction] = useState(null);
  const [timeEntries, setTimeEntries] = useState([]);
  const [currentEntry, setCurrentEntry] = useState(null);

  useEffect(() => {
    checkClockStatus();
  }, []);

  const checkClockStatus = async () => {
    try {
      const response = await axios.get(`${API}/time/entries`);
      setTimeEntries(response.data);
      
      const today = new Date().toISOString().split('T')[0];
      const todayEntry = response.data.find(entry => 
        entry.date === today && !entry.clock_out
      );
      setCurrentEntry(todayEntry);
    } catch (error) {
      console.error('Error checking clock status:', error);
    }
  };

  const handleClockAction = async (user) => {
    try {
      if (clockAction === 'in') {
        setIsClockingIn(true);
        await axios.post(`${API}/time/clock-in`);
        alert('Clocked in successfully!');
      } else {
        setIsClockingOut(true);
        const response = await axios.post(`${API}/time/clock-out`);
        alert(`Clocked out successfully! Total hours: ${response.data.total_hours.toFixed(2)}`);
      }
      
      checkClockStatus();
      setShowPinModal(false);
    } catch (error) {
      alert(error.response?.data?.detail || 'Error processing clock action');
    } finally {
      setIsClockingIn(false);
      setIsClockingOut(false);
    }
  };

  const initiateClock = (action) => {
    setClockAction(action);
    setShowPinModal(true);
  };

  return (
    <>
      <button
        onClick={() => initiateClock(currentEntry ? 'out' : 'in')}
        className={`px-4 py-2 rounded-lg transition-colors ${
          currentEntry 
            ? 'bg-red-600 text-white hover:bg-red-700' 
            : 'bg-blue-600 text-white hover:bg-blue-700'
        }`}
        disabled={isClockingIn || isClockingOut}
      >
        {isClockingIn || isClockingOut ? 'Processing...' : 
         currentEntry ? 'Clock Out' : 'Clock In'}
      </button>

      <PinVerificationModal
        isOpen={showPinModal}
        onClose={() => setShowPinModal(false)}
        onSuccess={handleClockAction}
        title={clockAction === 'in' ? 'Clock In' : 'Clock Out'}
      />
    </>
  );
};