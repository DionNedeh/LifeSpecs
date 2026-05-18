import { describe, expect, it } from 'vitest';
import { buildAmazonUrl, shouldSuggestBuyLink } from './affiliate';
import {
  createInitialData,
  deleteSpec,
  normalizeImport,
  updateAsset,
  upsertSpec,
  withAsset,
  withSection
} from './data';
import { createJsonBackup, createTextSummary } from './exporters';
import { homeForVehicle, searchSpecs, vehiclesForHome } from './search';

describe('LifeSpecs domain', () => {
  it('creates starter homes, vehicles, sections, and a vehicle-home link', () => {
    const data = createInitialData('2026-05-18T00:00:00.000Z');

    expect(data.assets.map((asset) => asset.type)).toEqual(['home', 'vehicle']);
    expect(data.sections.some((section) => section.name === 'HVAC / Utilities')).toBe(true);
    expect(data.sections.some((section) => section.name === 'Tires')).toBe(true);
    expect(homeForVehicle(data, 'vehicle-default')?.id).toBe('home-default');
    expect(vehiclesForHome(data, 'home-default')).toHaveLength(1);
  });

  it('adds homes and vehicles with default sections and optional links', () => {
    let data = createInitialData();
    data = withAsset(data, 'home', 'Cabin');
    const cabin = data.assets.find((asset) => asset.name === 'Cabin')!;
    data = withAsset(data, 'vehicle', 'RAV4', cabin.id);
    const rav4 = data.assets.find((asset) => asset.name === 'RAV4')!;

    expect(data.sections.filter((section) => section.assetId === cabin.id).length).toBeGreaterThan(0);
    expect(homeForVehicle(data, rav4.id)?.name).toBe('Cabin');
  });

  it('updates vehicle links when the selected home changes', () => {
    let data = createInitialData();
    data = withAsset(data, 'home', 'Lake House');
    const lakeHouse = data.assets.find((asset) => asset.name === 'Lake House')!;
    const vehicle = data.assets.find((asset) => asset.type === 'vehicle')!;

    data = updateAsset(data, vehicle.id, { name: vehicle.name, color: vehicle.color }, lakeHouse.id);

    expect(homeForVehicle(data, vehicle.id)?.id).toBe(lakeHouse.id);
    expect(vehiclesForHome(data, 'home-default')).toHaveLength(0);
  });

  it('searches across specs, sections, and assets', () => {
    let data = createInitialData();
    const vehicle = data.assets.find((asset) => asset.type === 'vehicle')!;
    const tires = data.sections.find((section) => section.assetId === vehicle.id && section.name === 'Tires')!;
    data = upsertSpec(data, {
      assetId: vehicle.id,
      sectionId: tires.id,
      name: 'Tire Size',
      value: '225/65R17',
      notes: 'Door jamb label'
    });

    expect(searchSpecs(data, '225')).toHaveLength(1);
    expect(searchSpecs(data, 'tires')[0].asset.name).toBe(vehicle.name);
    expect(searchSpecs(data, 'missing')).toHaveLength(0);
  });

  it('handles spec add, update, and delete', () => {
    let data = createInitialData();
    const home = data.assets.find((asset) => asset.type === 'home')!;
    const kitchen = data.sections.find((section) => section.assetId === home.id && section.name === 'Kitchen')!;
    data = withSection(data, home.id, 'Network');
    data = upsertSpec(data, {
      assetId: home.id,
      sectionId: kitchen.id,
      name: 'WiFi Password',
      value: 'correct horse'
    });
    const spec = data.specs[0];
    data = upsertSpec(data, { ...spec, value: 'updated password' });

    expect(data.specs[0].value).toBe('updated password');
    expect(data.sections.some((section) => section.name === 'Network')).toBe(true);

    data = deleteSpec(data, spec.id);
    expect(data.specs).toHaveLength(0);
  });

  it('suggests quiet affiliate links for reorderable specs', () => {
    expect(shouldSuggestBuyLink('HVAC Filter Size', '16x25x1')).toBe(true);
    expect(shouldSuggestBuyLink('VIN', '123')).toBe(false);
    expect(shouldSuggestBuyLink('WiFi Password', 'correct horse battery staple')).toBe(false);
    expect(buildAmazonUrl('Cabin filter', 'CF10285')).toContain('tag=your-tag-20');
  });

  it('exports and imports backups', () => {
    const data = createInitialData('2026-05-18T00:00:00.000Z');
    const backup = createJsonBackup(data);
    const imported = normalizeImport(JSON.parse(backup));
    const summary = createTextSummary(imported);

    expect(imported.assets).toHaveLength(2);
    expect(summary).toContain('LifeSpecs Summary');
    expect(summary).toContain('My Vehicle');
  });
});
