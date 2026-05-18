import { Car, Copy, Download, Edit3, FileText, Home, Link2, Plus, Search, Settings, Trash2, Upload } from 'lucide-react';
import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { buildAmazonUrl, shouldSuggestBuyLink } from './affiliate';
import { createInitialData, deleteAsset, deleteSection, deleteSpec, updateAsset, updateSection, upsertSpec, withAsset, withSection } from './data';
import { createJsonBackup, createTextSummary, downloadText } from './exporters';
import { countSpecsForAsset, countSpecsForSection, homeForVehicle, searchSpecs, vehiclesForHome } from './search';
import { clearLifeSpecsData, importLifeSpecsData, loadLifeSpecsData, saveLifeSpecsData } from './storage';
import type { Asset, AssetType, LifeSpecsData, Section, Spec } from './types';

type Tab = 'home' | 'search' | 'settings';
type View = { kind: 'dashboard' } | { kind: 'asset'; id: string } | { kind: 'spec'; id: string };
type AssetForm = { id?: string; type: AssetType; name: string; color: string; linkedHomeId: string };
type SectionForm = { id?: string; assetId: string; name: string };
type SpecForm = { id?: string; assetId: string; sectionId: string; name: string; value: string; notes: string; buyUrl: string };

const colors = { home: '#2f6f61', vehicle: '#445f99' };

export default function App() {
  const [data, setData] = useState<LifeSpecsData | null>(null);
  const [tab, setTab] = useState<Tab>('home');
  const [view, setView] = useState<View>({ kind: 'dashboard' });
  const [query, setQuery] = useState('');
  const [toast, setToast] = useState('');
  const [assetForm, setAssetForm] = useState<AssetForm | null>(null);
  const [sectionForm, setSectionForm] = useState<SectionForm | null>(null);
  const [specForm, setSpecForm] = useState<SpecForm | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => { loadLifeSpecsData().then(setData).catch(() => setData(createInitialData())); }, []);
  useEffect(() => { if (tab === 'search') setTimeout(() => searchRef.current?.focus(), 80); }, [tab]);

  const homes = data?.assets.filter((asset) => asset.type === 'home') ?? [];
  const vehicles = data?.assets.filter((asset) => asset.type === 'vehicle') ?? [];
  const results = useMemo(() => data ? searchSpecs(data, query) : [], [data, query]);

  async function persist(next: LifeSpecsData, message?: string) {
    setData(next);
    await saveLifeSpecsData(next);
    if (message) flash(message);
  }

  function flash(message: string) {
    setToast(message);
    setTimeout(() => setToast(''), 1500);
  }

  async function copy(value: string) {
    await navigator.clipboard?.writeText(value).catch(() => undefined);
    navigator.vibrate?.(16);
    flash('Copied');
  }

  if (!data) return <main className="app-shell loading">LifeSpecs</main>;

  const asset = view.kind === 'asset' ? data.assets.find((item) => item.id === view.id) : undefined;
  const spec = view.kind === 'spec' ? data.specs.find((item) => item.id === view.id) : undefined;

  return (
    <main className="app-shell">
      <header className="topbar">
        <button className="brand" type="button" onClick={() => { setTab('home'); setView({ kind: 'dashboard' }); }}>LifeSpecs<span>Homes and vehicles, offline</span></button>
        <button className="icon-button" type="button" aria-label="Search specs" onClick={() => setTab('search')}><Search size={20} /></button>
      </header>

      {tab === 'home' && view.kind === 'dashboard' && (
        <div className="screen-stack">
          <section className="hero-band"><p>Offline cheat sheet</p><h1>Specs you need when you are already at the shelf.</h1><div><button onClick={() => setAssetForm({ type: 'home', name: '', color: colors.home, linkedHomeId: '' })}><Plus size={18}/>Home</button><button onClick={() => setAssetForm({ type: 'vehicle', name: '', color: colors.vehicle, linkedHomeId: homes[0]?.id ?? '' })}><Plus size={18}/>Vehicle</button></div></section>
          <AssetGroup title="Homes" assets={homes} data={data} onOpen={(id) => setView({ kind: 'asset', id })} onEdit={(item) => setAssetForm({ id: item.id, type: item.type, name: item.name, color: item.color, linkedHomeId: '' })} onDelete={(item) => confirm(`Delete ${item.name}?`) && persist(deleteAsset(data, item.id), 'Asset deleted')} />
          <AssetGroup title="Vehicles" assets={vehicles} data={data} onOpen={(id) => setView({ kind: 'asset', id })} onEdit={(item) => setAssetForm({ id: item.id, type: item.type, name: item.name, color: item.color, linkedHomeId: homeForVehicle(data, item.id)?.id ?? '' })} onDelete={(item) => confirm(`Delete ${item.name}?`) && persist(deleteAsset(data, item.id), 'Asset deleted')} />
        </div>
      )}

      {tab === 'home' && asset && <AssetDetail data={data} asset={asset} onBack={() => setView({ kind: 'dashboard' })} onEditAsset={() => setAssetForm({ id: asset.id, type: asset.type, name: asset.name, color: asset.color, linkedHomeId: asset.type === 'vehicle' ? homeForVehicle(data, asset.id)?.id ?? '' : '' })} onAddSection={() => setSectionForm({ assetId: asset.id, name: '' })} onEditSection={(section) => setSectionForm({ id: section.id, assetId: section.assetId, name: section.name })} onDeleteSection={(section) => confirm(`Delete ${section.name}?`) && persist(deleteSection(data, section.id), 'Section deleted')} onAddSpec={(section) => setSpecForm({ assetId: asset.id, sectionId: section.id, name: '', value: '', notes: '', buyUrl: '' })} onOpenSpec={(id) => setView({ kind: 'spec', id })} onCopy={copy} />}

      {tab === 'home' && spec && <SpecDetail data={data} spec={spec} onBack={() => setView({ kind: 'asset', id: spec.assetId })} onEdit={() => setSpecForm({ id: spec.id, assetId: spec.assetId, sectionId: spec.sectionId, name: spec.name, value: spec.value, notes: spec.notes ?? '', buyUrl: spec.buyUrl ?? '' })} onDelete={() => confirm(`Delete ${spec.name}?`) && persist(deleteSpec(data, spec.id), 'Spec deleted').then(() => setView({ kind: 'asset', id: spec.assetId }))} onCopy={() => copy(spec.value)} />}

      {tab === 'search' && <SearchView query={query} setQuery={setQuery} results={results} searchRef={searchRef} onOpen={(id) => { setTab('home'); setView({ kind: 'spec', id }); }} onCopy={copy} />}
      {tab === 'settings' && <SettingsView data={data} onExportJson={() => downloadText('lifespecs-backup.json', createJsonBackup(data), 'application/json')} onExportText={() => downloadText('lifespecs-summary.txt', createTextSummary(data), 'text/plain')} onImport={async (file) => { if (!file) return; const next = await importLifeSpecsData(JSON.parse(await file.text())); setData(next); flash('Backup imported'); }} onReset={async () => { if (!confirm('Clear all local data?')) return; await clearLifeSpecsData(); const next = createInitialData(); await persist(next, 'Local data reset'); }} />}

      <nav className="tabbar"><button className={tab === 'home' ? 'active' : ''} onClick={() => { setTab('home'); setView({ kind: 'dashboard' }); }}><Home size={20}/>Home</button><button className={tab === 'search' ? 'active' : ''} onClick={() => setTab('search')}><Search size={20}/>Search</button><button className={tab === 'settings' ? 'active' : ''} onClick={() => setTab('settings')}><Settings size={20}/>Settings</button></nav>

      {assetForm && <AssetSheet form={assetForm} homes={homes} setForm={setAssetForm} onCancel={() => setAssetForm(null)} onSubmit={async (event) => { event.preventDefault(); const next = assetForm.id ? updateAsset(data, assetForm.id, { name: assetForm.name, color: assetForm.color }, assetForm.type === 'vehicle' ? assetForm.linkedHomeId : undefined) : withAsset(data, assetForm.type, assetForm.name, assetForm.type === 'vehicle' ? assetForm.linkedHomeId : undefined); await persist(next, assetForm.id ? 'Asset updated' : 'Asset added'); setAssetForm(null); }} />}
      {sectionForm && <SectionSheet form={sectionForm} setForm={setSectionForm} onCancel={() => setSectionForm(null)} onSubmit={async (event) => { event.preventDefault(); const next = sectionForm.id ? updateSection(data, sectionForm.id, sectionForm.name) : withSection(data, sectionForm.assetId, sectionForm.name); await persist(next, sectionForm.id ? 'Section updated' : 'Section added'); setSectionForm(null); }} />}
      {specForm && <SpecSheet form={specForm} sections={data.sections.filter((section) => section.assetId === specForm.assetId)} setForm={setSpecForm} onCancel={() => setSpecForm(null)} onSubmit={async (event) => { event.preventDefault(); const suggested = !specForm.buyUrl && shouldSuggestBuyLink(specForm.name, specForm.value) ? buildAmazonUrl(specForm.name, specForm.value) : ''; await persist(upsertSpec(data, { ...specForm, buyUrl: specForm.buyUrl || suggested }), specForm.id ? 'Spec updated' : 'Spec added'); setSpecForm(null); }} />}
      {toast && <div className="toast">{toast}</div>}
    </main>
  );
}

function AssetGroup({ title, assets, data, onOpen, onEdit, onDelete }: { title: string; assets: Asset[]; data: LifeSpecsData; onOpen: (id: string) => void; onEdit: (asset: Asset) => void; onDelete: (asset: Asset) => void }) {
  return <section className="asset-group"><h2>{title}</h2>{assets.map((asset) => { const home = asset.type === 'vehicle' ? homeForVehicle(data, asset.id) : undefined; const linked = asset.type === 'home' ? vehiclesForHome(data, asset.id) : []; return <article className="asset-card" key={asset.id} style={{ borderColor: asset.color }}><button className="asset-main" onClick={() => onOpen(asset.id)}><span className="asset-icon" style={{ backgroundColor: asset.color }}>{asset.type === 'home' ? <Home size={20}/> : <Car size={20}/>}</span><strong>{asset.name}</strong><small>{countSpecsForAsset(data, asset.id)} specs{home ? ` - linked to ${home.name}` : ''}{linked.length ? ` - ${linked.length} linked vehicle${linked.length === 1 ? '' : 's'}` : ''}</small></button><button onClick={() => onEdit(asset)}><Edit3 size={16}/></button><button onClick={() => onDelete(asset)}><Trash2 size={16}/></button></article>; })}</section>;
}

function AssetDetail({ data, asset, onBack, onEditAsset, onAddSection, onEditSection, onDeleteSection, onAddSpec, onOpenSpec, onCopy }: { data: LifeSpecsData; asset: Asset; onBack: () => void; onEditAsset: () => void; onAddSection: () => void; onEditSection: (section: Section) => void; onDeleteSection: (section: Section) => void; onAddSpec: (section: Section) => void; onOpenSpec: (id: string) => void; onCopy: (value: string) => void }) {
  return <div className="screen-stack"><button className="back" onClick={onBack}>Back</button><section className="asset-header" style={{ borderColor: asset.color }}><h1>{asset.name}</h1><p>{asset.type === 'vehicle' && homeForVehicle(data, asset.id) ? <><Link2 size={14}/> Kept at {homeForVehicle(data, asset.id)?.name}</> : asset.type}</p><button onClick={onEditAsset}><Edit3 size={16}/>Edit</button></section><button className="wide-button" onClick={onAddSection}><Plus size={18}/>Add Section</button>{data.sections.filter((section) => section.assetId === asset.id).map((section) => <section className="section-block" key={section.id}><div className="section-head"><h2>{section.name}</h2><small>{countSpecsForSection(data, section.id)} specs</small><button onClick={() => onAddSpec(section)}><Plus size={16}/></button><button onClick={() => onEditSection(section)}><Edit3 size={16}/></button><button onClick={() => onDeleteSection(section)}><Trash2 size={16}/></button></div>{data.specs.filter((spec) => spec.sectionId === section.id).map((spec) => <SpecRow key={spec.id} spec={spec} onOpen={() => onOpenSpec(spec.id)} onCopy={() => onCopy(spec.value)} />)}{!data.specs.some((spec) => spec.sectionId === section.id) && <p className="empty-state">Nothing stored yet. Tap + to start.</p>}</section>)}</div>;
}

function SpecRow({ spec, onOpen, onCopy }: { spec: Spec; onOpen: () => void; onCopy: () => void }) {
  return <article className="spec-row"><button onClick={onOpen}><span>{spec.name}</span><strong>{spec.value}</strong></button><button onClick={onCopy} aria-label={`Copy ${spec.name}`}><Copy size={16}/></button>{spec.buyUrl && <button onClick={() => window.open(spec.buyUrl, '_blank', 'noopener,noreferrer')}><FileText size={16}/></button>}</article>;
}

function SpecDetail({ data, spec, onBack, onEdit, onDelete, onCopy }: { data: LifeSpecsData; spec: Spec; onBack: () => void; onEdit: () => void; onDelete: () => void; onCopy: () => void }) {
  const asset = data.assets.find((item) => item.id === spec.assetId); const section = data.sections.find((item) => item.id === spec.sectionId);
  return <div className="screen-stack"><button className="back" onClick={onBack}>Back to {asset?.name}</button><section className="spec-detail"><p>{asset?.name} / {section?.name}</p><h1>{spec.name}</h1><div className="value-box">{spec.value}</div>{spec.notes && <p>{spec.notes}</p>}<button onClick={onCopy}><Copy size={18}/>Copy Value</button>{spec.buyUrl && <button onClick={() => window.open(spec.buyUrl, '_blank', 'noopener,noreferrer')}>Buy</button>}<button onClick={onEdit}><Edit3 size={16}/>Edit</button><button className="danger" onClick={onDelete}><Trash2 size={16}/>Delete</button></section></div>;
}

function SearchView({ query, setQuery, results, searchRef, onOpen, onCopy }: { query: string; setQuery: (value: string) => void; results: ReturnType<typeof searchSpecs>; searchRef: React.RefObject<HTMLInputElement>; onOpen: (id: string) => void; onCopy: (value: string) => void }) {
  return <div className="screen-stack"><label className="search-box"><Search size={20}/><input ref={searchRef} placeholder="Search any spec" value={query} onChange={(event) => setQuery(event.target.value)} /></label>{!query && <p className="empty-state">Start typing to find any spec in your home or vehicle.</p>}{query && !results.length && <p className="empty-state">No specs found for {query}.</p>}{results.map(({ spec, asset, section }) => <article className="search-result" key={spec.id}><button onClick={() => onOpen(spec.id)}><small>{asset.name} / {section.name}</small><span>{spec.name}</span><strong>{spec.value}</strong></button><button onClick={() => onCopy(spec.value)} aria-label={`Copy ${spec.name}`}><Copy size={16}/></button></article>)}</div>;
}

function SettingsView({ data, onExportJson, onExportText, onImport, onReset }: { data: LifeSpecsData; onExportJson: () => void; onExportText: () => void; onImport: (file?: File) => void; onReset: () => void }) {
  return <section className="settings-panel"><h1>Settings</h1><p>Version 0.1.0</p><button onClick={onExportJson}><Download size={18}/>Export Backup</button><button onClick={onExportText}><FileText size={18}/>Export Summary</button><label className="file-import"><Upload size={18}/>Import Backup<input type="file" accept="application/json,.json" onChange={(event) => onImport(event.target.files?.[0])}/></label><button className="danger" onClick={onReset}><Trash2 size={18}/>Clear Local Data</button><p>LifeSpecs stores data in this browser only. No account, backend, upload, or cloud sync is used in this build.</p><small>{data.assets.length} assets / {data.specs.length} specs saved locally</small></section>;
}

function Sheet({ title, children, onCancel }: { title: string; children: React.ReactNode; onCancel: () => void }) {
  return <div className="sheet-backdrop"><section className="sheet"><div className="sheet-heading"><h2>{title}</h2><button onClick={onCancel}>Cancel</button></div>{children}</section></div>;
}

function AssetSheet({ form, homes, setForm, onCancel, onSubmit }: { form: AssetForm; homes: Asset[]; setForm: (form: AssetForm | null) => void; onCancel: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  return <Sheet title={form.id ? 'Edit Asset' : 'Add Asset'} onCancel={onCancel}><form className="sheet-form" onSubmit={onSubmit}>{!form.id && <div className="segmented"><button type="button" className={form.type === 'home' ? 'selected' : ''} onClick={() => setForm({ ...form, type: 'home', color: colors.home })}>Home</button><button type="button" className={form.type === 'vehicle' ? 'selected' : ''} onClick={() => setForm({ ...form, type: 'vehicle', color: colors.vehicle })}>Vehicle</button></div>}<label>Name<input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })}/></label><label>Accent<input type="color" value={form.color} onChange={(event) => setForm({ ...form, color: event.target.value })}/></label>{form.type === 'vehicle' && <label>Linked home<select value={form.linkedHomeId} onChange={(event) => setForm({ ...form, linkedHomeId: event.target.value })}><option value="">No linked home</option>{homes.map((home) => <option key={home.id} value={home.id}>{home.name}</option>)}</select></label>}<button type="submit">Save</button></form></Sheet>;
}

function SectionSheet({ form, setForm, onCancel, onSubmit }: { form: SectionForm; setForm: (form: SectionForm | null) => void; onCancel: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  return <Sheet title={form.id ? 'Edit Section' : 'Add Section'} onCancel={onCancel}><form className="sheet-form" onSubmit={onSubmit}><label>Name<input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })}/></label><button type="submit">Save</button></form></Sheet>;
}

function SpecSheet({ form, sections, setForm, onCancel, onSubmit }: { form: SpecForm; sections: Section[]; setForm: (form: SpecForm | null) => void; onCancel: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  return <Sheet title={form.id ? 'Edit Spec' : 'Add Spec'} onCancel={onCancel}><form className="sheet-form" onSubmit={onSubmit}><label>Section<select value={form.sectionId} onChange={(event) => setForm({ ...form, sectionId: event.target.value })}>{sections.map((section) => <option key={section.id} value={section.id}>{section.name}</option>)}</select></label><label>Name<input required placeholder="HVAC Filter Size" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })}/></label><label>Value<input required placeholder="16x25x1" value={form.value} onChange={(event) => setForm({ ...form, value: event.target.value })}/></label><label>Notes<textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })}/></label><label>Buy link<input value={form.buyUrl} onChange={(event) => setForm({ ...form, buyUrl: event.target.value })}/></label><button type="submit">Save</button></form></Sheet>;
}
