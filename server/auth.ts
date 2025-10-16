import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as DiscordStrategy } from 'passport-discord';
import { createDatabaseService } from './database';

/**
 * Represents a user object stored in session
 * @interface SessionUser
 */
interface SessionUser {
  /** Unique user identifier (UUID) */
  id: string;
  /** User's email address */
  email: string | null;
  /** User's display name */
  name: string;
  /** URL to user's avatar */
  avatarUrl: string | null;
  /** OAuth provider used */
  provider: string;
}

// Initialize database service for auth operations
const db = createDatabaseService();

/**
 * Serializes user to session
 * Only stores user ID in session to minimize session data size
 * @param {Express.User} user - User object to serialize
 * @param {Function} done - Callback function (error, userId)
 */
passport.serializeUser((user: Express.User, done) => {
  // Store only the user ID in the session
  done(null, (user as SessionUser).id);
});

/**
 * Deserializes user from session
 * Fetches full user object from database using stored user ID
 * @param {string} id - User ID from session
 * @param {Function} done - Callback function (error, user)
 */
passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await db.getUserById(id);

    if (!user) {
      // User not found in database (possibly deleted)
      return done(new Error('User not found'), null);
    }

    // Return user object to be attached to req.user
    done(null, user);
  } catch (err) {
    console.error('Error deserializing user:', err);
    done(err, null);
  }
});

/**
 * Validates required environment variables for OAuth
 * @throws {Error} If required environment variables are missing
 */
function validateOAuthConfig(): void {
  const requiredEnvVars = [
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'DISCORD_CLIENT_ID',
    'DISCORD_CLIENT_SECRET',
  ];

  const missing = requiredEnvVars.filter((varName) => !process.env[varName]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required OAuth environment variables: ${missing.join(', ')}`
    );
  }
}

// Validate OAuth configuration on module load
if (process.env.NODE_ENV === 'production') {
  validateOAuthConfig();
} else {
  // In development, just warn about missing config
  const requiredEnvVars = [
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'DISCORD_CLIENT_ID',
    'DISCORD_CLIENT_SECRET',
  ];

  const missing = requiredEnvVars.filter((varName) => !process.env[varName]);

  if (missing.length > 0) {
    console.warn(
      `⚠️ Missing OAuth environment variables: ${missing.join(', ')}`
    );
    console.warn('OAuth login will not work until these are configured');
  }
}

/**
 * Google OAuth 2.0 Strategy Configuration
 * Handles authentication via Google accounts
 */
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID || 'placeholder',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'placeholder',
      callbackURL: '/auth/google/callback',
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Extract user profile data from Google response
        const userProfile = {
          email: profile.emails?.[0]?.value || null,
          name: profile.displayName,
          avatarUrl: profile.photos?.[0]?.value || null,
          provider: 'google' as const,
        };

        // Find existing user or create new one
        const user = await db.findOrCreateUserByOAuth(userProfile);

        console.log(`✅ Google OAuth successful for user: ${user.email}`);

        // Return user object to Passport
        return done(null, user);
      } catch (err) {
        console.error('Google OAuth error:', err);
        return done(err as Error);
      }
    }
  )
);

/**
 * Discord OAuth 2.0 Strategy Configuration
 * Handles authentication via Discord accounts
 */
passport.use(
  new DiscordStrategy(
    {
      clientID: process.env.DISCORD_CLIENT_ID || 'placeholder',
      clientSecret: process.env.DISCORD_CLIENT_SECRET || 'placeholder',
      callbackURL: '/auth/discord/callback',
      scope: ['identify', 'email'],
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Extract user profile data from Discord response
        const userProfile = {
          email: profile.email || null,
          name: profile.username,
          // Construct Discord avatar URL if avatar hash exists
          avatarUrl: profile.avatar
            ? `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png`
            : null,
          provider: 'discord' as const,
        };

        // Find existing user or create new one
        const user = await db.findOrCreateUserByOAuth(userProfile);

        console.log(`✅ Discord OAuth successful for user: ${user.email || user.name}`);

        // Return user object to Passport
        return done(null, user);
      } catch (err) {
        console.error('Discord OAuth error:', err);
        return done(err as Error);
      }
    }
  )
);

/**
 * Export configured passport instance
 * This should be imported and initialized in the Express app
 */
export default passport;
