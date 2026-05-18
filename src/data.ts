import type { Asset, AssetLink, AssetType, LifeSpecsData, Section, Spec } from './types';

export const HOME_SECTION_DEFAULTS = [
  'Kitchen',
  'Living Room',
  'Bedrooms',
  'Bathrooms',
  'HVAC / Utilities',
  'Garage',
  'Exterior'
];

export const VEHICLE_SECTION_DEFAULTS = [
  'Identity',
  'Tires',
  'Fluids',
  'Filters',
  'Battery',
  'Wipers',
  'Paint',
  'Insurance / Registration'
];

const COLORS = ['#2f6f61', '#8f5d33', '#445f99', '#8a4f70', '#47705f', '#a26f2a', '#3f6d83'];

export function nowIso(now = new Date()) {
  return now.toISOString();
}

export function makeId(prefix: string) {
  const cryptoId =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);
  return `${prefix}-${cryptoId}`;
}

export function createAsset(type: AssetType, name: string, now = nowIso()): Asset {
  const assetIndex = type === 'home' ? 0 : 2;
  return {
    id: makeId(type),
    type,
    name: name.trim() || (type === 'home' ? 'My Home' : 'My Vehicle'),
    color: COLORS[assetIndex],
    createdAt: now,
    updatedAt: now
  };
}

export function createDefaultSections(asset: Asset, now = nowIso()): Section[] {
  const names = asset.type === 'home' ? HOME_SECTION_DEFAULTS : VEHICLE_SECTION_DEFAULTS;
  return names.map((name, index) => ({
    id: makeId('section'),
    assetId: asset.id,
    name,
    color: COLORS[index % COLORS.length],
    createdAt: now,
    updatedAt: now
  }));
}

export function createInitialData(now = nowIso()): LifeSpecsData {
  const home: Asset = {
    id: 'home-default',
    type: 'home',
    name: 'My Home',
    color: COLORS[0],
    createdAt: now,
    updatedAt: now
  };
  const vehicle: Asset = {
    id: 'vehicle-default',
    type: 'vehicle',
    name: 'My Vehicle',
    color: COLORS[2],
    createdAt: now,
    updatedAt: now
  };

  const sections = [...createDefaultSections(home, now), ...createDefaultSections(vehicle, now)];

  return {
    version: 1,
    updatedAt: now,
    assets: [home, vehicle],
    sections,
    specs: [],
    links: [
      {
        id: 'link-default',
        sourceAssetId: vehicle.id,
        targetAssetId: home.id,
        relation: 'keptAt'
      }
    ]
  };
}

export function withAsset(data: LifeSpecsData, type: AssetType, name: string, linkedHomeId?: string): LifeSpecsData {
  const now = nowIso();
  const asset = createAsset(type, name, now);
  const sections = createDefaultSections(asset, now);
  const link: AssetLink | null =
    type === 'vehicle' && linkedHomeId
      ? {
          id: makeId('link'),
          sourceAssetId: asset.id,
          targetAssetId: linkedHomeId,
          relation: 'keptAt'
        }
      : null;

  return touch({
    ...data,
    assets: [...data.assets, asset],
    sections: [...data.sections, ...sections],
    links: link ? [...data.links, link] : data.links
  });
}

export function updateAsset(
  data: LifeSpecsData,
  assetId: string,
  updates: Pick<Asset, 'name' | 'color'>,
  linkedHomeId?: string
): LifeSpecsData {
  const now = nowIso();
  const asset = data.assets.find((item) => item.id === assetId);
  const linksWithoutVehicleHome = data.links.filter(
    (link) => !(link.sourceAssetId === assetId && link.relation === 'keptAt')
  );
  const nextLink =
    asset?.type === 'vehicle' && linkedHomeId
      ? [
          {
            id: makeId('link'),
            sourceAssetId: assetId,
            targetAssetId: linkedHomeId,
            relation: 'keptAt' as const
          }
        ]
      : [];

  return touch({
    ...data,
    assets: data.assets.map((item) =>
      item.id === assetId
        ? { ...item, name: updates.name.trim() || item.name, color: updates.color, updatedAt: now }
        : item
    ),
    links: [...linksWithoutVehicleHome, ...nextLink]
  });
}

export function deleteAsset(data: LifeSpecsData, assetId: string): LifeSpecsData {
  return touch({
    ...data,
    assets: data.assets.filter((asset) => asset.id !== assetId),
    sections: data.sections.filter((section) => section.assetId !== assetId),
    specs: data.specs.filter((spec) => spec.assetId !== assetId),
    links: data.links.filter((link) => link.sourceAssetId !== assetId && link.targetAssetId !== assetId)
  });
}

export function withSection(data: LifeSpecsData, assetId: string, name: string): LifeSpecsData {
  const now = nowIso();
  return touch({
    ...data,
    sections: [
      ...data.sections,
      {
        id: makeId('section'),
        assetId,
        name: name.trim() || 'New Section',
        color: COLORS[data.sections.length % COLORS.length],
        createdAt: now,
        updatedAt: now
      }
    ]
  });
}

export function updateSection(data: LifeSpecsData, sectionId: string, name: string): LifeSpecsData {
  const now = nowIso();
  return touch({
    ...data,
    sections: data.sections.map((section) =>
      section.id === sectionId ? { ...section, name: name.trim() || section.name, updatedAt: now } : section
    )
  });
}

export function deleteSection(data: LifeSpecsData, sectionId: string): LifeSpecsData {
  return touch({
    ...data,
    sections: data.sections.filter((section) => section.id !== sectionId),
    specs: data.specs.filter((spec) => spec.sectionId !== sectionId)
  });
}

export function upsertSpec(
  data: LifeSpecsData,
  input: Pick<Spec, 'assetId' | 'sectionId' | 'name' | 'value'> & Partial<Pick<Spec, 'id' | 'notes' | 'buyUrl'>>
): LifeSpecsData {
  const now = nowIso();
  const existing = input.id ? data.specs.find((spec) => spec.id === input.id) : undefined;
  const nextSpec: Spec = {
    id: input.id ?? makeId('spec'),
    assetId: input.assetId,
    sectionId: input.sectionId,
    name: input.name.trim(),
    value: input.value.trim(),
    notes: input.notes?.trim() || undefined,
    buyUrl: input.buyUrl?.trim() || undefined,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now
  };

  if (!nextSpec.name || !nextSpec.value) {
    return data;
  }

  return touch({
    ...data,
    specs: existing
      ? data.specs.map((spec) => (spec.id === nextSpec.id ? nextSpec : spec))
      : [nextSpec, ...data.specs]
  });
}

export function deleteSpec(data: LifeSpecsData, specId: string): LifeSpecsData {
  return touch({
    ...data,
    specs: data.specs.filter((spec) => spec.id !== specId)
  });
}

export function normalizeImport(value: unknown): LifeSpecsData {
  if (!value || typeof value !== 'object') {
    throw new Error('Import file is not a LifeSpecs backup.');
  }

  const data = value as Partial<LifeSpecsData>;
  if (!Array.isArray(data.assets) || !Array.isArray(data.sections) || !Array.isArray(data.specs)) {
    throw new Error('Backup is missing assets, sections, or specs.');
  }

  return {
    version: 1,
    updatedAt: typeof data.updatedAt === 'string' ? data.updatedAt : nowIso(),
    assets: data.assets,
    sections: data.sections,
    specs: data.specs,
    links: Array.isArray(data.links) ? data.links : []
  };
}

function touch(data: LifeSpecsData): LifeSpecsData {
  return {
    ...data,
    updatedAt: nowIso()
  };
}
