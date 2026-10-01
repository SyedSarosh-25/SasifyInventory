// Node-only local adapter. Production continues to use the Vercel function.
export function devCommerce() {
  return {
    name: 'sasify-dev-commerce',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/api/commerce', async (req, res) => {
        try {
          const url = new URL(
            req.originalUrl || req.url,
            'http://localhost:4173',
          );
          req.query = Object.fromEntries(url.searchParams);
          let body = '';
          for await (const chunk of req) {
            body += chunk;
            if (Buffer.byteLength(body) > 3500000) {
              res.statusCode = 413;
              res.end(JSON.stringify({ error: 'Request too large.' }));
              return;
            }
          }
          req.body = body ? JSON.parse(body) : {};
          const { default: handler } = await import('../commerce/handler.mjs');
          await handler(req, res);
        } catch {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(
            JSON.stringify({
              error:
                'Local commerce service is unavailable. Check server configuration.',
            }),
          );
        }
      });
    },
  };
}
