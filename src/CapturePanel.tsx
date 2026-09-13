/// <reference types="vite/client" />
import React,{useState} from 'react';
import {BRIDGEHEAD_CAPTURE_VIEWS,BridgeheadCaptureView,poseBridgeheadCapture} from './bridgehead-capture-tour';

// These views reset and pose the sortie; they do not count as play evidence.
export function CapturePanel({sceneRef,launch}:{sceneRef:any;launch:()=>void}) {
  const [busy,setBusy]=useState(false),[report,setReport]=useState(''),[png,setPng]=useState(''),[view,setView]=useState('');
  const capture=async(id:BridgeheadCaptureView|'current')=>{
    setBusy(true);setPng('');setReport('Preparing inspection view…');
    try {
      const scene=sceneRef.current;
      const position=scene.querySelector('#player').object3D.position;
      const result=id==='current'?{kind:'current-runtime-frame',capturedAt:new Date().toISOString(),paused:!scene.isPlaying,
        buildScript:Array.from(document.scripts).map(script=>script.src).find(src=>src.includes('/assets/'))||null,
        missionStage:scene.components['bridgehead-run']?.stage,route:scene.components['bridgehead-run']?.route,
        player:{x:position.x,y:position.y,z:position.z},elapsedMs:scene.components['game-manager']?.elapsed,
        qaReport:document.getElementsByClassName('playtest-panel')[0]?.querySelector('pre')?.textContent,
        evidenceLimit:'Current frame only; input provenance is supplied by the paired run report.'}:await poseBridgeheadCapture(scene,id,launch);
      // Copy immediately after drawing; no persistent framebuffer overhead in gameplay.
      scene.renderer.render(scene.object3D,scene.camera);
      const png=scene.renderer.domElement.toDataURL('image/png');
      setPng(png);setView(id);setReport(JSON.stringify(result,null,2));
      if(['127.0.0.1','localhost','[::1]'].includes(location.hostname)){
        const response=await fetch('/__inspection-capture',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({view:id,png,metadata:result})});
        if(!response.ok)throw Error('Local capture save failed');
        const saved=await response.json();setReport(JSON.stringify({...result,savedPath:saved.path},null,2));
      }
    } catch(error){setReport(String(error));} finally{setBusy(false);}
  };
  return <details className="capture-panel"><summary>Gameplay image inspection</summary>
    <p>Paused, posed views with actual assets and collision metadata. Resets the sortie.</p>
    {BRIDGEHEAD_CAPTURE_VIEWS.map(v=><button key={v.id} disabled={busy} onClick={()=>capture(v.id)}>Capture {v.label}</button>)}
    <button disabled={busy} onClick={()=>capture('current')}>Save current gameplay frame</button>
    {png&&<a href={png} download={`bridgehead-${view}.png`}><img style={{width:'100%'}} src={png} alt={`Bridgehead ${view} runtime inspection`} /></a>}
    <pre data-capture-report="" role="status">{report}</pre>
  </details>;
}
