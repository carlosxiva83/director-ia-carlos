const MY_VOICES_API='https://api.elevenlabs.io/v2/voices';
const SHARED_VOICES_API='https://api.elevenlabs.io/v1/shared-voices';
const PINNED_SEARCHES=['David Martin','Martin Osborne','Sara Martin'];

function normGender(g){
  const s=String(g||'').trim().toLowerCase();
  if(s==='female'||s==='woman'||s==='femenino'||s==='femenina') return 'female';
  if(s==='male'||s==='man'||s==='masculino'||s==='masculina') return 'male';
  return s;
}
function mapMy(v){return {voice_id:v.voice_id,name:v.name,category:v.category,labels:v.labels||{},description:v.description||'',source:'my_voices',preview_url:v.preview_url||null};}
function mapShared(v){
  const verified=(v.verified_languages||[]).find(x=>String(x.language||'').toLowerCase()==='es')||(v.verified_languages||[])[0]||{};
  return {voice_id:v.voice_id,name:v.name,category:v.category||'community',labels:{gender:normGender(v.gender),age:v.age||'',accent:verified.accent||v.accent||'',language:verified.language||v.language||'',locale:verified.locale||'',description:v.descriptive||'',use_case:v.use_case||''},description:v.description||'',source:'voice_library',preview_url:verified.preview_url||v.preview_url||null,featured:!!v.featured,trending_score:v.usage_character_count_7d||0,public_owner_id:v.public_owner_id||null};
}
async function getJson(url,headers){const r=await fetch(url,{headers});if(!r.ok)return [];const d=await r.json();return d.voices||[];}
export default async function handler(req,res){
  if(req.method!=='GET') return res.status(405).json({error:'method_not_allowed'});
  const key=process.env.ELEVENLABS_API_KEY;if(!key)return res.status(503).json({error:'elevenlabs_not_configured'});
  try{
    const headers={'xi-api-key':key};
    const [mineRaw,trendingRaw,...searched] = await Promise.all([
      getJson(`${MY_VOICES_API}?page_size=100`,headers),
      getJson(`${SHARED_VOICES_API}?page_size=100&language=es&sort=trending`,headers),
      ...PINNED_SEARCHES.map(name=>getJson(`${SHARED_VOICES_API}?page_size=30&search=${encodeURIComponent(name)}`,headers))
    ]);
    const mine=mineRaw.map(mapMy), shared=[...trendingRaw,...searched.flat()].map(mapShared);
    const dedup=new Map();[...mine,...shared].forEach(v=>{if(v.voice_id&&!dedup.has(v.voice_id))dedup.set(v.voice_id,v)});
    const voices=[...dedup.values()];
    res.setHeader('Cache-Control','no-store');
    return res.status(200).json({voices,counts:{my_voices:mine.length,shared_spanish:trendingRaw.length,pinned_results:searched.reduce((n,a)=>n+a.length,0),total:voices.length},pinned_searches:PINNED_SEARCHES});
  }catch(e){console.error('ElevenLabs voices error',e);return res.status(500).json({error:'internal_error'});}
}
