import React from 'react';
import {BRIDGEHEAD_ROUTE_PATHS,BRIDGEHEAD_EXTRACTION,BRIDGEHEAD_WARDEN,BRIDGEHEAD_WORLD} from './mission/bridgehead-run';

export function RouteMap({x,z,yaw,route}:{x:number;z:number;yaw:number;route:string}) {
  const point=(p:{x:number;z:number})=>`${p.x},${p.z}`;
  return <div className="route-map" aria-label="Bridgehead tactical map: charge route north, shield route south, court east">
    <small>BRIDGEHEAD <span>N ↑</span></small>
    <svg viewBox="-70 -57 172 107" role="img" aria-label={`Pilot on ${route || 'unselected'} route`}>
      <path className="map-chasm" transform="scale(3)" d="M-8-23 L6-20 3-9 9-2 5 6 10 20-6 20-11 8-7-2-12-10Z" />
      {BRIDGEHEAD_WORLD.boxes.map(b=><rect key={b.id} className="map-cover" x={b.center.x-b.size.x/2} y={b.center.z-b.size.z/2} width={b.size.x} height={b.size.z} />)}
      <polyline className={`map-high ${route==='low'?'map-muted':''}`} points={BRIDGEHEAD_ROUTE_PATHS.high.map(point).join(' ')} />
      <polyline className={`map-low ${route==='high'?'map-muted':''}`} points={BRIDGEHEAD_ROUTE_PATHS.low.map(point).join(' ')} />
      <text x="-26" y="-44">⚡ CHARGE</text><text x="-26" y="45">⬟ SHIELD</text>
      <text className="map-threat" x={BRIDGEHEAD_WARDEN.x-3} y={BRIDGEHEAD_WARDEN.z-3}>◆</text>
      <text x={BRIDGEHEAD_EXTRACTION.x-2} y={BRIDGEHEAD_EXTRACTION.z-3}>EXIT</text>
      <g transform={`translate(${x} ${z}) rotate(${-yaw*180/Math.PI}) scale(3)`}><path className="map-pilot" d="M0-2.5 L1.6 1.5 0 .6-1.6 1.5Z" /></g>
    </svg>
    <span>⚡ 3 charged shots · ⬟ 30 shield</span>
  </div>;
}
