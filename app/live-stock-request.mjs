// Share only a freshly fetched API response across components, never saved stock.
export function createLiveStockRequest(fetcher = (...args) => fetch(...args), now = Date.now) {
 let pending = null, completedAt = 0;
 return async function requestLiveStock() {
  if (!pending || (completedAt && now() - completedAt > 5000)) {
   completedAt = 0;
   pending = (async () => {
    let lastError;
    for(let attempt=0;attempt<2;attempt++) {
     try {
      const response = await fetcher('/api/commerce?action=stock', { cache:'no-store', signal:AbortSignal.timeout(25000) });
      if(!response.ok) throw new Error('Live availability could not be loaded.');
      // Buffer once so each consumer gets an independent, readable response.
      const body = await response.text();
      const data = JSON.parse(body);
      if(!Array.isArray(data.products)) throw new Error('Invalid live stock response.');
      completedAt = now();
      return new Response(body,{status:response.status,headers:response.headers});
     } catch(error) {lastError=error;}
    }
    throw lastError;
   })();
  }
  const current = pending;
  try { return (await current).clone(); }
  catch(error) {if(pending===current) {pending=null;completedAt=0;} throw error;}
 };
}
export const requestLiveStock = createLiveStockRequest();
