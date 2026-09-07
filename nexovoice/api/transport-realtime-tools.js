const SHIPMENTS={
  '581742':{numero:'581742',destinatario:'Ana María Gutiérrez',empresa:'Bar San Francisco',destino:'Valencia',estado:'En reparto',franja:'hoy entre las cuatro y las siete de la tarde',bultos:2,incidencia:null},
  '936105':{numero:'936105',destinatario:'Javier Molina',empresa:'Restaurante La Marina',destino:'Málaga',estado:'En tránsito',franja:'mañana entre las cuatro y las ocho de la tarde',bultos:1,incidencia:null},
  '274869':{numero:'274869',destinatario:'Laura Pérez',empresa:'Cafetería Central',destino:'Sevilla',estado:'En delegación de destino',franja:'mañana entre las nueve de la mañana y las dos de la tarde',bultos:3,incidencia:null}
};

function normalizeNumber(v){
  const d=String(v||'').replace(/\D/g,'');
  if(SHIPMENTS[d]) return d;
  if(d.endsWith('581742')||d==='42'||d==='742'||d==='1742'||d==='81742') return '581742';
  if(d.endsWith('936105')) return '936105';
  if(d.endsWith('274869')) return '274869';
  return d;
}

export default async function handler(req,res){
  if(req.method!=='POST') return res.status(405).json({error:'method_not_allowed'});
  const {name,arguments:args={}}=req.body||{};
  if(name==='consultar_expedicion'){
    const numero=normalizeNumber(args.numero);
    const shipment=SHIPMENTS[numero];
    if(!shipment) return res.status(200).json({ok:false,error:'expedicion_no_encontrada',numero});
    return res.status(200).json({ok:true,expedicion:shipment});
  }
  if(name==='crear_aviso_entrega'){
    const numero=normalizeNumber(args.numero);
    const shipment=SHIPMENTS[numero];
    if(!shipment) return res.status(200).json({ok:false,error:'expedicion_no_encontrada',numero});
    return res.status(200).json({ok:true,numero,motivo:String(args.motivo||'Llamar antes de realizar la entrega'),registrado:true});
  }
  return res.status(400).json({error:'unknown_tool'});
}
