"use client";
import { createContext,useContext,useMemo,useSyncExternalStore,type ReactNode } from "react";
import { createBrowserDemo,type BrowserDemoState } from "../lib/browser-demo-model";
const initial = createBrowserDemo();
let state = initial;
const listeners = new Set<() => void>();
function subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; }
const Context = createContext({ state: initial, update: (_work: (current: BrowserDemoState) => BrowserDemoState) => { void _work; }, reset: () => {} });
export function BrowserDemoProvider({ children }: { children: ReactNode }) {
  const current = useSyncExternalStore(subscribe, () => state, () => initial);
  const value = useMemo(() => ({ state: current, update: (work: (s: BrowserDemoState) => BrowserDemoState) => { state = work(state); listeners.forEach(fn => fn()); }, reset: () => { state = createBrowserDemo(); listeners.forEach(fn => fn()); } }), [current]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useBrowserDemo() { return useContext(Context); }
