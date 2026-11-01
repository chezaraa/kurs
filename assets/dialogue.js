(function(scope){
'use strict';
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function create({root,toast,navigate}){
 const data=scope.INKCRAFT_DIALOGUES||[];
 let current=null,voices=[],lastHighlighted=-1,lastError='',rate=.85,preferredVoice='';
 const $=id=>root.querySelector('#'+id);
 const player=scope.InkcraftSpeech.createPlayer({synth:scope.speechSynthesis,Utterance:scope.SpeechSynthesisUtterance,onChange:update});
 function update(s){
  if(!current||!$('dialogue-play'))return;
  $('dialogue-play').textContent=s.status==='playing'?'Ⅱ Пауза':s.status==='paused'?'▶ Продолжить':'▶ Слушать весь диалог';
  $('dialogue-stop').disabled=s.status==='idle';
  $('dialogue-audio-state').textContent=s.status==='playing'?'Читается фраза '+(s.index+1)+' из '+current.sentences.length:s.status==='paused'?'Пауза: продолжение с начала текущей фразы.':s.index>=0?'Озвучивание остановлено. Можно повторить любую фразу.':'Озвучивается только испанский текст.';
  root.querySelectorAll('[data-sentence]').forEach((row,i)=>{row.classList.toggle('is-speaking',i===s.index&&s.status!=='idle');if(i===s.index&&s.status!=='idle')row.setAttribute('aria-current','true');else row.removeAttribute('aria-current');});
  if(s.status==='playing'&&s.index!==lastHighlighted){
   const row=root.querySelector('[data-sentence="'+s.index+'"]');
   if(row){const r=row.getBoundingClientRect(),bar=$('dialogue-controls').getBoundingClientRect();if(r.top<bar.bottom+16||r.bottom>innerHeight-25)row.scrollIntoView({block:'center',behavior:'auto'});}
   lastHighlighted=s.index;
  }
  if(s.error){
   const message=s.error==='unsupported'?'Этот браузер не поддерживает озвучивание. Открой сайт в Safari или Chrome.':s.error==='not-allowed'?'Браузер не разрешил звук. Нажми кнопку прослушивания ещё раз; на iPhone открой сайт в Safari.':s.error==='language-unavailable'||s.error==='voice-unavailable'?'Испанский голос недоступен. Установи испанский голос в настройках устройства и открой сайт заново.':'Не удалось прочитать фразу. Попробуй другой испанский голос или открой сайт в Safari.';
   $('dialogue-audio-state').textContent=message;
   if(lastError!==s.error)toast(message);lastError=s.error;
  }else lastError='';
 }
 function refreshVoices(){
  voices=scope.InkcraftSpeech.spanishVoices(scope.speechSynthesis?.getVoices?.()||[]);
  const select=$('dialogue-voice');if(!select)return;
  select.innerHTML='<option value="">Автоматически · español</option>'+voices.map((v,i)=>'<option value="'+i+'">'+esc(v.name+' · '+v.lang)+'</option>').join('');
  const index=voices.findIndex(v=>v.voiceURI===preferredVoice);select.value=index<0?'':String(index);
  $('dialogue-voice-note').textContent=voices.length?'Предпочтение — голос es-ES (Испания). Звук зависит от голосов устройства.':'Браузер пока не показал испанские голоса. Попробуй «Слушать»; если звука нет, установи испанский голос в настройках устройства.';
 }
 function render(n){
  player.stop();current=data.find(d=>d.lesson===n);lastHighlighted=-1;if(!current)return;
  document.title='Диалог '+n+' · '+current.title+' · INKCRAFT';
  root.innerHTML=`<header class="library-header"><button type="button" class="back-link" data-open-lesson="${n}">← К уроку ${n}</button><button type="button" class="text-button" data-home>Все уроки</button></header><p class="eyebrow">ПРАКТИКА РАЗГОВОРА · УРОК ${String(n).padStart(2,'0')}</p><h1>${esc(current.title)}</h1><p class="dialogue-setting">${esc(current.setting)}</p><p class="dialogue-meta">${current.words} испанских слов · около ${current.minutes} минут при спокойном чтении</p><div class="dialogue-controls" id="dialogue-controls"><div class="dialogue-play-row"><button type="button" class="audio-main" id="dialogue-play">▶ Слушать весь диалог</button><button type="button" class="audio-stop" id="dialogue-stop" disabled>■ Стоп</button></div><div class="audio-settings"><label>Скорость<select id="dialogue-rate"><option value="0.7">Медленно · 0,7×</option><option value="0.85">Учебная · 0,85×</option><option value="1">Обычная · 1×</option></select></label><label>Испанский голос<select id="dialogue-voice"></select></label></div><p class="audio-state" id="dialogue-audio-state" role="status" aria-live="polite">Озвучивается только испанский текст.</p></div><details class="dialogue-help"><summary>Как тренироваться и читать транскрипцию</summary><p>Нажми на любое испанское предложение — откроются его перевод и подсказка произношения. Кнопка ▶ рядом читает только эту фразу. При прослушивании всего диалога текущая фраза подсвечивается.</p><p>Сначала слушай обоих участников, затем отвечай за Сергея самостоятельно. «Пауза» останавливает чтение; «Продолжить» повторяет текущую фразу с начала.</p><p>Транскрипция русскими буквами приблизительная, с ударениями: э — испанское e, нь — ñ, й — ll/y. Буква h не читается; b/v переданы через «б». В Испании c перед e/i и z часто звучат как межзубное [θ]; в подсказке написано «с». Сверяй произношение по звуку.</p><p id="dialogue-voice-note"></p><p>Голос синтезируется устройством или его речевым сервисом. Работа звука в фоне и при заблокированном экране зависит от браузера.</p></details><div class="dialogue-reveal-row"><button type="button" id="dialogue-reveal">Открыть все переводы</button><span>Нажми на фразу ↓</span></div><div class="dialogue-lines">${current.sentences.map((s,i)=>`<article class="dialogue-sentence ${s.speaker}" data-sentence="${i}"><div class="speaker-label">${s.speaker==='serguei'?'СЕРГЕЙ · INKCRAFT':'ЗАКАЗЧИК'}</div><div class="sentence-actions"><button type="button" class="sentence-text" data-reveal="${i}" aria-expanded="false" aria-controls="translation-${s.id}"><span lang="es">${esc(s.es)}</span><span class="reveal-hint" aria-hidden="true">＋ перевод и произношение</span></button><button type="button" class="sentence-listen" data-speak="${i}" aria-label="Прослушать фразу ${i+1} на испанском">▶</button></div><div class="sentence-translation" id="translation-${s.id}" hidden><p class="translation-label">ПЕРЕВОД</p><p>${esc(s.ru)}</p><p class="translation-label">ПРИБЛИЗИТЕЛЬНОЕ ПРОИЗНОШЕНИЕ</p><p class="sentence-pronunciation">${esc(s.pronunciation)}</p><button type="button" class="from-here" data-from="${i}">▶ Слушать диалог отсюда</button></div></article>`).join('')}</div><nav class="dialogue-footer"><button type="button" class="back-link" data-open-lesson="${n}">← Карточки урока ${n}</button>${n<16?`<button type="button" class="back-link" data-dialogue="${n+1}">Диалог ${n+1} →</button>`:'<button type="button" class="back-link" data-home>К оглавлению →</button>'}</nav>`;
  $('dialogue-rate').value=String(rate);refreshVoices();
  $('dialogue-play').disabled=!player.supported;
  if(!player.supported){root.querySelectorAll('[data-speak],[data-from]').forEach(b=>b.disabled=true);$('dialogue-audio-state').textContent='Озвучивание не поддерживается этим браузером. Открой сайт в Safari или Chrome; текст и переводы доступны здесь.';}
 }
 function toggle(i,open){const b=root.querySelector('[data-reveal="'+i+'"]');if(!b)return;const show=open??b.getAttribute('aria-expanded')!=='true';b.setAttribute('aria-expanded',String(show));$(b.getAttribute('aria-controls')).hidden=!show;b.querySelector('.reveal-hint').textContent=show?'− скрыть подсказку':'＋ перевод и произношение';}
 root.addEventListener('click',e=>{
  const b=e.target.closest('button');if(!b||!current)return;
  if(b.dataset.reveal!==undefined){toggle(Number(b.dataset.reveal));return;}
  if(b.dataset.speak!==undefined){player.play(current.sentences,Number(b.dataset.speak),'single');return;}
  if(b.dataset.from!==undefined){player.play(current.sentences,Number(b.dataset.from),'all');return;}
  if(b.id==='dialogue-play'){const s=player.getState();if(s.status==='playing')player.pause();else if(s.status==='paused')player.resume();else player.play(current.sentences);}
  if(b.id==='dialogue-stop')player.stop();
  if(b.id==='dialogue-reveal'){const open=!!root.querySelector('[data-reveal][aria-expanded="false"]');current.sentences.forEach((s,i)=>toggle(i,open));b.textContent=open?'Скрыть все переводы':'Открыть все переводы';}
 });
 root.addEventListener('change',e=>{if(e.target.id==='dialogue-rate'){rate=Number(e.target.value);player.configure({rate});}if(e.target.id==='dialogue-voice'){const v=e.target.value===''?null:voices[Number(e.target.value)];preferredVoice=v?.voiceURI||'';player.configure({voice:v});}});
 if(scope.speechSynthesis?.addEventListener)scope.speechSynthesis.addEventListener('voiceschanged',refreshVoices);
 scope.addEventListener('pagehide',()=>player.stop());
 document.addEventListener('visibilitychange',()=>{if(document.hidden&&player.getState().status==='playing')player.pause();});
 return{render,stop:()=>player.stop()};
}
scope.InkcraftDialogue={create};
})(window);
