import {importFile} from './import.mjs';
import {findTopics} from './learning.mjs';
import {entryGroup, normalizeAnswer, reviewQuestions} from './review.mjs';

const byId = id => document.getElementById(id);
function element(tag,value,style) {
  const node = document.createElement(tag);
  if (value) node.textContent = value;
  if (style) node.className = style;
  return node;
}
function button(label,action,style) {
  const control = element('button',label,style);
  control.addEventListener('click',action);
  return control;
}
const glossary = new Map(Object.entries({
  quiet:'조용한, 고요한', morning:'아침', river:'강', village:'마을', curious:'호기심이 많은',
  narrow:'좁은', path:'길, 오솔길', library:'도서관', shelf:'선반, 책꽂이', beyond:'~ 너머에',
  discover:'발견하다', ordinary:'평범한', remarkable:'주목할 만한, 놀라운', journey:'여행, 여정',
  courage:'용기', lantern:'등불', hesitate:'망설이다', hesitation:'망설임', gather:'모으다, 모이다',
  beneath:'~ 아래에', whisper:'속삭이다', wander:'거닐다, 돌아다니다', steady:'꾸준한, 안정된',
  current:'물살, 흐름', reflect:'반사하다, 곰곰이 생각하다', bridge:'다리', valley:'계곡',
  follow:'따라가다', notice:'알아차리다', promise:'약속', page:'페이지, 쪽', dawn:'새벽',
  open:'열다, 열린', book:'책, 예약하다', light:'빛, 가벼운', travel:'여행하다', letter:'편지, 글자',
  write:'쓰다', keep:'간직하다, 계속하다', carry:'나르다, 지니고 다니다', turn:'돌다, (책장을) 넘기다',
  walk:'걷다', trail:'오솔길, 흔적', cross:'건너다', arrive:'도착하다', early:'일찍, 이른',
  sunlight:'햇빛', enough:'충분한, 충분히', read:'읽다', small:'작은', blue:'파란색, 파란',
  put:'놓다', sentence:'문장', find:'찾다, 발견하다', sound:'소리, ~처럼 들리다', day:'하루, 날',
  window:'창문', still:'여전히, 고요한', story:'이야기', stone:'돌', water:'물',
  look:'보다, 바라보다', something:'무언가', leave:'떠나다, 남기다', return:'돌아오다, 돌려주다',
  learn:'배우다', begin:'시작하다', evening:'저녁', rain:'비', edge:'가장자리', few:'몇몇의, 거의 없는',
  build:'짓다, 만들다', clean:'깨끗한, 청소하다', treat:'다루다, 처리하다', wastewater:'하수, 폐수',
  flow:'흐르다, 유량', reservoir:'저수지', treatment:'처리, 치료', drainage:'배수', sewer:'하수관',
  infiltration:'침투, 침입수', flooding:'침수, 홍수', supply:'공급, 공급하다', pipe:'관, 파이프'
}));
const forms = {followed:'follow',noticed:'notice',opened:'open',carried:'carry',walked:'walk',crossed:'cross',arrived:'arrive',wrote:'write',found:'find',left:'leave',began:'begin',stories:'story',walks:'walk',looked:'look',books:'book',pages:'page',returned:'return',whispered:'whisper',travelled:'travel',turned:'turn'};
const sample = {
  id:'sample', title:'A Lantern by the River', kind:'샘플 문서', page:0,
  pages:[
    'On a quiet morning, Mina followed a narrow path beside the river. She carried a small lantern even though the sunlight was already bright enough to read by. It was a promise to her grandfather, who had once walked this same path every day.\n\nBeneath the stone bridge, the steady current carried a few blue leaves. Mina stopped to look. She had crossed the bridge many times, but today she noticed something remarkable: a letter was tucked beneath a stone at the edge of the water.\n\nShe opened the letter. It held a single sentence: “A curious mind can discover a new journey in an ordinary day.”',
    'Mina put the letter in her book and followed the trail beyond the bridge. When she arrived at the village library, she found a window that looked out over the valley. There was still enough light to read.\n\nShe turned a page and began to write a story of her own.'
  ]
};
const books = [sample];
let book = sample;
let saved;
try { saved = new Map(JSON.parse(localStorage.getItem('folio-vocabulary') || '[]')); }
catch { saved = new Map(); }
let selected = null;
let selectedNode = null;
let tab = 'dictionary';
let font = 22;
let toastTimer;
let importing = false;
let sequence = 0;
const cache = new Map();
const paragraphData = new WeakMap();
const groups = {vocabulary:'내 단어장',grammar:'내 문법'};
const reviewLabels = {...groups,all:'단어장과 문법'};
const reviews = new Map();

function announce(message,sticky=false) {
  const notice=byId('notice');
  clearTimeout(toastTimer);
  notice.hidden=false;
  notice.textContent=message;
  if (!sticky) toastTimer=setTimeout(()=>{notice.hidden=true},4400);
}

function renderBooks() {
  byId('books').replaceChildren(...books.map(item=>{
    const control=button(item.title,()=>{book=item; renderBook();},'book');
    control.setAttribute('aria-current',item.id===book.id);
    return control;
  }));
}

function renderBook() {
  renderBooks();
  byId('title').textContent=book.title;
  byId('kind').textContent=book.kind;
  byId('page').textContent=(book.page+1)+' / '+book.pages.length;
  byId('prev').disabled=book.page===0;
  byId('next').disabled=book.page>=book.pages.length-1;
  const reading=byId('reading');
  reading.replaceChildren();
  for (const paragraph of book.pages[book.page].split(/\n\s*\n/)) {
    const node=element('p');
    node.lang='en';
    const topics=findTopics(paragraph);
    paragraphData.set(node,{paragraph,topics});
    const topicsEndingAt=new Map();
    for (const topic of topics) {
      if (!topicsEndingAt.has(topic.end)) topicsEndingAt.set(topic.end,[]);
      topicsEndingAt.get(topic.end).push(topic);
    }
    let cursor=0;
    for (const match of paragraph.matchAll(/[A-Za-z]+(?:[’'-][A-Za-z]+)*/g)) {
      node.append(paragraph.slice(cursor,match.index));
      const start=match.index;
      const end=start+match[0].length;
      const word=element('button',match[0],'word');
      word.dataset.offset=start;
      word.dataset.length=match[0].length;
      node.append(word);
      for (const topic of topicsEndingAt.get(end) || []) {
        const marker=button('↗',()=>showTopic(topic,paragraph,book.title,marker),'topic-marker');
        marker.setAttribute('aria-label',`${topic.type} 설명: ${topic.excerpt}`);
        marker.title=`${topic.type} · ${topic.excerpt}`;
        marker.lang='ko';
        node.append(marker);
      }
      cursor=end;
    }
    node.append(paragraph.slice(cursor));
    reading.append(node);
  }
  if (!reading.textContent.trim()) reading.textContent='이 페이지에는 추출된 텍스트가 없습니다.';
}

function contextOf(text,start,end) {
  const before=text.slice(0,start);
  const last=Math.max(before.lastIndexOf('. '),before.lastIndexOf('? '),before.lastIndexOf('! '),before.lastIndexOf('\n'));
  const after=text.slice(end).search(/[.!?](?=\s|$)|\n/);
  return text.slice(Math.max(last+1,start-180),after<0 ? end+180 : Math.min(end+after+1,end+180)).trim();
}

function setTab(next) {
  tab=next;
  for (const name of ['dictionary',...Object.keys(groups)]) byId(name).setAttribute('aria-selected',name===next);
  byId('review').setAttribute('aria-pressed',next==='review');
  renderPanel();
}
function focusPanel() {
  if (matchMedia('(max-width:650px)').matches) {
    byId('panel').scrollIntoView({block:'start'});
    byId('dictionary').focus({preventScroll:true});
  }
}

function dictionaryLink(word) {
  const link=element('a','영한사전에서 더 보기');
  link.href='https://en.dict.naver.com/#/search?query='+encodeURIComponent(word);
  link.target='_blank';
  link.rel='noopener noreferrer';
  return link;
}
function selectionKey(value) {
  return value.topic ? `topic:${value.topic.title}` : value.word;
}
function activateNode(node) {
  selectedNode?.classList.remove('active');
  selectedNode=node;
  node?.classList.add('active');
}
function showTopic(topic,paragraph,source,node,moveFocus=true) {
  sequence++;
  activateNode(node);
  selected={word:topic.excerpt,korean:topic.korean,topic,source,
    context:contextOf(paragraph,topic.start,topic.end)};
  setTab('dictionary');
  if (moveFocus) focusPanel();
  else byId('details').querySelector('h2').focus({preventScroll:true});
}
function saveSelection() {
  if (!selected) return;
  const key=selectionKey(selected);
  const removing=saved.has(key);
  const next=new Map(saved);
  if (removing) next.delete(key);
  else {
    const {related,...entry}=selected;
    next.set(key,{...entry,status:''});
  }
  try {
    localStorage.setItem('folio-vocabulary',JSON.stringify([...next]));
    saved=next;
    const group=entryGroup(selected);
    reviews.delete(group);
    reviews.delete('review');
    renderPanel();
    announce(removing ? `${groups[group]}에서 삭제했습니다.` : `${groups[group]}에 저장했습니다.`);
  } catch { announce('브라우저 저장 공간을 사용할 수 없습니다.'); }
}
function startReview(group,entries) {
  const questions=reviewQuestions(entries);
  if (!questions.length) {
    announce('뜻이나 본문 문맥이 있는 항목을 저장하면 복습할 수 있어요.');
    return;
  }
  reviews.set(tab,{group,questions,index:0,score:0,result:null});
  refreshReview();
}
function refreshReview() {
  renderPanel();
  (byId('details').querySelector('input') || byId('details').querySelector('h2'))?.focus({preventScroll:true});
}
function renderReview(details,review,entries) {
  const {group,questions,index,result}=review;
  const heading=element('h2',`${reviewLabels[group]} 복습`,'review-title');
  heading.tabIndex=-1;
  details.append(heading,button(tab==='review'?'복습 범위 선택':'저장 목록',()=>{
    reviews.delete(tab);
    renderPanel();
    byId('details').querySelector('button')?.focus({preventScroll:true});
  }));
  if (index===questions.length) {
    details.append(element('p',`${questions.length}문제 중 ${review.score}문제를 맞혔어요.`,'meaning'),
      button('다시 풀기',()=>startReview(group,entries),'primary'));
    return;
  }
  const question=questions[index];
  details.append(element('p',`${index+1} / ${questions.length} 문제`,'topic-type'),
    element('p',question.instruction),element('p',question.clue,'review-clue'));
  const submit=answer=>{
    if (review.result || !answer.trim()) return;
    const correct=normalizeAnswer(answer)===normalizeAnswer(question.answer);
    review.result={answer,correct};
    if (correct) review.score++;
    refreshReview();
  };
  if (result) {
    const feedback=element('div',null,'review-feedback');
    feedback.setAttribute('role','status');
    feedback.append(element('p',result.correct ? '정답입니다!' : `오답 · ${result.answer}`,'meaning'),
      element('p',`정답 · ${question.answer}`));
    if (question.example) feedback.append(element('p',question.example),element('p',question.translation));
    details.append(feedback,button(index+1===questions.length?'결과 보기':'다음 문제',()=>{
      review.index++;
      review.result=null;
      refreshReview();
    },'primary'));
  } else if (question.options) {
    const options=element('div',null,'review-options');
    for (const option of question.options) options.append(button(option,()=>submit(option)));
    details.append(options);
  } else {
    const form=element('form',null,'review-form');
    const input=element('input');
    input.required=true;
    input.autocomplete='off';
    input.spellcheck=false;
    input.lang='en';
    input.setAttribute('aria-label','영어 답안');
    const check=element('button','정답 확인','primary');
    check.type='submit';
    form.addEventListener('submit',event=>{
      event.preventDefault();
      submit(input.value);
    });
    const first=normalizeAnswer(question.answer)[0];
    form.append(input,check);
    details.append(element('p',`힌트 · 첫 글자 ${first.toUpperCase()}`,'hint review-hint'),form);
  }
}
function renderPanel() {
  const details=byId('details');
  const lists={vocabulary:[],grammar:[]};
  for (const value of saved.values()) lists[entryGroup(value)].push(value);
  byId('count').textContent=lists.vocabulary.length;
  byId('grammar-count').textContent=lists.grammar.length;
  details.replaceChildren();
  if (tab==='review') {
    const review=reviews.get(tab);
    const all=[...lists.vocabulary,...lists.grammar];
    if (review) {
      renderReview(details,review,review.group==='all'?all:lists[review.group]);
      return;
    }
    const heading=element('h2','복습 범위 선택','review-title');
    heading.tabIndex=-1;
    details.append(heading);
    if (!all.length) {
      details.append(element('p','학습 사전에서 단어나 표현, 문법을 저장하면 복습 문제가 만들어져요.'));
      return;
    }
    const options=element('div',null,'review-options');
    for (const [group,entries] of Object.entries({...lists,all})) {
      const control=button(`${reviewLabels[group]} · ${entries.length}개`,()=>startReview(group,entries));
      control.disabled=!entries.length || (group==='all' && (!lists.vocabulary.length || !lists.grammar.length));
      options.append(control);
    }
    details.append(options);
    return;
  }
  if (tab!=='dictionary') {
    const entries=lists[tab].reverse();
    const review=reviews.get(tab);
    if (review) {
      renderReview(details,review,entries);
      return;
    }
    if (entries.length) {
      const group=tab;
      details.append(button('복습 시작',()=>startReview(group,entries),'primary'));
    } else {
      details.append(element('p',tab==='grammar'?'본문에서 문법 설명을 열어 저장해 보세요.':'본문에서 단어나 표현 설명을 열어 저장해 보세요.'));
    }
    for (const value of entries) {
      const row=element('div',null,'entry');
      row.append(button(value.topic?.type==='문법' ? value.topic.title : value.word,()=>{sequence++;activateNode(null);selected={...value};setTab('dictionary');}),element('p',value.korean || value.definitions?.[0]?.definition || value.context));
      details.append(row);
    }
    return;
  }
  if (!selected) {
    details.append(element('p','본문에서 단어를 누르거나 ↗ 표시를 눌러 표현과 문법을 확인해 보세요.'));
    return;
  }
  const title=element('h2',selected.word);
  title.lang='en';
  title.tabIndex=-1;
  const actions=element('div',null,'actions');
  actions.append(button(saved.has(selectionKey(selected))?'★ 저장됨 · 삭제':`☆ ${groups[entryGroup(selected)]}에 저장`,saveSelection));
  if ('speechSynthesis' in window) actions.append(button('발음 듣기',()=>{
    speechSynthesis.cancel();
    const utterance=new SpeechSynthesisUtterance(selected.word);
    utterance.lang='en-US';
    speechSynthesis.speak(utterance);
  }));
  if (matchMedia('(max-width:650px)').matches && selectedNode?.isConnected) actions.append(button('본문으로',()=>{
    selectedNode.scrollIntoView({block:'center'});
    selectedNode.focus({preventScroll:true});
  }));
  if (selected.topic) details.append(element('p',selected.topic.type,'topic-type'));
  details.append(title,actions);
  if (selected.korean) details.append(element('p',selected.korean,'meaning'));
  if (selected.topic) {
    const {title:pattern,explanation,example,translation}=selected.topic;
    if (pattern.toLowerCase()!==selected.word.toLowerCase()) details.append(element('p',pattern,'topic-pattern'));
    const exampleText=element('p',example,'context');
    exampleText.lang='en';
    details.append(element('p',explanation),element('h3','예문'),exampleText,element('p',translation));
  }
  if (selected.phonetic) details.append(element('p',selected.phonetic));
  if (selected.definitions?.length) {
    const list=element('ul');
    list.lang='en';
    for (const meaning of selected.definitions) list.append(element('li',meaning.part+' · '+meaning.definition));
    details.append(list);
  }
  if (selected.status) details.append(element('p',selected.status));
  if (selected.related?.length) {
    const related=element('div',null,'actions');
    for (const {topic,paragraph,source,node} of selected.related) {
      related.append(button(`${topic.type} · ${topic.excerpt}`,()=>showTopic(topic,paragraph,source,node,false)));
    }
    details.append(element('h3','관련 표현과 문법'),related);
  }
  if (selected.context) {
    const quote=element('p',selected.context,'context');
    quote.lang='en';
    if (selected.topic) details.append(element('h3','본문 문맥'));
    details.append(quote,element('small',selected.source));
  }
  if (!selected.topic) details.append(document.createElement('br'),dictionaryLink(selected.word));
}

function candidates(word) {
  return [...new Set([word,forms[word],word.replace(/[’']s$/,''),word.replace(/ies$/,'y'),
    word.replace(/es$/,''),word.replace(/s$/,''),word.replace(/ed$/,''),
    word.replace(/ed$/,'e'),word.replace(/ing$/,''),word.replace(/ing$/,'e')].filter(Boolean))];
}
async function getDefinition(variants) {
  const word=variants[0];
  if (cache.has(word)) return cache.get(word);
  const pending=(async()=>{
    const signal=AbortSignal.timeout(5500);
    for (const term of variants) {
      const response=await fetch('https://api.dictionaryapi.dev/api/v2/entries/en/'+encodeURIComponent(term),{signal});
      if (response.status===404) continue;
      if (!response.ok) throw new Error('사전 연결 오류');
      const data=await response.json();
      const definitions=data.flatMap(entry=>entry.meanings.map(meaning=>({
        part:meaning.partOfSpeech,definition:meaning.definitions[0]?.definition
      }))).filter(item=>item.definition).slice(0,4);
      return {definitions,phonetic:data.find(entry=>entry.phonetic)?.phonetic || '',status:definitions.length?'':'등록된 설명이 없습니다. 아래 영한사전에서 검색해 보세요.'};
    }
    return {status:'등록된 설명이 없습니다. 아래 영한사전에서 검색해 보세요.'};
  })();
  cache.set(word,pending);
  try { return await pending; }
  catch (error) { cache.delete(word); throw error; }
}

byId('reading').addEventListener('click',async event=>{
  const target=event.target.closest('.word');
  if (!target) return;
  activateNode(target);
  const request=++sequence;
  const word=target.textContent.toLowerCase();
  const variants=candidates(word);
  const korean=variants.map(term=>glossary.get(term)).find(Boolean) || '';
  const offset=Number(target.dataset.offset);
  const end=offset+Number(target.dataset.length);
  const {paragraph,topics}=paragraphData.get(target.parentNode);
  const source=book.title;
  const previous=saved.get(word);
  selected={word,korean,source,
    context:contextOf(paragraph,offset,end),
    related:topics.filter(topic=>topic.start<end && topic.end>offset).map(topic=>({topic,paragraph,source,node:target})),
    definitions:previous?.definitions,phonetic:previous?.phonetic,
    status:korean || previous?.definitions?.length ? '' : '영영사전에서 설명을 찾는 중…'};
  setTab('dictionary');
  focusPanel();
  if (korean || previous?.definitions?.length) return;
  let result;
  try { result=await getDefinition(variants); }
  catch { result={status:'영영사전에 연결할 수 없습니다. 아래 영한사전에서 검색해 보세요.'}; }
  if (request!==sequence) return;
  Object.assign(selected,result);
  if (saved.has(word) && result.definitions?.length) {
    const next=new Map(saved);
    next.set(word,{...saved.get(word),...result,status:''});
    try {localStorage.setItem('folio-vocabulary',JSON.stringify([...next]));saved=next;}
    catch { /* Keep the earlier saved entry. */ }
  }
  if (tab==='dictionary') renderPanel();
});

async function openFile(file) {
  if (!file || importing) return;
  importing=true;
  announce('문서에서 글자를 불러오는 중…',true);
  try {
    book=await importFile(file);
    books.push(book);
    selectedNode=null;
    selected=null;
    sequence++;
    renderBook();
    setTab('dictionary');
    announce('문서를 열었습니다.');
  } catch (error) {
    announce(error.name==='PasswordException'?'암호가 해제된 PDF를 열어 주세요.':error.message || '파일을 읽을 수 없습니다.');
  } finally { importing=false; }
}
byId('open').onclick=byId('drop').onclick=()=>byId('file').click();
byId('file').onchange=event=>{
  openFile(event.target.files[0]);
  event.target.value='';
};
let dragDepth=0;
window.addEventListener('dragenter',event=>{
  if (!Array.from(event.dataTransfer.types).includes('Files')) return;
  event.preventDefault();
  dragDepth++;
  document.body.classList.add('dragging');
});
window.addEventListener('dragover',event=>{
  if (Array.from(event.dataTransfer.types).includes('Files')) event.preventDefault();
});
window.addEventListener('dragleave',()=>{
  dragDepth=Math.max(0,dragDepth-1);
  if (!dragDepth) document.body.classList.remove('dragging');
});
window.addEventListener('drop',event=>{
  if (!event.dataTransfer.files.length) return;
  event.preventDefault();
  dragDepth=0;
  document.body.classList.remove('dragging');
  openFile(event.dataTransfer.files[0]);
});
function changePage(delta) {
  book.page+=delta;
  renderBook();
  document.querySelector('main').scrollIntoView({block:'start'});
}
byId('prev').onclick=()=>changePage(-1);
byId('next').onclick=()=>changePage(1);
byId('dictionary').onclick=()=>setTab('dictionary');
byId('vocabulary').onclick=()=>setTab('vocabulary');
byId('grammar').onclick=()=>setTab('grammar');
byId('review').onclick=()=>{
  setTab('review');
  byId('details').querySelector('h2')?.focus({preventScroll:true});
};
function resize(delta) {
  font=Math.max(16,Math.min(36,font+delta));
  document.documentElement.style.setProperty('--reading',font+'px');
  byId('smaller').disabled=font===16;
  byId('larger').disabled=font===36;
}
byId('smaller').onclick=()=>resize(-2);
byId('larger').onclick=()=>resize(2);
renderBook();
renderPanel();
