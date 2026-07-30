function text(value) {
  return String(value ?? "").trim();
}

function createProductOrder(products) {
  const productRanks = new Map();
  const categoryRanks = new Map();

  products.forEach((product, index) => {
    const productId = text(product.ProductID || product.productId);
    const category = text(product.Category || product.category || product.CategoryName);
    if (productId && !productRanks.has(productId)) productRanks.set(productId, index);
    if (category && !categoryRanks.has(category)) categoryRanks.set(category, index);
  });

  function compareCategories(left, right) {
    const leftCategory = text(left?.category ?? left?.Category ?? left);
    const rightCategory = text(right?.category ?? right?.Category ?? right);
    const leftRank = categoryRanks.get(leftCategory);
    const rightRank = categoryRanks.get(rightCategory);
    if (leftRank !== undefined || rightRank !== undefined) {
      return (leftRank ?? Number.MAX_SAFE_INTEGER) - (rightRank ?? Number.MAX_SAFE_INTEGER);
    }
    return leftCategory.localeCompare(rightCategory, "ar");
  }

  function compareProducts(left, right) {
    const leftProductId = text(left?.productId ?? left?.ProductID);
    const rightProductId = text(right?.productId ?? right?.ProductID);
    const leftRank = productRanks.get(leftProductId);
    const rightRank = productRanks.get(rightProductId);
    if (leftRank !== undefined || rightRank !== undefined) {
      return (leftRank ?? Number.MAX_SAFE_INTEGER) - (rightRank ?? Number.MAX_SAFE_INTEGER);
    }

    const categoryOrder = compareCategories(left, right);
    if (categoryOrder) return categoryOrder;
    const leftName = text(left?.productName ?? left?.ProductName);
    const rightName = text(right?.productName ?? right?.ProductName);
    return leftName.localeCompare(rightName, "ar");
  }

  return { compareCategories, compareProducts };
}

module.exports = { createProductOrder };
