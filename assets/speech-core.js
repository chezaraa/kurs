(function(scope){
'use strict';
function spanishVoices(list){return Array.from(list||[]).filter(v=>/^es(?:[-_]|$)/i.test(v.lang)).sort((a,b)=>Number(/^es[-_]ES$/i.test(b.lang))-Number(/^es[-_]ES$/i.test(a.lang)));}
function createPlayer({synth,Utterance,onChange=()=>{}}){
 let generation=0,utterance=null,items=[],index=-1,status='idle',mode='all',rate=.85,voice=null;
 const supported=!!(synth&&Utterance),emit=(error=null)=>onChange({status,index,mode,rate,error,supported});
 function cancel(){generation++;if(supported)synth.cancel();utterance=null;}
 function stop(){cancel();status='idle';emit();}
 function speak(){
  if(index<0||index>=items.length){status='idle';emit();return;}
  const ticket=generation;
  utterance=new Utterance(items[index].es);utterance.lang='es-ES';utterance.rate=rate;utterance.pitch=1;
  const selected=voice||spanishVoices(synth.getVoices())[0];if(selected)utterance.voice=selected;
  utterance.onstart=()=>{if(ticket===generation){status='playing';emit();}};
  utterance.onend=()=>{if(ticket!==generation)return;utterance=null;if(mode==='all'&&index+1<items.length){index++;speak();}else{status='idle';emit();}};
  utterance.onerror=e=>{if(ticket!==generation)return;utterance=null;status='idle';emit(e.error||'speech-failed');};
  status='playing';emit();try{synth.speak(utterance);}catch{status='idle';emit('speech-failed');}
 }
 function play(list,start=0,kind='all'){
  cancel();items=list||[];index=Math.max(0,Math.min(items.length-1,start));mode=kind;
  if(!supported){status='idle';emit('unsupported');return;}
  if(!items.length){status='idle';emit();return;}speak();
 }
 function pause(){if(status!=='playing')return;cancel();status='paused';emit();}
 function resume(){if(status!=='paused'||!supported)return;speak();}
 function configure(options){
  if(Number.isFinite(options.rate))rate=Math.max(.6,Math.min(1.2,options.rate));
  if('voice' in options)voice=options.voice;
  // Restart the current sentence on a settings change; preserve a paused state.
  if(status==='playing'){cancel();speak();}else emit();
 }
 return{play,stop,pause,resume,configure,supported,getState:()=>({status,index,mode,rate}),getUtterance:()=>utterance};
}
const api={spanishVoices,createPlayer};if(typeof module!=='undefined'&&module.exports)module.exports=api;else scope.InkcraftSpeech=api;
})(typeof window!=='undefined'?window:globalThis);
