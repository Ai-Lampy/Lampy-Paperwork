/* Live navigation only: no project data or export geometry. */
(function(root){
  'use strict';
  const preferenceKey='lampy-paperwork-sidebar-collapsed';
  function readPreference(storage){try{return storage.getItem(preferenceKey)==='true'}catch{return false}}
  function writePreference(storage,value){try{storage.setItem(preferenceKey,String(value))}catch{}}
  function layoutState(collapsed,mobile,open){return {width:mobile?0:collapsed?60:256,hidden:mobile&&!open,expanded:mobile?open:!collapsed}}
  let controller;
  function init({changed=()=>{}}={}){
    if(controller)return controller;
    const doc=root.document,nav=doc.querySelector('.previewHead');if(!nav)return;
    const aside=doc.createElement('aside');aside.id='appNavigation';aside.className='appNavigation';aside.setAttribute('aria-label','Application navigation');
    aside.innerHTML='<div class="appNavigationBrand"><img src="images/branding/lampy-paperwork-logo.png" alt="Lampy Paperwork"><span aria-hidden="true">LP</span></div><button type="button" class="appNavigationToggle" aria-controls="appNavigation">☰</button>';
    nav.before(aside);aside.append(nav);nav.setAttribute('role','navigation');nav.setAttribute('aria-label','Paperwork pages');
    const trigger=doc.createElement('button');trigger.type='button';trigger.className='appNavigationMobileToggle';trigger.textContent='☰';trigger.setAttribute('aria-label','Open navigation');trigger.setAttribute('aria-controls',aside.id);doc.querySelector('.topHeader').prepend(trigger);
    const backdrop=doc.createElement('div');backdrop.className='appNavigationBackdrop';backdrop.hidden=true;aside.before(backdrop);
    let storage;try{storage=root.localStorage}catch{}
    const media=root.matchMedia('(max-width: 767px)'),expanded=new Set();let collapsed=readPreference(storage),open=false,previousFocus=null;
    const toggle=aside.querySelector('.appNavigationToggle');
    const icons={home:'⌂',fixturePatch:'▦',powerSheet:'ϟ',controlNetwork:'☷',network:'⌘',rackLayout:'▤',looms:'〰',distroLabels:'▱',positions:'⌖',projectSettings:'⚙'};
    function paint(){const state=layoutState(collapsed,media.matches,open);doc.body.classList.add('hasAppNavigation');doc.body.classList.toggle('appNavigationCompact',collapsed&&!media.matches);doc.body.classList.toggle('appNavigationOpen',media.matches&&open);aside.inert=state.hidden;aside.setAttribute('aria-hidden',String(state.hidden));backdrop.hidden=!(media.matches&&open);toggle.setAttribute('aria-expanded',String(state.expanded));toggle.setAttribute('aria-label',media.matches?'Close navigation':collapsed?'Expand navigation':'Collapse navigation');trigger.setAttribute('aria-expanded',String(open));refresh();changed()}
    function close(){if(!open)return;open=false;paint();previousFocus?.focus?.()}
    function refresh(){aside.querySelectorAll('[data-sheet-tab]').forEach(button=>{
      const key=button.dataset.sheetTab,label=button.dataset.navLabel||button.textContent.trim();button.dataset.navLabel=label;button.setAttribute('aria-label',label);button.title=label;
      if(!button.querySelector('.appNavigationIcon')){button.textContent='';const icon=doc.createElement('span');icon.className='appNavigationIcon';icon.setAttribute('aria-hidden','true');icon.textContent=icons[key]||'▪';const text=doc.createElement('span');text.className='appNavigationLabel';text.textContent=label;button.append(icon,text)}
      if(button.classList.contains('active'))button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');
      const host=button.parentElement,menu=host.querySelector('.sheetSubMenu');host.onmouseenter=host.onmouseleave=host.onfocusin=null;
      button.removeAttribute('aria-haspopup');button.removeAttribute('aria-controls');
      let disclosure=host.querySelector('.appNavigationDisclosure');
      if(!menu){disclosure?.remove();return}menu.removeAttribute('role');menu.querySelectorAll('[role]').forEach(item=>item.removeAttribute('role'));
      if(!disclosure){disclosure=doc.createElement('button');disclosure.type='button';disclosure.className='appNavigationDisclosure';disclosure.textContent='⌄';host.append(disclosure);disclosure.addEventListener('click',()=>{if(collapsed&&!media.matches){collapsed=false;writePreference(storage,false)}expanded.has(key)?expanded.delete(key):expanded.add(key);paint()})}
      disclosure.setAttribute('aria-label',label+' sub-pages');disclosure.setAttribute('aria-controls',menu.id);disclosure.setAttribute('aria-expanded',String(expanded.has(key)));menu.hidden=!expanded.has(key)||(collapsed&&!media.matches);
    })}
    toggle.addEventListener('click',()=>{if(media.matches)close();else{collapsed=!collapsed;writePreference(storage,collapsed);paint()}});
    trigger.addEventListener('click',()=>{previousFocus=doc.activeElement;open=true;paint();toggle.focus()});backdrop.addEventListener('click',close);
    aside.addEventListener('click',event=>{if(event.target.closest('[data-sheet-tab],.sheetSubMenu button')&&media.matches){close();doc.getElementById('sheet')?.focus({preventScroll:true})}});
    doc.addEventListener('keydown',event=>{if(!media.matches||!open)return;if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();close()}else if(event.key==='Tab'){const buttons=[...aside.querySelectorAll('button')].filter(b=>b.getClientRects().length&&!b.disabled),first=buttons[0],last=buttons.at(-1);if(event.shiftKey&&(doc.activeElement===first||!aside.contains(doc.activeElement))){event.preventDefault();last?.focus()}else if(!event.shiftKey&&(doc.activeElement===last||!aside.contains(doc.activeElement))){event.preventDefault();first?.focus()}}},true);
    media.addEventListener('change',()=>{open=false;paint()});controller={refresh};paint();return controller;
  }
  const api={init,refresh:()=>controller?.refresh(),readPreference,writePreference,layoutState};if(typeof module==='object'&&module.exports)module.exports=api;else root.LampySidebar=api;
})(typeof window==='undefined'?globalThis:window);
