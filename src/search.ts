import type { LifeSpecsData, SearchResult } from './types';

export function searchSpecs(data: LifeSpecsData, query: string): SearchResult[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return [];
  }

  return data.specs
    .map((spec) => {
      const asset = data.assets.find((item) => item.id === spec.assetId);
      const section = data.sections.find((item) => item.id === spec.sectionId);
      if (!asset || !section) {
        return null;
      }

      const haystack = `${spec.name} ${spec.value} ${spec.notes ?? ''} ${asset.name} ${section.name}`.toLowerCase();
      return haystack.includes(normalized) ? { spec, asset, section } : null;
    })
    .filter((result): result is SearchResult => Boolean(result));
}

export function countSpecsForAsset(data: LifeSpecsData, assetId: string) {
  return data.specs.filter((spec) => spec.assetId === assetId).length;
}

export function countSpecsForSection(data: LifeSpecsData, sectionId: string) {
  return data.specs.filter((spec) => spec.sectionId === sectionId).length;
}

export function homeForVehicle(data: LifeSpecsData, vehicleId: string) {
  const link = data.links.find((item) => item.sourceAssetId === vehicleId && item.relation === 'keptAt');
  return link ? data.assets.find((asset) => asset.id === link.targetAssetId && asset.type === 'home') : undefined;
}

export function vehiclesForHome(data: LifeSpecsData, homeId: string) {
  const vehicleIds = new Set(
    data.links
      .filter((item) => item.targetAssetId === homeId && item.relation === 'keptAt')
      .map((item) => item.sourceAssetId)
  );
  return data.assets.filter((asset) => asset.type === 'vehicle' && vehicleIds.has(asset.id));
}
