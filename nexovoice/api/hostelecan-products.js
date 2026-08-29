function normalize(value=''){
  return String(value)
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/[×*]/g,'x')
    .replace(/(\d+)\s*[xX]\s*(\d+)/g,'$1x$2')
    .replace(/[^a-z0-9x]+/g,' ')
    .replace(/\s+/g,' ')
    .trim();
}

const STOP=new Set(['de','del','la','las','el','los','un','una','unos','unas','para','por','con','que','hay','tenéis','teneis','tiene','quiero','busco','necesito','linea','línea']);
const DEFAULT_DELIVERY='24-72 horas';

function usefulTokens(q){
  return normalize(q).split(' ').filter(t=>t.length>1&&!STOP.has(t));
}

function productPrice(p){
  const minor=p.prices?.currency_minor_unit??2;
  const raw=p.prices?.price;
  return raw===null||raw===undefined?null:Number(raw)/(10**minor);
}

function mapProduct(p){
  return {
    id:p.id,
    name:p.name,
    sku:p.sku||null,
    price:productPrice(p),
    currency:p.prices?.currency_code||'EUR',
    in_stock:typeof p.is_in_stock==='boolean'?p.is_in_stock:null,
    permalink:p.permalink||null,
    delivery_window:DEFAULT_DELIVERY,
    delivery_source:'Hostelecan: plazo habitual cuando no exista un plazo específico distinto para el producto'
  };
}

function scoreProduct(p,tokens,approx){
  const hay=normalize(`${p.name||''} ${p.sku||''}`);
  let score=0;
  for(const t of tokens){
    if(hay.includes(t)) score+=t.includes('x')&&/\d/.test(t)?8:3;
  }
  if(tokens.length&&tokens.every(t=>hay.includes(t))) score+=12;
  if(approx&&p.price!=null){
    const diff=Math.abs(p.price-approx);
    score+=Math.max(0,8-(diff/Math.max(approx,1))*20);
  }
  return score;
}

async function searchStore(term){
  const url='https://hostelecan.com/wp-json/wc/store/v1/products?search='+encodeURIComponent(term)+'&per_page=100';
  const r=await fetch(url,{headers:{'Accept':'application/json'}});
  if(!r.ok) throw new Error('catalog '+r.status);
  const rows=await r.json();
  return Array.isArray(rows)?rows:[];
}

export default async function handler(req,res){
  if(req.method!=='GET') return res.status(405).json({error:'Method not allowed'});
  const q=String(req.query.q||'').trim();
  const approx=Number(req.query.price||0)||null;
  if(!q) return res.status(400).json({error:'Falta q'});

  try{
    const tokens=usefulTokens(q);
    const attempts=[];
    const add=t=>{t=String(t||'').trim();if(t&&!attempts.includes(t))attempts.push(t)};

    add(q);
    add(tokens.join(' '));

    for(const t of tokens.filter(t=>/\d/.test(t))) add(t);
    for(const t of tokens.filter(t=>!/^\d/.test(t))) add(t);
    if(tokens.length>=2){
      for(let i=0;i<tokens.length;i++){
        for(let j=i+1;j<tokens.length;j++) add(tokens[i]+' '+tokens[j]);
      }
    }

    const found=new Map();
    for(const term of attempts.slice(0,8)){
      let rows=[];
      try{rows=await searchStore(term)}catch(e){if(!found.size) throw e;}
      for(const row of rows) found.set(row.id,row);
      if(found.size>=40) break;
    }

    let products=[...found.values()].map(mapProduct);
    products=products
      .map(p=>({...p,_score:scoreProduct(p,tokens,approx)}))
      .sort((a,b)=>b._score-a._score || (approx?Math.abs((a.price??1e9)-approx)-Math.abs((b.price??1e9)-approx):0))
      .filter((p,i)=>p._score>0 || i<3)
      .slice(0,8)
      .map(({_score,...p})=>p);

    return res.status(200).json({
      query:q,
      approx_price:approx,
      default_delivery_window:DEFAULT_DELIVERY,
      products,
      searched_terms:attempts.slice(0,8),
      note:'El plazo habitual de Hostelecan es 24-72 horas cuando no haya un plazo específico distinto para el producto. in_stock es el estado público de la tienda online.'
    });
  }catch(e){
    return res.status(502).json({error:'No se pudo consultar el catálogo público de Hostelecan.'});
  }
}