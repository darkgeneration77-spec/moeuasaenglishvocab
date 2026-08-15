(()=>{
  let ac=null, master=null, timer=null, step=0;
  const melody=[261.63,329.63,392.00,523.25,392.00,329.63,293.66,392.00,493.88,587.33,493.88,392.00,329.63,440.00,523.25,659.25];
  const bass=[130.81,130.81,146.83,146.83,164.81,164.81,146.83,146.83];

  // Global game UI rule: feedback must never cover the vocabulary/game field.
  // All game iframes are same-origin, so move Reader V2 feedback into its own top bar.
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
            top:8px!important;
            left:50%!important;
            min-width:0!important;
            width:auto!important;
            max-width:min(420px,46vw)!important;
            padding:7px 13px!important;
            border-radius:10px!important;
            font-size:13px!important;
            line-height:1.15!important;
            box-shadow:0 6px 18px #0008!important;
          }
          .toast .small{display:inline!important;font-size:10px!important;margin:0 0 0 7px!important;opacity:.92!important}
          .xpPop{top:50px!important;right:14px!important;font-size:17px!important;pointer-events:none!important}
          @media(max-width:760px){
            .toast{top:6px!important;left:50%!important;max-width:58vw!important;padding:6px 10px!important;font-size:11px!important}
            .toast .small{font-size:9px!important}
            .xpPop{top:72px!important;right:8px!important;font-size:14px!important}
          }
        `;
        d.head.appendChild(st);
      }
    }catch(e){}
  }
  keepFeedbackOutOfGame();
  setTimeout(keepFeedbackOutOfGame,120);
  setTimeout(keepFeedbackOutOfGame,600);

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
