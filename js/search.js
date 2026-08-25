/* Search module boundary for the redesign. */
const GasolinaGoSearch = {
  debounceMs: 300,
  cache: new Map(),
  normalize(value) { return String(value || '').trim().toLocaleLowerCase('es-ES'); }
};
if (typeof window !== 'undefined') window.GasolinaGoSearch = GasolinaGoSearch;