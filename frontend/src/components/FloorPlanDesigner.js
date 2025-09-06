import React, { useState, useEffect, useRef } from 'react';

// Floor Plan Designer Component
const FloorPlanDesigner = ({ tables, onUpdateTablePosition, onSaveFloorPlan, onLoadFloorPlan }) => {
  const [floorPlanData, setFloorPlanData] = useState({});
  const [rooms, setRooms] = useState([]);
  const [selectedTool, setSelectedTool] = useState('select'); // select, table, room, wall
  const [draggedTable, setDraggedTable] = useState(null);
  const [selectedTable, setSelectedTable] = useState(null);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [floorPlanName, setFloorPlanName] = useState('');
  const [savedFloorPlans, setSavedFloorPlans] = useState([]);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  const canvasRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  useEffect(() => {
    loadFloorPlan();
    loadSavedFloorPlans();
  }, []);

  const loadFloorPlan = () => {
    const data = onLoadFloorPlan();
    setFloorPlanData(data.tables || {});
    setRooms(data.rooms || []);
    if (data.canvasSize) setCanvasSize(data.canvasSize);
  };

  const loadSavedFloorPlans = () => {
    try {
      const floorPlans = JSON.parse(localStorage.getItem('floorPlans') || '{}');
      setSavedFloorPlans(Object.keys(floorPlans));
    } catch (error) {
      console.error('Error loading saved floor plans:', error);
    }
  };

  const saveCurrentFloorPlan = (name) => {
    const data = {
      tables: floorPlanData,
      rooms: rooms,
      canvasSize: canvasSize,
      createdAt: new Date().toISOString()
    };
    onSaveFloorPlan(data, name);
    loadSavedFloorPlans();
  };

  const handleTableDragStart = (e, table) => {
    if (selectedTool !== 'select') return;
    setDraggedTable(table);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleCanvasDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleCanvasDrop = (e) => {
    e.preventDefault();
    if (!draggedTable) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left - pan.x) / zoom;
    const y = (e.clientY - rect.top - pan.y) / zoom;

    const updatedData = {
      ...floorPlanData,
      [draggedTable.id]: { ...draggedTable, x, y }
    };
    
    setFloorPlanData(updatedData);
    onUpdateTablePosition(draggedTable.id, x, y);
    setDraggedTable(null);
  };

  const handleTableClick = (table) => {
    if (selectedTool === 'select') {
      setSelectedTable(selectedTable?.id === table.id ? null : table);
    }
  };

  const handleCanvasMouseDown = (e) => {
    if (selectedTool === 'select') {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleCanvasMouseMove = (e) => {
    if (isDragging && selectedTool === 'select') {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleCanvasMouseUp = () => {
    setIsDragging(false);
  };

  const handleZoom = (direction) => {
    const newZoom = direction === 'in' ? Math.min(zoom * 1.2, 3) : Math.max(zoom * 0.8, 0.3);
    setZoom(newZoom);
  };

  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const addRoom = () => {
    const newRoom = {
      id: Date.now(),
      name: `Room ${rooms.length + 1}`,
      x: 50,
      y: 50,
      width: 200,
      height: 150,
      color: '#e3f2fd'
    };
    setRooms([...rooms, newRoom]);
  };

  const updateRoom = (roomId, updates) => {
    setRooms(rooms.map(room => 
      room.id === roomId ? { ...room, ...updates } : room
    ));
  };

  const deleteRoom = (roomId) => {
    setRooms(rooms.filter(room => room.id !== roomId));
    if (selectedRoom?.id === roomId) {
      setSelectedRoom(null);
    }
  };

  const handleRoomClick = (room) => {
    if (selectedTool === 'select') {
      setSelectedRoom(selectedRoom?.id === room.id ? null : room);
    }
  };

  const exportFloorPlan = () => {
    const canvas = canvasRef.current;
    const link = document.createElement('a');
    link.download = `floor-plan-${floorPlanName || 'unnamed'}.png`;
    link.href = canvas.toDataURL();
    link.click();
  };

  const loadSavedFloorPlan = (planName) => {
    try {
      const floorPlans = JSON.parse(localStorage.getItem('floorPlans') || '{}');
      const plan = floorPlans[planName];
      if (plan) {
        setFloorPlanData(plan.tables || {});
        setRooms(plan.rooms || []);
        if (plan.canvasSize) setCanvasSize(plan.canvasSize);
        setShowLoadModal(false);
      }
    } catch (error) {
      console.error('Error loading floor plan:', error);
      alert('Error loading floor plan');
    }
  };

  const deleteSavedFloorPlan = (planName) => {
    try {
      const floorPlans = JSON.parse(localStorage.getItem('floorPlans') || '{}');
      delete floorPlans[planName];
      localStorage.setItem('floorPlans', JSON.stringify(floorPlans));
      loadSavedFloorPlans();
    } catch (error) {
      console.error('Error deleting floor plan:', error);
    }
  };

  const getTableDisplayName = (table) => {
    return table.name && table.name.trim() ? table.name : `Table ${table.number}`;
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-bold text-gray-800">Floor Plan Designer</h3>
        
        {/* Toolbar */}
        <div className="flex items-center space-x-4">
          {/* Tool Selection */}
          <div className="flex items-center space-x-2 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setSelectedTool('select')}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                selectedTool === 'select' 
                  ? 'bg-blue-600 text-white' 
                  : 'text-gray-600 hover:bg-gray-200'
              }`}
            >
              Select
            </button>
            <button
              onClick={() => setSelectedTool('table')}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                selectedTool === 'table' 
                  ? 'bg-blue-600 text-white' 
                  : 'text-gray-600 hover:bg-gray-200'
              }`}
            >
              Table
            </button>
            <button
              onClick={() => setSelectedTool('room')}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                selectedTool === 'room' 
                  ? 'bg-blue-600 text-white' 
                  : 'text-gray-600 hover:bg-gray-200'
              }`}
            >
              Room
            </button>
          </div>

          {/* Zoom Controls */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handleZoom('out')}
              className="bg-gray-200 text-gray-700 px-2 py-1 rounded text-sm hover:bg-gray-300"
            >
              -
            </button>
            <span className="text-sm font-medium">{Math.round(zoom * 100)}%</span>
            <button
              onClick={() => handleZoom('in')}
              className="bg-gray-200 text-gray-700 px-2 py-1 rounded text-sm hover:bg-gray-300"
            >
              +
            </button>
            <button
              onClick={resetView}
              className="bg-gray-200 text-gray-700 px-2 py-1 rounded text-sm hover:bg-gray-300"
            >
              Reset View
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-2">
            <button
              onClick={addRoom}
              className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
            >
              Add Room
            </button>
            <button
              onClick={() => setShowSaveModal(true)}
              className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
            >
              Save
            </button>
            <button
              onClick={() => setShowLoadModal(true)}
              className="bg-purple-600 text-white px-3 py-1 rounded text-sm hover:bg-purple-700"
            >
              Load
            </button>
            <button
              onClick={() => setShowExportModal(true)}
              className="bg-orange-600 text-white px-3 py-1 rounded text-sm hover:bg-orange-700"
            >
              Export
            </button>
          </div>
        </div>
      </div>

      {/* Canvas Container */}
      <div className="border border-gray-300 rounded-lg overflow-hidden relative">
        <div 
          className="canvas-container"
          style={{ 
            width: canvasSize.width, 
            height: canvasSize.height,
            cursor: selectedTool === 'select' && isDragging ? 'grabbing' : 'default'
          }}
          onDragOver={handleCanvasDragOver}
          onDrop={handleCanvasDrop}
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
          onMouseLeave={handleCanvasMouseUp}
        >
          <canvas
            ref={canvasRef}
            width={canvasSize.width}
            height={canvasSize.height}
            className="absolute inset-0"
            style={{
              transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)`,
              transformOrigin: 'top left'
            }}
          />

          {/* Rooms */}
          {rooms.map(room => (
            <div
              key={room.id}
              className={`absolute border-2 rounded-lg cursor-pointer transition-colors ${
                selectedRoom?.id === room.id 
                  ? 'border-blue-500 bg-blue-100' 
                  : 'border-gray-400 hover:border-gray-600'
              }`}
              style={{
                left: room.x * zoom + pan.x,
                top: room.y * zoom + pan.y,
                width: room.width * zoom,
                height: room.height * zoom,
                backgroundColor: room.color || '#f0f0f0',
                transform: 'translate3d(0,0,0)'
              }}
              onClick={() => handleRoomClick(room)}
            >
              <div className="p-1 text-xs font-medium text-gray-700">
                {room.name}
              </div>
            </div>
          ))}

          {/* Tables */}
          {tables.map(table => {
            const position = floorPlanData[table.id] || { x: 50 + (table.number * 80), y: 50 };
            return (
              <div
                key={table.id}
                className={`absolute w-16 h-16 rounded-full border-2 flex items-center justify-center cursor-pointer transition-all ${
                  selectedTable?.id === table.id
                    ? 'border-blue-500 bg-blue-100 shadow-lg scale-110'
                    : table.status === 'occupied'
                    ? 'border-red-500 bg-red-100 hover:shadow-md'
                    : 'border-green-500 bg-green-100 hover:shadow-md'
                }`}
                style={{
                  left: position.x * zoom + pan.x,
                  top: position.y * zoom + pan.y,
                  transform: 'translate3d(0,0,0)'
                }}
                draggable={selectedTool === 'select'}
                onDragStart={(e) => handleTableDragStart(e, table)}
                onClick={() => handleTableClick(table)}
              >
                <div className="text-center">
                  <div className="text-xs font-bold">
                    {getTableDisplayName(table)}
                  </div>
                  <div className="text-xs capitalize">
                    {table.status}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Property Panel */}
      {(selectedTable || selectedRoom) && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium mb-3">Properties</h4>
          
          {selectedTable && (
            <div className="space-y-2">
              <h5 className="font-medium text-blue-600">Table: {getTableDisplayName(selectedTable)}</h5>
              <p className="text-sm text-gray-600">Status: {selectedTable.status}</p>
              <p className="text-sm text-gray-600">Capacity: {selectedTable.capacity}</p>
              {floorPlanData[selectedTable.id] && (
                <p className="text-sm text-gray-600">
                  Position: ({Math.round(floorPlanData[selectedTable.id].x)}, {Math.round(floorPlanData[selectedTable.id].y)})
                </p>
              )}
            </div>
          )}

          {selectedRoom && (
            <div className="space-y-3">
              <h5 className="font-medium text-green-600">Room: {selectedRoom.name}</h5>
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium">Name:</label>
                <input
                  type="text"
                  value={selectedRoom.name}
                  onChange={(e) => updateRoom(selectedRoom.id, { name: e.target.value })}
                  className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                />
              </div>
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium">Color:</label>
                <input
                  type="color"
                  value={selectedRoom.color}
                  onChange={(e) => updateRoom(selectedRoom.id, { color: e.target.value })}
                  className="w-8 h-8 border border-gray-300 rounded"
                />
              </div>
              <button
                onClick={() => deleteRoom(selectedRoom.id)}
                className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
              >
                Delete Room
              </button>
            </div>
          )}
        </div>
      )}

      {/* Save Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-bold mb-4">Save Floor Plan</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Floor Plan Name</label>
              <input
                type="text"
                value={floorPlanName}
                onChange={(e) => setFloorPlanName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter floor plan name..."
              />
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowSaveModal(false)}
                className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (floorPlanName.trim()) {
                    saveCurrentFloorPlan(floorPlanName);
                    setShowSaveModal(false);
                    setFloorPlanName('');
                    alert('Floor plan saved successfully!');
                  } else {
                    alert('Please enter a floor plan name');
                  }
                }}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Load Modal */}
      {showLoadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full max-h-96 overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">Load Floor Plan</h3>
              <button
                onClick={() => setShowLoadModal(false)}
                className="text-gray-500 hover:text-gray-700 text-xl"
              >
                ×
              </button>
            </div>
            
            {savedFloorPlans.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No saved floor plans found</p>
            ) : (
              <div className="space-y-2">
                {savedFloorPlans.map((planName) => (
                  <div key={planName} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="font-medium">{planName}</span>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => loadSavedFloorPlan(planName)}
                        className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                      >
                        Load
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm(`Delete floor plan "${planName}"?`)) {
                            deleteSavedFloorPlan(planName);
                          }
                        }}
                        className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-bold mb-4">Export Floor Plan</h3>
            <p className="text-gray-600 mb-4">
              Export your current floor plan as a PNG image.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Export Name</label>
              <input
                type="text"
                value={floorPlanName}
                onChange={(e) => setFloorPlanName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Floor plan name..."
              />
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowExportModal(false)}
                className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  exportFloorPlan();
                  setShowExportModal(false);
                }}
                className="flex-1 bg-orange-600 text-white py-2 px-4 rounded-lg hover:bg-orange-700"
              >
                Export PNG
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FloorPlanDesigner;