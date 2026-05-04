// Barrel re-export. The store has been split into per-mechanic slices under
// `./store/`. The public surface (`useGameStore`, all type names) is
// unchanged: any module that imports from `'./store'` or `'../store'` keeps
// working without modification.
export * from './store/index';
