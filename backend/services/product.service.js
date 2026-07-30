const { getSheetRows } = require("./sheets.service");

async function getAll() {
  const { rows } = await getSheetRows("Products");
  return rows;
}

module.exports = {
  getAll,
};
