const NES = [0x7C7C7C,0x0000FC,0x0000BC,0x4428BC,0x940084,0xA80020,0xA81000,0x881400,0x503000,0x007800,0x006800,0x005800,0x004058,0x000000,0,0,0xBCBCBC,0x0078F8,0x0058F8,0x6844FC,0xD800CC,0xE40058,0xF83800,0xE45C10,0xAC7C00,0x00B800,0x00A800,0x00A844,0x008888,0,0,0,0xF8F8F8,0x3CBCFC,0x6888FC,0x9878F8,0xF878F8,0xF85898,0xF87858,0xFCA044,0xF8B800,0xB8F818,0x58D854,0x58F898,0x00E8D8,0x787878,0,0,0xFCFCFC,0xA4E4FC,0xB8B8F8,0xD8B8F8,0xF8B8F8,0xF8A4C0,0xF0D0B0,0xFCE0A8,0xF8D878,0xD8F878,0xB8F8B8,0xB8F8D8,0x00FCFC,0xF8D8F8,0,0].map(n => n ? [n>>16,(n>>8)&255,n&255] : [0,0,0]);
const NES_CHOICES = NES.map((color,index)=>({color,index})).filter(({color,index},position,all)=>{const key=color.join(',');if(key==='0,0,0')return index===0x0F;return all.findIndex(entry=>entry.color.join(',')===key)===position;}).map(entry=>entry.index);
const canvas = document.querySelector('#previewCanvas'), ctx = canvas.getContext('2d', {willReadFrequently:true});
const input = document.querySelector('#imageInput'), empty = document.querySelector('#emptyState'), status = document.querySelector('#statusText'), dot = document.querySelector('.status-dot');
let source, output = { width:256, height:240 }, data = null, palette = [0x0F,0x21,0x30,0x16], activeSwatch = 0;
const swatches = document.querySelector('#paletteSwatches'), picker = document.querySelector('#palettePicker');
function renderPalette() { swatches.innerHTML=''; palette.forEach((i,n) => { const el=document.createElement('button'); el.className=`swatch ${n===activeSwatch?'active':''}`; el.style.background=`rgb(${NES[i].join(',')})`; el.title=`NES color $${i.toString(16).padStart(2,'0')}`; el.onclick=()=>{activeSwatch=n;renderPalette();}; swatches.append(el); }); picker.innerHTML=''; NES.forEach((c,i)=>{if(i%16===13)return;const b=document.createElement('button');b.className=`color-chip ${palette[activeSwatch]===i?'selected':''}`;b.style.background=`rgb(${c.join(',')})`;b.title=`NES color $${i.toString(16).padStart(2,'0')}`;b.onclick=()=>{palette[activeSwatch]=i;renderPalette();if(data)recolorPreview();};picker.append(b);}); }
renderPalette();

function recolorPreview() {
  const rgba=new Uint8ClampedArray(data.indexed.length*4);
  for(let i=0;i<data.indexed.length;i++){const c=NES[palette[data.indexed[i]]];rgba.set([c[0],c[1],c[2],255],i*4);}
  data.rgba=rgba;
  data.palette=new Uint8Array(palette);
  draw(rgba);
  renderUsage();
  status.textContent='Palette updated — slot assignments preserved';
}

function renderUsage() {
  const usage=document.querySelector('#paletteUsage');
  if(!data){usage.innerHTML=['00','01','10','11'].map(slot=>`<span>${slot}</span>`).join('');return;}
  const counts=[0,0,0,0]; for(const slot of data.indexed)counts[slot]++;
  usage.innerHTML=counts.map((count,slot)=>`<span class="${count?'':'unused'}">${slot.toString(2).padStart(2,'0')} · ${Math.round(count/data.indexed.length*100)}%</span>`).join('');
}
renderUsage();

document.querySelectorAll('.size-option').forEach(b => b.onclick = () => { document.querySelector('.size-option.active')?.classList.remove('active'); b.classList.add('active'); setOutput(+b.dataset.width,+b.dataset.height); });
function setOutput(width,height) { output={width,height}; document.querySelector('#canvasWidth').value=width; document.querySelector('#canvasHeight').value=height; const zoom=+document.querySelector('#zoomRange').value; canvas.style.width=`${width*zoom}px`; canvas.style.height=`${height*zoom}px`; if(source) convert(); }
document.querySelectorAll('#canvasWidth,#canvasHeight').forEach(el=>el.onchange=()=>{const w=Math.max(8,Math.min(512,Math.round(+document.querySelector('#canvasWidth').value/8)*8));const h=Math.max(8,Math.min(480,Math.round(+document.querySelector('#canvasHeight').value/8)*8));document.querySelectorAll('.size-option').forEach(b=>b.classList.remove('active'));setOutput(w,h);});
input.onchange = e => load(e.target.files[0]);
document.querySelector('.canvas-wrap').ondragover = e => e.preventDefault();
document.querySelector('.canvas-wrap').ondrop = e => { e.preventDefault(); load(e.dataTransfer.files[0]); };
document.querySelector('#convertButton').onclick = convert;
document.querySelector('#paletteHelpButton').onclick = () => { const help=document.querySelector('#paletteHelp'), open=help.hidden; help.hidden=!open; document.querySelector('#paletteHelpButton').setAttribute('aria-expanded',String(open)); };
document.querySelector('#gridToggle').onchange = () => data && draw(data.rgba);
document.querySelector('#zoomRange').oninput = e => { const zoom=+e.target.value; document.querySelector('#zoomValue').value=`${zoom}×`; canvas.style.width=`${output.width*zoom}px`; canvas.style.height=`${output.height*zoom}px`; };
document.querySelectorAll('#ditherMode').forEach(el => el.onchange = () => source && convert());
document.querySelectorAll('[data-export]').forEach(b => b.onclick = () => download(b.dataset.export));

function load(file) { if (!file || !file.type.startsWith('image/')) return; data=null; const url=URL.createObjectURL(file), img=new Image(); img.onload=()=>{source=img; URL.revokeObjectURL(url); convert();}; img.src=url; }
function nearest(r,g,b, choices) { let best=choices[0], dist=Infinity; for(const i of choices){const c=NES[i],d=(r-c[0])**2+(g-c[1])**2+(b-c[2])**2;if(d<dist){dist=d;best=i;}} return best; }
function paletteFor(pixels) {
  const histogram=new Map();
  for(const px of pixels){const index=nearest(px[0],px[1],px[2],NES_CHOICES);histogram.set(index,(histogram.get(index)||0)+1);}
  const candidates=[...histogram].map(([index,count])=>({index,count})).sort((a,b)=>b.count-a.count);
  const picked=candidates.length?[candidates[0].index]:[0x0F];
  while(picked.length<4&&picked.length<candidates.length){let best=null,bestGain=-1;for(const candidate of candidates){if(picked.includes(candidate.index))continue;let gain=0;for(const sample of candidates){const color=NES[sample.index],current=Math.min(...picked.map(index=>{const c=NES[index];return(color[0]-c[0])**2+(color[1]-c[1])**2+(color[2]-c[2])**2;})),next=(()=>{const c=NES[candidate.index];return(color[0]-c[0])**2+(color[1]-c[1])**2+(color[2]-c[2])**2;})();gain+=(current-Math.min(current,next))*sample.count;}if(gain>bestGain){bestGain=gain;best=candidate.index;}}picked.push(best);}
  while(picked.length<4){const fallback=NES_CHOICES.find(index=>!picked.includes(index))??0x0F;picked.push(fallback);}
  return picked.sort((a,b)=>{const luminance=color=>color[0]*.299+color[1]*.587+color[2]*.114;return luminance(NES[a])-luminance(NES[b]);});
}
function convert() {
  canvas.width=output.width; canvas.height=output.height; const temp=document.createElement('canvas'); temp.width=output.width; temp.height=output.height; const t=temp.getContext('2d');
  const scale=document.querySelector('#fitImage').checked ? Math.max(output.width/source.width,output.height/source.height) : Math.min(output.width/source.width,output.height/source.height); const w=source.width*scale,h=source.height*scale; t.fillStyle='#000';t.fillRect(0,0,temp.width,temp.height);t.drawImage(source,(output.width-w)/2,(output.height-h)/2,w,h);
  const raw=t.getImageData(0,0,output.width,output.height), globalPixels=[]; for(let i=0;i<raw.data.length;i+=4)globalPixels.push([raw.data[i],raw.data[i+1],raw.data[i+2]]);
  if (!data) { palette=paletteFor(globalPixels); renderPalette(); }
  const global=palette, indexed=new Uint8Array(output.width*output.height), chr=[], nam=[], map=new Map();
  for(let ty=0;ty<output.height/8;ty++) for(let tx=0;tx<output.width/8;tx++) { let pixels=[]; for(let y=0;y<8;y++)for(let x=0;x<8;x++){let i=((ty*8+y)*output.width+tx*8+x)*4;pixels.push([raw.data[i],raw.data[i+1],raw.data[i+2]]);} let pal=global, tile=[];
    for(let y=0;y<8;y++)for(let x=0;x<8;x++){let p=pixels[y*8+x], bias=document.querySelector('#ditherMode').value==='bayer'?(((x&1)^((y&1)<<1))-1)*10:0, nes=nearest(p[0]+bias,p[1]+bias,p[2]+bias,pal), color=pal.indexOf(nes); indexed[(ty*8+y)*output.width+tx*8+x]=color; tile.push(color);}
    let key=tile.join(''); if(!map.has(key)){map.set(key,map.size); for(let plane=0;plane<2;plane++)for(let y=0;y<8;y++){let byte=0;for(let x=0;x<8;x++)byte|=((tile[y*8+x]>>plane)&1)<<(7-x);chr.push(byte);}} nam.push(map.get(key));
  }
  let rgba=new Uint8ClampedArray(raw.data.length); for(let i=0;i<indexed.length;i++){let c=NES[global[indexed[i]]];rgba.set([c[0],c[1],c[2],255],i*4);}
  const overflow=map.size>256;
  data={rgba,indexed,chr:new Uint8Array(chr),nam:new Uint8Array(nam),palette:new Uint8Array(global),unique:map.size}; draw(rgba); renderUsage(); empty.hidden=true; document.querySelector('#convertButton').disabled=false; document.querySelectorAll('[data-export]').forEach(b=>b.disabled=overflow); status.textContent=overflow ? map.size+' unique tiles — reduce detail to fit one CHR bank' : 'Converted and ready to export'; dot.classList.toggle('ready',!overflow); document.querySelector('#stats').innerHTML=`<span>${nam.length} tiles</span><span>${map.size} unique tiles</span><span>${chr.length} CHR bytes</span>`;
}
function draw(rgba){const image=new ImageData(rgba,output.width,output.height);ctx.putImageData(image,0,0);if(document.querySelector('#gridToggle').checked){ctx.strokeStyle='#ffffff55';ctx.lineWidth=1;for(let x=0;x<=output.width;x+=8){ctx.beginPath();ctx.moveTo(x+.5,0);ctx.lineTo(x+.5,output.height);ctx.stroke()}for(let y=0;y<=output.height;y+=8){ctx.beginPath();ctx.moveTo(0,y+.5);ctx.lineTo(output.width,y+.5);ctx.stroke()}}}
function download(kind){let bytes, name; if(kind==='chr'){bytes=data.chr;name='tiles.chr'}else if(kind==='nam'){bytes=data.nam;name='nametable.nam'}else if(kind==='pal'){bytes=data.palette;name='palette.pal'}else{bytes=new Uint8Array(data.chr.length+data.nam.length+data.palette.length);bytes.set(data.chr);bytes.set(data.nam,data.chr.length);bytes.set(data.palette,data.chr.length+data.nam.length);name='nes-graphics.bin'} const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([bytes],{type:'application/octet-stream'}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}
