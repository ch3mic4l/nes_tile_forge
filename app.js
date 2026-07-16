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


// Tile, sprite, and NES binary editor extension.
(() => {
  const canvasWrap = document.querySelector(".canvas-wrap");
  const toolButtons = [...document.querySelectorAll("[data-tool]")];
  const clearButton = document.querySelector("#clearCanvasButton");
  let activeTool = "pencil";
  let painting = false;
  let paintSlot = 0;
  let lastPixel = null;
  let importedChrTiles = null;
  let importedNam = null;

  function setStatus(message, ready = false) {
    status.textContent = message;
    dot.classList.toggle("ready", ready);
  }

  function applyCanvasDimensions(width, height) {
    output = { width, height };
    document.querySelector("#canvasWidth").value = width;
    document.querySelector("#canvasHeight").value = height;
    canvas.width = width;
    canvas.height = height;
    const zoom = +document.querySelector("#zoomRange").value;
    canvas.style.width = width * zoom + "px";
    canvas.style.height = height * zoom + "px";
  }

  function setEditorZoom(width, height) {
    const zoom = Math.max(1, Math.min(32, Math.floor(256 / Math.max(width, height))));
    const range = document.querySelector("#zoomRange");
    range.value = zoom;
    document.querySelector("#zoomValue").value = zoom + "×";
    canvas.style.width = width * zoom + "px";
    canvas.style.height = height * zoom + "px";
  }

  function rgbaFromIndexed(indexed) {
    const rgba = new Uint8ClampedArray(indexed.length * 4);
    for (let index = 0; index < indexed.length; index++) {
      const color = NES[palette[indexed[index]]];
      rgba.set([color[0], color[1], color[2], 255], index * 4);
    }
    return rgba;
  }

  function encodeTile(tile, chr) {
    for (let plane = 0; plane < 2; plane++) {
      for (let y = 0; y < 8; y++) {
        let byte = 0;
        for (let x = 0; x < 8; x++) {
          byte |= ((tile[y * 8 + x] >> plane) & 1) << (7 - x);
        }
        chr.push(byte);
      }
    }
  }

  function enableEditor() {
    const enabled = Boolean(data);
    canvas.classList.toggle("editable", enabled);
    toolButtons.forEach((button) => { button.disabled = !enabled; });
    clearButton.disabled = !enabled;
  }

  function refreshEditorData(indexed, message) {
    const chr = [];
    const nam = [];
    const uniqueTiles = new Map();
    const tilesWide = output.width / 8;
    const tilesHigh = output.height / 8;
    for (let tileY = 0; tileY < tilesHigh; tileY++) {
      for (let tileX = 0; tileX < tilesWide; tileX++) {
        const tile = [];
        for (let y = 0; y < 8; y++) {
          for (let x = 0; x < 8; x++) {
            tile.push(indexed[(tileY * 8 + y) * output.width + tileX * 8 + x]);
          }
        }
        const key = tile.join("");
        if (!uniqueTiles.has(key)) {
          uniqueTiles.set(key, uniqueTiles.size);
          encodeTile(tile, chr);
        }
        nam.push(uniqueTiles.get(key));
      }
    }
    const rgba = rgbaFromIndexed(indexed);
    const overflow = uniqueTiles.size > 256;
    data = {
      rgba,
      indexed,
      chr: new Uint8Array(chr),
      nam: new Uint8Array(nam),
      palette: new Uint8Array(palette),
      unique: uniqueTiles.size
    };
    draw(rgba);
    renderUsage();
    empty.hidden = true;
    document.querySelector("#convertButton").disabled = !source;
    document.querySelectorAll("[data-export]").forEach((button) => {
      button.disabled = overflow;
    });
    document.querySelector("#stats").innerHTML =
      "<span>" + nam.length + " tiles</span>" +
      "<span>" + uniqueTiles.size + " unique tiles</span>" +
      "<span>" + chr.length + " CHR bytes</span>";
    setStatus(
      overflow ? uniqueTiles.size + " unique tiles — reduce detail to fit one CHR bank" : message,
      !overflow
    );
    enableEditor();
  }

  function resizeEditor(oldIndexed, oldWidth, oldHeight, width, height) {
    const resized = new Uint8Array(width * height);
    const copyWidth = Math.min(oldWidth, width);
    const copyHeight = Math.min(oldHeight, height);
    for (let y = 0; y < copyHeight; y++) {
      resized.set(oldIndexed.subarray(y * oldWidth, y * oldWidth + copyWidth), y * width);
    }
    refreshEditorData(resized, "Canvas resized — existing pixels preserved");
  }

  const strengthInput = document.querySelector("#ditherStrength");
  const strengthOutput = document.querySelector("#ditherStrengthValue");
  const modeInput = document.querySelector("#ditherMode");
  const alphaInput = document.querySelector("#alphaToSlotZero");
  let regeneratePaletteOnConvert = false;
  const BAYER_2 = [[0, 2], [3, 1]];
  const BAYER_4 = [
    [0, 8, 2, 10],
    [12, 4, 14, 6],
    [3, 11, 1, 9],
    [15, 7, 13, 5]
  ];

  function clampByte(value) {
    return Math.max(0, Math.min(255, value));
  }

  function rgbToLab(r, g, b) {
    const linear = [r, g, b].map((value) => {
      const channel = clampByte(value) / 255;
      return channel > 0.04045 ? ((channel + 0.055) / 1.055) ** 2.4 : channel / 12.92;
    });
    const x = (linear[0] * 0.4124 + linear[1] * 0.3576 + linear[2] * 0.1805) / 0.95047;
    const y = linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
    const z = (linear[0] * 0.0193 + linear[1] * 0.1192 + linear[2] * 0.9505) / 1.08883;
    const transform = (value) => value > 216 / 24389
      ? Math.cbrt(value)
      : (24389 / 27 * value + 16) / 116;
    const fx = transform(x);
    const fy = transform(y);
    const fz = transform(z);
    return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
  }

  const NES_LAB = NES.map((color) => rgbToLab(color[0], color[1], color[2]));

  function labDistance(first, second) {
    return (first[0] - second[0]) ** 2 +
      (first[1] - second[1]) ** 2 +
      (first[2] - second[2]) ** 2;
  }

  nearest = function nearestPerceptual(r, g, b, choices) {
    const sample = rgbToLab(r, g, b);
    let best = choices[0];
    let bestDistance = Infinity;
    for (const choice of choices) {
      const distance = labDistance(sample, NES_LAB[choice]);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = choice;
      }
    }
    return best;
  };

  function perceptualPaletteFor(pixels) {
    const histogram = new Map();
    for (const pixel of pixels) {
      const index = nearest(pixel[0], pixel[1], pixel[2], NES_CHOICES);
      histogram.set(index, (histogram.get(index) || 0) + 1);
    }
    const candidates = [...histogram]
      .map(([index, count]) => ({ index, count }))
      .sort((first, second) => second.count - first.count);
    const picked = candidates.length ? [candidates[0].index] : [0x0f];
    while (picked.length < 4 && picked.length < candidates.length) {
      let best = null;
      let bestGain = -1;
      for (const candidate of candidates) {
        if (picked.includes(candidate.index)) continue;
        let gain = 0;
        for (const sample of candidates) {
          const current = Math.min(...picked.map((index) =>
            labDistance(NES_LAB[sample.index], NES_LAB[index])
          ));
          const next = labDistance(NES_LAB[sample.index], NES_LAB[candidate.index]);
          gain += (current - Math.min(current, next)) * sample.count;
        }
        if (gain > bestGain) {
          bestGain = gain;
          best = candidate.index;
        }
      }
      picked.push(best);
    }
    while (picked.length < 4) {
      picked.push(NES_CHOICES.find((index) => !picked.includes(index)) ?? 0x0f);
    }
    return picked.sort((first, second) => NES_LAB[first][0] - NES_LAB[second][0]);
  }

  function orderedBias(mode, x, y, strength) {
    if (mode === "pattern") {
      return ((x + y) % 2 ? 1 : -1) * 32 * strength;
    }
    const matrix = mode === "bayer4" ? BAYER_4 : BAYER_2;
    const size = matrix.length;
    const threshold = (matrix[y % size][x % size] + 0.5) / (size * size) - 0.5;
    return threshold * 64 * strength;
  }

  function quantizeOrdered(raw, mode, strength, alphaToZero) {
    const indexed = new Uint8Array(output.width * output.height);
    for (let y = 0; y < output.height; y++) {
      for (let x = 0; x < output.width; x++) {
        const pixelIndex = y * output.width + x;
        const rawIndex = pixelIndex * 4;
        if (alphaToZero && raw.data[rawIndex + 3] < 128) {
          indexed[pixelIndex] = 0;
          continue;
        }
        const bias = mode === "none" ? 0 : orderedBias(mode, x, y, strength);
        const color = nearest(
          raw.data[rawIndex] + bias,
          raw.data[rawIndex + 1] + bias,
          raw.data[rawIndex + 2] + bias,
          palette
        );
        indexed[pixelIndex] = palette.indexOf(color);
      }
    }
    return indexed;
  }

  function quantizeDiffusion(raw, mode, strength, alphaToZero) {
    const length = output.width * output.height;
    const red = new Float32Array(length);
    const green = new Float32Array(length);
    const blue = new Float32Array(length);
    const indexed = new Uint8Array(length);
    for (let index = 0; index < length; index++) {
      red[index] = raw.data[index * 4];
      green[index] = raw.data[index * 4 + 1];
      blue[index] = raw.data[index * 4 + 2];
    }
    const diffusion = mode === "floyd"
      ? [[1, 0, 7 / 16], [-1, 1, 3 / 16], [0, 1, 5 / 16], [1, 1, 1 / 16]]
      : [[1, 0, 1 / 8], [2, 0, 1 / 8], [-1, 1, 1 / 8], [0, 1, 1 / 8], [1, 1, 1 / 8], [0, 2, 1 / 8]];

    for (let y = 0; y < output.height; y++) {
      for (let x = 0; x < output.width; x++) {
        const index = y * output.width + x;
        if (alphaToZero && raw.data[index * 4 + 3] < 128) {
          indexed[index] = 0;
          continue;
        }
        const r = clampByte(red[index]);
        const g = clampByte(green[index]);
        const b = clampByte(blue[index]);
        const colorIndex = nearest(r, g, b, palette);
        const slot = palette.indexOf(colorIndex);
        const color = NES[colorIndex];
        indexed[index] = slot;
        const errorR = (r - color[0]) * strength;
        const errorG = (g - color[1]) * strength;
        const errorB = (b - color[2]) * strength;
        for (const [offsetX, offsetY, weight] of diffusion) {
          const targetX = x + offsetX;
          const targetY = y + offsetY;
          if (targetX < 0 || targetX >= output.width || targetY >= output.height) continue;
          const target = targetY * output.width + targetX;
          red[target] += errorR * weight;
          green[target] += errorG * weight;
          blue[target] += errorB * weight;
        }
      }
    }
    return indexed;
  }

  function convertSourceImage() {
    if (!source) return;
    importedChrTiles = null;
    importedNam = null;
    canvas.width = output.width;
    canvas.height = output.height;
    const temp = document.createElement("canvas");
    temp.width = output.width;
    temp.height = output.height;
    const tempContext = temp.getContext("2d");
    const alphaToZero = alphaInput.checked;
    tempContext.clearRect(0, 0, temp.width, temp.height);
    if (!alphaToZero) {
      tempContext.fillStyle = "#000";
      tempContext.fillRect(0, 0, temp.width, temp.height);
    }
    const scale = document.querySelector("#fitImage").checked
      ? Math.max(output.width / source.width, output.height / source.height)
      : Math.min(output.width / source.width, output.height / source.height);
    const width = source.width * scale;
    const height = source.height * scale;
    tempContext.drawImage(source, (output.width - width) / 2, (output.height - height) / 2, width, height);
    const raw = tempContext.getImageData(0, 0, output.width, output.height);
    const pixels = [];
    for (let index = 0; index < raw.data.length; index += 4) {
      if (!alphaToZero || raw.data[index + 3] >= 128) {
        pixels.push([raw.data[index], raw.data[index + 1], raw.data[index + 2]]);
      }
    }
    if (!data || regeneratePaletteOnConvert) {
      palette = perceptualPaletteFor(pixels);
      renderPalette();
    }
    regeneratePaletteOnConvert = false;
    const mode = modeInput.value;
    const strength = +strengthInput.value / 100;
    const indexed = mode === "floyd" || mode === "atkinson"
      ? quantizeDiffusion(raw, mode, strength, alphaToZero)
      : quantizeOrdered(raw, mode, strength, alphaToZero);
    const label = modeInput.selectedOptions[0].textContent;
    refreshEditorData(indexed, label + " conversion ready — perceptual color matching applied");
  }

  convert = convertSourceImage;
  document.querySelector("#convertButton").onclick = () => {
    if (source) {
      regeneratePaletteOnConvert = true;
      convert();
      setStatus("NES palette regenerated and image remapped", true);
    }
  };

  let conversionTimer = null;

  function updateStrengthControl() {
    strengthInput.disabled = modeInput.value === "none";
    strengthOutput.value = strengthInput.value + "%";
  }

  function scheduleConversion() {
    clearTimeout(conversionTimer);
    conversionTimer = setTimeout(() => {
      if (source) convert();
    }, 120);
  }

  modeInput.onchange = () => {
    updateStrengthControl();
    if (source) convert();
  };
  strengthInput.oninput = () => {
    updateStrengthControl();
    scheduleConversion();
  };
  alphaInput.onchange = () => {
    if (source) convert();
  };
  document.querySelector("#fitImage").onchange = () => {
    if (source) convert();
  };
  updateStrengthControl();


  const imageSetOutput = setOutput;
  setOutput = function setEditableOutput(width, height) {
    if (source) {
      imageSetOutput(width, height);
      enableEditor();
      return;
    }
    const oldIndexed = data && data.indexed;
    const oldWidth = output.width;
    const oldHeight = output.height;
    applyCanvasDimensions(width, height);
    if (oldIndexed) {
      importedChrTiles = null;
      importedNam = null;
      resizeEditor(oldIndexed, oldWidth, oldHeight, width, height);
    }
  };

  function createBlank(width, height, label) {
    source = null;
    importedChrTiles = null;
    importedNam = null;
    document.querySelectorAll(".size-option").forEach((button) => button.classList.remove("active"));
    applyCanvasDimensions(width, height);
    setEditorZoom(width, height);
    refreshEditorData(new Uint8Array(width * height), label + " ready — select a color slot and draw");
  }

  document.querySelectorAll("[data-new-width]").forEach((button) => {
    button.onclick = () => createBlank(+button.dataset.newWidth, +button.dataset.newHeight, button.textContent.trim());
  });
  document.querySelector("#newBlankButton").onclick = () => {
    createBlank(output.width, output.height, output.width + "×" + output.height + " canvas");
  };

  toolButtons.forEach((button) => {
    button.onclick = () => {
      activeTool = button.dataset.tool;
      toolButtons.forEach((item) => item.classList.toggle("active", item === button));
      setStatus(button.textContent + " tool selected", true);
    };
  });

  function pixelFromEvent(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(output.width - 1, Math.floor((event.clientX - rect.left) * output.width / rect.width))),
      y: Math.max(0, Math.min(output.height - 1, Math.floor((event.clientY - rect.top) * output.height / rect.height)))
    };
  }

  function paintLine(from, to, slot) {
    let x = from.x;
    let y = from.y;
    const dx = Math.abs(to.x - from.x);
    const sx = from.x < to.x ? 1 : -1;
    const dy = -Math.abs(to.y - from.y);
    const sy = from.y < to.y ? 1 : -1;
    let error = dx + dy;
    while (true) {
      data.indexed[y * output.width + x] = slot;
      if (x === to.x && y === to.y) break;
      const doubled = error * 2;
      if (doubled >= dy) {
        error += dy;
        x += sx;
      }
      if (doubled <= dx) {
        error += dx;
        y += sy;
      }
    }
  }

  function previewPaint() {
    data.rgba = rgbaFromIndexed(data.indexed);
    data.palette = new Uint8Array(palette);
    draw(data.rgba);
    renderUsage();
  }

  function floodFill(startX, startY, replacement) {
    const target = data.indexed[startY * output.width + startX];
    if (target === replacement) return false;
    const queue = new Int32Array(data.indexed.length);
    let head = 0;
    let tail = 0;
    queue[tail++] = startY * output.width + startX;
    data.indexed[startY * output.width + startX] = replacement;
    while (head < tail) {
      const index = queue[head++];
      const x = index % output.width;
      const y = Math.floor(index / output.width);
      const neighbors = [];
      if (x > 0) neighbors.push(index - 1);
      if (x + 1 < output.width) neighbors.push(index + 1);
      if (y > 0) neighbors.push(index - output.width);
      if (y + 1 < output.height) neighbors.push(index + output.width);
      for (const neighbor of neighbors) {
        if (data.indexed[neighbor] === target) {
          data.indexed[neighbor] = replacement;
          queue[tail++] = neighbor;
        }
      }
    }
    return true;
  }

  canvas.onpointerdown = (event) => {
    if (!data || event.button > 2) return;
    event.preventDefault();
    const pixel = pixelFromEvent(event);
    if (activeTool === "eyedropper") {
      activeSwatch = data.indexed[pixel.y * output.width + pixel.x];
      renderPalette();
      setStatus("Selected palette slot " + activeSwatch.toString(2).padStart(2, "0"), true);
      return;
    }
    paintSlot = event.button === 2 ? 0 : activeSwatch;
    if (activeTool === "fill") {
      if (floodFill(pixel.x, pixel.y, paintSlot)) {
        refreshEditorData(data.indexed, "Area filled — exports updated");
      }
      return;
    }
    painting = true;
    lastPixel = pixel;
    paintLine(pixel, pixel, paintSlot);
    previewPaint();
    canvas.setPointerCapture(event.pointerId);
  };

  canvas.onpointermove = (event) => {
    if (!painting || !data) return;
    const pixel = pixelFromEvent(event);
    paintLine(lastPixel, pixel, paintSlot);
    lastPixel = pixel;
    previewPaint();
  };

  function finishPainting() {
    if (!painting) return;
    painting = false;
    lastPixel = null;
    refreshEditorData(data.indexed, "Canvas edited — exports updated");
  }

  canvas.onpointerup = finishPainting;
  canvas.onpointercancel = finishPainting;
  canvas.oncontextmenu = (event) => event.preventDefault();

  clearButton.onclick = () => {
    if (!data) return;
    data.indexed.fill(0);
    refreshEditorData(data.indexed, "Canvas cleared to palette slot 00");
  };

  function decodeChr(bytes) {
    if (!bytes.length || bytes.length % 16 !== 0) {
      throw new Error("CHR files must contain a whole number of 16-byte tiles.");
    }
    const tiles = [];
    for (let offset = 0; offset < bytes.length; offset += 16) {
      const tile = new Uint8Array(64);
      for (let y = 0; y < 8; y++) {
        const low = bytes[offset + y];
        const high = bytes[offset + 8 + y];
        for (let x = 0; x < 8; x++) {
          tile[y * 8 + x] = ((low >> (7 - x)) & 1) | (((high >> (7 - x)) & 1) << 1);
        }
      }
      tiles.push(tile);
    }
    return tiles;
  }

  function tileSheetDimensions(tileCount) {
    let columns = Math.min(16, tileCount);
    let rows = Math.ceil(tileCount / columns);
    if (rows > 60) {
      columns = Math.min(64, Math.ceil(tileCount / 60));
      rows = Math.ceil(tileCount / columns);
    }
    if (columns > 64 || rows > 60) {
      throw new Error("This CHR file is too large for the 512×480 editor canvas.");
    }
    return { columns, rows };
  }

  function renderChrSheet(tiles, fileName) {
    const dimensions = tileSheetDimensions(tiles.length);
    const width = dimensions.columns * 8;
    const height = dimensions.rows * 8;
    const indexed = new Uint8Array(width * height);
    tiles.forEach((tile, tileIndex) => {
      const tileX = tileIndex % dimensions.columns;
      const tileY = Math.floor(tileIndex / dimensions.columns);
      for (let y = 0; y < 8; y++) {
        for (let x = 0; x < 8; x++) {
          indexed[(tileY * 8 + y) * width + tileX * 8 + x] = tile[y * 8 + x];
        }
      }
    });
    applyCanvasDimensions(width, height);
    setEditorZoom(width, height);
    refreshEditorData(indexed, fileName + " imported as " + tiles.length + " editable tiles");
  }

  function inferNamDimensions(length) {
    const currentTiles = output.width / 8 * (output.height / 8);
    if (length === currentTiles) {
      return { columns: output.width / 8, rows: output.height / 8 };
    }
    if (length === 960) return { columns: 32, rows: 30 };
    if (length === 896) return { columns: 32, rows: 28 };
    if (length % 32 === 0 && length / 32 <= 60) {
      return { columns: 32, rows: length / 32 };
    }
    let best = null;
    for (let columns = 1; columns <= 64; columns++) {
      if (length % columns !== 0) continue;
      const rows = length / columns;
      if (rows > 60) continue;
      const score = Math.abs(columns / rows - 4 / 3);
      if (!best || score < best.score) best = { columns, rows, score };
    }
    if (!best) throw new Error("NAM dimensions exceed the 512×480 editor canvas.");
    return { columns: best.columns, rows: best.rows };
  }

  function renderNamMap(nam, tiles) {
    const width = nam.columns * 8;
    const height = nam.rows * 8;
    const indexed = new Uint8Array(width * height);
    let missingTiles = 0;
    nam.indices.forEach((tileIndex, mapIndex) => {
      const tile = tiles[tileIndex];
      if (!tile) {
        missingTiles++;
        return;
      }
      const tileX = mapIndex % nam.columns;
      const tileY = Math.floor(mapIndex / nam.columns);
      for (let y = 0; y < 8; y++) {
        for (let x = 0; x < 8; x++) {
          indexed[(tileY * 8 + y) * width + tileX * 8 + x] = tile[y * 8 + x];
        }
      }
    });
    applyCanvasDimensions(width, height);
    setEditorZoom(width, height);
    let message = nam.fileName + " mapped with " + tiles.length + " CHR tiles";
    if (nam.ignoredAttributes) message += " — 64 attribute bytes ignored";
    if (missingTiles) message += " — " + missingTiles + " missing tile references shown as slot 00";
    refreshEditorData(indexed, message);
  }

  async function importChr(file) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    importedChrTiles = decodeChr(bytes);
    source = null;
    if (importedNam) renderNamMap(importedNam, importedChrTiles);
    else renderChrSheet(importedChrTiles, file.name);
  }

  async function importNamFile(file) {
    let bytes = new Uint8Array(await file.arrayBuffer());
    if (!bytes.length) throw new Error("NAM file is empty.");
    let ignoredAttributes = false;
    if (bytes.length === 1024) {
      bytes = bytes.slice(0, 960);
      ignoredAttributes = true;
    }
    const dimensions = inferNamDimensions(bytes.length);
    importedNam = {
      indices: bytes,
      columns: dimensions.columns,
      rows: dimensions.rows,
      fileName: file.name,
      ignoredAttributes
    };
    source = null;
    if (!importedChrTiles && data && data.chr.length) {
      importedChrTiles = decodeChr(data.chr);
    }
    if (importedChrTiles) {
      renderNamMap(importedNam, importedChrTiles);
    } else {
      setStatus(file.name + " loaded — import its CHR file to reconstruct the canvas");
    }
  }

  async function importPal(file) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (bytes.length < 4) throw new Error("PAL files must contain at least four color bytes.");
    palette = Array.from(bytes.slice(0, 4), (value) => value & 0x3f);
    renderPalette();
    if (data) {
      recolorPreview();
      data.palette = new Uint8Array(palette);
      setStatus(file.name + " imported — first four palette colors applied", true);
    } else {
      setStatus(file.name + " imported — create or import graphics to use it");
    }
  }

  async function handleBinaryFile(file, kind) {
    try {
      if (kind === "chr") await importChr(file);
      else if (kind === "nam") await importNamFile(file);
      else if (kind === "pal") await importPal(file);
    } catch (error) {
      setStatus(error.message);
    }
  }

  [["#chrInput", "chr"], ["#namInput", "nam"], ["#palInput", "pal"]].forEach(([selector, kind]) => {
    const fileInput = document.querySelector(selector);
    fileInput.onchange = async () => {
      const file = fileInput.files[0];
      if (file) await handleBinaryFile(file, kind);
      fileInput.value = "";
    };
  });

  canvasWrap.ondragover = (event) => event.preventDefault();
  canvasWrap.ondrop = (event) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (!file) return;
    const extension = (file.name.match(/\.([^.]+)$/) || [])[1];
    const kind = extension && extension.toLowerCase();
    if (file.type.startsWith("image/")) {
      load(file);
    } else if (["chr", "nam", "pal"].includes(kind)) {
      handleBinaryFile(file, kind);
    } else {
      setStatus("Choose an image, CHR, NAM, or PAL file.");
    }
  };

  enableEditor();
})();


document.querySelector("#processingHelpButton").onclick = () => {
  const help = document.querySelector("#processingHelp");
  const open = help.hidden;
  help.hidden = !open;
  document.querySelector("#processingHelpButton").setAttribute("aria-expanded", String(open));
};
