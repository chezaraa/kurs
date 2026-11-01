(()=>{
'use strict';
const course=window.INKCRAFT_COURSE,Core=window.InkcraftLearning;
if(!course||!Core){document.body.textContent='Не удалось загрузить материалы курса. Проверь, что папка assets находится рядом с index.html.';return;}
const $=id=>document.getElementById(id),esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const views={home:$('home-view'),lesson:$('lesson-shell'),glossary:$('glossary-view'),reader:$('reader-view'),dialogue:$('dialogue-view')};
const deck=$('deck'),dialog=$('contents-dialog'),help=$('help-dialog');
let saved=null;try{saved=JSON.parse(localStorage.getItem(Core.storageKey)||'null');}catch{}
let progress=Core.migrate(saved,course.lessons,n=>JSON.parse(localStorage.getItem('inkcraft-es-lesson-'+n+'-v1')||'null'));
let activeLesson=null,activeCard=0,pages=[],view='home',quizRevealed=false,showQuizAnswers=false;
let tab='terms',searchLimit=60,toastTimer=null,programmaticTarget=null,scrollTimer=null,storageWarning=false;
const dialogueUI=window.InkcraftDialogue.create({root:$('dialogue-view'),toast,navigate});
const state=()=>Core.ensureLesson(progress,activeLesson);
const lessonById=n=>course.lessons.find(l=>l.n===Number(n));
function toast(message){$('app-status').textContent=message;$('app-status').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('app-status').classList.remove('visible'),3600);}
function persist(){try{localStorage.setItem(Core.storageKey,JSON.stringify(progress));}catch{if(!storageWarning){storageWarning=true;toast('Этот браузер не разрешил сохранить прогресс. Его можно скачать файлом в оглавлении.');}}}
function setView(name){if(view==='dialogue')dialogueUI.stop();view=name;for(const [key,node]of Object.entries(views))node.hidden=key!==name;document.body.classList.toggle('is-learning',name==='lesson');if(name!=='lesson')window.scrollTo({top:0,behavior:'instant'});}
function setHash(hash,replace=false){try{history[replace?'replaceState':'pushState'](null,'',hash);}catch{location.hash=hash;}}
function navigate(hash){setHash(hash);renderRoute();}
function openLesson(n,card=null){const l=lessonById(n);if(!l)return;const position=card===null?Core.ensureLesson(progress,l).card:card;navigate(Core.routeFor(l.n,position));}
function renderHome(){
 setView('home');document.title='INKCRAFT · Испанский для ремонта · 16 уроков';
 const completed=course.lessons.filter(l=>progress.lessons[l.n]?.completed).length;
 $('completion-label').textContent=completed+' из 16 завершено';
 $('lesson-grid').innerHTML=course.lessons.map(l=>{const s=progress.lessons[l.n],done=s?.completed,visited=s?Math.round((s.card+1)/l.cards.length*100):0;const q=s?Core.quizStatus(l,s):null;const label=done?'Урок пройден':q?.finished?'Самопроверка: '+q.correct+'/'+q.total:s&&s.card>0?'Продолжить с карточки '+(s.card+1):'60 минут · '+l.cards.length+' карточек';return`<button type="button" class="lesson-link${done?' is-complete':''}" data-open-lesson="${l.n}"><span class="lesson-number">${String(l.n).padStart(2,'0')}${done?'<i aria-label="Пройден">✓</i>':''}</span><span class="lesson-title">${esc(l.title)}</span><span class="lesson-meta">${label}</span><span class="lesson-line" aria-hidden="true"><i style="width:${done?100:visited}%"></i></span></button>`;}).join('');
 document.querySelectorAll('.lesson-link').forEach(b=>{const wrap=document.createElement('div');wrap.className='lesson-tile';b.replaceWith(wrap);wrap.append(b);const link=document.createElement('button');link.type='button';link.className='lesson-dialogue-link';link.dataset.dialogue=b.dataset.openLesson;link.textContent='▶ Диалог с заказчиком';wrap.append(link);});
 const last=lessonById(progress.lastLesson)||course.lessons[0],lastState=progress.lessons[last.n],hasWork=Object.values(progress.lessons).some(s=>s.card>0||s.answers.length||s.completed);
 $('continue-button').innerHTML=(hasWork?'Продолжить урок '+last.n:'Начать первый урок')+' <span aria-hidden="true">→</span>';
 $('continue-label').textContent=hasWork?last.title+' · карточка '+((lastState?.card||0)+1)+' из '+last.cards.length:'Листай карточки, говори вслух, проверяй себя.';
 $('terms-count').textContent=course.terms.length+' словарных записей с переводом';
}
function chapterMarkup(){const found=[];activeLesson.cards.forEach((c,i)=>{if(!found.some(x=>x.name===c.section))found.push({name:c.section,index:i});});return found.map(c=>`<button type="button" class="chapter-button" data-jump="${c.index}"><span>${esc(c.name)}</span><small>${c.index+1} / ${activeLesson.cards.length}</small></button>`).join('');}
function renderLesson(lesson,card){
 const changed=activeLesson?.n!==lesson.n||!pages.length;
 activeLesson=lesson;progress.lastLesson=lesson.n;const s=state();activeCard=card===null?s.card:card;
 setView('lesson');document.title='Урок '+lesson.n+' · '+lesson.title+' · INKCRAFT';
 if(changed){
  quizRevealed=false;showQuizAnswers=false;
  deck.innerHTML=lesson.cards.map((c,i)=>`<section class="slide ${esc(c.tone||'')}" data-index="${i}" aria-label="Карточка ${i+1}: ${esc(c.title)}">${c.full?c.body:`<div class="slide-inner"><div class="eyebrow">${esc(c.section)}</div><h2>${esc(c.title)}</h2>${c.body}</div>`}</section>`).join('');
  pages=Array.from(deck.children);
  const lastInner=pages[pages.length-1].querySelector('.slide-inner');
  lastInner.insertAdjacentHTML('beforeend','<div class="finish-actions"><button type="button" class="main-button" id="complete-lesson">Отметить урок пройденным</button><button type="button" class="end-link" data-home>К оглавлению</button></div>');
  $('chapters').innerHTML=chapterMarkup();renderQuiz();
 }
 $('lesson-tag').textContent='Урок '+lesson.n+'/16 · '+lesson.title;
 $('progress').setAttribute('aria-valuemax',lesson.cards.length);
 goCard(activeCard,true);
}
function updateCard(){
 if(!activeLesson||view!=='lesson')return;
 const card=activeLesson.cards[activeCard],s=state();s.card=activeCard;
 deck.classList.toggle('hide-ru',!progress.translations);
 $('section-label').textContent=card.section;
 $('slide-count').textContent=String(activeCard+1).padStart(2,'0')+' / '+activeLesson.cards.length;
 $('progress-fill').style.width=((activeCard+1)/activeLesson.cards.length*100)+'%';$('progress').setAttribute('aria-valuenow',activeCard+1);
 $('prev').disabled=activeCard===0;
 const last=activeCard===activeLesson.cards.length-1;
 $('next').classList.toggle('long-label',last);
 $('next').innerHTML=last?(activeLesson.n===16?'К оглавлению':'Следующий урок →'):'Далее <span aria-hidden="true">→</span>';
 const hasRu=!!pages[activeCard].querySelector('.ru')&&card.kind!=='quiz';
 $('translation').hidden=!hasRu;$('bottom-label').hidden=hasRu;
 $('translation').textContent=progress.translations?'Скрыть перевод':'Показать перевод';$('translation').setAttribute('aria-pressed',String(progress.translations));
 $('bottom-label').textContent=last?'Урок '+activeLesson.n+' завершён':'Свайп влево или «Далее»';
 pages.forEach((p,i)=>{p.inert=i!==activeCard;p.setAttribute('aria-hidden',String(i!==activeCard));});
 document.querySelectorAll('[data-jump]').forEach(b=>b.classList.toggle('current',activeLesson.cards[Number(b.dataset.jump)].section===card.section));
 if($('complete-lesson'))$('complete-lesson').textContent=s.completed?'Урок отмечен как пройденный ✓':'Отметить урок пройденным';
 setHash(Core.routeFor(activeLesson.n,activeCard),true);persist();
}
function goCard(n,instant=false){
 if(!activeLesson)return;n=Math.max(0,Math.min(activeLesson.cards.length-1,n));activeCard=n;programmaticTarget=n;
 deck.scrollTo({left:n*deck.clientWidth,behavior:instant||matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});updateCard();
 clearTimeout(scrollTimer);scrollTimer=setTimeout(()=>{programmaticTarget=null;},650);
}
let framePending=false;
deck.addEventListener('scroll',()=>{if(framePending||view!=='lesson'||!deck.clientWidth)return;framePending=true;requestAnimationFrame(()=>{const n=Math.max(0,Math.min(pages.length-1,Math.round(deck.scrollLeft/deck.clientWidth)));if(programmaticTarget===null||n===programmaticTarget){if(n===programmaticTarget)programmaticTarget=null;if(n!==activeCard){activeCard=n;updateCard();}}framePending=false;});},{passive:true});
for(const event of ['pointerdown','touchstart','wheel'])deck.addEventListener(event,()=>{programmaticTarget=null;},{passive:true});
new ResizeObserver(()=>{if(view==='lesson'&&deck.clientWidth)deck.scrollTo({left:activeCard*deck.clientWidth,behavior:'instant'});}).observe(deck);
function pair(es,ru){return`<div class="pair"><span class="es" lang="es">${esc(es)}</span><span class="ru">${esc(ru)}</span></div>`;}
function renderQuiz(){
 const area=$('quiz-area');if(!area||!activeLesson)return;
 const s=state(),q=Core.quizStatus(activeLesson,s);
 if(q.finished){
  area.innerHTML=`<div class="score-label">Самооценка: вспомнил без подсказки</div><div class="result-number">${q.correct}<span style="font-size:32px;letter-spacing:0;color:#d3e0e2"> / ${q.total}</span></div><p class="sub">${q.passed?'Цель достигнута. Теперь повтори разговор по сценарию.':'Повтори фразы, на которых остановился.'}</p><p class="target-line">Рабочая цель: ${q.target} из ${q.total}.</p><button type="button" class="main-button" data-quiz="restart">Пройти ещё раз</button><button type="button" class="plain-button" style="color:#d6e5df" data-quiz="answers">${showQuizAnswers?'Скрыть все ответы':'Посмотреть все ответы'}</button>${showQuizAnswers?'<div class="quiz-all-answers">'+activeLesson.quiz.map(([ru,es],i)=>pair(es,(i+1)+'. '+ru)).join('')+'</div>':''}`;return;
 }
 const [ru,es]=activeLesson.quiz[q.answered];
 area.innerHTML=`<div class="score-label">Фраза ${q.answered+1} из ${q.total}</div><div class="quiz-question">${esc(ru)}</div><div class="quiz-answer" lang="es">${quizRevealed?esc(es):''}</div>${quizRevealed?'<div class="quiz-actions"><button type="button" class="again" data-quiz="again">Повторить</button><button type="button" class="remembered" data-quiz="yes">Вспомнил</button></div>':'<button type="button" class="main-button" data-quiz="reveal">Показать ответ</button>'}<div class="quiz-dots" aria-hidden="true">${activeLesson.quiz.map((_,i)=>`<span class="${i<q.answered?(s.answers[i]?'yes':'no'):i===q.answered?'now':''}"></span>`).join('')}</div><p class="note">Смысл, отрицание, участник и предмет должны совпасть. Другой правильный ответ с тем же смыслом допустим.</p>`;
}
function quizAction(action){if(!activeLesson)return;if(action==='reveal')quizRevealed=true;else if(action==='yes'||action==='again'){if(!quizRevealed)return;Core.grade(activeLesson,state(),action==='yes');quizRevealed=false;}else if(action==='restart'){state().answers=[];quizRevealed=false;showQuizAnswers=false;}else if(action==='answers')showQuizAnswers=!showQuizAnswers;persist();renderQuiz();}
const firstVerbAnswers=[['Trabajo en Barcelona.','Trabajamos en Barcelona.','No trabajamos en Barcelona.','¿Usted trabaja en Barcelona?'],['Cambio los azulejos.','Cambiamos los azulejos.','No cambiamos los azulejos.','¿Usted cambia los azulejos?'],['Instalo el inodoro.','Instalamos el inodoro.','No instalamos el inodoro.','¿Usted instala el inodoro?'],['Desmonto el lavabo.','Desmontamos el lavabo.','No desmontamos el lavabo.','¿Usted desmonta el lavabo?'],['Preparo el presupuesto.','Preparamos el presupuesto.','No preparamos el presupuesto.','¿Usted prepara el presupuesto?']];
const secondExercises=[[['Hay una grieta.','Есть трещина.'],['Hay una mancha.','Есть пятно.'],['Hay una fuga.','Есть утечка.']],[['La grieta está aquí.','Трещина здесь.'],['La grieta está allí.','Трещина там.'],['La grieta está junto a la ventana.','Трещина рядом с окном.']],[['La pared es de ladrillo.','Стена кирпичная.'],['El suelo es de madera.','Пол деревянный.']],[['¿Cuánto mide el baño?','Какой размер ванной?'],['¿Cuánto mide el dormitorio?','Какой размер спальни?'],['¿Cuánto mide el pasillo?','Какой размер коридора?']]];
function sentenceMode(button){const examples=activeLesson.n===1?{yes:['Cambiamos las tuberías.'],no:['No cambiamos las tuberías.'],question:['¿Cambiamos las tuberías?']}:{hay:['Hay una grieta.','Есть трещина. Сообщаем о наличии.'],esta:['La grieta está aquí.','Трещина здесь. Сообщаем место.'],es:['La pared es de ladrillo.','Стена кирпичная. Сообщаем материал.']};const value=examples[button.dataset.mode];if(!value)return;deck.querySelectorAll('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));$('sentence-output').textContent=value[0];if($('sentence-translation'))$('sentence-translation').textContent=value[1]||'';}
function revealExercise(){const output=$('exercise-answers'),button=$('exercise-reveal');if(!output||!button)return;output.hidden=!output.hidden;const i=Number($('verb-exercise').value);const rows=activeLesson.n===1?firstVerbAnswers[i].map((es,k)=>[es,['Я делаю','Мы делаем','Мы не делаем','Вы делаете?'][k]]):secondExercises[i];if(!output.hidden)output.innerHTML=rows.map(x=>pair(...x)).join('');button.textContent=output.hidden?(activeLesson.n===1?'Проверить четыре формы':'Показать примеры'):'Скрыть подсказку';}
function revealMeasures(){const answer=$('measure-answers'),button=$('measure-reveal');answer.hidden=!answer.hidden;if($('measure-values'))$('measure-values').hidden=!answer.hidden;button.textContent=answer.hidden?'Проверить чтение':'Скрыть чтение';button.setAttribute('aria-expanded',String(!answer.hidden));if(!answer.hidden)answer.innerHTML=[['dos coma sesenta metros','2,60 m'],['tres coma veinticinco metros','3,25 m'],['cuatro coma cinco metros cuadrados','4,5 m²'],['veintiún centímetros','21 cm']].map(x=>pair(...x)).join('');}
function renderDictionary(newTab=tab){
 tab=newTab;setView('glossary');document.title='Справочник · INKCRAFT';document.querySelectorAll('[data-tab]').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.tab===tab)));renderSearch();
}
function lessonLinks(numbers,card=null){return numbers.map(n=>`<button type="button" data-open-lesson="${n}"${card===null?'':` data-card="${card}"`}>Урок ${String(n).padStart(2,'0')} →</button>`).join('');}
function renderSearch(){
 const found=Core.search(course[tab],$('dictionary-search').value),shown=found.slice(0,searchLimit);$('search-count').textContent='Найдено: '+found.length+(found.length>shown.length?' · показано '+shown.length:'');
 $('dictionary-results').innerHTML=shown.map(x=>tab==='questions'?`<article class="dictionary-entry"><details><summary><span class="entry-es" lang="es">${esc(x.es)}</span><span class="entry-ru">${esc(x.ru)}</span></summary><div class="qa-answer"><span class="entry-es" lang="es">${esc(x.answer)}</span><span class="entry-ru">${esc(x.answerRu)}</span></div><div class="entry-links">${lessonLinks([x.lesson],x.card)}</div></details></article>`:`<article class="dictionary-entry"><span class="entry-es" lang="es">${esc(x.es)}</span><span class="entry-ru">${esc(x.ru)}</span><div class="entry-links">${lessonLinks(x.lessons)}</div></article>`).join('')||(found.length?'':'<p class="library-description">Ничего не найдено. Попробуй «плитка» или «azulejos».</p>');
 $('load-more').hidden=shown.length>=found.length;
}
function textWithLinks(text){let out='',last=0;for(const m of text.matchAll(/https?:\/\/\S+/g)){const url=m[0].replace(/[.,;]+$/,'');out+=esc(text.slice(last,m.index))+`<a href="${esc(url)}" target="_blank" rel="noopener">${esc(url)}</a>`+esc(m[0].slice(url.length));last=m.index+m[0].length;}return out+esc(text.slice(last));}
function renderReader(n){const l=lessonById(n);if(!l)return;setView('reader');$('reader-title').textContent='Урок '+n+'. '+l.title;$('reader-back').dataset.lesson=n;$('reader-content').innerHTML=l.sourceText.split(/\n\s*\n/).map(block=>{const text=block.replace(/\n/g,' ').trim();const heading=text.length<130&&/[А-ЯЁ]/.test(text)&&text===text.toUpperCase();return heading?'<h2>'+esc(text)+'</h2>':'<p>'+textWithLinks(text)+'</p>';}).join('');document.title='Конспект '+n+' · INKCRAFT';}
function renderRoute(){const route=Core.parseRoute(location.hash,course.lessons);if(route.view==='lesson')renderLesson(lessonById(route.lesson),route.card);else if(route.view==='glossary'){searchLimit=60;renderDictionary(route.tab);}else if(route.view==='reader')renderReader(route.lesson);else if(route.view==='dialogue'){setView('dialogue');dialogueUI.render(route.lesson);}else renderHome();}
function closeDialogs(){if(dialog.open)dialog.close();if(help.open)help.close();}
document.addEventListener('click',event=>{
 const button=event.target.closest('button');if(!button)return;
 if(button.hasAttribute('data-home')){closeDialogs();navigate('#/course');return;}
 if(button.dataset.dialogue){closeDialogs();navigate('#/dialogue/'+button.dataset.dialogue);return;}
 if(button.dataset.openLesson){closeDialogs();openLesson(Number(button.dataset.openLesson),button.dataset.card!==undefined?Number(button.dataset.card):null);return;}
 if(button.dataset.glossary){$('dictionary-search').value='';searchLimit=60;navigate('#/glossary/'+button.dataset.glossary);return;}
 if(button.dataset.tab){searchLimit=60;setHash('#/glossary/'+button.dataset.tab,true);renderDictionary(button.dataset.tab);return;}
 if(button.dataset.jump!==undefined){dialog.close();goCard(Number(button.dataset.jump));return;}
 if(button.dataset.quiz){quizAction(button.dataset.quiz);return;}
 if(button.dataset.mode){sentenceMode(button);return;}
 if(button.hasAttribute('data-close-dialog')){closeDialogs();return;}
 if(button.hasAttribute('data-start')||button.id==='start'){goCard(1);return;}
 switch(button.id){
  case 'continue-button':openLesson(progress.lastLesson);break;
  case 'prev':goCard(activeCard-1);break;
  case 'next':if(activeCard<activeLesson.cards.length-1)goCard(activeCard+1);else if(activeLesson.n<16)openLesson(activeLesson.n+1,0);else navigate('#/course');break;
  case 'translation':progress.translations=!progress.translations;updateCard();break;
  case 'lesson-dialogue-button':case 'chapter-dialogue':closeDialogs();navigate('#/dialogue/'+activeLesson.n);break;
  case 'contents-button':dialog.showModal();break;
  case 'read-full':dialog.close();navigate('#/reader/'+activeLesson.n);break;
  case 'reader-back':openLesson(Number(button.dataset.lesson));break;
  case 'exercise-reveal':revealExercise();break;
  case 'measure-reveal':revealMeasures();break;
  case 'complete-lesson':state().completed=true;persist();updateCard();toast('Урок '+activeLesson.n+' отмечен как пройденный.');break;
  case 'load-more':searchLimit+=60;renderSearch();break;
  case 'help-button':help.showModal();break;
  case 'export-progress':{const blob=new Blob([Core.exportProgress(progress)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='inkcraft-progress.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1500);break;}
  case 'import-progress':$('progress-file').click();break;
 }
});
deck.addEventListener('change',event=>{if(event.target.id==='verb-exercise'&&$('exercise-answers')){$('exercise-answers').hidden=true;$('exercise-reveal').textContent=activeLesson.n===1?'Проверить четыре формы':'Показать примеры';}});
$('dictionary-search').addEventListener('input',()=>{searchLimit=60;renderSearch();});
$('progress-file').addEventListener('change',async event=>{const file=event.target.files[0];if(!file)return;try{if(file.size>2000000)throw Error('Файл прогресса слишком большой.');progress=Core.importProgress(await file.text(),course.lessons);activeLesson=null;pages=[];persist();navigate('#/course');toast('Прогресс загружен.');}catch(error){toast(error.message||'Не удалось прочитать файл прогресса.');}event.target.value='';});
document.addEventListener('keydown',event=>{if(view!=='lesson'||dialog.open||help.open||/INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName))return;if(event.key==='ArrowRight'){event.preventDefault();$('next').click();}if(event.key==='ArrowLeft'){event.preventDefault();$('prev').click();}});
for(const modal of [dialog,help])modal.addEventListener('click',event=>{if(event.target!==modal)return;const r=modal.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)modal.close();});
window.addEventListener('hashchange',renderRoute);
$('sources-content').innerHTML=course.sources.split(/\n/).filter(Boolean).map(line=>'<p>'+textWithLinks(line)+'</p>').join('');
persist();renderRoute();
})();
