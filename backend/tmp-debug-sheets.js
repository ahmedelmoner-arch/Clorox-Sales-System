const { getSheetRows } = require("./services/sheets.service");
const { buildProductNameToIdMap, getTargetRowProductTargets, normalizeProductName } = require("./services/target.service");

(async () => {
  try {
    const products = await getSheetRows("Products");
    const targets = await getSheetRows("Targets");
    console.log("Products headers:", products.headers);
    console.log("Targets headers:", targets.headers);
    console.log("Products rows count:", products.rows.length);
    console.log("Targets rows count:", targets.rows.length);
    console.log("First product sample:", products.rows[0]);
    console.log("First target sample:", targets.rows[0]);

    const productNameToId = buildProductNameToIdMap(products.rows);
    console.log("Mapped product keys (showing 60):", [...productNameToId.keys()].slice(0, 60));

    if (targets.rows.length) {
      const row = targets.rows[0];
      const rowKeys = Object.keys(row).filter((k) => k && !["DelegateID","DelegateId","DelegateName","BranchName","BranchID","Date","Month","TargetConsumer","TargetPieces","Target_Pieces"].includes(k));
      console.log("Target keys to map:", rowKeys);
      const mapped = getTargetRowProductTargets(row, productNameToId);
      console.log("Mapped target IDs:", Object.fromEntries(mapped));
      rowKeys.forEach((key) => {
        const normalized = normalizeProductName(key);
        const direct = productNameToId.get(key) || productNameToId.get(key.toLowerCase()) || productNameToId.get(normalized);
        console.log({ key, normalized, direct });
      });
    }
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
})();
