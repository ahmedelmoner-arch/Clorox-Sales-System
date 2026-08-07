const fs = require('fs');
const { getSheetRows } = require('./services/sheets.service');
const { buildProductNameToIdMap, normalizeProductName, getTargetRowProductTargets } = require('./services/target.service');

(async () => {
  try {
    const products = await getSheetRows('Products');
    const targets = await getSheetRows('Targets');
    const productMap = buildProductNameToIdMap(products.rows);
    const keysToCheck = [
      'Kitchen Cleaner Regular 500ml',
      'Kitchen Cleaner Lemon 500ml',
      'Bathroom Cleaner 500ml',
      'Multipurpose Cleaner 500ml',
      'CDW F. Pack10',
      'CDW L. Pack10',
      'CDW F. Pack20',
      'CDW L. Pack20',
      'CDW F. Pack40',
      'CDW L. Pack40',
    ];
    const keyResults = keysToCheck.map((key) => ({
      key,
      normalized: normalizeProductName(key),
      idExact: productMap.get(key),
      idLower: productMap.get(key.toLowerCase()),
      idNorm: productMap.get(normalizeProductName(key)),
    }));
    const row = targets.rows[0] || {};
    const productTargets = Object.fromEntries(getTargetRowProductTargets(row, productMap));
    fs.writeFileSync('tmp-debug-target-map-check.json', JSON.stringify({ keyResults, headerKeys: Object.keys(row), productTargets }, null, 2), 'utf8');
    console.log('Wrote tmp-debug-target-map-check.json');
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();