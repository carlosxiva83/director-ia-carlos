export default async function handler(req,res){
  if(req.method!=='GET') return res.status(405).json({error:'Method not allowed'});
  const q=String(req.query.q||'').trim();
  if(!q) return res.status(400).json({error:'Falta q'});
  try{
    const r=await fetch('https://hostelecan.com/wp-json/wc/store/v1/products?search='+encodeURIComponent(q)+'&per_page=8');
    if(!r.ok) throw new Error('catalog '+r.status);
    const rows=await r.json();
    const products=(Array.isArray(rows)?rows:[]).map(p=>({id:p.id,name:p.name,sku:p.sku||null,price:p.prices?.price||null,currency:p.prices?.currency_code||'EUR',minor_unit:p.prices?.currency_minor_unit??2,in_stock:typeof p.is_in_stock==='boolean'?p.is_in_stock:null,permalink:p.permalink||null}));
    return res.status(200).json({query:q,products,note:'in_stock es el estado público de la tienda web y no confirma una unidad física en almacén.'});
  }catch(e){return res.status(502).json({error:'No se pudo consultar el catálogo público de Hostelecan.'});}
}