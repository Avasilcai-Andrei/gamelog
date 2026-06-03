import passport from 'passport'
import { Strategy as GoogleStrategy } from 'passport-google-oauth20'
import { findOrCreateOAuthUser } from '../services/userService.js'

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:4000/api/auth/google/callback',
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const result = await findOrCreateOAuthUser(profile)
          if (!result.ok) return done(null, false, { message: result.error })
          return done(null, result.data)
        } catch (err) {
          return done(err)
        }
      }
    )
  )
}

// Sessions not used — passport is only needed for the OAuth redirect dance.
passport.serializeUser((user, done) => done(null, user.id))
passport.deserializeUser((id, done) => done(null, { id }))

export default passport
