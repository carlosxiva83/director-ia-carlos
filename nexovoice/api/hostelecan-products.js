export default async function handler(req,res){
  if(req.method!=='GET') return res.status(405).json({error:'Method not allowed'});
  const q=String(req.query.q||'').trim();
  const approx=Number(req.query.price||0)||null;
  if(!q) return res.status(400).json({error:'Falta q'});
  try{
    const r=await fetch('https://hostelecan.com/wp-json/wc/store/v1/products?search='+encodeURIComponent(q)+'&per_page=100');
    if(!r.ok) throw new Error('catalog '+r.status);
    const rows=await r.json();
    let products=(Array.isArray(rows)?rows:[]).map(p=>{
      const minor=p.prices?.currency_minor_unit??2;
      const raw=p.prices?.price;
      const numeric=raw===null||raw===undefined?null:Number(raw)/(10**minor);
      return {id:p.id,name:p.name,sku:p.sku||null,price:numeric,currency:p.prices?.currency_code||'EUR',in_stock:typeof p.is_in_stock==='boolean'?p.is_in_stock:null,permalink:p.permalink||null};
    });
    if(approx) products.sort((a,b)=>Math.abs((a.price??1e9)-approx)-Math.abs((b.price??1e9)-approx));
    products=products.slice(0,8);
    return res.status(200).json({query:q,approx_price:approx,products,note:'in_stock es el estado público de la tienda web y no confirma por sí solo una unidad física en almacén.'});
  }catch(e){return res.status(502).json({error:'No se pudo consultar el catálogo público de Hostelecan.'});}
}