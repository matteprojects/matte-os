exports.handler = async function(event) {
  const SLACK_TOKEN = process.env.SLACK_TOKEN;
  const SLACK_USER = process.env.SLACK_USER || 'maxpollack';

  try {
    const query = encodeURIComponent('@' + SLACK_USER);
    const url = `https://slack.com/api/search.messages?query=${query}&count=20&sort=timestamp&sort_dir=desc`;

    const res = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${SLACK_TOKEN}`,
        'Content-Type': 'application/json',
      }
    });
    const data = await res.json();

    if (!data.ok || !data.messages || !data.messages.matches) {
      return { statusCode: 200, body: JSON.stringify([]) };
    }

    const tz = 'America/New_York';
    const now = new Date();

    const formatTime = (ts) => {
      if (!ts) return '';
      const d = new Date(parseFloat(ts) * 1000);
      const msgDate = d.toLocaleDateString('en-CA', { timeZone: tz });
      const todayDate = now.toLocaleDateString('en-CA', { timeZone: tz });
      const yesterdayDate = new Date(now - 86400000).toLocaleDateString('en-CA', { timeZone: tz });
      const timeStr = d.toLocaleTimeString('en-US', {
        hour: 'numeric', minute: '2-digit', hour12: true, timeZone: tz
      });
      if (msgDate === todayDate) return `Today ${timeStr}`;
      if (msgDate === yesterdayDate) return `Yesterday ${timeStr}`;
      return d.toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true, timeZone: tz
      });
    };

    const msgs = data.messages.matches
      .filter(m => m.text && m.text.length > 0)
      .map((m, i) => ({
        id: 'slack_' + (m.ts || i).replace('.', '_'),
        from: m.username || m.user || 'Unknown',
        channel: m.channel ? '#' + (m.channel.name || m.channel) : (m.channel_type || 'unknown'),
        channelId: m.channel ? (m.channel.id || m.channel) : null,
        ts: m.ts || null,
        type: (m.channel_type === 'mpim' || m.channel_type === 'im') ? 'dm'
              : m.channel_is_private ? 'private' : 'public',
        text: m.text || '',
        time: formatTime(m.ts),
        url: m.permalink || '',
      }));

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify(msgs),
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
