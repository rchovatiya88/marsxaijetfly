export type Settings = { sensitivity: number; reducedMotion: boolean; invertY: boolean; volume: number };
const defaults: Settings = {sensitivity:0.5,reducedMotion:false,invertY:false,volume:0.7};
export function readSettings(): Settings {
  try {
    const value = JSON.parse(localStorage.getItem('mars-settings-v1') || '{}');
    const number = (key: 'sensitivity' | 'volume', min: number,max: number) => typeof value?.[key] === 'number' && Number.isFinite(value[key]) ? Math.max(min,Math.min(max,value[key])) : defaults[key];
    return {sensitivity:number('sensitivity',0.1,1.5),volume:number('volume',0,1),reducedMotion:value?.reducedMotion === true,invertY:value?.invertY === true};
  } catch { return {...defaults}; }
}
export function saveSettings(settings: Settings): void {
  try {localStorage.setItem('mars-settings-v1',JSON.stringify(settings));} catch { /* Storage is optional. */ }
}
