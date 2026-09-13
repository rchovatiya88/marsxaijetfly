import React, {useRef,useState,useEffect} from 'react';

// A transparent browser scheduling diagnostic, not a GPU profiler or a player score.
export function FrameBenchmark({sceneRef}:{sceneRef:any}) {
  const [busy,setBusy]=useState(false),[report,setReport]=useState('');
  const cancel=useRef(false);
  useEffect(()=>()=>{cancel.current=true;},[]);
  const measure=async()=>{
    if(busy)return;
    setBusy(true);cancel.current=false;
    const scene=sceneRef.current,renderer=scene.renderer,canvas=renderer.domElement;
    const records:any[]=[];
    const start={viewport:[innerWidth,innerHeight],pixels:[canvas.width,canvas.height],dpr:devicePixelRatio,browser:navigator.userAgent,build:document.head.querySelector('script[type="module"]')?.getAttribute('src')};
    const frame=()=>new Promise<number>(resolve=>requestAnimationFrame(resolve));
    try {
      if(!scene.isPlaying)throw Error('Launch and keep the game focused before measuring.');
      for(let run=1;run<=3;run++) {
        for(let i=0;i<60;i++){await frame();if(cancel.current)throw Error('Cancelled');}
        const samples:number[]=[];let previous=await frame(),draws=0,triangles=0;
        for(let i=0;i<300;i++){
          const now=await frame();
          if(cancel.current || document.hidden || !scene.isPlaying)throw Error('Interrupted by stop, pause, result or focus loss; discard this set.');
          if(canvas.width!==start.pixels[0] || canvas.height!==start.pixels[1])throw Error('Renderer size changed; discard this set.');
          samples.push(now-previous);previous=now;
          draws=Math.max(draws,renderer.info.render.calls);triangles=Math.max(triangles,renderer.info.render.triangles);
          if(i%60===0)setReport(`Current-scene scheduling · run ${run}/3 · ${i}/300 frames\nFly normally to exercise the route. No automated movement or damage.`);
        }
        const ordered=[...samples].sort((a,b)=>a-b),percentile=(p:number)=>Number(ordered[Math.min(299,Math.ceil(p*300)-1)].toFixed(2));
        records.push({run,samples,median:percentile(.5),p95:percentile(.95),p99:percentile(.99),max:ordered[299],hitchesOver100:samples.filter(n=>n>100).length,draws,triangles,geometries:renderer.info.memory.geometries,textures:renderer.info.memory.textures});
      }
      const result={kind:'browser-frame-interval-diagnostic',...start,records,thresholdsMet:records.every(r=>r.p95<=20 && r.p99<=33.3 && !r.hitchesOver100),limitations:'Current scene, observed browser scheduling; hardware, power state and full-route workload require a declared foreground run. This is not a GPU timing trace.'};
      setReport(JSON.stringify(result,null,2));
    }catch(error){setReport(`${String(error)}\nCompleted runs: ${records.length}. No acceptance score awarded.`);}
    finally{setBusy(false);}
  };
  return <details className="frame-benchmark"><summary>Frame measurement</summary><p>3 × 300 frames after warmup. Keep this tab focused and fly through the route.</p><button disabled={busy} onClick={measure}>Measure current scene</button><button disabled={!busy} onClick={()=>{cancel.current=true;}}>Stop measurement</button><pre data-frame-report="" role="status">{report}</pre></details>;
}
