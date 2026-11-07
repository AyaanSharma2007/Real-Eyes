const express = require('express');
const path = require('path');
const dotenv = require('dotenv');
const router = express.Router();

function getSitePassword() {
  try {
    dotenv.config({ path: path.join(__dirname, '../../.env') });
  } catch (_) {}
  return process.env.SITE_PASSWORD ? process.env.SITE_PASSWORD.trim() : '';
}

/**
 * GET /api/auth/status
 * Check if the site requires a password
 */
router.get('/status', (req, res) => {
  const pwd = getSitePassword();
  const isRequired = Boolean(pwd && pwd.length > 0);
  return res.json({ required: isRequired });
});

/**
 * POST /api/auth/verify
 * Verify the site passcode
 */
router.post('/verify', (req, res) => {
  try {
    const sitePassword = getSitePassword();

    // If no password is configured, access is always granted
    if (!sitePassword) {
      return res.json({ success: true });
    }

    const { password } = req.body;
    if (!password || typeof password !== 'string') {
      return res.status(400).json({ error: 'Passcode is required.' });
    }

    if (password.trim() === sitePassword) {
      return res.json({ success: true });
    } else {
      return res.status(401).json({ error: 'Incorrect passcode. Please try again.' });
    }
  } catch (err) {
    console.error('Error verifying site passcode:', err);
    return res.status(500).json({ error: 'Authentication error.' });
  }
});

module.exports = router;
