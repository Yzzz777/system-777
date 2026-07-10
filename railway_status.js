const https = require('https');
const RTOKEN = 'bad5c951-d7e6-49b4-859d-a0bb22330186';
const PROJECT_ID = '1ae08693-3c02-4caa-bb2d-6b6bfd3bd091';
const SERVICE_ID = '96541af1-b770-4ff3-bb6d-de9204c6f5dc';

function rq(query) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ query });
    const req = https.request({
      hostname: 'backboard.railway.app', path: '/graphql/v2', method: 'POST',
      headers: { 'Authorization': `Bearer ${RTOKEN}`, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
    }, res => { let d = ''; res.on('data', c => d += c); res.on('end', () => resolve(JSON.parse(d))); });
    req.on('error', reject); req.write(body); req.end();
  });
}

rq(`{ deployments(input: { projectId: "${PROJECT_ID}", serviceId: "${SERVICE_ID}" }) { edges { node { id status createdAt meta url } } } }`).then(r => {
  const deploys = r.data.deployments.edges.slice(0, 3);
  deploys.forEach(e => {
    const n = e.node;
    console.log(n.status, '|', n.meta?.commitHash?.substring(0, 8), '|', new Date(n.createdAt).toLocaleTimeString(), '|', n.url || '');
  });
}).catch(console.error);
