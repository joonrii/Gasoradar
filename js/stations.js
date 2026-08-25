/* Station-data module boundary for the redesign. */
const GasolinaGoStations = {
  endpoint: '/api/precios',
  fuels: ['g95', 'g98', 'diesel']
};
if (typeof window !== 'undefined') window.GasolinaGoStations = GasolinaGoStations;