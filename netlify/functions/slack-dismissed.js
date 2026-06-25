const { getStore } = require('@netlify/blobs');

function getConfiguredStore(name) {
  return getStore({
    name,
    siteID: process.env.NETLIFY_SITE_ID,
    token: process.env.NETLIFY_TOKEN,
  });
}

exports.handler = async function(event) {
  const store = getConfiguredStore('matte-slack');
  const method = event.httpMethod;
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  try {
    if (method === 'GET') {
      let dismissed = [];
      try { dismissed = await store.get('dismissed', { type: 'json' }) || []; } catch {}
      return { statusCode: 200, headers, body: JSON.stringify(dismissed) };
    }

    if (method === 'POST') {
      const { id } = JSON.parse(event.body);
      let dismissed = [];
      try { dismissed = await store.get('dismissed', { type: 'json' }) || []; } catch {}
      if (!dismissed.includes(id)) {
        dismissed.push(id);
        await store.setJSON('dismissed', dismissed);
      }
      return { statusCode: 200, headers, body: JSON.stringify(dismissed) };
    }

    if (method === 'DELETE') {
      await store.setJSON('dismissed', []);
      return { statusCode: 200, headers, body: JSON.stringify([]) };
    }

    return { statusCode: 405, body: 'Method not allowed' };
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
