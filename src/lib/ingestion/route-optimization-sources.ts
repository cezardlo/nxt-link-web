export type RouteOptimizationSource = {
  id: string;
  name: string;
  url: string;
  country: string;
  source: string;
};

export const routeOptimizationSources: RouteOptimizationSource[] = [
  {
    id: 'onfleet',
    name: 'Onfleet',
    url: 'https://onfleet.com',
    country: 'USA',
    source: 'curated-homepage-list-v1',
  },
  {
    id: 'optimoroute',
    name: 'OptimoRoute',
    url: 'https://optimoroute.com',
    country: 'USA',
    source: 'curated-homepage-list-v1',
  },
  {
    id: 'routific',
    name: 'Routific',
    url: 'https://routific.com',
    country: 'Canada',
    source: 'curated-homepage-list-v1',
  },
  {
    id: 'route4me',
    name: 'Route4Me',
    url: 'https://route4me.com',
    country: 'USA',
    source: 'curated-homepage-list-v1',
  },
  {
    id: 'badger-maps',
    name: 'Badger Maps',
    url: 'https://www.badgermapping.com',
    country: 'USA',
    source: 'curated-homepage-list-v1',
  },
  {
    id: 'circuit',
    name: 'Circuit for Teams',
    url: 'https://getcircuit.com/teams',
    country: 'USA',
    source: 'curated-homepage-list-v1',
  },
  {
    id: 'far-eye',
    name: 'FarEye',
    url: 'https://fareye.com',
    country: 'Global',
    source: 'curated-homepage-list-v1',
  },
  {
    id: 'bringg',
    name: 'Bringg',
    url: 'https://bringg.com',
    country: 'Global',
    source: 'curated-homepage-list-v1',
  },
];
