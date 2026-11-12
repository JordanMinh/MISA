document.getElementById('startMigration').addEventListener('click',async()=>{const file=document.getElementById('migrationFile').files[0],status=document.getElementById('migrationStatus'),log=document.getElementById('migrationLog'),btn=document.getElementById('startMigration');if(!file){status.textContent='Choose a CSV or JSON export first.';return;}btn.disabled=true;log.textContent='';try{if(!(await MISA.isAdmin()))throw new Error('Sign in with an Admin account first.');let rows;if(file.name.toLowerCase().endsWith('.json')){const parsed=JSON.parse(await file.text());rows=Array.isArray(parsed)?parsed:(parsed.data||parsed.products||[]);}else rows=parseCSV(await file.text());if(!rows.length)throw new Error('No product rows found in the export.');let done=0;for(const r of rows){const id=String(r.id||'').trim();if(!id)throw new Error('A product row has no id; migration stopped.');const oldImage=r.image_url||r.image||'';let image_url=oldImage;if(oldImage&&/^https?:\/\//i.test(oldImage)&&!oldImage.includes('res.cloudinary.com')){image_url=await MISA.uploadToCloudinary(oldImage);}const created=r.created_at?new Date(r.created_at).toISOString():new Date().toISOString();const payload={name:r.name||'',price:Number(r.price||0),category:MISA.normalizeCategory(r.category),description:r.description||r.desc||'',link:r.link||'',image_url,hidden:r.hidden===true||String(r.hidden).toLowerCase()==='true',created_at:created,updated_at:new Date().toISOString()};await MISA.saveProduct(id,payload);done++;status.textContent=`Migrated ${done}/${rows.length} products`;log.textContent+=`✓ ${payload.name}\n`;}status.textContent=`Completed: ${done} products imported.`;}catch(e){console.error(e);status.textContent='Migration stopped: '+(e.message||e); }finally{btn.disabled=false;}});
function parseCSV(text){
  text=text.replace(/^\uFEFF/,'');
  const rows=[];let row=[],field='',quoted=false;
  for(let i=0;i<text.length;i++){
    const ch=text[i];
    if(ch==='"'&&quoted&&text[i+1]==='"'){field+='"';i++;}
    else if(ch==='"'){quoted=!quoted;}
    else if(ch===','&&!quoted){row.push(field);field='';}
    else if((ch==='\n'||ch==='\r')&&!quoted){if(ch==='\r'&&text[i+1]==='\n')i++;row.push(field);if(row.some(v=>v!==''))rows.push(row);row=[];field='';}
    else field+=ch;
  }
  row.push(field);if(row.some(v=>v!==''))rows.push(row);
  if(rows.length<2)return [];
  const headers=rows.shift().map(h=>h.trim());
  return rows.map(values=>{const obj={};headers.forEach((h,i)=>obj[h]=values[i]??'');return obj;});
}
