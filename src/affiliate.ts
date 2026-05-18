export const AFFILIATE_TAG = 'your-tag-20';

export const BUY_TRIGGER_KEYWORDS = [
  'filter',
  'bulb',
  'lightbulb',
  'battery',
  'batteries',
  'wiper',
  'oil',
  'fuse',
  'cartridge',
  'belt',
  'pad',
  'bag'
];

export function shouldSuggestBuyLink(specName: string, _specValue = '') {
  const haystack = specName.toLowerCase();
  return BUY_TRIGGER_KEYWORDS.some((keyword) => haystack.includes(keyword));
}

export function buildAmazonUrl(specName: string, specValue: string) {
  const query = encodeURIComponent(`${specName} ${specValue}`.trim());
  return `https://www.amazon.com/s?k=${query}&tag=${AFFILIATE_TAG}`;
}
