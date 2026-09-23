import { randomBytes, timingSafeEqual } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { URL } from 'node:url';

const credentialPath = process.argv[2];
if (!credentialPath) throw new Error('Pass the replacement OAuth client JSON path.');
const json = JSON.parse(await readFile(credentialPath, 'utf8'));
const client = json.installed || json.web;
if (!client?.client_id || !client?.client_secret)
  throw new Error('OAuth client JSON is missing client credentials.');

const project = 'sasify-solutions-updated-build';
const state = randomBytes(32);
const server = createServer();
const port = 8765;
await new Promise((resolve, reject) => {
  server.once('error', reject);
  server.listen(port, '127.0.0.1', resolve);
});
const redirectUri = `http://127.0.0.1:${port}`;
const authUrl = new URL(client.auth_uri || 'https://accounts.google.com/o/oauth2/v2/auth');
authUrl.search = new URLSearchParams({
  client_id: client.client_id,
  redirect_uri: redirectUri,
  response_type: 'code',
  scope: 'https://www.googleapis.com/auth/gmail.send',
  access_type: 'offline',
  prompt: 'consent',
  state: state.toString('hex'),
}).toString();

console.log(`Authorize the Gmail sender in the open browser: ${authUrl}`);
console.log('Waiting for the Google redirect to this computer only...');
const code = await new Promise((resolve, reject) => {
  const timeout = setTimeout(() => reject(new Error('OAuth authorization timed out.')), 5 * 60_000);
  server.on('request', (request, response) => {
    const params = new URL(request.url, redirectUri).searchParams;
    if (new URL(request.url, redirectUri).pathname !== '/' || !params.has('state')) {
      response.writeHead(204);
      response.end();
      return;
    }
    const returnedState = Buffer.from(params.get('state') || '', 'hex');
    if (returnedState.length !== state.length || !timingSafeEqual(returnedState, state)) {
      response.writeHead(400, { 'content-type': 'text/plain; charset=utf-8' });
      response.end('OAuth state mismatch. You can close this tab.');
      clearTimeout(timeout);
      reject(new Error('OAuth state validation failed.'));
      return;
    }
    const error = params.get('error');
    const authorizationCode = params.get('code');
    response.writeHead(error || !authorizationCode ? 400 : 200, {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
      'referrer-policy': 'no-referrer',
    });
    response.end(`<main style="font:16px system-ui;margin:4rem auto;max-width:38rem"><h1>${error || !authorizationCode ? 'Authorization not completed' : 'Google authorization received'}</h1><p>${error || !authorizationCode ? 'Return to the setup window and retry.' : 'You can close this tab and return to the setup window.'}</p></main>`);
    clearTimeout(timeout);
    server.close();
    if (error || !authorizationCode) reject(new Error(`Google authorization failed: ${error || 'missing_code'}`));
    else resolve(authorizationCode);
  });
});

const tokenResponse = await fetch(client.token_uri || 'https://oauth2.googleapis.com/token', {
  method: 'POST',
  headers: { 'content-type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    client_id: client.client_id,
    client_secret: client.client_secret,
    code,
    grant_type: 'authorization_code',
    redirect_uri: redirectUri,
  }),
  signal: AbortSignal.timeout(15000),
});
const token = await tokenResponse.json().catch(() => ({}));
if (!tokenResponse.ok || !token.refresh_token) {
  const safeError = /^[a-z_]{1,40}$/.test(token.error || '') ? token.error : 'token_exchange_failed';
  throw new Error(`Google token exchange failed (${tokenResponse.status}, ${safeError}).`);
}

async function updateProductionSecret(name, value) {
  const args = [
    'vercel', 'env', 'update', name, 'production', '--type', 'secret', '--yes',
    '--project', project,
  ];
  const command = process.platform === 'win32' ? 'cmd.exe' : 'npx';
  const commandArgs = process.platform === 'win32'
    ? ['/d', '/s', '/c', `npx ${args.join(' ')}`]
    : args;
  const child = spawn(command, commandArgs, {
    stdio: ['pipe', 'pipe', 'pipe'],
    windowsHide: true,
  });
  let output = '';
  child.stdout.on('data', (chunk) => (output += chunk));
  child.stderr.on('data', (chunk) => (output += chunk));
  child.stdin.end(`${value}\n`);
  const exitCode = await new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('close', resolve);
  });
  if (exitCode !== 0) {
    const safeOutput = output
      .replaceAll(value, '[redacted]')
      .split(/\r?\n/)
      .filter((line) => /error|updated|added/i.test(line))
      .join(' ')
      .slice(0, 500);
    throw new Error(`Could not update ${name} in Vercel Production (exit ${exitCode}): ${safeOutput}`);
  }
  console.log(`Updated Vercel Production secret: ${name}`);
}

for (const [name, value] of [
  ['GMAIL_OAUTH_CLIENT_ID', client.client_id],
  ['GMAIL_OAUTH_CLIENT_SECRET', client.client_secret],
  ['GMAIL_OAUTH_REFRESH_TOKEN', token.refresh_token],
]) await updateProductionSecret(name, value);

console.log('Replacement Gmail OAuth credentials are configured in Vercel Production.');
