// Utility functions extracted from App.js without changes

// Helper function to properly parse backend timestamps (UTC) and convert to local timezone
export const parseBackendTimestamp = (timestamp) => {
  // Backend now sends proper UTC timestamps with timezone info (+00:00)
  // JavaScript Date constructor will properly handle these and convert to local timezone
  return new Date(timestamp);
};

// Helper function to format date for display
export const formatLocalDate = (timestamp) => {
  const date = parseBackendTimestamp(timestamp);
  return date.toLocaleDateString();
};

// Helper function to format time for display
export const formatLocalTime = (timestamp) => {
  const date = parseBackendTimestamp(timestamp);
  return date.toLocaleTimeString();
};

// Helper function to format full datetime for display
export const formatLocalDateTime = (timestamp) => {
  const date = parseBackendTimestamp(timestamp);
  return date.toLocaleString();
};

// Helper function to calculate time elapsed
export const getTimeElapsed = (createdAt) => {
  const now = new Date();
  const created = parseBackendTimestamp(createdAt);
  
  // Ensure we're working with valid dates
  if (isNaN(created.getTime())) {
    return "Invalid date";
  }
  
  const diffMs = Math.abs(now - created);
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffMonths = Math.floor(diffDays / 30);
  
  if (diffMins < 1) {
    return "just now";
  } else if (diffMins < 60) {
    return `${diffMins} min ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  } else if (diffDays < 30) {
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  } else {
    return `${diffMonths} month${diffMonths > 1 ? 's' : ''} ago`;
  }
};

// Helper function to get order age color
export const getOrderAgeColor = (createdAt) => {
  const now = new Date();
  const orderTime = parseBackendTimestamp(createdAt);
  const minutesAgo = Math.floor((now - orderTime) / (1000 * 60));
  
  if (minutesAgo >= 45) return 'bg-red-100 border-red-500 text-red-800';
  if (minutesAgo >= 30) return 'bg-orange-100 border-orange-500 text-orange-800';
  if (minutesAgo >= 20) return 'bg-yellow-100 border-yellow-500 text-yellow-800';
  return 'bg-white border-gray-200';
};