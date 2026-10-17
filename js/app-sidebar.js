/* Live navigation only: no project data or export geometry. */
(function(root){
  'use strict';
  const preferenceKey='lampy-paperwork-sidebar-collapsed';
  function readPreference(storage){try{return storage.getItem(preferenceKey)==='true'}catch{return false}}
  function writePreference(storage,value){try{storage.setItem(preferenceKey,String(value))}catch{}}
  function layoutState(collapsed,mobile,open){return {width:mobile?0:collapsed?60:256,hidden:mobile&&!open,expanded:mobile?open:!collapsed}}
  const iconPaths={
    home:'M3 10 12 3l9 7M5 9v12h5v-7h4v7h5V9',
    fixturePatch:'M4 4h16v16H4zM4 9h16M9 4v16M14 9v11M4 14h16',
    powerSheet:'m13 2-9 12h7l-1 8 10-13h-7z',
    controlNetwork:'M4 5h16M4 12h16M4 19h16M8 3v4M16 10v4M9 17v4',
    network:'M9 3h6v5H9zM3 16h6v5H3zM15 16h6v5h-6zM12 8v4M6 16v-4h12v4',
    rackLayout:'M4 3h16v18H4zM4 9h16M4 15h16M7 6h1M7 12h1M7 18h1M12 6h5M12 12h5M12 18h5',
    looms:'M5 3v7a4 4 0 0 0 4 4h6a4 4 0 0 1 4 4v3M19 3v3a4 4 0 0 1-4 4H9a4 4 0 0 0-4 4v7M3 3h4M17 3h4M3 21h4M17 21h4',
    distroLabels:'M3 3h9l9 9-9 9-9-9zM7 7h.01',
    collapse:'M4 4h16v16H4zM9 4v16m7-11-3 3 3 3',
    menu:'M4 6h16M4 12h16M4 18h16',
    chevron:'m6 9 6 6 6-6'
  };
  function iconMarkup(name){return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="'+(iconPaths[name]||iconPaths.menu)+'"/></svg>'}
  function flyoutPosition(anchor,viewport,width,height){return {left:Math.max(8,Math.min(anchor.right+8,viewport.width-width-8)),top:Math.max(8,Math.min(anchor.top,viewport.height-height-8))}}
  let controller;
  function init({changed=()=>{}}={}){
    if(controller)return controller;
    const doc=root.document,nav=doc.querySelector('.previewHead');if(!nav)return;
    const aside=doc.createElement('aside');aside.id='appNavigation';aside.className='appNavigation';aside.setAttribute('aria-label','Application navigation');
    aside.innerHTML='<div class="appNavigationHead"><div class="appNavigationBrand"><img src="images/branding/lampy-paperwork-logo.png" alt="Lampy Paperwork"><span aria-hidden="true">LP</span></div><button type="button" class="appNavigationToggle" aria-controls="appNavigation">'+iconMarkup('collapse')+'</button></div>';
    nav.before(aside);aside.append(nav);nav.classList.remove('previewHead');nav.classList.add('appNavigationContent');nav.setAttribute('role','navigation');nav.setAttribute('aria-label','Paperwork pages');
    const trigger=doc.createElement('button');trigger.type='button';trigger.className='appNavigationMobileToggle';trigger.innerHTML=iconMarkup('menu');trigger.setAttribute('aria-label','Open navigation');trigger.setAttribute('aria-controls',aside.id);doc.querySelector('.topHeader').prepend(trigger);
    const footer=doc.createElement('div');footer.className='appNavigationFooter';
    const menuButton=doc.querySelector('.menuButton'),actions=doc.getElementById('actionSidebar');
    if(menuButton){menuButton.removeAttribute('style');menuButton.setAttribute('aria-label','Menu');menuButton.title='Menu';menuButton.innerHTML=iconMarkup('menu')+'<span class="appNavigationLabel">Menu</span>';footer.append(menuButton)}
    if(actions)footer.append(actions);aside.append(footer);
    const backdrop=doc.createElement('div');backdrop.className='appNavigationBackdrop';backdrop.hidden=true;aside.before(backdrop);
    let storage;try{storage=root.localStorage}catch{}
    const media=root.matchMedia('(max-width: 767px)'),expanded=new Set();let collapsed=readPreference(storage),open=false,previousFocus=null;
    const toggle=aside.querySelector('.appNavigationToggle');
    const flyout=doc.createElement('nav');flyout.className='appNavigationFlyout';flyout.id='appNavigationFlyout';flyout.hidden=true;doc.body.append(flyout);
    let flyoutSource=null,leaveTimer=null,suppressFocus=false;
    function cancelLeave(){root.clearTimeout(leaveTimer);leaveTimer=null}
    function hideFlyout(restore=false){cancelLeave();const source=flyoutSource;flyoutSource=null;flyout.hidden=true;flyout.replaceChildren();if(source){source.removeAttribute('aria-expanded');source.removeAttribute('aria-controls')}if(restore&&source){suppressFocus=true;source.focus();suppressFocus=false}}
    function scheduleLeave(){cancelLeave();leaveTimer=root.setTimeout(()=>{if(!flyout.contains(doc.activeElement)&&doc.activeElement!==flyoutSource)hideFlyout()},200)}
    function showFlyout(button){
      if(media.matches||suppressFocus)return;cancelLeave();if(flyoutSource===button)return;hideFlyout();flyoutSource=button;
      const label=button.dataset.navLabel||button.textContent.trim();flyout.setAttribute('aria-label',label+' navigation');
      function addAction(original,heading=false){const item=doc.createElement('button');item.type='button';item.textContent=heading?label:original.textContent;item.className=heading?'appNavigationFlyoutTitle':'';item.addEventListener('click',()=>{hideFlyout();original.click();doc.getElementById('sheet')?.focus({preventScroll:true})});flyout.append(item)}
      addAction(button,true);button.parentElement.querySelectorAll('.sheetSubMenu button').forEach(item=>addAction(item));
      button.setAttribute('aria-controls',flyout.id);button.setAttribute('aria-expanded','true');flyout.hidden=false;
      const bounds=button.getBoundingClientRect(),position=flyoutPosition({right:aside.getBoundingClientRect().right,top:bounds.top},{width:doc.documentElement.clientWidth,height:root.innerHeight},flyout.offsetWidth,flyout.offsetHeight);
      flyout.style.left=position.left+'px';flyout.style.top=position.top+'px';
    }
    aside.addEventListener('pointerover',event=>{if(event.pointerType==='touch')return;const button=event.target.closest('[data-sheet-tab]');if(button)showFlyout(button)});
    aside.addEventListener('pointerleave',scheduleLeave);flyout.addEventListener('pointerenter',cancelLeave);flyout.addEventListener('pointerleave',scheduleLeave);
    aside.addEventListener('focusin',event=>{const button=event.target.closest('[data-sheet-tab]');if(button)showFlyout(button)});
    doc.addEventListener('focusin',event=>{if(flyoutSource&&!flyout.contains(event.target)&&event.target!==flyoutSource)hideFlyout()});
    doc.addEventListener('pointerdown',event=>{if(flyoutSource&&!flyout.contains(event.target)&&!flyoutSource.contains(event.target))hideFlyout()});
    doc.addEventListener('keydown',event=>{if(!flyoutSource)return;if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();hideFlyout(true)}else if(event.key==='ArrowRight'&&event.target===flyoutSource){event.preventDefault();flyout.querySelector('button')?.focus()}else if(event.key==='ArrowLeft'&&flyout.contains(event.target)){event.preventDefault();hideFlyout(true)}else if(event.key==='Tab'&&!event.shiftKey&&event.target===flyoutSource){event.preventDefault();flyout.querySelector('button')?.focus()}else if(event.key==='Tab'&&flyout.contains(event.target)){const items=[...flyout.querySelectorAll('button')];if(event.shiftKey&&event.target===items[0]){event.preventDefault();hideFlyout(true)}else if(!event.shiftKey&&event.target===items.at(-1)){event.preventDefault();const pages=[...aside.querySelectorAll('[data-sheet-tab]')],next=pages[pages.indexOf(flyoutSource)+1];hideFlyout();if(next)next.focus();else doc.getElementById('sheet')?.focus({preventScroll:true})}}},true);
    nav.addEventListener('scroll',()=>hideFlyout());root.addEventListener('resize',()=>hideFlyout());
    function paint(){hideFlyout();const state=layoutState(collapsed,media.matches,open);doc.body.classList.add('hasAppNavigation');doc.body.classList.toggle('appNavigationCompact',collapsed&&!media.matches);doc.body.classList.toggle('appNavigationOpen',media.matches&&open);aside.inert=state.hidden;aside.setAttribute('aria-hidden',String(state.hidden));backdrop.hidden=!(media.matches&&open);toggle.setAttribute('aria-expanded',String(state.expanded));toggle.setAttribute('aria-label',media.matches?'Close navigation':collapsed?'Expand navigation':'Collapse navigation');trigger.setAttribute('aria-expanded',String(open));refresh();changed()}
    function close(){if(!open)return;if(doc.body.classList.contains('actionMenuOpen'))menuButton?.click();open=false;paint();previousFocus?.focus?.()}
    function refresh(){hideFlyout();aside.querySelectorAll('[data-sheet-tab]').forEach(button=>{
      const key=button.dataset.sheetTab,label=button.dataset.navLabel||button.textContent.trim();button.dataset.navLabel=label;button.setAttribute('aria-label',label);button.removeAttribute('title');
      if(!button.querySelector('.appNavigationIcon')){button.textContent='';const icon=doc.createElement('span');icon.className='appNavigationIcon';icon.setAttribute('aria-hidden','true');icon.innerHTML=iconMarkup(key);const text=doc.createElement('span');text.className='appNavigationLabel';text.textContent=label;button.append(icon,text)}
      if(button.classList.contains('active'))button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');
      const host=button.parentElement,menu=host.querySelector('.sheetSubMenu');host.onmouseenter=host.onmouseleave=host.onfocusin=null;
      button.removeAttribute('aria-haspopup');button.removeAttribute('aria-controls');
      let disclosure=host.querySelector('.appNavigationDisclosure');
      if(!menu){disclosure?.remove();button.style.gridColumn='1 / -1';return}button.style.gridColumn='';menu.removeAttribute('role');menu.querySelectorAll('[role]').forEach(item=>item.removeAttribute('role'));
      if(!disclosure){disclosure=doc.createElement('button');disclosure.type='button';disclosure.className='appNavigationDisclosure';disclosure.innerHTML=iconMarkup('chevron');host.append(disclosure);disclosure.addEventListener('click',()=>{if(collapsed&&!media.matches){collapsed=false;writePreference(storage,false)}expanded.has(key)?expanded.delete(key):expanded.add(key);paint()})}
      disclosure.setAttribute('aria-label',label+' sub-pages');disclosure.setAttribute('aria-controls',menu.id);disclosure.setAttribute('aria-expanded',String(expanded.has(key)));menu.hidden=!expanded.has(key)||(collapsed&&!media.matches);
    })}
    toggle.addEventListener('click',()=>{if(media.matches)close();else{collapsed=!collapsed;writePreference(storage,collapsed);paint()}});
    trigger.addEventListener('click',()=>{previousFocus=doc.activeElement;open=true;paint();toggle.focus()});backdrop.addEventListener('click',close);
    aside.addEventListener('click',event=>{if(event.target.closest('[data-sheet-tab],.sheetSubMenu button')&&media.matches){close();doc.getElementById('sheet')?.focus({preventScroll:true})}});
    doc.addEventListener('keydown',event=>{if(!media.matches||!open)return;if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();close()}else if(event.key==='Tab'){const buttons=[...aside.querySelectorAll('button')].filter(b=>b.getClientRects().length&&!b.disabled),first=buttons[0],last=buttons.at(-1);if(event.shiftKey&&(doc.activeElement===first||!aside.contains(doc.activeElement))){event.preventDefault();last?.focus()}else if(!event.shiftKey&&(doc.activeElement===last||!aside.contains(doc.activeElement))){event.preventDefault();first?.focus()}}},true);
    actions?.addEventListener('click',event=>{if(media.matches&&event.target.closest('button')){open=false;paint()}});
    media.addEventListener('change',()=>{open=false;paint()});controller={refresh};paint();return controller;
  }
  const api={init,refresh:()=>controller?.refresh(),readPreference,writePreference,layoutState,flyoutPosition};if(typeof module==='object'&&module.exports)module.exports=api;else root.LampySidebar=api;
})(typeof window==='undefined'?globalThis:window);
