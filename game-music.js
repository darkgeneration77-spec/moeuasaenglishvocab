(()=>{
  let ac=null, master=null, timer=null, step=0;
  const melody=[261.63,329.63,392.00,523.25,392.00,329.63,293.66,392.00,493.88,587.33,493.88,392.00,329.63,440.00,523.25,659.25];
  const bass=[130.81,130.81,146.83,146.83,164.81,164.81,146.83,146.83];

  // Feedback belongs outside the vocabulary playfield. Humans need to see the words they are learning. Radical concept.
  function keepFeedbackOutOfGame(){
    try{
      const p=parent;
      if(!p||p===window||!p.document)return;
      const d=p.document;
      if(!d.getElementById('uasaGameFeedbackSafeZone')){
        const st=d.createElement('style');
        st.id='uasaGameFeedbackSafeZone';
        st.textContent=`
          .toast{
            top:4px!important;
            left:auto!important;
            right:12px!important;
            transform:translateY(-8px)!important;
            min-width:0!important;
            width:auto!important;
            max-width:330px!important;
            padding:5px 9px!important;
            border-radius:8px!important;
            font-size:11px!important;
            line-height:1.1!important;
            box-shadow:0 3px 10px #0007!important;
          }
          .toast.show{transform:translateY(0)!important}
          .toast .small{display:inline!important;font-size:9px!important;margin:0 0 0 6px!important;opacity:.9!important}
          .xpPop{top:38px!important;right:14px!important;font-size:14px!important;pointer-events:none!important}
          @media(max-width:760px){
            .toast{top:3px!important;right:5px!important;left:auto!important;max-width:52vw!important;padding:4px 7px!important;font-size:10px!important}
            .toast .small{font-size:8px!important}
            .xpPop{top:58px!important;right:6px!important;font-size:12px!important}
          }
        `;
        d.head.appendChild(st);
      }
    }catch(e){}
  }

  function addNinjaLevelBar(){
    if(!/ninja-vocab\.html/i.test(location.pathname)||document.getElementById('ninjaSevenLevels'))return;
    const hud=document.querySelector('.hud');
    if(!hud)return;
    const qs=new URLSearchParams(location.search),current=Math.max(1,+(qs.get('level')||1));
    const bar=document.createElement('div');
    bar.id='ninjaSevenLevels';
    bar.style.cssText='display:grid;grid-template-columns:repeat(7,1fr);gap:5px;margin:5px 0 7px';
    for(let n=1;n<=7;n++){
      const b=document.createElement('button');
      b.textContent='L'+n;
      b.title=n<7?`Level ${n}: 20 questions`:'Level 7: remaining questions';
      b.style.cssText=`border:1px solid ${n===current?'#fde047':'#31587c'};background:${n===current?'#854d0e':'#10233a'};color:#fff;border-radius:8px;padding:7px 2px;font-weight:900;cursor:pointer`;
      b.onclick=()=>{if(n===current)return;qs.set('level',String(n));location.href=location.pathname+'?'+qs.toString()};
      bar.appendChild(b);
    }
    hud.insertAdjacentElement('afterend',bar);
  }

  keepFeedbackOutOfGame();
  addNinjaLevelBar();
  setTimeout(()=>{keepFeedbackOutOfGame();addNinjaLevelBar()},120);
  setTimeout(()=>{keepFeedbackOutOfGame();addNinjaLevelBar()},600);

  function tone(freq,dur=.16,type='triangle',vol=.032){
    if(!ac||ac.state!=='running')return;
    const o=ac.createOscillator(),g=ac.createGain(),now=ac.currentTime;
    o.type=type;o.frequency.setValueAtTime(freq,now);
    g.gain.setValueAtTime(0.0001,now);
    g.gain.exponentialRampToValueAtTime(vol,now+.018);
    g.gain.exponentialRampToValueAtTime(0.0001,now+dur);
    o.connect(g);g.connect(master);o.start(now);o.stop(now+dur+.03);
  }
  function tick(){
    tone(melody[step%melody.length],.18,'triangle',.035);
    if(step%2===0)tone(bass[Math.floor(step/2)%bass.length],.28,'sine',.025);
    if(step%4===2)tone(880,.035,'square',.008);
    step++;
  }
  async function start(){
    try{
      keepFeedbackOutOfGame();
      if(!ac){
        ac=new (window.AudioContext||window.webkitAudioContext)();
        master=ac.createGain();master.gain.value=.48;master.connect(ac.destination);
      }
      if(ac.state==='suspended')await ac.resume();
      if(!timer){tick();timer=setInterval(tick,230);}
    }catch(e){}
  }
  function stop(){if(timer){clearInterval(timer);timer=null;}try{ac?.suspend()}catch(e){}}
  window.addEventListener('pointerdown',start,{passive:true});
  window.addEventListener('keydown',start);
  window.addEventListener('touchstart',start,{passive:true});
  window.addEventListener('pagehide',stop);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
})();
