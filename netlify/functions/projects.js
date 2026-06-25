const { getStore } = require('@netlify/blobs');

function getConfiguredStore(name) {
  return getStore({
    name,
    siteID: process.env.NETLIFY_SITE_ID,
    token: process.env.NETLIFY_TOKEN,
  });
}

// Default seed - only used if the projects store is COMPLETELY empty
const SEED_PROJECTS = {
  business: [{id:'b1',name:'Capital Raise Prep'},{id:'b2',name:'Q2 Finance Review'},{id:'b3',name:'Recruiting Pipeline'},{id:'b4',name:'Ops Strategy'}],
  brand: [{id:'br1',name:'Events Calendar'},{id:'br2',name:'Thought Leadership Program'},{id:'br3',name:'Merch Drop'}],
  newbiz: [{id:'nb1',name:'Active Pitches'},{id:'nb2',name:'Outbound Pipeline'}],
  hero: [{id:'h1',name:'ELF x Warner Bros.'},{id:'h2',name:'New Space 2026'},{id:'h3',name:'HERO [OPS]'}],
  client: [{id:'cl1',name:'Apple RFQ — Global Launch 2026'}],
  personal: [{id:'p1',name:'Personal CRM'},{id:'p2',name:'Family'}],
};

exports.handler = async function(event) {
  const store = getConfiguredStore('matte-projects');
  const method = event.httpMethod;
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  try {
    if (method === 'GET') {
      let projects = null;
      try { projects = await store.get('projects', { type: 'json' }); } catch {}
      // Only seed if the store has never been written to
      if (projects === null) {
        await store.setJSON('projects', SEED_PROJECTS);
        projects = SEED_PROJECTS;
      }
      return { statusCode: 200, headers, body: JSON.stringify(projects) };
    }

    // PUT - replace the entire projects object (used when adding a project)
    if (method === 'POST' || method === 'PUT') {
      const projects = JSON.parse(event.body);
      await store.setJSON('projects', projects);
      return { statusCode: 200, headers, body: JSON.stringify(projects) };
    }

    return { statusCode: 405, body: 'Method not allowed' };
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
