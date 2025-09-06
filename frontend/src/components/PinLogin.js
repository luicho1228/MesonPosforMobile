import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

// PIN Login Component - extracted from App.js without changes
const PinLogin = () => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

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

  const handleLogin = async () => {
    if (pin.length !== 4) {
      setError('Please enter a 4-digit PIN');
      return;
    }

    setLoading(true);
    setError('');

    const result = await login(pin);
    if (!result.success) {
      setError(result.error);
      setPin('');
    }
    setLoading(false);
  };

  useEffect(() => {
    if (pin.length === 4) {
      handleLogin();
    }
  }, [pin]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-700 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Restaurant POS</h1>
          <p className="text-gray-600">Enter your 4-digit PIN</p>
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
              className="h-16 bg-gray-100 hover:bg-gray-200 rounded-xl text-2xl font-semibold text-gray-800 transition-colors"
              disabled={loading}
            >
              {num}
            </button>
          ))}
          <button
            onClick={handleClear}
            className="h-16 bg-red-100 hover:bg-red-200 rounded-xl text-sm font-semibold text-red-600 transition-colors"
            disabled={loading}
          >
            Clear
          </button>
          <button
            onClick={() => handlePinInput('0')}
            className="h-16 bg-gray-100 hover:bg-gray-200 rounded-xl text-2xl font-semibold text-gray-800 transition-colors"
            disabled={loading}
          >
            0
          </button>
          <button
            onClick={handleBackspace}
            className="h-16 bg-gray-100 hover:bg-gray-200 rounded-xl text-sm font-semibold text-gray-600 transition-colors"
            disabled={loading}
          >
            ←
          </button>
        </div>

        {error && (
          <div className="text-red-600 text-center text-sm mb-4">{error}</div>
        )}

        {loading && (
          <div className="text-center text-blue-600 text-sm">Logging in...</div>
        )}

        <div className="text-center text-xs text-gray-500 mt-8">
          <strong>Demo PIN:</strong> 1234 (Manager) | 5678 (Employee)
        </div>
      </div>
    </div>
  );
};

export default PinLogin;