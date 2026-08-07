const fs = require('fs');
const { getSheetRows } = require('./services/sheets.service');

(async () => {
  try {
    const products = await getSheetRows('Products');
    const targets = await getSheetRows('Targets');
    const trig = products.rows.filter((p) => String(p.ProductName || '').toLowerCase().includes('trigger') || String(p.Category || '').toLowerCase().includes('trigger'));
    const wipes = products.rows.filter((p) => String(p.ProductName || '').toLowerCase().includes('wipes') || String(p.Category || '').toLowerCase().includes('wipes'));
    const row = targets.rows[0] || {};
    const keys = Object.keys(row).filter((k) => !['UUID','Month','Date','DelegateID','DelegateName','BranchID','BranchName','TargetConsumer','TargetPieces','Target_Pieces'].includes(k));
    const output = { productsCount: products.rows.length, triggerProducts: trig, wipesProducts: wipes, targetsCount: targets.rows.length, targetDataKeys: keys };
    fs.writeFileSync('tmp-debug-live-output.json', JSON.stringify(output, null, 2), 'utf8');
    console.log('Wrote tmp-debug-live-output.json');
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
})();
