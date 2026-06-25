import type { EiaFeed } from './eia.js';

// Claros EIA feed catalog — flagship series across every EIA dataset family.
// The adapter is generic, so adding any series = one more row here.
// decimals (k): unit-prices=6, percent=4, volumes/MWh/Btu=3, counts=0.
export const EIA_FEEDS: EiaFeed[] = [
  // ── Natural gas ──
  { asset_id: 'EIA.NG.PRICE.HENRYHUB.DAILY', route: 'natural-gas/pri/fut', frequency: 'daily', data_col: 'value', facets: { series: 'RNGWHHD' }, unit: '$/MMBtu', decimals: 6 },
  { asset_id: 'EIA.NG.PRICE.HENRYHUB_FUT1.DAILY', route: 'natural-gas/pri/fut', frequency: 'daily', data_col: 'value', facets: { series: 'RNGC1' }, unit: '$/MMBtu', decimals: 6 },
  { asset_id: 'EIA.NG.STORAGE.L48_WORKING.WEEKLY', route: 'natural-gas/stor/wkly', frequency: 'weekly', data_col: 'value', facets: { series: 'NW2_EPG0_SWO_R48_BCF' }, unit: 'Bcf', decimals: 3 },
  { asset_id: 'EIA.NG.PROD.MARKETED.MONTHLY', route: 'natural-gas/prod/sum', frequency: 'monthly', data_col: 'value', facets: { process: 'VGM', duoarea: 'NUS' }, unit: 'MMcf', decimals: 3 },
  { asset_id: 'EIA.NG.CONS.TOTAL.MONTHLY', route: 'natural-gas/cons/sum', frequency: 'monthly', data_col: 'value', facets: { process: 'VGT', duoarea: 'NUS' }, unit: 'MMcf', decimals: 3 },
  { asset_id: 'EIA.NG.RESERVES.DRY.ANNUAL', route: 'natural-gas/enr/dry', frequency: 'annual', data_col: 'value', facets: { duoarea: 'NUS' }, unit: 'Bcf', decimals: 3 },
  { asset_id: 'EIA.NG.IMPORTS.TOTAL.MONTHLY', route: 'natural-gas/move/impc', frequency: 'monthly', data_col: 'value', facets: { duoarea: 'NUS' }, unit: 'MMcf', decimals: 3 },

  // ── Petroleum ──
  { asset_id: 'EIA.PET.PRICE.WTI.DAILY', route: 'petroleum/pri/spt', frequency: 'daily', data_col: 'value', facets: { series: 'RWTC' }, unit: '$/bbl', decimals: 6 },
  { asset_id: 'EIA.PET.PRICE.BRENT.DAILY', route: 'petroleum/pri/spt', frequency: 'daily', data_col: 'value', facets: { series: 'RBRTE' }, unit: '$/bbl', decimals: 6 },
  { asset_id: 'EIA.PET.PRICE.GASOLINE_RETAIL.WEEKLY', route: 'petroleum/pri/gnd', frequency: 'weekly', data_col: 'value', facets: { series: 'EMM_EPM0_PTE_NUS_DPG' }, unit: '$/gal', decimals: 6 },
  { asset_id: 'EIA.PET.PRICE.DIESEL_RETAIL.WEEKLY', route: 'petroleum/pri/gnd', frequency: 'weekly', data_col: 'value', facets: { series: 'EMD_EPD2D_PTE_NUS_DPG' }, unit: '$/gal', decimals: 6 },
  { asset_id: 'EIA.PET.STOCKS.CRUDE_EXSPR.WEEKLY', route: 'petroleum/stoc/wstk', frequency: 'weekly', data_col: 'value', facets: { series: 'WCESTUS1' }, unit: 'Mbbl', decimals: 3 },
  { asset_id: 'EIA.PET.PROD.CRUDE_FIELD.MONTHLY', route: 'petroleum/crd/crpdn', frequency: 'monthly', data_col: 'value', facets: { duoarea: 'NUS', process: 'FPF' }, unit: 'Mbbl/d', decimals: 3 },
  { asset_id: 'EIA.PET.RESERVES.CRUDE.ANNUAL', route: 'petroleum/crd/pres', frequency: 'annual', data_col: 'value', facets: { duoarea: 'NUS' }, unit: 'MMbbl', decimals: 3 },
  { asset_id: 'EIA.PET.SUPPLIED.PRODUCTS.WEEKLY', route: 'petroleum/cons/wpsup', frequency: 'weekly', data_col: 'value', facets: { series: 'WRPUPUS2' }, unit: 'Mbbl/d', decimals: 3 },
  { asset_id: 'EIA.PET.IMPORTS.CRUDE_SAU.MONTHLY', route: 'crude-oil-imports', frequency: 'monthly', data_col: 'quantity', facets: { originId: 'SAU', destinationType: 'US' }, unit: 'Mbbl', decimals: 3 },

  // ── Electricity ──
  { asset_id: 'EIA.ELEC.DEMAND.US48.HOURLY', route: 'electricity/rto/region-data', frequency: 'hourly', data_col: 'value', facets: { respondent: 'US48', type: 'D' }, unit: 'MWh', decimals: 3 },
  { asset_id: 'EIA.ELEC.INTERCHANGE.US48.HOURLY', route: 'electricity/rto/region-data', frequency: 'hourly', data_col: 'value', facets: { respondent: 'US48', type: 'TI' }, unit: 'MWh', decimals: 3 },
  { asset_id: 'EIA.ELEC.GEN_NG.US48.HOURLY', route: 'electricity/rto/fuel-type-data', frequency: 'hourly', data_col: 'value', facets: { respondent: 'US48', fueltype: 'NG' }, unit: 'MWh', decimals: 3 },
  { asset_id: 'EIA.ELEC.RETAIL.PRICE.US_ALL.MONTHLY', route: 'electricity/retail-sales', frequency: 'monthly', data_col: 'price', facets: { stateid: 'US', sectorid: 'ALL' }, unit: 'cents/kWh', decimals: 6 },
  { asset_id: 'EIA.ELEC.RETAIL.SALES.US_ALL.MONTHLY', route: 'electricity/retail-sales', frequency: 'monthly', data_col: 'sales', facets: { stateid: 'US', sectorid: 'ALL' }, unit: 'million kWh', decimals: 3 },
  { asset_id: 'EIA.ELEC.RETAIL.REVENUE.US_ALL.MONTHLY', route: 'electricity/retail-sales', frequency: 'monthly', data_col: 'revenue', facets: { stateid: 'US', sectorid: 'ALL' }, unit: 'million $', decimals: 3 },
  { asset_id: 'EIA.ELEC.RETAIL.CUSTOMERS.US_RES.MONTHLY', route: 'electricity/retail-sales', frequency: 'monthly', data_col: 'customers', facets: { stateid: 'US', sectorid: 'RES' }, unit: 'count', decimals: 0 },

  // ── Coal ──
  { asset_id: 'EIA.COAL.PROD.US.ANNUAL', route: 'coal/aggregate-production', frequency: 'annual', data_col: 'production', facets: { location: 'US' }, unit: 'short tons', decimals: 3 },
  { asset_id: 'EIA.COAL.PRICE.MARKET.US.ANNUAL', route: 'coal/market-sales-price', frequency: 'annual', data_col: 'price', facets: { stateRegionId: 'US' }, unit: '$/short ton', decimals: 6 },
  { asset_id: 'EIA.COAL.PRICE.BITUMINOUS.QUARTERLY', route: 'coal/price-by-rank', frequency: 'quarterly', data_col: 'price', facets: { coalRankId: 'BIT' }, unit: '$/short ton', decimals: 6 },

  // ── Densified biomass (quarterly EIA-63C; verify columns live) ──
  { asset_id: 'EIA.DBF.PROD.US.QUARTERLY', route: 'densified-biomass/production-by-region', frequency: 'quarterly', data_col: 'value', facets: {}, unit: 'short tons', decimals: 3 },
  { asset_id: 'EIA.DBF.SALES_PRICE.US.QUARTERLY', route: 'densified-biomass/sales-and-price-by-region', frequency: 'quarterly', data_col: 'value', facets: {}, unit: '$/short ton', decimals: 6 },

  // ── Nuclear outages (daily) ──
  { asset_id: 'EIA.NUC.OUTAGE.US_PCT.DAILY', route: 'nuclear-outages/us-nuclear-outages', frequency: 'daily', data_col: 'percentOutage', facets: {}, unit: 'percent', decimals: 4 },
  { asset_id: 'EIA.NUC.OUTAGE.US_CAPACITY.DAILY', route: 'nuclear-outages/us-nuclear-outages', frequency: 'daily', data_col: 'capacity', facets: {}, unit: 'MW', decimals: 3 },

  // ── Outlooks ──
  { asset_id: 'EIA.STEO.WTI_PRICE.MONTHLY', route: 'steo', frequency: 'monthly', data_col: 'value', facets: { seriesId: 'WTIPUUS' }, unit: '$/bbl', decimals: 6 },
  { asset_id: 'EIA.STEO.BRENT_PRICE.MONTHLY', route: 'steo', frequency: 'monthly', data_col: 'value', facets: { seriesId: 'BREPUUS' }, unit: '$/bbl', decimals: 6 },

  // ── Total energy ──
  { asset_id: 'EIA.TOTAL.PRIMARY_CONS.MONTHLY', route: 'total-energy', frequency: 'monthly', data_col: 'value', facets: { msn: 'TETCBUS' }, unit: 'trillion Btu', decimals: 3 },

  // ── SEDS (state energy) ──
  { asset_id: 'EIA.SEDS.TOTAL_CONS.CA.ANNUAL', route: 'seds', frequency: 'annual', data_col: 'value', facets: { seriesId: 'TETCB', stateId: 'CA' }, unit: 'billion Btu', decimals: 3 },
  { asset_id: 'EIA.SEDS.PROD.CA.ANNUAL', route: 'seds', frequency: 'annual', data_col: 'value', facets: { seriesId: 'TEPRB', stateId: 'CA' }, unit: 'billion Btu', decimals: 3 },

  // ── CO2 emissions ──
  { asset_id: 'EIA.CO2.AGG.US_TOTAL.ANNUAL', route: 'co2-emissions/co2-emissions-aggregates', frequency: 'annual', data_col: 'value', facets: { stateId: 'US', fuelId: 'TO', sectorId: 'TT' }, unit: 'MMT CO2', decimals: 6 },

  // ── International ──
  { asset_id: 'EIA.INTL.CRUDE_PROD.WORLD.ANNUAL', route: 'international', frequency: 'annual', data_col: 'value', facets: { activityId: '1', productId: '57', countryRegionId: 'WORL', unit: 'TBPD' }, unit: 'Mbbl/d', decimals: 3 },
];

export const FEED_BY_ID: Record<string, EiaFeed> = Object.fromEntries(
  EIA_FEEDS.map(f => [f.asset_id, f]),
);
