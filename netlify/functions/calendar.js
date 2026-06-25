const { createSign } = require('crypto');

async function getAccessToken(clientEmail, privateKey) {
  // Fix private key formatting - handle both \n strings and actual newlines
  const formattedKey = privateKey
    .replace(/\\n/g, '\n')
    .replace(/\n\n/g, '\n')
    .trim();

  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const claim = Buffer.from(JSON.stringify({
    iss: clientEmail,
    scope: 'https://www.googleapis.com/auth/calendar.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  })).toString('base64url');

  const signingInput = `${header}.${claim}`;

  try {
    const sign = createSign('RSA-SHA256');
    sign.update(signingInput);
    const signature = sign.sign(formattedKey, 'base64url');
    const jwt = `${signingInput}.${signature}`;

    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
    });
    const data = await res.json();
    if (!data.access_token) throw new Error(JSON.stringify(data));
    return data.access_token;
  } catch (err) {
    throw new Error('JWT signing failed: ' + err.message);
  }
}

exports.handler = async function(event) {
  const clientEmail = process.env.GCAL_CLIENT_EMAIL;
  const privateKey = process.env.GCAL_PRIVATE_KEY;
  const calendarId = process.env.GCAL_CALENDAR_ID || 'max@matteprojects.com';
  const tz = 'America/New_York';

  if (!clientEmail || !privateKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Missing GCAL_CLIENT_EMAIL or GCAL_PRIVATE_KEY env vars' })
    };
  }

  try {
    const accessToken = await getAccessToken(clientEmail, privateKey);

    const now = new Date();
    const start = new Date(now); start.setHours(0,0,0,0);
    const end = new Date(now); end.setHours(23,59,59,999);

    const calId = encodeURIComponent(calendarId);
    const url = `https://www.googleapis.com/calendar/v3/calendars/${calId}/events` +
      `?timeMin=${start.toISOString()}` +
      `&timeMax=${end.toISOString()}` +
      `&singleEvents=true` +
      `&orderBy=startTime` +
      `&timeZone=${encodeURIComponent(tz)}` +
      `&maxResults=20`;

    const res = await fetch(url, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    const data = await res.json();

    if (!data.items) {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ debug: data, events: [] })
      };
    }

    const SKIP = ['hard block','block - no meetings','please reach out','out of office','focus time'];
    const shouldSkip = t => SKIP.some(k => t.toLowerCase().includes(k));

    const fmt = dt => {
      if (!dt) return null;
      return new Date(dt).toLocaleTimeString('en-US', {
        hour: '2-digit', minute: '2-digit', hour12: false, timeZone: tz
      });
    };

    const events = data.items
      .filter(ev => ev.start && ev.start.dateTime && !shouldSkip(ev.summary || ''))
      .map(ev => ({
        title: ev.summary || '(no title)',
        start: fmt(ev.start.dateTime),
        end: fmt(ev.end && ev.end.dateTime),
        location: ev.location ? ev.location.split(';')[0].trim().slice(0, 40) : null,
        attendees: Array.isArray(ev.attendees) ? ev.attendees.filter(a => !a.resource).length : null,
      }));

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify(events),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: err.message })
    };
  }
};
