const https = require('https');
const RTOKEN = 'bad5c951-d7e6-49b4-859d-a0bb22330186';
const PROJECT_ID = '1ae08693-3c02-4caa-bb2d-6b6bfd3bd091';
const SERVICE_ID = '96541af1-b770-4ff3-bb6d-de9204c6f5dc';
const ENV_ID = 'a88d6e8a-dc2e-4cc1-9450-378013047177';

function rq(query, vars = {}) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ query, variables: vars });
    const req = https.request({
      hostname: 'backboard.railway.app', path: '/graphql/v2', method: 'POST',
      headers: { 'Authorization': `Bearer ${RTOKEN}`, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
    }, res => { let d = ''; res.on('data', c => d += c); res.on('end', () => resolve(JSON.parse(d))); });
    req.on('error', reject); req.write(body); req.end();
  });
}

async function main() {
  // List all deploy/service mutations
  const schema = await rq(`{ __schema { mutationType { fields { name description args { name type { name kind ofType { name kind } } } } } } }`);
  const fields = schema.data.__schema.mutationType.fields;
  const relevant = fields.filter(f => f.name.toLowerCase().includes('deploy') || f.name.toLowerCase().includes('github') || f.name.toLowerCase().includes('trigger'));
  console.log('=== Deploy/GitHub Mutations ===');
  relevant.forEach(f => {
    console.log(`\n${f.name}: ${f.description || ''}`);
    f.args.forEach(a => console.log(`  arg: ${a.name} (${a.type?.ofType?.name || a.type?.name || 'complex'})`));
  });

  // Check service source - is it connected to GitHub?
  console.log('\n=== Service Source Info ===');
  const svc = await rq(`{ service(id: "${SERVICE_ID}") { id name source { image repo } repoTriggers { edges { node { id branch projectId serviceId } } } } }`);
  console.log(JSON.stringify(svc.data, null, 2));
}

main().catch(console.error);
