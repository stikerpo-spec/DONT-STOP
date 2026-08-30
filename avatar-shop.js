(() => {
  'use strict';
  if (!document.getElementById('avatarShop')) return;
  const items = [
    { id:'starter', name:'STARTER', price:0, img:'./assets/avatar-starter.svg', desc:'Ausgewogener Runner.' },
    { id:'speed', name:'SPEED RUNNER', price:2500, img:'./assets/avatar-speed.svg', desc:'+5% Spieltempo-Kontrolle.' },
    { id:'armor', name:'ARMORED', price:12500, img:'./assets/avatar-armor.svg', desc:'Sichtbares Schutz-Equipment.' },
    { id:'elite', name:'ELITE', price:50000, img:'./assets/avatar-elite.svg', desc:'Seltene Elite-Ausrüstung.' }
  ];
  const key = 'avatarShopV1';
  const read = () => window.DontStopSave?.read?.() || {};
  const save = patch => window.DontStopSave?.set?.(patch) || false;
  function ensure(){const s=read();const avatar={skin:'starter',owned:['starter'],...(s.avatar||{})};return { ...s, avatar };}
  function render(){const root=document.getElementById('avatarShop');if(!root||!window.DontStopSave)return;const s=ensure();root.innerHTML='';const title=document.createElement('h2');title.textContent='🧍 AVATAR GARAGE';root.appendChild(title);const sub=document.createElement('p');sub.textContent='Kaufe mit Coins bessere Ausrüstung. Jede Stufe verändert das Aussehen deines Runners.';sub.className='avatar-sub';root.appendChild(sub);const grid=document.createElement('div');grid.className='avatar-grid';for(const item of items){const owned=(s.avatar.owned||[]).includes(item.id);const active=s.avatar.skin===item.id;const card=document.createElement('article');card.className='avatar-card';const img=document.createElement('img');img.src=item.img;img.alt=item.name;const h=document.createElement('h3');h.textContent=item.name;const p=document.createElement('p');p.textContent=item.desc;const cost=document.createElement('div');cost.className='avatar-cost';cost.textContent=item.price?`🪙 ${item.price.toLocaleString('de-DE')}`:'KOSTENLOS';const btn=document.createElement('button');btn.className='avatar-btn'+(active?' active':'');btn.type='button';if(active){btn.textContent='AUSGERÜSTET';btn.disabled=true;}else if(owned){btn.textContent='AUSRÜSTEN';}else{btn.textContent=`KAUFEN • ${item.price.toLocaleString('de-DE')} 🪙`;btn.disabled=Number(s.coins||0)<item.price;}btn.onclick=()=>{const latest=ensure();const owns=(latest.avatar.owned||[]).includes(item.id);if(owns){save({avatar:{...(latest.avatar||{}),skin:item.id}});render();return;}if(Number(latest.coins||0)<item.price)return;save({coins:Number(latest.coins||0)-item.price,avatar:{...(latest.avatar||{}),skin:item.id,owned:[...(latest.avatar?.owned||['starter']),item.id]}});render();};card.append(img,h,p,cost,btn);grid.appendChild(card);}root.appendChild(grid);}
  render();window.addEventListener('dontstop:saved',render);window[key]=true;
})();