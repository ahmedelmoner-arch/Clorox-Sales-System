const { getSheetRows } = require("./sheets.service");

async function getBranches() {
  const { rows } = await getSheetRows("Branches");

  return rows
    .map((row) => ({
      id: row.UUID || "",
      code: row.BranchID || "",
      name: row.BranchName || "",
    }))
    .filter((branch) => branch.code && branch.name)
    .sort((a, b) => a.name.localeCompare(b.name, "ar"));
}

module.exports = {
  getBranches,
};
