import React, { useState } from 'react';
import { Droplets, Trash2, ChevronDown, Pencil } from 'lucide-react';
import '../styles/PlantCard.css';

const PlantCard = ({ plant, onWatered, onDelete, onEdit }) => {
  const [expanded, setExpanded] = useState(false);

  // The backend is the authoritative source for risk (GET /plants now
  // includes it). Only fall back to a client-side calc if it's ever missing.
  const getRiskStatus = () => {
    if (
      typeof plant.risk_score === 'number' &&
      plant.risk_level &&
      typeof plant.days_since_watered === 'number'
    ) {
      const colorMap = {
        Healthy: 'safe',
        'Needs Water Soon': 'thirsty',
        'High Risk': 'overdue'
      };
      return {
        risk: plant.risk_score,
        level: plant.risk_level,
        color: colorMap[plant.risk_level] || 'safe',
        daysSince: plant.days_since_watered
      };
    }

    // Fallback mirrors the backend's formula exactly.
    const daysSince = Math.floor(
      (Date.now() - new Date(plant.last_watered)) / (1000 * 60 * 60 * 24)
    );
    const risk = Math.min(100, Math.round((daysSince / plant.watering_frequency) * 100));

    let level, color;
    if (risk < 40) {
      level = 'Healthy';
      color = 'safe';
    } else if (risk < 70) {
      level = 'Needs Water Soon';
      color = 'thirsty';
    } else {
      level = 'High Risk';
      color = 'overdue';
    }

    return { risk, level, color, daysSince };
  };

  const { risk, level, color, daysSince } = getRiskStatus();

  const getDaysSinceLabel = () => {
    if (daysSince === 0) return 'Today';
    if (daysSince === 1) return 'Yesterday';
    return `${daysSince} days ago`;
  };

  // Watering guidance: always driven by the actual expected watering date
  // (last_watered + watering_frequency vs. today), never by the risk
  // number alone — a plant can read "High Risk" without being overdue yet.
  const getWateringGuidance = () => {
    let daysOverdue, daysUntilNext;

    if (
      typeof plant.days_overdue === 'number' &&
      typeof plant.days_until_next_watering === 'number'
    ) {
      daysOverdue = plant.days_overdue;
      daysUntilNext = plant.days_until_next_watering;
    } else if (plant.watering_frequency > 0) {
      daysOverdue = Math.max(0, daysSince - plant.watering_frequency);
      daysUntilNext = Math.max(0, plant.watering_frequency - daysSince);
    } else {
      daysOverdue = daysSince;
      daysUntilNext = 0;
    }

    if (daysOverdue > 0) {
      return `Should have been watered ${daysOverdue} day${daysOverdue === 1 ? '' : 's'} ago`;
    }
    if (daysUntilNext === 0) {
      return level === 'Healthy' ? 'Water today' : 'Needs water today';
    }
    if (level === 'Healthy') {
      return daysUntilNext === 1 ? 'Next water: tomorrow' : `Next water: in ${daysUntilNext} days`;
    }
    return `Needs water in ${daysUntilNext} day${daysUntilNext === 1 ? '' : 's'}`;
  };

  return (
    <div className={`plant-card plant-card-${color}`}>
      <div className="card-header">
        <div className="card-title-section">
          <h3 className="card-title">{plant.name}</h3>
          <p className="card-species">{plant.species}</p>
        </div>
        <div className={`health-badge badge-${color}`}>
          <span className="status-text">{level}</span>
        </div>
      </div>

      <div className="health-bar-section">
        <div className="health-bar-header">
          <span className="health-label">Risk Score</span>
          <span className="health-percentage">{risk} / 100</span>
        </div>
        <div className="health-bar-container">
          <div className="health-bar-background">
            <div
              className={`health-bar-fill health-bar-${color}`}
              style={{ width: `${risk}%` }}
            ></div>
          </div>
        </div>
      </div>

      <div className="quick-info">
        <div className="info-item">
          <span className="info-icon" aria-hidden="true">📍</span>
          <span className="info-text">
            {plant.location}
            {plant.specific_spot ? ` → ${plant.specific_spot}` : ''}
          </span>
        </div>
        <div className="info-item">
          <span className="info-icon" aria-hidden="true">☀️</span>
          <span className="info-text">{plant.sunlight}</span>
        </div>
        <div className="info-item">
          <span className="info-icon" aria-hidden="true">💧</span>
          <span className="info-text">
            Every {plant.watering_frequency} days • {plant.water_amount_ml}ml
          </span>
        </div>
      </div>

      <div className={`watering-guidance watering-guidance-${color}`}>
        <span className="info-icon" aria-hidden="true">💧</span>
        <span>{getWateringGuidance()}</span>
      </div>

      <div className="last-watered">
        <span className="last-watered-label">Last watered</span>
        <span className="last-watered-time">{getDaysSinceLabel()}</span>
      </div>

      {plant.notes && (
        <div className="notes-section">
          <p className="notes-text">📝 {plant.notes}</p>
        </div>
      )}

      <div className="card-actions">
        <button
          onClick={() => onWatered(plant.id)}
          className="btn-water-primary"
          aria-label={`Mark ${plant.name} as watered`}
        >
          <Droplets size={20} />
          <span>Just Watered!</span>
        </button>
        <button
          onClick={() => setExpanded(!expanded)}
          className="btn-expand"
          aria-label={expanded ? 'Hide more options' : 'Show more options'}
          aria-expanded={expanded}
        >
          <ChevronDown size={20} className={expanded ? 'rotated' : ''} />
        </button>
      </div>

      {expanded && (
        <div className="expanded-actions">
          <button
            onClick={() => onEdit(plant)}
            className="btn-edit"
            aria-label={`Edit ${plant.name}`}
          >
            <Pencil size={18} />
            <span>Edit Plant</span>
          </button>
          <button
            onClick={() => {
              if (window.confirm(`Delete ${plant.name}? This action cannot be undone.`)) {
                onDelete(plant.id);
              }
            }}
            className="btn-delete"
            aria-label={`Delete ${plant.name}`}
          >
            <Trash2 size={18} />
            <span>Delete Plant</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default PlantCard;
