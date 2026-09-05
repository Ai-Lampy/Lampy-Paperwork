/* Small DOM enhancements kept separate from project calculations. */
(function(){
  'use strict';
  let sequence=0,scheduled=false;
  function labelControls(){
    scheduled=false;
    document.querySelectorAll('label:not([for])').forEach(label=>{
      if(label.querySelector('input,select,textarea'))return;
      const parent=label.parentElement,controls=parent?.querySelectorAll('input:not([type=hidden]),select,textarea');
      if(controls?.length!==1)return;const control=controls[0];
      if(!control.id)control.id='lampy-field-'+(++sequence);
      label.htmlFor=control.id;
    });
  }
  document.addEventListener('click',event=>{
    const open=event.target.closest('[data-open-supply]'),remove=event.target.closest('[data-remove-supply]');
    if(open)openPowerSupplyPane(open.dataset.openSupply);
    if(remove)removePowerSupply(remove.dataset.removeSupply);
    const fixture=event.target.closest('[data-fixture-action]');
    if(fixture){const [name,...args]=JSON.parse(fixture.dataset.fixtureAction),actions={patched:selectPatchedFixture,manufacturer:selectPatchManufacturer,fixture:selectPatchFixture,mode:selectPatchMode};if(Object.hasOwn(actions,name))actions[name](...args)}
  },true);
  document.addEventListener('keydown',event=>{
    if((event.key==='Enter'||event.key===' ')&&event.target.matches('[data-open-supply]')){event.preventDefault();event.target.click()}
  });
  new MutationObserver(()=>{if(!scheduled){scheduled=true;requestAnimationFrame(labelControls)}}).observe(document.body,{childList:true,subtree:true});
  labelControls();
})();
