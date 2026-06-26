const User = require('../models/User');
const AppError = require('./AppError');

async function getOrRefreshAccessToken(user) {
  if (!user.googleTokens || !user.googleTokens.refreshToken) {
    throw new AppError('Google Calendar account is not connected.', 400);
  }

  const expiry = user.googleTokens.expiryDate;
  if (user.googleTokens.accessToken && expiry && new Date(expiry).getTime() > Date.now() + 60000) {
    return user.googleTokens.accessToken;
  }

  // Handle mock mode
  if (user.googleTokens.refreshToken === 'mock_refresh_token') {
    user.googleTokens.accessToken = 'mock_access_token';
    user.googleTokens.expiryDate = new Date(Date.now() + 3600 * 1000);
    await user.save();
    return 'mock_access_token';
  }

  try {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        refresh_token: user.googleTokens.refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`Google refresh failed: ${errBody}`);
    }

    const data = await res.json();
    user.googleTokens.accessToken = data.access_token;
    if (data.expires_in) {
      user.googleTokens.expiryDate = new Date(Date.now() + data.expires_in * 1000);
    }
    await user.save();
    return data.access_token;
  } catch (error) {
    console.error('Failed to refresh Google token:', error);
    throw new AppError('Google session expired. Please reconnect Google Calendar.', 401);
  }
}

async function createMeetRoom(session, instructorEmail) {
  // If credentials are not set, fallback to Mock Meet Room URL
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    const letters = 'abcdefghijklmnopqrstuvwxyz';
    const part1 = Array.from({length: 3}, () => letters[Math.floor(Math.random() * letters.length)]).join('');
    const part2 = Array.from({length: 4}, () => letters[Math.floor(Math.random() * letters.length)]).join('');
    const part3 = Array.from({length: 3}, () => letters[Math.floor(Math.random() * letters.length)]).join('');
    return `https://meet.google.com/${part1}-${part2}-${part3}`;
  }

  const adminEmail = process.env.GOOGLE_ADMIN_EMAIL;
  let tokenUser = null;

  if (adminEmail) {
    tokenUser = await User.findOne({ email: adminEmail.toLowerCase() })
      .select('+googleTokens.accessToken +googleTokens.refreshToken +googleTokens.expiryDate');
  }

  // Fallback to instructor's tokens if admin is not connected or not configured
  if (!tokenUser || !tokenUser.googleTokens || !tokenUser.googleTokens.refreshToken) {
    if (instructorEmail) {
      tokenUser = await User.findOne({ email: instructorEmail.toLowerCase() })
        .select('+googleTokens.accessToken +googleTokens.refreshToken +googleTokens.expiryDate');
    }
  }

  if (!tokenUser || !tokenUser.googleTokens || !tokenUser.googleTokens.refreshToken) {
    throw new AppError('Central Google Admin Calendar is not connected. Please connect it in the Admin Dashboard.', 400);
  }

  const accessToken = await getOrRefreshAccessToken(tokenUser);

  if (accessToken === 'mock_access_token') {
    const letters = 'abcdefghijklmnopqrstuvwxyz';
    const part1 = Array.from({length: 3}, () => letters[Math.floor(Math.random() * letters.length)]).join('');
    const part2 = Array.from({length: 4}, () => letters[Math.floor(Math.random() * letters.length)]).join('');
    const part3 = Array.from({length: 3}, () => letters[Math.floor(Math.random() * letters.length)]).join('');
    return `https://meet.google.com/${part1}-${part2}-${part3}`;
  }

  try {
    const startDateTime = new Date(session.scheduledAt || Date.now()).toISOString();
    const duration = session.durationMins || 60;
    const endDateTime = new Date(new Date(session.scheduledAt || Date.now()).getTime() + duration * 60000).toISOString();

    const attendees = [
      { email: adminEmail, responseStatus: 'accepted' }
    ];
    if (instructorEmail) {
      attendees.push({ email: instructorEmail, responseStatus: 'accepted' });
    }

    const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        summary: `GD: ${session.title}`,
        description: session.description || 'PrepLyt Group Discussion Evaluation Session',
        start: { dateTime: startDateTime },
        end: { dateTime: endDateTime },
        attendees,
        conferenceData: {
          createRequest: {
            requestId: `preplyt-gd-${session._id}-${Date.now()}`,
            conferenceSolutionKey: { type: 'hangoutsMeet' },
          },
        },
      }),
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody.error?.message || 'Calendar event creation failed');
    }

    const data = await res.json();
    const entryPoints = data.conferenceData?.entryPoints || [];
    const videoEntryPoint = entryPoints.find((ep) => ep.entryPointType === 'video');
    if (!videoEntryPoint || !videoEntryPoint.uri) {
      throw new Error('No Google Meet URL was generated by Google Calendar API.');
    }

    return videoEntryPoint.uri;
  } catch (error) {
    console.error('Failed to create Google Meet event:', error);
    throw new AppError(`Failed to generate Google Meet: ${error.message}`, 400);
  }
}

module.exports = {
  createMeetRoom,
};
