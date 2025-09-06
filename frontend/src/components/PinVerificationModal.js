import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

// PIN Verification Modal - extracted from App.js without changes
const PinVerificationModal = ({ isOpen, onClose, onSuccess, title = "Enter PIN to Continue" }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { verifyPin } = useAuth();

  const handlePinInput = (digit) => {
    if (pin.length < 4) {
      setPin(pin + digit);
    }
  };

  const handleBackspace = () => {
    setPin(pin.slice(0, -1));
  };

  const handleClear = () => {
    setPin('');
    setError('');
  };

  const handleVerification = async () => {
    if (pin.length !== 4) {
      setError('Please enter a 4-digit PIN');
      return;
    }

    setLoading(true);
    setError('');

    const result = await verifyPin(pin);
    if (result.success) {
      onSuccess(result.user);
      onClose();
      setPin('');
    } else {
      setError(result.error);
      setPin('');
    }
    setLoading(false);
  };

  useEffect(() => {
    if (pin.length === 4) {
      handleVerification();
    }
  }, [pin]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">{title}</h2>
        </div>

        {/* PIN Display */}
        <div className="flex justify-center mb-8">
          <div className="flex space-x-3">
            {[0,1,2,3].map(i => (
              <div 
                key={i}
                className={`w-4 h-4 rounded-full border-2 ${
                  i < pin.length ? 'bg-blue-600 border-blue-600' : 'border-gray-300'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[1,2,3,4,5,6,7,8,9].map(num => (
            <button
              key={num}
              onClick={() => handlePinInput(num.toString())}
              className="h-12 bg-gray-100 hover:bg-gray-200 rounded-xl text-xl font-semibold text-gray-800 transition-colors"
              disabled={loading}
            >
              {num}
            </button>
          ))}
          <button
            onClick={handleClear}
            className="h-12 bg-red-100 hover:bg-red-200 rounded-xl text-sm font-semibold text-red-600 transition-colors"
            disabled={loading}
          >
            Clear
          </button>
          <button
            onClick={() => handlePinInput('0')}
            className="h-12 bg-gray-100 hover:bg-gray-200 rounded-xl text-xl font-semibold text-gray-800 transition-colors"
            disabled={loading}
          >
            0
          </button>
          <button
            onClick={handleBackspace}
            className="h-12 bg-gray-100 hover:bg-gray-200 rounded-xl text-sm font-semibold text-gray-600 transition-colors"
            disabled={loading}
          >
            ←
          </button>
        </div>

        {error && (
          <div className="text-red-600 text-center text-sm mb-4">{error}</div>
        )}

        <div className="flex space-x-3">
          <button
            onClick={onClose}
            className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default PinVerificationModal;