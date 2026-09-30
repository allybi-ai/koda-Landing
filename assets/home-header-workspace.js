/* Home-only adapter: shared landing routes remain owned by allybi-header.js. */
document.addEventListener('DOMContentLoaded', () => {
  const header=document.querySelector('.site-header');
  if(!header || !window.WorkspaceMenuMotion) return;
  header.querySelectorAll('[data-dropdown]').forEach(group => {
    const trigger=group.querySelector('.site-header__nav-trigger');
    const panel=group.querySelector('.site-header__dropdown-panel');
    const links=[...panel.children];
    const surface=document.createElement('div');
    surface.className='allybi-dropdown__surface workspace-popover-surface';
    surface.setAttribute('aria-hidden','true');
    const reveal=document.createElement('div');
    reveal.className='allybi-dropdown__reveal';
    const viewport=document.createElement('div');
    viewport.className='allybi-dropdown__viewport';
    const items=document.createElement('div');
    items.className='allybi-dropdown__items';
    links.forEach(link => {
      link.classList.add('allybi-dropdown__item');
      const label=document.createElement('span');
      label.className='allybi-dropdown__label';
      while(link.firstChild) label.append(link.firstChild);
      link.append(label); items.append(link);
    });
    viewport.append(items); reveal.append(viewport); panel.append(surface,reveal);
    panel.classList.add('allybi-dropdown','workspace-popover-surface');
    panel.inert=true; panel.setAttribute('aria-hidden','true');
    function measure() {
      const anchor=trigger.getBoundingClientRect(), parent=group.getBoundingClientRect();
      const width=panel.offsetWidth;
      const left=Math.max(10,Math.min(anchor.left-12,innerWidth-width-10));
      panel.style.left=(left-parent.left)+'px';
      panel.style.top=(anchor.bottom-parent.top+8)+'px';
      panel.style.maxHeight=Math.max(0,Math.min(420,innerHeight-anchor.bottom-18))+'px';
      const box=panel.getBoundingClientRect();
      return {left:box.left,top:box.top,width:panel.offsetWidth,height:panel.offsetHeight,
        sourceLeft:Math.max(0,anchor.left-box.left),sourceRight:Math.min(width,anchor.right-box.left),gap:8,placement:'bottom'};
    }
    const motion=WorkspaceMenuMotion.createMotion(panel,measure);
    const open=()=>group.getAttribute('data-open')==='true';
    new MutationObserver(()=>motion.retarget(open())).observe(group,{attributes:true,attributeFilter:['data-open']});
    const reposition=()=>{if(open()) motion.retarget(true);};
    header.addEventListener('allybi:header-geometry',reposition);
    window.addEventListener('resize',reposition);
    window.addEventListener('scroll',reposition,true);
    new ResizeObserver(reposition).observe(trigger);
    trigger.addEventListener('keydown',event=>{
      if(event.key==='ArrowDown') {
        event.preventDefault(); if(!open()) trigger.click();
        requestAnimationFrame(()=>links[0]?.focus());
      }
    });
    panel.addEventListener('keydown',event=>{
      let next;
      const current=links.indexOf(document.activeElement);
      if(event.key==='ArrowDown') next=(current+1)%links.length;
      if(event.key==='ArrowUp') next=(current-1+links.length)%links.length;
      if(event.key==='Home') next=0;
      if(event.key==='End') next=links.length-1;
      if(next!==undefined) {event.preventDefault();links[next].focus();}
      if(event.key==='Escape') trigger.focus();
      if(event.key==='Tab') {group.setAttribute('data-open','false');trigger.setAttribute('aria-expanded','false');}
    });
  });
});
