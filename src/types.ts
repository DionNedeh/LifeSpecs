export type AssetType = 'home' | 'vehicle';

export type LinkRelation = 'keptAt' | 'associatedWith';

export interface Asset {
  id: string;
  type: AssetType;
  name: string;
  color: string;
  createdAt: string;
  updatedAt: string;
}

export interface Section {
  id: string;
  assetId: string;
  name: string;
  color: string;
  createdAt: string;
  updatedAt: string;
}

export interface Spec {
  id: string;
  assetId: string;
  sectionId: string;
  name: string;
  value: string;
  notes?: string;
  buyUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AssetLink {
  id: string;
  sourceAssetId: string;
  targetAssetId: string;
  relation: LinkRelation;
}

export interface LifeSpecsData {
  version: 1;
  updatedAt: string;
  assets: Asset[];
  sections: Section[];
  specs: Spec[];
  links: AssetLink[];
}

export interface SearchResult {
  spec: Spec;
  asset: Asset;
  section: Section;
}
