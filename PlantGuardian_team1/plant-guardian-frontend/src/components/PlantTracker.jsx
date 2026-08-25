import React, { useState, useEffect } from 'react';
import { Plus, AlertCircle, Leaf } from 'lucide-react';
import { API_BASE_URL } from '../App';
import AddPlantModal from './AddPlantModal';
import PlantCard from './PlantCard';
import '../styles/PlantTracker.css';

const PlantTracker = () => {
  const [plants, setPlants] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [showAddPlant, setShowAddPlant] = useState(false);
  const [editingPlant, setEditingPlant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    loadPlants();
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(timer);
  }, [toast]);

  const loadPlants = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/plants`);
      if (!response.ok) throw new Error(`API error: ${response.status}`);
      const data = await response.json();
      setPlants(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load plants:', err);
      setError("We couldn't load your plants.");
    } finally {
      setLoading(false);
    }
  };

  const handleAddPlant = async (formData) => {
    const response = await fetch(`${API_BASE_URL}/plants`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      throw new Error(body?.detail?.[0]?.msg || body?.detail || 'Failed to add plant');
    }
    await loadPlants();
    setShowAddPlant(false);
    setToast(`${formData.name} added 🌱`);
  };

  const handleUpdatePlant = async (plantId, formData) => {
    const response = await fetch(`${API_BASE_URL}/plants/${plantId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      throw new Error(body?.detail?.[0]?.msg || body?.detail || 'Failed to update plant');
    }
    await loadPlants();
    setEditingPlant(null);
    setToast(`${formData.name} updated`);
  };

  const handleWatered = async (plantId) => {
    const plant = plants.find((p) => p.id === plantId);
    try {
      const response = await fetch(`${API_BASE_URL}/plants/${plantId}/water`, {
        method: 'PATCH'
      });
      if (!response.ok) throw new Error('Failed to water plant');
      await loadPlants();
      setToast(`${plant?.name || 'Plant'} watered successfully 🌱`);
    } catch (err) {
      console.error('Failed to water plant:', err);
      setError('Could not update watering status.');
    }
  };

  const handleDelete = async (plantId) => {
    const plant = plants.find((p) => p.id === plantId);
    try {
      const response = await fetch(`${API_BASE_URL}/plants/${plantId}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to delete plant');
      await loadPlants();
      setToast(`${plant?.name || 'Plant'} deleted`);
    } catch (err) {
      console.error('Failed to delete plant:', err);
      setError('Could not delete plant.');
    }
  };

  const locations = ['all', ...new Set(plants.map((p) => p.location).filter(Boolean))];

  const filteredPlants =
    selectedLocation === 'all'
      ? plants
      : plants.filter((p) => p.location === selectedLocation);

  const summary = {
    total: plants.length,
    healthy: plants.filter((p) => p.risk_level === 'Healthy').length,
    thirsty: plants.filter((p) => p.risk_level === 'Needs Water Soon').length,
    highRisk: plants.filter((p) => p.risk_level === 'High Risk').length
  };

  return (
    <div className="plant-tracker">
      <header className="tracker-header">
        <div className="header-title-group">
          <h1>🌱 Plant Guardian</h1>
          <p className="header-subtitle">Smart care for every plant</p>
        </div>
        <button className="btn-add-plant" onClick={() => setShowAddPlant(true)}>
          <Plus size={18} />
          <span>Add Plant</span>
        </button>
      </header>

      {toast && <div className="toast-banner">{toast}</div>}

      {error && (
        <div className="error-banner">
          <AlertCircle size={18} />
          <span>{error}</span>
          <button className="btn-retry" onClick={loadPlants}>
            Try Again
          </button>
        </div>
      )}

      {!loading && plants.length > 0 && (
        <div className="dashboard-summary">
          <div className="summary-card">
            <span className="summary-value">{summary.total}</span>
            <span className="summary-label">My Plants</span>
          </div>
          <div className="summary-card summary-healthy">
            <span className="summary-value">{summary.healthy}</span>
            <span className="summary-label">Healthy</span>
          </div>
          <div className="summary-card summary-thirsty">
            <span className="summary-value">{summary.thirsty}</span>
            <span className="summary-label">Needs Water Soon</span>
          </div>
          <div className="summary-card summary-overdue">
            <span className="summary-value">{summary.highRisk}</span>
            <span className="summary-label">High Risk</span>
          </div>
        </div>
      )}

      {!loading && plants.length > 0 && (
        <div className="location-filters">
          {locations.map((loc) => (
            <button
              key={loc}
              className={`filter-btn ${selectedLocation === loc ? 'active' : ''}`}
              onClick={() => setSelectedLocation(loc)}
            >
              {loc === 'all' ? 'All Locations' : loc}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="loading-state">
          <p className="loading-text">Loading your plants...</p>
        </div>
      ) : plants.length === 0 && !error ? (
        <div className="empty-state">
          <Leaf size={40} className="empty-icon" />
          <h2>Your plant collection is empty</h2>
          <p>Add your first plant to start tracking its care and risk.</p>
          <button className="btn-add-plant" onClick={() => setShowAddPlant(true)}>
            <Plus size={18} />
            <span>Add Your First Plant</span>
          </button>
        </div>
      ) : filteredPlants.length > 0 ? (
        <div className="plant-grid">
          {filteredPlants.map((plant) => (
            <PlantCard
              key={plant.id}
              plant={plant}
              onWatered={handleWatered}
              onDelete={handleDelete}
              onEdit={setEditingPlant}
            />
          ))}
        </div>
      ) : null}

      {showAddPlant && (
        <AddPlantModal onClose={() => setShowAddPlant(false)} onAdd={handleAddPlant} />
      )}

      {editingPlant && (
        <AddPlantModal
          plant={editingPlant}
          onClose={() => setEditingPlant(null)}
          onUpdate={handleUpdatePlant}
        />
      )}
    </div>
  );
};

export default PlantTracker;
