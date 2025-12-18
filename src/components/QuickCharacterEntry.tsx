/**
 * Quick Character Entry Modal
 * Allows players to create a basic character with minimal info for fast game entry
 * Characters created this way can be enhanced later with full JSON imports
 */

import React, { useState } from 'react';
import { useCharacterStore } from '@/stores/characterStore';

interface QuickCharacterData {
  name: string;
  class: string;
  level: number;
  race: string;
  background: string;
}

interface QuickCharacterEntryProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (characterId: string) => void;
  playerId: string;
}

const DND_CLASSES = [
  'Barbarian',
  'Bard',
  'Cleric',
  'Druid',
  'Fighter',
  'Monk',
  'Paladin',
  'Ranger',
  'Rogue',
  'Sorcerer',
  'Warlock',
  'Wizard',
];

export const QuickCharacterEntry: React.FC<QuickCharacterEntryProps> = ({
  isOpen,
  onClose,
  onComplete,
  playerId,
}) => {
  const [formData, setFormData] = useState<QuickCharacterData>({
    name: '',
    class: '',
    level: 1,
    race: '',
    background: '',
  });
  const [isCreating, setIsCreating] = useState(false);

  const createQuickCharacter = useCharacterStore(
    (state) => state.createQuickCharacter,
  );

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.class) {
      return;
    }

    setIsCreating(true);

    try {
      const characterId = await createQuickCharacter(formData, playerId);
      onComplete(characterId);
      handleClose();
    } catch (error) {
      console.error('Failed to create quick character:', error);
      alert('Failed to create character. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    setFormData({
      name: '',
      class: '',
      level: 1,
      race: '',
      background: '',
    });
    onClose();
  };

  const isValid = formData.name.trim() && formData.class;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div
        className="modal-content quick-entry-modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '500px' }}
      >
        <div className="modal-header">
          <h2>⚡ Quick Character Entry</h2>
          <button className="modal-close" onClick={handleClose}>
            ×
          </button>
        </div>

        <p className="modal-subtitle" style={{ marginBottom: '1.5rem' }}>
          Enter basic info to get started fast. You can import a full character
          JSON later.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="character-name">
              Character Name <span className="required">*</span>
            </label>
            <input
              id="character-name"
              type="text"
              placeholder="e.g., Thorin Oakenshield"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className="glass-input"
              autoFocus
              required
            />
          </div>

          <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label htmlFor="character-class">
                Class <span className="required">*</span>
              </label>
              <select
                id="character-class"
                value={formData.class}
                onChange={(e) =>
                  setFormData({ ...formData, class: e.target.value })
                }
                className="glass-input"
                required
              >
                <option value="">Select class...</option>
                {DND_CLASSES.map((cls) => (
                  <option key={cls} value={cls}>
                    {cls}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="character-level">
                Level <span className="required">*</span>
              </label>
              <input
                id="character-level"
                type="number"
                min="1"
                max="20"
                value={formData.level}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    level: Math.max(1, Math.min(20, parseInt(e.target.value) || 1)),
                  })
                }
                className="glass-input"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="character-race">Race (Optional)</label>
            <input
              id="character-race"
              type="text"
              placeholder="e.g., Dwarf, Human, Elf..."
              value={formData.race}
              onChange={(e) =>
                setFormData({ ...formData, race: e.target.value })
              }
              className="glass-input"
            />
          </div>

          <div className="form-group">
            <label htmlFor="character-background">Background (Optional)</label>
            <input
              id="character-background"
              type="text"
              placeholder="e.g., Folk Hero, Sage..."
              value={formData.background}
              onChange={(e) =>
                setFormData({ ...formData, background: e.target.value })
              }
              className="glass-input"
            />
          </div>

          <div
            className="info-box glass-panel"
            style={{
              padding: '1rem',
              marginTop: '1.5rem',
              marginBottom: '1.5rem',
              background: 'rgba(59, 130, 246, 0.1)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
            }}
          >
            <p style={{ margin: 0, fontSize: '0.9rem' }}>
              💡 <strong>Quick Entry creates a basic placeholder</strong> with
              standard ability scores (10 in all stats). You can import a full
              character JSON later to add complete details, custom stats, and
              equipment.
            </p>
          </div>

          <div className="modal-actions" style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={handleClose}
              className="glass-button secondary"
              disabled={isCreating}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!isValid || isCreating}
              className="glass-button primary"
            >
              {isCreating ? (
                <>
                  <span className="loading-spinner"></span>
                  Creating...
                </>
              ) : (
                <>
                  <span>✨</span>
                  Create & Continue
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
