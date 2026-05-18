import type { LifeSpecsData } from './types';

export function createJsonBackup(data: LifeSpecsData) {
  return JSON.stringify(data, null, 2);
}

export function createTextSummary(data: LifeSpecsData) {
  const lines = ['LifeSpecs Summary', `Updated: ${new Date(data.updatedAt).toLocaleString()}`, ''];

  for (const asset of data.assets) {
    lines.push(`${asset.type === 'home' ? 'Home' : 'Vehicle'}: ${asset.name}`);
    const sections = data.sections.filter((section) => section.assetId === asset.id);
    for (const section of sections) {
      const specs = data.specs.filter((spec) => spec.sectionId === section.id);
      if (!specs.length) {
        continue;
      }
      lines.push(`  ${section.name}`);
      for (const spec of specs) {
        lines.push(`    ${spec.name}: ${spec.value}`);
        if (spec.notes) {
          lines.push(`      Notes: ${spec.notes}`);
        }
      }
    }
    lines.push('');
  }

  return lines.join('\n').trim() + '\n';
}

export function downloadText(filename: string, contents: string, type: string) {
  const blob = new Blob([contents], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
