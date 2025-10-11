/**
 * Welcome Page Component
 *
 * Simple, beautiful welcome page with background image where users
 * enter their name, select their role (Player/DM), and begin their adventure.
 */

import React, { useState, useMemo } from 'react';
import { useGameStore } from '@/stores/gameStore';
import { NexusLogo } from './Assets';
import { useAssetExists } from '@/utils/assets';
import DnDTeamBackground from '@/assets/DnDTeamPosing.png';

export const WelcomePage: React.FC = () => {
  const { setUser, startPreparation } = useGameStore();
  const [playerName, setPlayerName] = useState('');
  const [selectedRole, setSelectedRole] = useState<'player' | 'host' | null>(
    null,
  );
  const [error, setError] = useState('');
  const hasCustomLogo = useAssetExists('/assets/logos/nexus-logo.svg');

  const particles = useMemo(() => {
    return Array.from({ length: 15 }).map((_, i) => ({
      id: i,
      style: {
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        animationDelay: `${Math.random() * 4}s`,
        animationDuration: `${4 + Math.random() * 4}s`,
      },
    }));
  }, []);

  const handleBeginAdventure = () => {
    if (!playerName.trim()) {
      setError('Please enter your name');
      return;
    }
    if (!selectedRole) {
      setError('Please select your role');
      return;
    }

    setError('');

    // Set user with selected role
    setUser({
      name: playerName.trim(),
      type: selectedRole,
    });

    // If DM, start preparation mode
    if (selectedRole === 'host') {
      startPreparation();
    }

    // GameLayout will handle routing to appropriate page based on role
  };

  return (
    <div className="welcome-page">
      <div className="welcome-background">
        <img src={DnDTeamBackground} alt="D&D Adventure Party" />
        <div className="background-overlay"></div>
        <div className="background-particles">
          {particles.map((p) => (
            <div
              key={p.id}
              className="particle"
              style={p.style as React.CSSProperties}
            ></div>
          ))}
        </div>
      </div>

      <div className="welcome-content">
        <div className="welcome-panel glass-panel">
          {/* Brand Section */}
          <div className="brand-section">
            {hasCustomLogo ? (
              <NexusLogo size="xl" className="welcome-logo" />
            ) : (
              <div className="brand-logo">
                <div className="logo-icon">🎲</div>
                <h1 className="brand-title">Nexus VTT</h1>
              </div>
            )}
            <p className="brand-tagline">Your gateway to epic adventures</p>
          </div>

          {error && (
            <div className="error-message glass-panel error">
              <span className="error-icon">⚠️</span>
              {error}
            </div>
          )}

          {/* Name Input */}
          <div className="form-section">
            <div className="input-group">
              <label htmlFor="adventurerName">Enter Your Name</label>
              <div className="glass-input-wrapper">
                <span className="input-icon">👤</span>
                <input
                  id="adventurerName"
                  type="text"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder="Your adventurer name"
                  className="glass-input"
                />
              </div>
            </div>

            {/* Role Selection */}
            <div className="role-selection">
              <label>Choose Your Role</label>
              <div className="role-cards">
                <div
                  className={`role-card glass-panel ${selectedRole === 'player' ? 'selected' : ''}`}
                  onClick={() => setSelectedRole('player')}
                >
                  <div className="role-icon">⚔️</div>
                  <div className="role-info">
                    <h3>Player</h3>
                    <p>Embark on adventures as a hero</p>
                  </div>
                  <div className="selection-indicator">
                    {selectedRole === 'player' && <span>✓</span>}
                  </div>
                </div>

                <div
                  className={`role-card glass-panel ${selectedRole === 'host' ? 'selected' : ''}`}
                  onClick={() => setSelectedRole('host')}
                >
                  <div className="role-icon">👑</div>
                  <div className="role-info">
                    <h3>Dungeon Master</h3>
                    <p>Guide the story and control the world</p>
                  </div>
                  <div className="selection-indicator">
                    {selectedRole === 'host' && <span>✓</span>}
                  </div>
                </div>
              </div>
            </div>

            {/* Begin Button */}
            <button
              onClick={handleBeginAdventure}
              disabled={!playerName.trim() || !selectedRole}
              className="begin-adventure-btn glass-button primary"
            >
              <span>🚀</span>
              Begin the Adventure
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
