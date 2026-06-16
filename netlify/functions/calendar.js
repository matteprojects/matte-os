const { google } = require('googleapis');

exports.handler = async function(event, context) {
  try {
    const auth = new google.auth.JWT(
      process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      null,
      process.env.GOOGLE_PRIVATE_KEY.split('\\n').join('\n'),
      ['https://www.googleapis.com/auth/calendar.readonly']
    );

    const calendar = google.calendar({ version: 'v3', auth });

    const now = new Date();
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: now.toISOString(),
      timeMax: endOfDay.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
    });

    const events = response.data.items.map(ev => ({
      title: ev.summary || '(No title)',
      start: ev.start.dateTime ? new Date(ev.start.dateTime).toLocaleTimeString('en-US', {hour:'numeric',minute:'2-digit'}) : 'All day',
      end: ev.end.dateTime ? new Date(ev.end.dateTime).toLocaleTimeString('en-US', {hour:'numeric',minute:'2-digit'}) : '',
      location: ev.location || null,
      attendees: ev.attendees ? ev.attendees.length : 1,
    }));

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(events),
    };

  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
