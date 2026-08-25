/* GasolinaGo application bootstrap — extracted as part of the frontend migration. */
const GasolinaGoApp = {
  version: 'frontend-modular-1',
  init() {
    // Behaviour remains in the legacy page during this migration.
    // New modules will be moved here incrementally to keep main stable.
    return true;
  }
};
if (typeof window !== 'undefined') window.GasolinaGoApp = GasolinaGoApp;