'use client';

import { useState } from 'react';
import MapGL from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';

const MAP_STYLE = 'https://tiles.openfreemap.org/styles/dark';
const EL_PASO = { longitude: -106.4850, latitude: 31.7619, zoom: 10 };

export default function CommandCenter() {
  const [viewState, setViewState] = useState(EL_PASO);

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#07070F' }}>
      <MapGL
        {...viewState}
        onMove={e => setViewState(e.viewState)}
        style={{ width: '100%', height: '100%' }}
        mapStyle={MAP_STYLE}
        attributionControl={false}
        reuseMaps
      />
    </div>
  );
}
