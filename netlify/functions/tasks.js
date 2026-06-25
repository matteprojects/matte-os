const { getStore } = require('@netlify/blobs');

function getConfiguredStore(name) {
  return getStore({
    name,
    siteID: process.env.NETLIFY_SITE_ID,
    token: process.env.NETLIFY_TOKEN,
  });
}

exports.handler = async function(event) {
  const store = getConfiguredStore('matte-tasks');
  const method = event.httpMethod;
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  try {
    if (method === 'GET') {
      const { blobs } = await store.list();
      const tasks = await Promise.all(
        blobs.map(async ({ key }) => {
          try { return await store.get(key, { type: 'json' }); } catch { return null; }
        })
      );
      const valid = tasks.filter(Boolean).sort((a, b) => (a.created || 0) - (b.created || 0));
      return { statusCode: 200, headers, body: JSON.stringify(valid) };
    }

    if (method === 'POST') {
      const task = JSON.parse(event.body);
      await store.setJSON(task.id, task);
      return { statusCode: 200, headers, body: JSON.stringify(task) };
    }

    if (method === 'PATCH') {
      const { id, fields } = JSON.parse(event.body);
      let existing = {};
      try { existing = await store.get(id, { type: 'json' }) || {}; } catch {}
      const updated = { ...existing, ...fields };
      await store.setJSON(id, updated);
      return { statusCode: 200, headers, body: JSON.stringify(updated) };
    }

    if (method === 'DELETE') {
      const { id } = JSON.parse(event.body);
      await store.delete(id);
      return { statusCode: 200, headers, body: JSON.stringify({ deleted: id }) };
    }

    return { statusCode: 405, body: 'Method not allowed' };
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
