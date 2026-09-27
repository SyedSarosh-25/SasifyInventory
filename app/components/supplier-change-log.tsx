'use client';
const providers: Record<string,string> = {dodi:'DODI Store',qamify:'Qamify',mke:'MKE Shop',fatbunny:'Fat Bunny Hub',piggyai:'PiggyAi',zoomstore:'Zoom Store'};
const fields: Record<string,string> = {wholesale_price:'Supplier price',currency:'Currency',stock:'Stock',name:'Title',description:'Description',delivery_instruction:'Delivery instructions',product:'Product',availability:'Availability'};
export function SupplierChangeLog({changes=[],status=[]}:{changes?:any[];status?:any[]}) {
 return <section className="admin-panel">
 <div className="panel-heading"><div><span className="admin-eyebrow">Supplier monitoring</span><h2>Supplier catalog changes</h2></div></div>
 <p>Selling prices stay unchanged. Checks run daily and when you select Sync providers. Elite Tools is excluded.</p>
 <div style={{display:'grid',gap:8}}>{status.map(item => <span key={item.provider_id}>{providers[item.provider_id] || item.provider_id}: {item.succeeded ? 'Updated' : 'Sync failed — previous catalog retained'} · {new Date(item.checked_at).toLocaleString('en-PK')}</span>)}</div>
 <div style={{overflowX:'auto',marginTop:16}}><table style={{width:'100%',textAlign:'left'}}><thead><tr><th>When</th><th>Supplier</th><th>Product</th><th>Change</th><th>Previous</th><th>New</th></tr></thead><tbody>
 {changes.flatMap(item => (item.changes || []).map((change:any,index:number) => <tr key={`${item.id}-${index}`}><td>{new Date(item.created_at).toLocaleString('en-PK')}</td><td>{providers[item.provider_id] || item.provider_id}</td><td>{item.product_name}</td><td>{fields[change.field] || change.field}</td><td>{['description','delivery_instruction'].includes(change.field) ? 'Previous copy' : String(change.before ?? '—')}</td><td>{['description','delivery_instruction'].includes(change.field) ? 'Copy updated' : String(change.after ?? '—')}</td></tr>))}
 {!changes.length && <tr><td colSpan={6}>No changes recorded yet. The first successful check establishes a baseline.</td></tr>}
 </tbody></table></div></section>;
}
