const branchService = require("./branch.service");
const productService = require("./product.service");
const { getSheetRows } = require("./sheets.service");

async function loadCache() {

    const [branches, products, delegates, supervisors, reportTypes] = await Promise.all([
        branchService.getBranches(),
        productService.getAll(),
        getSheetRows("Delegates"),
        getSheetRows("Supervisors"),
        getSheetRows("ReportTypes"),
    ]);

    return {
        branches,
        products,
        delegates: delegates.rows,
        supervisors: supervisors.rows,
        reportTypes: reportTypes.rows,
    };

}

module.exports = {
    loadCache
};
