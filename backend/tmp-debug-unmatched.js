const fs = require('fs');
const { getSheetRows } = require('./services/sheets.service');
const { buildProductNameToIdMap, normalizeProductName } = require('./services/target.service');

(async () => {
  try {
    const products = await getSheetRows('Products');
    const targets = await getSheetRows('Targets');
    const productMap = buildProductNameToIdMap(products.rows);
    const keys = Object.keys(targets.rows[0] || {}).filter((k) => !['UUID','Month','Date','DelegateID','DelegateName','BranchID','BranchName','TargetConsumer','TargetPieces','Target_Pieces'].includes(k));
    const unmatched = [];
    const matched = [];
    keys.forEach((key) => {
      const normalized = normalizeProductName(key);
      const id = productMap.get(key) || productMap.get(key.toLowerCase()) || productMap.get(normalized);
      if (!id) {
        unmatched.push({ key, normalized });
      } else {
        matched.push({ key, normalized, id });
      }
    });
    const output = { matched, unmatched, totalKeys: keys.length, matchedCount: matched.length, unmatchedCount: unmatched.length };
    fs.writeFileSync('tmp-debug-unmatched.json', JSON.stringify(output, null, 2), 'utf8');
    console.log('Wrote tmp-debug-unmatched.json');
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
})();
