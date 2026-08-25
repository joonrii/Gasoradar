/* Map module boundary for the redesign. Leaflet/map behaviour will move here incrementally. */
const GasolinaGoMap = {
  maxClusterRadius: 55,
  disableClusteringAtZoom: 14
};
if (typeof window !== 'undefined') window.GasolinaGoMap = GasolinaGoMap;