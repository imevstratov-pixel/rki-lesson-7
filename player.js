'use strict';
const lesson=window.LESSON, steps=lesson.steps;
const $=id=>document.getElementById(id);
const words={ru:{prev:'Назад',next:'Дальше →',finish:'К началу',check:'Проверить',correct:'Верно. Можно идти дальше.',wrong:'Пока не совпало. Попробуй ещё раз.',choose:'Выбери все ответы.',select:'Выбери…',record:'Записать ответ',stop:'Остановить запись',recorded:'Запись готова. Послушай себя, затем перейди к образцу.',recording:'Идёт запись…',denied:'Микрофон недоступен. Разреши доступ в браузере или проверь текст ответа ниже.',fallback:'Ответить текстом',type:'Напиши полное предложение',typed:'Верный текст. Произношение не оценивалось.',option:'Вариант',step:'Экран',ex:'Упражнение',note:'Это просмотр содержания. Речевые ответы здесь можно записать и сравнить с образцом. Автоматическая оценка произношения не подключена.',speechHelp:'Запись останется в браузере и никуда не отправится. После попытки открой следующий экран и сравни с образцом.',mode:'Демонстрационный урок',outline:'Содержание урока',jump:'Перейти к упражнению',instructions:'Инструкции'},en:{prev:'Back',next:'Continue →',finish:'Back to start',check:'Check',correct:'Correct. You can continue.',wrong:'Not quite. Try again.',choose:'Choose an answer for every item.',select:'Choose…',record:'Record answer',stop:'Stop recording',recorded:'Recording ready. Listen to yourself, then continue to the model.',recording:'Recording…',denied:'Microphone unavailable. Allow access in your browser, or check a written answer below.',fallback:'Answer in writing',type:'Write the full sentence',typed:'Correct text. Pronunciation was not evaluated.',option:'Option',step:'Screen',ex:'Exercise',note:'Record your answer and compare it with the model. Automatic pronunciation scoring is not connected.',speechHelp:'Your recording stays in this browser and is not uploaded. After your attempt, continue to the next screen to compare with the model.',mode:'Demo lesson',outline:'Lesson contents',jump:'Jump to exercise',instructions:'Instructions'}};
let locale='ru', index=0, completed=new Set(), recorder=null, stream=null, recordingUrl=null, selected=null;
const groups=[...new Set(steps.map(s=>s.source))];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const mediaPath=p=>/^(images|audio|video)\/[A-Za-z0-9_.-]+$/.test(p)?p:'';
function inline(s){return esc(s).replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>');}
function markdown(text){
  const lines=text.split('\n');let html='';
  for(let i=0;i<lines.length;i++){
    const l=lines[i].trim();if(!l)continue;
    const image=l.match(/^!\[(.*?)\]\((.*?)\)$/);if(image){html+=`<img src="${mediaPath(image[2])}" alt="${esc(image[1])}" tabindex="0" data-zoom>`;continue;}
    const audio=l.match(/^::?audio\[(.*?)\]$/);if(audio){html+=`<audio controls preload="metadata" aria-label="${locale==='ru'?'Аудио к заданию':'Exercise audio'}" src="${mediaPath(audio[1])}"></audio>`;continue;}
    if(l.startsWith('|')&&lines[i+1]?.match(/^\|\s*-+/)){
      const cells=t=>t.trim().slice(1,-1).split('|').map(x=>x.trim());
      html+='<div class="table-wrap"><table><thead><tr>'+cells(l).map(c=>'<th>'+inline(c)+'</th>').join('')+'</tr></thead><tbody>';i+=2;
      for(;i<lines.length&&lines[i].trim().startsWith('|');i++)html+='<tr>'+cells(lines[i]).map(c=>'<td>'+inline(c)+'</td>').join('')+'</tr>';
      i--;html+='</tbody></table></div>';continue;
    }
    if(l.startsWith('- ')){html+='<ul>';for(;i<lines.length&&lines[i].trim().startsWith('- ');i++)html+='<li>'+inline(lines[i].trim().slice(2))+'</li>';i--;html+='</ul>';continue;}
    if(l.startsWith('## ')){html+='<h3>'+inline(l.slice(3))+'</h3>';continue;}
    html+='<p>'+inline(l)+'</p>';
  }
  return html;
}
function label(source){if(source==='intro')return locale==='ru'?'Начало':'Start';if(source==='checklist')return locale==='ru'?'Итоги':'Your progress';if(source==='glossary')return locale==='ru'?'Словарь':'Vocabulary';return source.slice(1).replace(/^0/,'');}
function message(text,good=false){$('result').textContent=text;$('result').className=good?'good':'bad';}
function mark(){completed.add(steps[index].id);$('next').disabled=false;save();}
function save(){try{localStorage.setItem('rki:'+lesson.id,JSON.stringify({index,locale,completed:[...completed]}));}catch{}}
function stopRecording(){if(recorder&&recorder.state==='recording')recorder.stop();if(stream)stream.getTracks().forEach(t=>t.stop());stream=null;recorder=null;}
function go(to,focus=false){stopRecording();document.querySelectorAll('audio').forEach(a=>a.pause());index=Math.max(0,Math.min(steps.length-1,to));render();save();if(focus){$('title').focus({preventScroll:true});window.scrollTo({top:0,behavior:'instant'});}}
function render(){
  const s=steps[index],w=words[locale],tr=s.locales[locale];selected=null;document.documentElement.lang=locale;
  $('language').value=locale;$('title').textContent=tr.title;$('body').innerHTML=markdown(tr.body);$('interaction').replaceChildren();$('result').textContent='';
  $('exercise').textContent=s.source.startsWith('E')?`${w.ex} ${label(s.source)} / 25`:label(s.source);
  $('position').textContent=locale==='ru'?'Модуль 2 · Урок 7':'Module 2 · Lesson 7';
  $('kind').textContent=({view:locale==='ru'?'Слушаем и читаем':'Listen and read','audio-record':locale==='ru'?'Говорим':'Speak',grouping:locale==='ru'?'Группируем':'Group',matching:locale==='ru'?'Соединяем':'Match'})[s.mechanics]||(locale==='ru'?'Выбираем':'Choose');
  $('progress').value=(index+1)/steps.length*100;$('stepCount').textContent=`${w.step} ${index+1} / ${steps.length}`;
  $('previous').textContent=w.prev;$('previous').disabled=index===0;$('next').textContent=index===steps.length-1?w.finish:w.next;
  $('next').disabled=s.mechanics!=='view'&&!completed.has(s.id);$('previewNote').textContent=w.note;$('mode').textContent=w.mode;$('outlineLabel').textContent=w.outline;$('jumpLabel').textContent=w.jump;$('languageLabel').textContent=w.instructions;
  $('lessonTitle').innerHTML=locale==='ru'?'Чей это<br>чемодан?':'Whose<br>suitcase?';$('lessonSubtitle').textContent=locale==='ru'?'Наши и ваши вещи':'Our things. Your things.';
  $('outline').replaceChildren();$('jump').replaceChildren();
  groups.forEach(g=>{const first=steps.findIndex(x=>x.source===g),st=steps[first],name=st.locales[locale].title,b=document.createElement('button');b.type='button';b.className=g===s.source?'active':'';b.innerHTML=`<span class="num">${esc(label(g))}</span><span>${esc(name)}</span>`;if(g===s.source)b.setAttribute('aria-current','step');b.onclick=()=>go(first,true);$('outline').append(b);const o=document.createElement('option');o.value=first;o.textContent=label(g)+' · '+name;o.selected=g===s.source;$('jump').append(o);});
  if(s.mechanics==='single-selection'||s.mechanics==='single-image-selection'){
    const images=s.mechanics==='single-image-selection',box=document.createElement('div');box.className='choices'+(images?' images':'');box.setAttribute('role','group');box.setAttribute('aria-label',tr.title);
    s.questions.forEach((q,i)=>{const b=document.createElement('button');b.type='button';b.className='choice';b.dataset.value=q;b.setAttribute('aria-pressed','false');b.innerHTML=images?`<img src="${mediaPath(q)}" alt="${w.option} ${i+1}"><span class="option-label">${w.option} ${i+1}</span>`:esc(q);b.onclick=()=>{box.querySelectorAll('button').forEach(x=>{x.className='choice';x.setAttribute('aria-pressed','false')});b.classList.add('selected');b.setAttribute('aria-pressed','true');selected=q;$('result').textContent='';};box.append(b);});$('interaction').append(box);
    checkButton(()=>{if(selected===null)return message(w.choose);const ok=selected===s.answer[0],b=[...box.children].find(x=>x.dataset.value===selected);b.classList.add(ok?'correct':'wrong');message(ok?w.correct:w.wrong,ok);if(ok)mark();});
  }else if(s.mechanics==='grouping'||s.mechanics==='matching'){
    const left=s.mechanics==='grouping'?s.questions:s.questions[0],right=s.mechanics==='grouping'?s.categories:s.questions[1];
    left.forEach((q,i)=>{const row=document.createElement('div');row.className='pair-row';const lab=document.createElement('label');lab.htmlFor='pair-'+i;lab.textContent=q;const sel=document.createElement('select');sel.id='pair-'+i;sel.dataset.left=q;sel.innerHTML=`<option value="">${w.select}</option>`+right.map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join('');row.append(lab,sel);$('interaction').append(row);});
    checkButton(()=>{const choices=[...$('interaction').querySelectorAll('select')];if(choices.some(x=>!x.value))return message(w.choose);const ok=choices.every(x=>s.answer.some(p=>p[0]===x.dataset.left&&p[1]===x.value));message(ok?w.correct:w.wrong,ok);if(ok)mark();});
  }else if(s.mechanics==='audio-record'){
    const panel=document.createElement('div');panel.className='speech-panel';panel.innerHTML=`<button type="button" id="record">${w.record}</button><p>${w.speechHelp}</p><div id="recording"></div><details><summary>${w.fallback}</summary><label for="spokenText">${w.type}</label><input id="spokenText" autocomplete="off" lang="ru"><button type="button" id="checkText" class="check secondary">${w.check}</button></details>`;$('interaction').append(panel);
    $('record').onclick=async()=>{
      if(recorder?.state==='recording'){stopRecording();return;}
      const thisId=s.id;
      try{if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder)throw new Error('Unavailable');const acquired=await navigator.mediaDevices.getUserMedia({audio:true});if(steps[index].id!==thisId){acquired.getTracks().forEach(t=>t.stop());return;}stream=acquired;const r=new MediaRecorder(stream),chunks=[];recorder=r;r.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};r.onstop=()=>{acquired.getTracks().forEach(t=>t.stop());if(steps[index].id!==thisId)return;if(recordingUrl)URL.revokeObjectURL(recordingUrl);recordingUrl=URL.createObjectURL(new Blob(chunks,{type:r.mimeType}));const a=document.createElement('audio');a.controls=true;a.src=recordingUrl;$('recording').replaceChildren(a);$('record').textContent=w.record;message(w.recorded,true);mark();};r.start();$('record').textContent=w.stop;message(w.recording,true);}catch{message(w.denied);}
    };
    $('checkText').onclick=()=>{const norm=t=>t.toLowerCase().replace(/ё/g,'е').replace(/\u0301/g,'').replace(/[^а-яa-z0-9]/g,'');const ok=s.accepted_variants.some(x=>norm(x)===norm($('spokenText').value));message(ok?w.typed:w.wrong,ok);if(ok)mark();};
  }
  document.querySelectorAll('[data-zoom]').forEach(im=>{const open=()=>{$('zoom').querySelector('img').src=im.src;$('zoom').showModal()};im.onclick=open;im.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();open();}};});
}
function checkButton(fn){const b=document.createElement('button');b.type='button';b.className='check';b.textContent=words[locale].check;b.onclick=fn;$('interaction').append(b);}
try{const saved=JSON.parse(localStorage.getItem('rki:'+lesson.id));if(saved){index=Math.min(Math.max(0,saved.index||0),steps.length-1);locale=lesson.locales.includes(saved.locale)?saved.locale:'ru';completed=new Set(saved.completed||[]);}}catch{}
const requested=new URLSearchParams(location.search).get('step');if(requested){const i=steps.findIndex(s=>s.id===requested);if(i>=0)index=i;}
$('language').onchange=e=>{stopRecording();locale=e.target.value;render();save()};$('previous').onclick=()=>go(index-1,true);$('next').onclick=()=>go(index===steps.length-1?0:index+1,true);$('jump').onchange=e=>go(Number(e.target.value),true);$('closeZoom').onclick=()=>$('zoom').close();document.querySelector('.brand').onclick=e=>{e.preventDefault();go(0,true)};window.addEventListener('beforeunload',stopRecording);render();
