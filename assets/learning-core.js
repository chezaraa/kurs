(function(scope){
'use strict';
const storageKey='inkcraft-es-course-v2';
const clone=value=>JSON.parse(JSON.stringify(value));
function blankProgress(){return{version:2,lastLesson:1,translations:true,lessons:{}};}
function normalizeProgress(raw,lessons){
 const out=blankProgress();
 if(!raw||typeof raw!=='object')return out;
 out.lastLesson=lessons.some(l=>l.n===raw.lastLesson)?raw.lastLesson:1;
 out.translations=typeof raw.translations==='boolean'?raw.translations:true;
 for(const lesson of lessons){
  const x=raw.lessons&&raw.lessons[String(lesson.n)];
  if(!x||typeof x!=='object')continue;
  out.lessons[lesson.n]={card:Number.isInteger(x.card)?Math.max(0,Math.min(lesson.cards.length-1,x.card)):0,completed:x.completed===true,answers:Array.isArray(x.answers)?x.answers.filter(a=>typeof a==='boolean').slice(0,lesson.quiz.length):[]};
 }
 return out;
}
function ensureLesson(progress,lesson){
 if(!progress.lessons[lesson.n])progress.lessons[lesson.n]={card:0,completed:false,answers:[]};
 return progress.lessons[lesson.n];
}
function migrate(old,lessons,getLegacy){
 const result=normalizeProgress(old,lessons);
 for(const n of [1,2]){
  if(result.lessons[n])continue;
  let legacy=null;try{legacy=getLegacy(n);}catch{}
  const lesson=lessons.find(l=>l.n===n);if(!legacy||!lesson)continue;
  result.lessons[n]={card:Number.isInteger(legacy.index)?Math.max(0,Math.min(lesson.cards.length-1,legacy.index)):0,completed:false,answers:Array.isArray(legacy.quizAnswers)?legacy.quizAnswers.filter(x=>typeof x==='boolean').slice(0,lesson.quiz.length):[]};
  if(typeof legacy.translations==='boolean')result.translations=legacy.translations;
  if(result.lessons[n].card>0)result.lastLesson=n;
 }
 return result;
}
function parseRoute(hash,lessons){
 const text=String(hash||'');
 let m=text.match(/^#\/lesson\/(\d{1,2})(?:\/card\/(\d+))?$/);
 if(m){const lesson=lessons.find(l=>l.n===Number(m[1]));if(lesson)return{view:'lesson',lesson:lesson.n,card:m[2]?Math.max(0,Math.min(lesson.cards.length-1,Number(m[2])-1)):null};}
 m=text.match(/^#card-(\d+)$/);if(m)return{view:'lesson',lesson:1,card:Math.max(0,Math.min(lessons[0].cards.length-1,Number(m[1])-1))};
 m=text.match(/^#\/dialogue\/(\d{1,2})$/);if(m&&lessons.some(l=>l.n===Number(m[1])))return{view:'dialogue',lesson:Number(m[1])};
 m=text.match(/^#\/reader\/(\d{1,2})$/);if(m&&lessons.some(l=>l.n===Number(m[1])))return{view:'reader',lesson:Number(m[1])};
 m=text.match(/^#\/glossary(?:\/(terms|verbs|questions))?$/);if(m)return{view:'glossary',tab:m[1]||'terms'};
 return{view:'home'};
}
function routeFor(lesson,card=0){return'#/lesson/'+String(lesson).padStart(2,'0')+'/card/'+(card+1);}
function quizStatus(lesson,state){const answers=state.answers||[],correct=answers.filter(Boolean).length;return{answered:answers.length,total:lesson.quiz.length,correct,target:lesson.target,finished:answers.length===lesson.quiz.length,passed:answers.length===lesson.quiz.length&&correct>=lesson.target};}
function grade(lesson,state,remembered){if(typeof remembered!=='boolean'||state.answers.length>=lesson.quiz.length)return false;state.answers.push(remembered);return true;}
function normalizeText(text){return String(text||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();}
function search(items,query){const words=normalizeText(query).split(/\s+/).filter(Boolean);return items.filter(x=>{const hay=normalizeText([x.es,x.ru,x.answer,x.answerRu,x.category].filter(Boolean).join(' '));return words.every(word=>hay.includes(word));});}
function exportProgress(progress){return JSON.stringify({application:'inkcraft-spanish',exportedAt:new Date().toISOString(),progress:clone(progress)},null,2);}
function importProgress(text,lessons){const input=JSON.parse(text);if(input.application!=='inkcraft-spanish'||input.progress?.version!==2)throw Error('Это не файл прогресса курса INKCRAFT.');return normalizeProgress(input.progress,lessons);}
const api={storageKey,blankProgress,normalizeProgress,ensureLesson,migrate,parseRoute,routeFor,quizStatus,grade,normalizeText,search,exportProgress,importProgress};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else scope.InkcraftLearning=api;
})(typeof window!=='undefined'?window:globalThis);
