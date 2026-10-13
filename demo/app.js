'use strict';
const $ = id => document.getElementById(id);
const catalog = ['ФБС 24.4.6-Т', 'ПК 63.15-8', 'КС 15.9'];
const factories = [
 {id:1,name:'Демо-завод «Восток»',distance:65,products:[0,1,2],prices:[3400,8700,4200],delivery:26000,days:12},
 {id:2,name:'Демо-завод «Монолит»',distance:140,products:[0,1,2],prices:[3300,9100,4100],delivery:18000,days:8},
 {id:3,name:'Демо-завод «Регион»',distance:230,products:[0,2],prices:[3000,0,3900],delivery:34000,days:6}
];
const key='b2b-demo-v1';
let state={positions:[],recipients:[],offers:[],selected:null,status:'В производстве'};
const money=n=>new Intl.NumberFormat('ru-RU',{style:'currency',currency:'RUB',maximumFractionDigits:0}).format(n);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const normalize=s=>s.toUpperCase().replace(/Ё/g,'Е').replace(/[–—]/g,'-').replace(/\s/g,'').replace(/-/g,'.');
function save(){try{localStorage.setItem(key,JSON.stringify({...state,object:$('object').value,radius:$('radius').value,spec:$('spec').value}));}catch{$('message').textContent='Браузер запретил сохранение. Демо продолжает работать до закрытия страницы.';}}
function clearResults(){state.recipients=[];state.offers=[];state.selected=null;state.status='В производстве';$('factories').textContent='Подберите заводы для текущих позиций.';$('comparison').textContent='Сначала выберите адресатов запроса.';$('shipment').textContent='Выберите полное предложение.';$('summary').textContent='';$('request').disabled=true;$('export').disabled=true;}
function positionsView(){
 $('count').textContent=state.positions.length+' позиций';
 $('positions').innerHTML=state.positions.map((p,i)=>`<div class="position"><div><strong>${esc(p.mark)}</strong><br><small>${p.quantity===null?'Количество не распознано':esc(p.quantity)+' шт'}</small>${p.index<0?'<br><small class="error">Нет точного совпадения в демо-каталоге</small>':''}</div><label><input type="checkbox" data-confirm="${i}" ${p.confirmed?'checked':''} ${p.index<0||p.quantity===null?'disabled':''}> Подтверждаю</label></div>`).join('')||'Нет позиций';
 $('match').disabled=!state.positions.length||state.positions.some(p=>!p.confirmed||p.index<0||p.quantity===null);
}
function parse(){
 const lines=$('spec').value.split('\n').filter(s=>s.trim());
 if(lines.length>100){$('message').textContent='В демо допустимо до 100 строк.';return;}
 state.positions=lines.map(line=>{
 const m=line.match(/^(.+?)\s*[—–-]\s*(\d+(?:[.,]\d+)?)\s*(?:шт\.?)?\s*$/i);
 const raw=m?m[1].trim():line.trim();const index=catalog.findIndex(s=>normalize(s)===normalize(raw));
 const q=m?Number(m[2].replace(',','.')):null;
 return {mark:index>=0?catalog[index]:raw,index,quantity:q!==null&&Number.isSafeInteger(q)&&q>0?q:null,confirmed:false};
 });clearResults();positionsView();save();$('message').textContent='Проверьте и подтвердите каждую позицию. Дробные количества для изделий в штуках не принимаются.';
}
function candidates(){return factories.filter(f=>f.distance<=Number($('radius').value)&&state.positions.some(p=>f.products.includes(p.index)));}
function factoriesView(){const fs=candidates();$('factories').innerHTML=fs.map(f=>`<div class="factory"><input aria-label="Выбрать ${esc(f.name)}" type="checkbox" data-factory="${f.id}" ${state.recipients.includes(f.id)?'checked':''}><label>${esc(f.name)}<small>${f.distance} км · Покрытие ${state.positions.filter(p=>f.products.includes(p.index)).length}/${state.positions.length} позиций</small></label></div>`).join('')||'В заданном радиусе нет подходящих демо-заводов.';$('request').disabled=!state.recipients.length;}
function offersView(){
 const full=state.offers.filter(o=>o.full);const best=full.length?Math.min(...full.map(o=>o.total)):null;
 $('comparison').innerHTML=state.offers.length?`<div class="table-scroll"><table><thead><tr><th>Завод / покрытие</th><th>Товар</th><th>Доставка</th><th>Итого</th><th>Срок</th><th>Решение</th></tr></thead><tbody>${state.offers.map(o=>`<tr class="${o.full&&o.total===best?'best':''}"><td>${esc(o.name)}<br>${o.coverage}/${state.positions.length} позиций</td><td>${money(o.goods)}</td><td>${money(o.delivery)}</td><td><strong>${money(o.total)}</strong>${o.full?'Полный заказ':'Только доступные позиции'}</td><td>${o.days} дней</td><td><button data-choose="${o.id}" ${!o.full?'disabled':''}>${state.selected===o.id?'Выбран':'Выбрать'}</button></td></tr>`).join('')}</tbody></table></div>`:'Нет предложений';
 $('summary').textContent=best!==null?`Расчётная сводка: минимальная стоимость полного заказа — ${money(best)}. Частичные ответы исключены из рейтинга. Цены условно включают НДС; доставка — фиксированная сумма демо-предложения, без расчёта рейсов. Это не ИИ-анализ.`:'Полных предложений нет. Измените адресатов или состав заявки.';
 $('export').disabled=!state.offers.length;shipmentView();
}
function shipmentView(){const offer=state.offers.find(o=>o.id===state.selected);if(!offer){$('shipment').textContent='Выберите полное предложение.';return;}
 const statuses=['В производстве','Готово','Отгружено','В пути','Доставлено'];
 $('shipment').innerHTML=`<div class="shipment"><div><strong>${esc(offer.name)}</strong><p>${esc($('object').value)}<br>Полный заказ: ${money(offer.total)}</p><small>Доставка указана в предложении завода. Подбор отдельного перевозчика в демо не реализован.</small></div><label>Статус отгрузки<select id="status">${statuses.map(s=>`<option ${s===state.status?'selected':''}>${s}</option>`).join('')}</select></label></div>`;
 $('status').onchange=()=>{state.status=$('status').value;save();};
}
$('parse').onclick=parse;
$('positions').onchange=e=>{const index=e.target.dataset.confirm;if(index===undefined)return;state.positions[Number(index)].confirmed=e.target.checked;clearResults();positionsView();save();};
$('match').onclick=()=>{if(!Number.isFinite(Number($('radius').value))||Number($('radius').value)<1||Number($('radius').value)>3000){$('message').textContent='Укажите радиус от 1 до 3000 километров.';return;}clearResults();state.recipients=candidates().map(f=>f.id);factoriesView();save();$('message').textContent='Выберите адресатов. Расстояния заданы для демо, адрес не геокодируется.';};
$('factories').onchange=e=>{if(e.target.dataset.factory===undefined)return;const id=Number(e.target.dataset.factory);state.recipients=e.target.checked?[...state.recipients,id]:state.recipients.filter(n=>n!==id);state.offers=[];state.selected=null;$('comparison').textContent='Адресаты изменились. Получите предложения заново.';$('shipment').textContent='Выберите полное предложение.';$('summary').textContent='';$('export').disabled=true;$('request').disabled=!state.recipients.length;save();};
$('request').onclick=()=>{state.selected=null;state.offers=factories.filter(f=>state.recipients.includes(f.id)).map(f=>{const covered=state.positions.filter(p=>f.products.includes(p.index));const goods=covered.reduce((s,p)=>s+p.quantity*f.prices[p.index],0);return {...f,goods,total:goods+f.delivery,coverage:covered.length,full:covered.length===state.positions.length};});offersView();save();$('message').textContent='Сформированы синтетические ответы. Письма не отправлялись.';};
$('comparison').onclick=e=>{if(e.target.dataset.choose===undefined)return;const id=Number(e.target.dataset.choose);if(!state.offers.some(o=>o.id===id&&o.full))return;state.selected=id;state.status='В производстве';offersView();save();};
for(const id of ['spec','object','radius'])$(id).addEventListener('input',()=>{state.positions=[];clearResults();positionsView();save();$('message').textContent='Заявка изменена: разберите и подтвердите позиции заново.';});
$('export').onclick=()=>{const rows=[['Завод','Покрытие','Товар RUB','Доставка RUB','Итого RUB','Срок дней','Полный заказ'],...state.offers.map(o=>[o.name,o.coverage+'/'+state.positions.length,o.goods,o.delivery,o.total,o.days,o.full?'Да':'Нет'])];const csv='\uFEFF'+rows.map(r=>r.map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(';')).join('\r\n');const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='demo-offers.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
$('reset').onclick=()=>{try{localStorage.removeItem(key);}catch{}location.reload();};
try{const saved=JSON.parse(localStorage.getItem(key));if(saved&&Array.isArray(saved.positions)&&Array.isArray(saved.offers)&&Array.isArray(saved.recipients)){state=saved;for(const id of ['object','radius','spec'])if(typeof saved[id]==='string')$(id).value=saved[id];positionsView();if(state.recipients.length)factoriesView();if(state.offers.length)offersView();}}catch{$('message').textContent='Не удалось восстановить демо. Нажмите «Начать заново».';}
