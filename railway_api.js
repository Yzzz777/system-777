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

async function waitForDeploy(deplId, maxWaitMs = 300000) {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    const r = await rq(`{ deployments(input: { projectId: "${PROJECT_ID}", serviceId: "${SERVICE_ID}" }) { edges { node { id status url meta } } } }`);
    const d = r.data?.deployments?.edges?.find(e => e.node.id === deplId)?.node;
    if (!d) { console.log('Deployment not found yet...'); await new Promise(r => setTimeout(r, 5000)); continue; }
    console.log(`[${new Date().toLocaleTimeString()}] ${d.status} — commit: ${d.meta?.commitHash?.substring(0,8)}`);
    if (d.status === 'SUCCESS') { console.log('\n✅ BOT ONLINE:', d.url || 'bot-production-b02b.up.railway.app'); return true; }
    if (d.status === 'FAILED' || d.status === 'CRASHED') {
      const logs = await rq(`{ buildLogs(deploymentId: "${deplId}") { message severity } }`);
      const msgs = logs.data?.buildLogs || [];
      const errors = msgs.filter(m => m.severity === 'error' || m.message.includes('error') || m.message.includes('Error'));
      console.log('\n❌ FALLÓ. Errores:');
      errors.slice(-10).forEach(m => console.log(m.message));
      return false;
    }
    await new Promise(r => setTimeout(r, 10000));
  }
}

async function main() {
  const r = await rq(`mutation { serviceInstanceRedeploy(environmentId: "${ENV_ID}", serviceId: "${SERVICE_ID}") }`);
  console.log('Deploy triggered:', r.data?.serviceInstanceRedeploy);
  await new Promise(r => setTimeout(r, 3000));
  const deploys = await rq(`{ deployments(input: { projectId: "${PROJECT_ID}", serviceId: "${SERVICE_ID}" }) { edges { node { id status createdAt meta } } } }`);
  const latest = deploys.data?.deployments?.edges?.[0]?.node;
  console.log('New deploy ID:', latest?.id, '| commit:', latest?.meta?.commitHash?.substring(0,8));
  await waitForDeploy(latest?.id);
}

main().catch(console.error);
