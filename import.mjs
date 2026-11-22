export function paginate(text) {
  const pages = [];
  let remaining = text.trim();
  while (remaining.length > 3600) {
    let boundary = remaining.lastIndexOf('\n', 3600);
    if (boundary < 1800) boundary = remaining.lastIndexOf(' ', 3600);
    if (boundary < 1) boundary = 3600;
    pages.push(remaining.slice(0, boundary));
    remaining = remaining.slice(boundary).trimStart();
  }
  if (remaining) pages.push(remaining);
  return pages;
}

function decodeText(data) {
  const [first, second] = new Uint8Array(data, 0, Math.min(2, data.byteLength));
  if (first === 255 && second === 254) return new TextDecoder('utf-16le').decode(data);
  if (first === 254 && second === 255) return new TextDecoder('utf-16be').decode(data);
  try { return new TextDecoder('utf-8', {fatal:true}).decode(data); }
  catch { return new TextDecoder('euc-kr', {fatal:true}).decode(data); }
}

async function readPdf(data) {
  const pdfjs = await import('./pdf.min.mjs');
  pdfjs.GlobalWorkerOptions.workerSrc = new URL('./pdf.worker.min.mjs', import.meta.url).href;
  const task = pdfjs.getDocument({
    data,
    cMapUrl:new URL('./cmaps/', import.meta.url).href,
    standardFontDataUrl:new URL('./standard_fonts/', import.meta.url).href,
    wasmUrl:new URL('./wasm/', import.meta.url).href
  });
  try {
    const document = await task.promise;
    const pages = [];
    for (let i = 1; i <= document.numPages; i++) {
      const page = await document.getPage(i);
      const content = await page.getTextContent();
      pages.push(content.items.map(item => (item.str ?? '') + (item.hasEOL ? '\n' : item.str ? ' ' : '')).join('').trim());
      page.cleanup();
    }
    return pages;
  } finally { await task.destroy(); }
}

async function readHwpx(data) {
  const zip = await JSZip.loadAsync(data);
  const sections = zip.file(/^Contents\/section\d+\.xml$/i)
    .sort((a,b) => a.name.localeCompare(b.name, undefined, {numeric:true}));
  const parts = [];
  for (const section of sections) {
    const xml = new DOMParser().parseFromString(await section.async('string'), 'application/xml');
    if (xml.querySelector('parsererror')) throw new Error('HWPX 본문을 해석할 수 없습니다.');
    const paragraphs = Array.from(xml.getElementsByTagNameNS('*','p'), paragraph =>
      Array.from(paragraph.getElementsByTagNameNS('*','t'))
        .filter(run => {
          let parent = run.parentElement;
          while (parent && parent.localName !== 'p') parent = parent.parentElement;
          return parent === paragraph;
        })
        .map(run => run.textContent).join(''));
    parts.push(paragraphs.join('\n\n'));
  }
  return paginate(parts.join('\n\n'));
}

// HWP 5 stores its header and compressed section streams in a Compound File.
function compound(data) {
  const view = new DataView(data);
  if (view.getUint32(0) !== 0xd0cf11e0 || view.getUint32(4) !== 0xa1b11ae1) {
    throw new Error('HWP 5.x 문서 또는 HWPX로 저장한 파일을 열어 주세요.');
  }
  const uint = (offset) => view.getUint32(offset,true);
  const shift = view.getUint16(30,true);
  if (![9,12].includes(shift) || view.getUint16(32,true) !== 6) throw new Error('HWP 저장 형식을 읽을 수 없습니다.');
  const size = 2 ** shift;
  const sectorCount = Math.floor(data.byteLength / size) - 1;
  const sector = index => {
    if (index >= sectorCount) throw new Error('HWP 파일의 일부가 손상되었습니다.');
    return new Uint8Array(data,(index+1)*size,size);
  };
  const ids = bytes => new Uint32Array(bytes.buffer,bytes.byteOffset,bytes.byteLength/4);
  const end = 0xfffffffe;
  const fatCount = uint(44);
  if (fatCount > sectorCount) throw new Error('HWP 파일의 일부가 손상되었습니다.');
  const fatIds = Array.from({length:Math.min(109,fatCount)},(_,i)=>uint(76+4*i));
  let difat = uint(68);
  for (let i=0;i<Math.min(uint(72),sectorCount) && fatIds.length<fatCount;i++) {
    const entries = ids(sector(difat));
    fatIds.push(...entries.subarray(0,Math.min(entries.length-1,fatCount-fatIds.length)));
    difat = entries.at(-1);
  }
  const fat = new Uint32Array(fatIds.length * size / 4);
  fatIds.forEach((id,i)=>fat.set(ids(sector(id)),i*size/4));
  function chain(start, table, block, length = Infinity) {
    const chunks = [];
    const seen = new Set();
    let total = 0;
    for (let id=start; id!==end && total<length; id=table[id]) {
      if (id >= table.length || seen.has(id)) throw new Error('HWP 데이터 연결이 손상되었습니다.');
      seen.add(id);
      const chunk = block(id);
      if (!chunk.length) throw new Error('HWP 스트림이 비어 있습니다.');
      chunks.push(chunk);
      total += chunk.length;
    }
    if (length !== Infinity && total < length) throw new Error('HWP 스트림이 잘렸습니다.');
    const output = new Uint8Array(Math.min(total,length));
    let offset = 0;
    for (const chunk of chunks) {
      const partial = chunk.subarray(0,output.length-offset);
      output.set(partial,offset);
      offset += partial.length;
    }
    return output;
  }
  const directory = chain(uint(48),fat,sector);
  const entries = [];
  const utf16 = new TextDecoder('utf-16le');
  for (let offset=0;offset+128<=directory.length;offset+=128) {
    const row = new DataView(directory.buffer,offset,128);
    const length = row.getUint16(64,true);
    entries.push({
      name:length>=2 && length<=64 ? utf16.decode(directory.subarray(offset,offset+length-2)) : '',
      type:row.getUint8(66), left:row.getUint32(68,true), right:row.getUint32(72,true),
      child:row.getUint32(76,true), start:row.getUint32(116,true), length:row.getUint32(120,true)
    });
  }
  const root = entries[0];
  const miniFat = ids(chain(uint(60),fat,sector,uint(64)*size));
  const miniStream = chain(root.start,fat,sector,root.length);
  function children(entry) {
    const found = [];
    const pending = [entry.child];
    const seen = new Set();
    while (pending.length) {
      const id = pending.pop();
      if (!entries[id] || seen.has(id)) continue;
      const child = entries[id];
      seen.add(id);
      found.push(child);
      pending.push(child.left,child.right);
    }
    return found;
  }
  function stream(entry) {
    if (entry.length >= uint(56)) return chain(entry.start,fat,sector,entry.length);
    return chain(entry.start,miniFat,id=>miniStream.subarray(id*64,(id+1)*64),entry.length);
  }
  return {files:children(root),children,stream};
}

function hwpParagraph(bytes) {
  const text = [];
  const view = new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  for (let i=0;i+1<bytes.length;i+=2) {
    const code = view.getUint16(i,true);
    if (code >= 32) text.push(String.fromCharCode(code));
    else if ([10,13,24,30,31,0].includes(code)) {
      if (code === 10) text.push('\n');
      if ([24,30,31].includes(code)) text.push(code === 24 ? '-' : ' ');
    } else {
      if (code === 9) text.push('\t');
      i += 14;
    }
  }
  return text.join('');
}

export function readHwp(data) {
  const {files,children,stream} = compound(data);
  const header = files.find(file=>file.name==='FileHeader');
  if (!header) throw new Error('HWP 문서 헤더를 찾을 수 없습니다.');
  const bytes = stream(header);
  if (!new TextDecoder().decode(bytes.subarray(0,17)).startsWith('HWP Document File')) throw new Error('지원하지 않는 HWP 형식입니다.');
  if (bytes[36] & 6) throw new Error('암호 또는 배포용 설정이 있는 HWP입니다. 일반 HWPX나 텍스트로 저장해 주세요.');
  const body = files.find(file=>file.name==='BodyText');
  if (!body) throw new Error('HWP 본문을 찾을 수 없습니다.');
  const paragraphs = [];
  const sections = children(body).filter(file => /^Section\d+$/.test(file.name))
    .sort((a,b)=>Number(a.name.slice(7))-Number(b.name.slice(7)));
  for (const section of sections) {
    const raw = stream(section);
    const payload = bytes[36] & 1 ? pako.inflateRaw(raw) : raw;
    const records = new DataView(payload.buffer,payload.byteOffset,payload.byteLength);
    for (let pos=0;pos+4<=records.byteLength;) {
      const header = records.getUint32(pos,true);
      pos += 4;
      let size = header >>> 20;
      if (size === 0xfff) { size = records.getUint32(pos,true); pos += 4; }
      if (pos+size>records.byteLength) throw new Error('HWP 본문 데이터가 잘렸습니다.');
      if ((header & 0x3ff) === 67) paragraphs.push(hwpParagraph(payload.subarray(pos,pos+size)));
      pos += size;
    }
  }
  return paginate(paragraphs.join('\n\n'));
}

export async function importFile(file) {
  const kind = file.name.split('.').at(-1).toLowerCase();
  if (!['txt','pdf','hwpx','hwp'].includes(kind)) throw new Error('TXT, PDF, HWP, HWPX 파일을 선택해 주세요.');
  const data = await file.arrayBuffer();
  let pages;
  if (kind === 'txt') pages = paginate(decodeText(data));
  if (kind === 'pdf') pages = await readPdf(data);
  if (kind === 'hwpx') pages = await readHwpx(data);
  if (kind === 'hwp') pages = readHwp(data);
  if (!pages.some(page=>page.trim())) throw new Error(kind === 'pdf' ? '선택할 수 있는 글자가 없는 PDF입니다. OCR 처리한 PDF를 열어 주세요.' : '읽을 수 있는 텍스트가 없습니다.');
  return {id:crypto.randomUUID(),title:file.name.replace(/\.[^.]+$/,''),kind:kind.toUpperCase(),pages,page:0};
}
