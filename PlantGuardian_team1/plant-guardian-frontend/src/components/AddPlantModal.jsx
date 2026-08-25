import React, { useState } from 'react';
import { X } from 'lucide-react';
import '../styles/AddPlantModal.css';

const AddPlantModal = ({ onClose, onAdd, onUpdate, plant }) => {
  const today = new Date().toISOString().split('T')[0];
  const isEditMode = Boolean(plant);

  const [formData, setFormData] = useState(
    isEditMode
      ? {
          name: plant.name || '',
          species: plant.species || '',
          location: plant.location || '',
          specific_spot: plant.specific_spot || '',
          watering_frequency: plant.watering_frequency ?? 7,
          last_watered: plant.last_watered || today,
          sunlight: plant.sunlight || 'Indirect',
          water_amount_ml: plant.water_amount_ml ?? 250,
          notes: plant.notes || ''
        }
      : {
          name: '',
          species: '',
          location: '',
          specific_spot: '',
          watering_frequency: 7,
          last_watered: today,
          sunlight: 'Indirect',
          water_amount_ml: 250,
          notes: ''
        }
  );

  // Tracks which fields the user has actually interacted with, so we never
  // show "required" errors on a form the user just opened.
  const [touched, setTouched] = useState({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [loading, setLoading] = useState(false);

  const validateField = (field, data) => {
    switch (field) {
      case 'name':
        return data.name.trim() ? '' : 'Plant name is required';
      case 'species':
        return data.species.trim() ? '' : 'Species is required';
      case 'location':
        return data.location.trim() ? '' : 'Location is required';
      case 'watering_frequency':
        return data.watering_frequency >= 1 && data.watering_frequency <= 365
          ? ''
          : 'Frequency must be between 1 and 365 days';
      case 'water_amount_ml':
        return data.water_amount_ml > 0 ? '' : 'Water amount must be greater than 0';
      default:
        return '';
    }
  };

  const requiredFields = ['name', 'species', 'location', 'watering_frequency', 'water_amount_ml'];

  const getFieldError = (field) => {
    const showError = touched[field] || submitAttempted;
    if (!showError) return '';
    return validateField(field, formData);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    const numericFields = ['watering_frequency', 'water_amount_ml'];
    setFormData((prev) => ({
      ...prev,
      [name]: numericFields.includes(name) ? parseInt(value) || 0 : value
    }));
  };

  const handleBlur = (e) => {
    setTouched((prev) => ({ ...prev, [e.target.name]: true }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitAttempted(true);
    setSubmitError('');

    const hasErrors = requiredFields.some((field) => validateField(field, formData));
    if (hasErrors) return;

    setLoading(true);
    try {
      if (isEditMode) {
        await onUpdate(plant.id, formData);
      } else {
        await onAdd(formData);
      }
    } catch (err) {
      console.error('Error saving plant:', err);
      setSubmitError(
        err instanceof Error && err.message
          ? err.message
          : `Failed to ${isEditMode ? 'update' : 'add'} plant. Check the backend is running.`
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="plant-modal-title"
      >
        <div className="modal-header">
          <h2 id="plant-modal-title">{isEditMode ? 'Edit Plant' : 'Add a Plant'}</h2>
          <button className="btn-close" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="plant-form" noValidate>
          <div className="form-group">
            <label htmlFor="plant-name">Plant Name *</label>
            <input
              id="plant-name"
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="e.g. Milo"
              aria-invalid={Boolean(getFieldError('name'))}
            />
            {getFieldError('name') && <span className="field-error">{getFieldError('name')}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="plant-species">Species *</label>
            <input
              id="plant-species"
              type="text"
              name="species"
              value={formData.species}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="e.g. Money Plant"
              aria-invalid={Boolean(getFieldError('species'))}
            />
            {getFieldError('species') && (
              <span className="field-error">{getFieldError('species')}</span>
            )}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="plant-location">Location *</label>
              <input
                id="plant-location"
                type="text"
                name="location"
                value={formData.location}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="e.g. Living Room"
                aria-invalid={Boolean(getFieldError('location'))}
              />
              {getFieldError('location') && (
                <span className="field-error">{getFieldError('location')}</span>
              )}
            </div>
            <div className="form-group">
              <label htmlFor="plant-spot">Specific Spot</label>
              <input
                id="plant-spot"
                type="text"
                name="specific_spot"
                value={formData.specific_spot}
                onChange={handleChange}
                placeholder="e.g. Window Shelf 2"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="plant-frequency">Watering Frequency (days) *</label>
              <input
                id="plant-frequency"
                type="number"
                name="watering_frequency"
                value={formData.watering_frequency}
                onChange={handleChange}
                onBlur={handleBlur}
                min="1"
                max="365"
                aria-invalid={Boolean(getFieldError('watering_frequency'))}
              />
              {getFieldError('watering_frequency') && (
                <span className="field-error">{getFieldError('watering_frequency')}</span>
              )}
            </div>
            <div className="form-group">
              <label htmlFor="plant-water-amount">Water Amount (ml) *</label>
              <input
                id="plant-water-amount"
                type="number"
                name="water_amount_ml"
                value={formData.water_amount_ml}
                onChange={handleChange}
                onBlur={handleBlur}
                min="1"
                aria-invalid={Boolean(getFieldError('water_amount_ml'))}
              />
              {getFieldError('water_amount_ml') && (
                <span className="field-error">{getFieldError('water_amount_ml')}</span>
              )}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="plant-last-watered">Last Watered *</label>
              <input
                id="plant-last-watered"
                type="date"
                name="last_watered"
                value={formData.last_watered}
                onChange={handleChange}
              />
            </div>
            <div className="form-group">
              <label htmlFor="plant-sunlight">Sunlight *</label>
              <select
                id="plant-sunlight"
                name="sunlight"
                value={formData.sunlight}
                onChange={handleChange}
              >
                <option value="Direct">Direct</option>
                <option value="Indirect">Indirect</option>
                <option value="Low Light">Low Light</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="plant-notes">Notes (optional)</label>
            <textarea
              id="plant-notes"
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              placeholder="e.g. Do not move the plant"
            />
          </div>

          {submitError && <span className="field-error">{submitError}</span>}

          <div className="form-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-submit" disabled={loading}>
              {loading
                ? isEditMode
                  ? 'Saving...'
                  : 'Adding...'
                : isEditMode
                ? 'Save Changes'
                : 'Add Plant'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddPlantModal;
