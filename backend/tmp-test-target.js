const { buildProductNameToIdMap, getTargetRowProductTargets } = require('./services/target.service');
const products = [
  { ProductID: 'P001', ProductName: 'Kitchen Cleaner Regular 500ml', Category: 'trigger' },
  { ProductID: 'P002', ProductName: 'Kitchen Cleaner Lemon 500ml', Category: 'trigger' },
];
const target = {
  DelegateID: 'D001',
  Date: '2026-08-07',
  BranchName: 'Branch A',
  'P001': '3',
  'P002': '2',
  'Kitchen Cleaner Lemon 500ml': '1',
};
const map = buildProductNameToIdMap(products);
console.log('map keys:', [...map.keys()]);
console.log('productTargets:', JSON.stringify(Object.fromEntries(getTargetRowProductTargets(target, map))));
