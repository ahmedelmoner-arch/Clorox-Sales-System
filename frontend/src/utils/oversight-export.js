import writeExcelFile from "write-excel-file/browser";

const shortageTypes = {
  OutOfStock: "غير موجود",
  LowStock: "كمية غير كافية",
  NotDisplayed: "غير معروض",
};

const shortageStatuses = {
  Open: "مفتوح",
  Resolved: "تم الحل",
};

function safeCell(value) {
  if (typeof value === "number") return value;
  const text = String(value ?? "");
  return /^[=+\-@]/.test(text) ? `'${text}` : text;
}

function fileBaseName(month) {
  return `تقرير-المتابعة-${month || "الشهري"}`;
}

function percentage(value) {
  return `${Number(value || 0)}%`;
}

function asSheet(sheet, rows) {
  const sourceRows = rows.length ? rows : [{ "لا توجد بيانات": "" }];
  const headers = Object.keys(sourceRows[0]);
  return {
    sheet,
    columns: headers.map(() => ({ width: 18 })),
    data: [
      headers.map((header) => ({ value: header, fontWeight: "bold", backgroundColor: "#EAF3FF" })),
      ...sourceRows.map((row) => headers.map((header) => safeCell(row[header]))),
    ],
  };
}

function delegateRows(delegates = []) {
  return delegates.map((delegate) => ({
    "اسم المندوبة": delegate.delegateName,
    "المشرف": delegate.supervisorName || delegate.supervisorCode,
    "القطع المحققة": delegate.actualPieces,
    "هدف القطع": delegate.targetPieces,
    "إنجاز القطع": percentage(delegate.piecesAchievement),
    "العملاء المحققون": delegate.totalConsumers,
    "هدف العملاء": delegate.targetConsumers,
    "إنجاز العملاء": percentage(delegate.consumersAchievement),
    "قيمة المبيعات": delegate.salesValue,
    "الفواتير": delegate.vouchers,
    "التقارير": delegate.reports,
  }));
}

function supervisorRows(supervisors = []) {
  return supervisors.map((supervisor) => ({
    "اسم المشرف": supervisor.supervisorName,
    "عدد المندوبات": supervisor.delegates,
    "القطع المحققة": supervisor.actualPieces,
    "هدف القطع": supervisor.targetPieces,
    "إنجاز القطع": percentage(supervisor.piecesAchievement),
    "العملاء المحققون": supervisor.totalConsumers,
    "هدف العملاء": supervisor.targetConsumers,
    "إنجاز العملاء": percentage(supervisor.consumersAchievement),
    "قيمة المبيعات": supervisor.salesValue,
    "الفواتير": supervisor.vouchers,
    "التقارير": supervisor.reports,
  }));
}

function categoryRows(categories = []) {
  return categories.flatMap((category) => [
    {
      "النوع": "كاتيجوري",
      "الاسم": category.category,
      "القطع المحققة": category.actualPieces,
      "هدف القطع": category.targetPieces,
      "إنجاز القطع": percentage(category.piecesAchievement),
      "قيمة المبيعات": category.salesValue,
    },
    ...(category.products || []).map((product) => ({
      "النوع": "منتج",
      "الاسم": product.productName,
      "الكاتيجوري": category.category,
      "القطع المحققة": product.actualPieces,
      "هدف القطع": product.targetPieces,
      "إنجاز القطع": percentage(product.piecesAchievement),
      "قيمة المبيعات": product.salesValue,
    })),
  ]);
}

function shortageRows(shortages = {}) {
  return (shortages.details || []).map((shortage) => ({
    "التاريخ": shortage.Date,
    "المندوبة": shortage.DelegateName,
    "الفرع": shortage.BranchName,
    "المنتج": shortage.ProductName || shortage.ProductID,
    "الكاتيجوري": shortage.Category,
    "نوع النقص": shortageTypes[shortage.ShortageType] || shortage.ShortageType,
    "الطلب المتوقع": shortage.EstimatedDemand,
    "الحالة": shortageStatuses[shortage.Status] || shortage.Status,
    "ملاحظات": shortage.Notes,
  }));
}

function dailyRows(days = []) {
  return days.map((day) => ({
    "التاريخ": day.date,
    "القطع المحققة": day.actualPieces,
    "هدف القطع": day.targetPieces,
    "العملاء المحققون": day.totalConsumers,
    "هدف العملاء": day.targetConsumers,
    "قيمة المبيعات": day.salesValue,
    "الفواتير": day.vouchers,
    "التقارير": day.reports,
  }));
}

function summaryRows(data) {
  const summary = data.summary || {};
  return [
    { "البند": "الشهر", "القيمة": data.month },
    { "البند": "نطاق التقرير", "القيمة": data.scope?.role === "Management" ? "كل فرق المبيعات" : "فريق المشرف فقط" },
    { "البند": "اسم المستخدم", "القيمة": data.scope?.name },
    { "البند": "عدد المندوبات", "القيمة": data.scope?.delegates },
    { "البند": "القطع المحققة", "القيمة": summary.actualPieces },
    { "البند": "هدف القطع", "القيمة": summary.targetPieces },
    { "البند": "إنجاز القطع", "القيمة": percentage(summary.piecesAchievement) },
    { "البند": "العملاء المحققون", "القيمة": summary.totalConsumers },
    { "البند": "هدف العملاء", "القيمة": summary.targetConsumers },
    { "البند": "إنجاز العملاء", "القيمة": percentage(summary.consumersAchievement) },
    { "البند": "قيمة المبيعات", "القيمة": summary.salesValue },
    { "البند": "الفواتير", "القيمة": summary.vouchers },
    { "البند": "التقارير", "القيمة": summary.reports },
    { "البند": "النواقص المفتوحة", "القيمة": data.shortages?.open },
    { "البند": "إجمالي النواقص", "القيمة": data.shortages?.total },
  ];
}

export async function exportOversightExcel(data) {
  const sheets = [
    asSheet("ملخص", summaryRows(data)),
    asSheet("المندوبات", delegateRows(data.delegates)),
    asSheet("المنتجات", categoryRows(data.categories)),
    asSheet("النواقص", shortageRows(data.shortages)),
    asSheet("الأيام", dailyRows(data.teamDays)),
  ];
  if (data.supervisors?.length) sheets.splice(2, 0, asSheet("المشرفون", supervisorRows(data.supervisors)));
  await writeExcelFile(sheets, { fontFamily: "Arial", fontSize: 11 }).toFile(`${fileBaseName(data.month)}.xlsx`);
}

function csvValue(value) {
  return `"${String(safeCell(value)).replaceAll('"', '""')}"`;
}

export function exportOversightCsv(data) {
  const rows = delegateRows(data.delegates);
  const headers = Object.keys(rows[0] || { "لا توجد بيانات": "" });
  const body = rows.map((row) => headers.map((header) => csvValue(row[header])).join(","));
  const csv = `\uFEFF${headers.map(csvValue).join(",")}\n${body.join("\n")}`;
  const link = document.createElement("a");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  link.href = url;
  link.download = `${fileBaseName(data.month)}-المندوبات.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 100);
}
