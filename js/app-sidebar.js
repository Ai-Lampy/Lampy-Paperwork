/* Live navigation only: no project data or export geometry. */
(function(root){
  'use strict';
  const preferenceKey='lampy-paperwork-sidebar-collapsed';
  function readPreference(storage){try{return storage.getItem(preferenceKey)==='true'}catch{return false}}
  function writePreference(storage,value){try{storage.setItem(preferenceKey,String(value))}catch{}}
  function layoutState(collapsed,mobile,open){return {width:mobile?0:collapsed?60:200,hidden:mobile&&!open,expanded:mobile?open:!collapsed}}
  const iconPaths={
    general:'M4 6h16M4 12h16M4 18h16M7 4v4M17 10v4M10 16v4',
    projectInfo:'M6 2h9l4 4v16H6zM14 2v5h5M10 11h5M10 15h5M10 19h3',
    contacts:'M8 3a3 3 0 1 0 0 6 3 3 0 0 0 0-6M2 20v-4a6 6 0 0 1 12 0v4M17 5h5M17 10h5M17 15h5',
    vendor:'M3 9h18L18 3H6zM4 9v12h16V9M8 21v-7h5v7',
    logos:'M3 3h18v18H3zM3 18l6-7 4 4 3-3 5 6M15 6h2v2h-2z',
    exports:'M5 14v7h14v-7M12 3v12M7 8l5-5 5 5',
    home:'M3 10 12 3l9 7M5 9v12h5v-7h4v7h5V9',
    fixturePatch:'M4 4h16v16H4zM4 9h16M9 4v16M14 9v11M4 14h16',
    powerSheet:'m13 2-9 12h7l-1 8 10-13h-7z',
    controlNetwork:'M4 5h16M4 12h16M4 19h16M8 3v4M16 10v4M9 17v4',
    network:'M9 3h6v5H9zM3 16h6v5H3zM15 16h6v5h-6zM12 8v4M6 16v-4h12v4',
    rackLayout:'M4 3h16v18H4zM4 9h16M4 15h16M7 6h1M7 12h1M7 18h1M12 6h5M12 12h5M12 18h5',
    looms:'M3 4v5c0 6 18 0 18 6v5M7 4v4c0 5 10 1 10 7v5M11 4v3c0 4 2 5 2 8v5M2 2h10v2H2zM12 20h10v2H12z',
    distroLabels:'M3 3h9l9 9-9 9-9-9zM7 7h.01',
    universe:'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20M2 12h20M4 6h16M4 18h16M12 2c-6 5-6 15 0 20M12 2c6 5 6 15 0 20',
    ports:'M3 3h8v8H3zM6 6v2M8 6v2M14 16h7v5h-7zM7 11v7h7M15 4h6M18 2v4M15 9h6M17 7v4',
    fan:'M10 18h4v4h-4zM12 18v-7M12 11 4 7M12 11l8-4M2 2h4v5H2zM10 2h4v5h-4zM18 2h4v5h-4zM12 7v4',
    totals:'M4 20V10h4v10M10 20V4h4v16M16 20v-7h4v7',
    list:'M8 5h13M8 12h13M8 19h13M3 5h1M3 12h1M3 19h1',
    rear:'M3 3h9l9 9-9 9-9-9zM7 7h.01M9 16V9h3a2 2 0 0 1 0 4H9m3 0 3 3',
    settings:'M22.00 12.00 21.81 13.95 19.39 15.06 18.65 16.44 19.07 19.07 17.56 20.31 15.06 19.39 13.56 19.85 12.00 22.00 10.05 21.81 8.94 19.39 7.56 18.65 4.93 19.07 3.69 17.56 4.61 15.06 4.15 13.56 2.00 12.00 2.19 10.05 4.61 8.94 5.35 7.56 4.93 4.93 6.44 3.69 8.94 4.61 10.44 4.15 12.00 2.00 13.95 2.19 15.06 4.61 16.44 5.35 19.07 4.93 20.31 6.44 19.39 8.94 19.85 10.44zM12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8',
    help:'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20M9 8a3 3 0 1 1 4 3c-1 .5-1 1-1 3M12 17h.01',
    collapse:'M4 4h16v16H4zM9 4v16m7-11-3 3 3 3',
    menu:'M4 6h16M4 12h16M4 18h16',
    chevron:'m6 9 6 6 6-6'
  };
  function iconMarkup(name){return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="'+(iconPaths[name]||iconPaths.menu)+'"/></svg>'}
  function subPageIcon(parent,label){
    const names={'General':'general','Project Info':'projectInfo','Production Contacts':'contacts','Lighting Vendor':'vendor','Logos':'logos','Exports':'exports','Project Settings':'settings','Patch':'fixturePatch','Universe Detail':'universe','Device Config':'network','Port Configuration':'ports','Power Calcs':'powerSheet','Fan Outs':'fan','Phase Totals':'totals','Looms':'looms','Cable List':'list','Front RCBO Labels':'distroLabels','Rear Labels':'rear','Table View':'fixturePatch'};
    return parent==='rackLayout'?'rackLayout':parent==='fixturePatch'&&label!=='Universe Detail'?'fixturePatch':names[label]||parent;
  }
  function decorateSubPage(button,parent,doc){
    if(button.querySelector('.appNavigationSubIcon'))return;
    const label=button.textContent,icon=doc.createElement('span'),text=doc.createElement('span');
    icon.className='appNavigationSubIcon';icon.setAttribute('aria-hidden','true');icon.innerHTML=iconMarkup(subPageIcon(parent,label));
    button.setAttribute('aria-label',label);text.className='appNavigationSubLabel';text.textContent=label;button.replaceChildren(icon,text);
  }
  function resetExpandedPages(expanded,activePage){expanded.clear();if(activePage)expanded.add(activePage)}
  function subPagesVisible(compact,active,expanded){return compact?active:expanded}
  function flyoutMode(mainPage,active){return mainPage==='home'&&active?'none':mainPage&&!active?'group':'name'}
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
    const helpButton=doc.createElement('button');helpButton.type='button';helpButton.className='appNavigationHelp';helpButton.setAttribute('aria-label','Help for this page');helpButton.setAttribute('aria-haspopup','dialog');helpButton.setAttribute('aria-controls','appInfoDialog');helpButton.title='Help';helpButton.innerHTML=iconMarkup('help')+'<span class="appNavigationLabel">Help</span>';helpButton.addEventListener('click',()=>{close();root.openAppInfo('help')});footer.append(helpButton);
    const menuButton=doc.querySelector('.menuButton'),actions=doc.getElementById('actionSidebar');
    if(menuButton){menuButton.removeAttribute('style');menuButton.setAttribute('aria-label','Menu');menuButton.title='Menu';menuButton.innerHTML=iconMarkup('menu')+'<span class="appNavigationLabel">Menu</span>';footer.append(menuButton)}
    if(actions)footer.append(actions);aside.append(footer);
    const backdrop=doc.createElement('div');backdrop.className='appNavigationBackdrop';backdrop.hidden=true;aside.before(backdrop);
    let storage;try{storage=root.localStorage}catch{}
    const media=root.matchMedia('(max-width: 767px)'),expanded=new Set();let collapsed=readPreference(storage),open=false,previousFocus=null,lastActivePage=null,wasExpanded=false;
    const toggle=aside.querySelector('.appNavigationToggle');
    const flyout=doc.createElement('nav');flyout.className='appNavigationFlyout';flyout.id='appNavigationFlyout';flyout.hidden=true;doc.body.append(flyout);
    let flyoutSource=null,leaveTimer=null,suppressFocus=false;
    function cancelLeave(){root.clearTimeout(leaveTimer);leaveTimer=null}
    function hideFlyout(restore=false){cancelLeave();const source=flyoutSource;flyoutSource=null;flyout.hidden=true;flyout.replaceChildren();if(source){source.removeAttribute('aria-expanded');source.removeAttribute('aria-controls')}if(restore&&source){suppressFocus=true;source.focus();suppressFocus=false}}
    function scheduleLeave(){cancelLeave();leaveTimer=root.setTimeout(()=>{if(!flyout.contains(doc.activeElement)&&doc.activeElement!==flyoutSource)hideFlyout()},200)}
    function showFlyout(button){
      if(!collapsed||media.matches||suppressFocus)return;cancelLeave();if(flyoutSource===button)return;hideFlyout();const mode=flyoutMode(button.dataset.sheetTab,button.classList.contains('active'));if(mode==='none')return;flyoutSource=button;
      const label=button.dataset.navLabel||button.textContent.trim();flyout.setAttribute('aria-label',label+' navigation');
      function addAction(original,heading=false){const item=doc.createElement('button');item.type='button';item.textContent=heading?label:original.textContent;item.className=heading?'appNavigationFlyoutTitle':'';if(!heading)decorateSubPage(item,button.dataset.sheetTab,doc);item.addEventListener('click',()=>{hideFlyout();original.click();doc.getElementById('sheet')?.focus({preventScroll:true})});flyout.append(item)}
      if(button.dataset.sheetTab!=='home')addAction(button,true);if(mode==='group')button.parentElement.querySelectorAll('.sheetSubMenu button:not(.appNavigationDuplicate)').forEach(item=>addAction(item));
      button.setAttribute('aria-controls',flyout.id);button.setAttribute('aria-expanded','true');flyout.hidden=false;
      const bounds=button.getBoundingClientRect(),position=flyoutPosition({right:aside.getBoundingClientRect().right,top:bounds.top},{width:doc.documentElement.clientWidth,height:root.innerHeight},flyout.offsetWidth,flyout.offsetHeight);
      flyout.style.left=position.left+'px';flyout.style.top=position.top+'px';
    }
    aside.addEventListener('pointerover',event=>{if(event.pointerType==='touch')return;const button=event.target.closest('[data-sheet-tab],.sheetSubMenu button');if(button)showFlyout(button)});
    aside.addEventListener('pointerleave',scheduleLeave);flyout.addEventListener('pointerenter',cancelLeave);flyout.addEventListener('pointerleave',scheduleLeave);
    aside.addEventListener('focusin',event=>{const button=event.target.closest('[data-sheet-tab],.sheetSubMenu button');if(button)showFlyout(button)});
    doc.addEventListener('focusin',event=>{if(flyoutSource&&!flyout.contains(event.target)&&event.target!==flyoutSource)hideFlyout()});
    doc.addEventListener('pointerdown',event=>{if(flyoutSource&&!flyout.contains(event.target)&&!flyoutSource.contains(event.target))hideFlyout()});
    doc.addEventListener('keydown',event=>{if(!flyoutSource)return;if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();hideFlyout(true)}else if(event.key==='ArrowRight'&&event.target===flyoutSource){event.preventDefault();flyout.querySelector('button')?.focus()}else if(event.key==='ArrowLeft'&&flyout.contains(event.target)){event.preventDefault();hideFlyout(true)}else if(event.key==='Tab'&&!event.shiftKey&&event.target===flyoutSource){event.preventDefault();flyout.querySelector('button')?.focus()}else if(event.key==='Tab'&&flyout.contains(event.target)){const items=[...flyout.querySelectorAll('button')];if(event.shiftKey&&event.target===items[0]){event.preventDefault();hideFlyout(true)}else if(!event.shiftKey&&event.target===items.at(-1)){event.preventDefault();const pages=[...aside.querySelectorAll('[data-sheet-tab],.sheetSubMenu button')].filter(item=>item.getClientRects().length),next=pages[pages.indexOf(flyoutSource)+1];hideFlyout();if(next)next.focus();else doc.getElementById('sheet')?.focus({preventScroll:true})}}},true);
    nav.addEventListener('scroll',()=>hideFlyout());root.addEventListener('resize',()=>hideFlyout());
    function paint(){hideFlyout();const state=layoutState(collapsed,media.matches,open);if(state.expanded&&!wasExpanded)resetExpandedPages(expanded,aside.querySelector('[data-sheet-tab].active')?.dataset.sheetTab);wasExpanded=state.expanded;doc.body.classList.add('hasAppNavigation');doc.body.classList.toggle('appNavigationCompact',collapsed&&!media.matches);doc.body.classList.toggle('appNavigationOpen',media.matches&&open);aside.inert=state.hidden;aside.setAttribute('aria-hidden',String(state.hidden));backdrop.hidden=!(media.matches&&open);toggle.setAttribute('aria-expanded',String(state.expanded));toggle.setAttribute('aria-label',media.matches?'Close navigation':collapsed?'Expand navigation':'Collapse navigation');trigger.setAttribute('aria-expanded',String(open));refresh();changed()}
    function close(){if(!open)return;if(doc.body.classList.contains('actionMenuOpen'))menuButton?.click();open=false;paint();previousFocus?.focus?.()}
    aside.addEventListener('click',event=>{const page=event.target.closest('[data-sheet-tab]');if(page)resetExpandedPages(expanded,page.dataset.sheetTab)},true);
    function refresh(){hideFlyout();const activePage=aside.querySelector('[data-sheet-tab].active')?.dataset.sheetTab;if(activePage!==lastActivePage){resetExpandedPages(expanded,activePage);lastActivePage=activePage}aside.querySelectorAll('[data-sheet-tab]').forEach(button=>{
      const key=button.dataset.sheetTab,label=button.dataset.navLabel||button.textContent.trim();button.dataset.navLabel=label;button.setAttribute('aria-label',label);button.removeAttribute('title');
      if(!button.querySelector('.appNavigationIcon')){button.textContent='';const icon=doc.createElement('span');icon.className='appNavigationIcon';icon.setAttribute('aria-hidden','true');icon.innerHTML=iconMarkup(key);const text=doc.createElement('span');text.className='appNavigationLabel';text.textContent=label;button.append(icon,text)}
      if(button.classList.contains('active'))button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');
      const host=button.parentElement,menu=host.querySelector('.sheetSubMenu');host.onmouseenter=host.onmouseleave=host.onfocusin=null;
      button.removeAttribute('aria-haspopup');button.removeAttribute('aria-controls');
      let disclosure=host.querySelector('.appNavigationDisclosure');
      if(!menu){disclosure?.remove();button.style.gridColumn='1 / -1';return}button.style.gridColumn='';menu.removeAttribute('role');menu.querySelectorAll('button').forEach(item=>decorateSubPage(item,key,doc));menu.querySelectorAll('[role]').forEach(item=>item.removeAttribute('role'));
      if(!disclosure){disclosure=doc.createElement('button');disclosure.type='button';disclosure.className='appNavigationDisclosure';disclosure.innerHTML=iconMarkup('chevron');host.append(disclosure);disclosure.addEventListener('click',()=>{if(collapsed&&!media.matches){collapsed=false;writePreference(storage,false)}expanded.has(key)?expanded.delete(key):resetExpandedPages(expanded,key);paint()})}
      disclosure.setAttribute('aria-label',label+' sub-pages');disclosure.setAttribute('aria-controls',menu.id);const compact=collapsed&&!media.matches,visible=subPagesVisible(compact,button.classList.contains('active'),expanded.has(key));disclosure.setAttribute('aria-expanded',String(visible));menu.hidden=!visible;menu.querySelectorAll('button').forEach(item=>item.removeAttribute('title'));
    })}
    toggle.addEventListener('click',()=>{if(media.matches)close();else{collapsed=!collapsed;writePreference(storage,collapsed);paint()}});
    trigger.addEventListener('click',()=>{previousFocus=doc.activeElement;open=true;paint();toggle.focus()});backdrop.addEventListener('click',close);
    aside.addEventListener('click',event=>{if(event.target.closest('[data-sheet-tab],.sheetSubMenu button')&&media.matches){close();doc.getElementById('sheet')?.focus({preventScroll:true})}});
    doc.addEventListener('keydown',event=>{if(!media.matches||!open)return;if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();close()}else if(event.key==='Tab'){const buttons=[...aside.querySelectorAll('button,a[href]')].filter(b=>b.getClientRects().length&&!b.disabled),first=buttons[0],last=buttons.at(-1);if(event.shiftKey&&(doc.activeElement===first||!aside.contains(doc.activeElement))){event.preventDefault();last?.focus()}else if(!event.shiftKey&&(doc.activeElement===last||!aside.contains(doc.activeElement))){event.preventDefault();first?.focus()}}},true);
    actions?.addEventListener('click',event=>{if(media.matches&&event.target.closest('button,a[href]')){open=false;paint()}});
    media.addEventListener('change',()=>{open=false;paint()});controller={refresh};paint();return controller;
  }
  const api={init,refresh:()=>controller?.refresh(),readPreference,writePreference,layoutState,flyoutPosition,subPageIcon,decorateSubPage,subPagesVisible,iconMarkup,resetExpandedPages,flyoutMode};if(typeof module==='object'&&module.exports)module.exports=api;else root.LampySidebar=api;
})(typeof window==='undefined'?globalThis:window);
