from pathlib import Path


APP_JS = Path(r"D:\Invoice\src\App.js")


def set_line(lines, number, text):
    lines[number - 1] = text


def replace_range(lines, start, end, text):
    lines[start - 1 : end] = text.strip("\n").splitlines()


def main():
    lines = APP_JS.read_text(encoding="utf-8").splitlines()

    replacements = {
        6: 'const APP_NAME = "إدارة ذرعات المقاولين";',
        10: '    companyName: "الشركة العامة",',
        11: '    projectName: "مشروع جديد",',
        93: '  if (!/[ØÙÛÃ]/.test(value)) {',
        284: '        unit: "م3",',
        294: '  return type === "clearance" ? "ذرعة تصفية" : "ذرعة اعتيادية";',
        302: '    return "مغلقة - تصفية";',
        305: '    return "مغلقة";',
        308: '    return "صادرة - تصفية";',
        311: '    return "صادرة";',
        313: '  return "مسودة";',
        317: '  return measurement && measurement.signedPdfPath ? "مرفقة" : "غير مرفقة";',
        715: '    return <div className="loading-screen">جاري تحميل النظام...</div>;',
        815: '          unit: "م3",',
        846: '      flash("اختيار مسار قاعدة البيانات يعمل في نسخة سطح المكتب فقط.");',
        859: '    flash("تم تحديث مسار قاعدة البيانات.");',
        864: '      flash("التفعيل الأوفلاين يعمل في نسخة سطح المكتب فقط.");',
        869: '      flash("فشل التفعيل. تحقق من كود التفعيل أو ربطه بهذا الجهاز.");',
        875: '    flash(`تم التفعيل بنجاح. نوع الرخصة: ${result.plan}`);',
        911: '      flash("أدخل اسم المتعهد ورقم العقد والعمل قبل الحفظ.");',
        931: '    flash("تم حفظ بيانات المتعهد والعقد.");',
        943: '      flash("اختر متعهداً أولاً لبدء ذرعة جديدة.");',
        947: '      flash("تم إصدار ذرعة تصفية لهذا العقد أو رقم العمل، ولا يمكن إنشاء ذرعة جديدة بعد التصفية.");',
        1067: '    flash("تم فتح الذرعة الصادرة للتعديل.");',
        1082: '      flash("يمكن حذف الذرعات الصادرة فقط.");',
        1092: '    flash("تم حذف الذرعة الصادرة.");',
        1104: '      flash("توجد فقرة تجاوزت الكمية العقدية، صحح الكميات قبل الحفظ.");',
        1110: '      flash("لا يمكن حفظ ذرعة تحتوي على كمية سالبة.");',
        1115: '      flash("ذرعة التصفية تحتاج إلى تأكيد إصدار محضر الاستلام.");',
        1120: '      flash("ذرعة التصفية تحتاج إلى إرفاق ملف محضر الاستلام.");',
        1162: '              ? "إصدار الذرعة"',
        1164: '                ? "إغلاق الذرعة"',
        1165: '                : "حفظ الذرعة",',
        1192: '        ? "تم إصدار الذرعة وأرشفتها."',
        1194: '          ? "تم إغلاق الذرعة نهائياً."',
        1195: '          : "تم حفظ الذرعة."',
        1209: '      flash("تم اختيار ملف العقد.");',
        1214: '      flash("تم اختيار النسخة الموقعة.");',
        1219: '      flash("تم اختيار محضر الاستلام.");',
        1224: '      flash("تم اختيار شعار المشروع.");',
        1238: '      flash("تم ربط النسخة الموقعة.");',
        1255: '      flash("تم ربط محضر الاستلام.");',
        1283: '      flash("المتصفح منع نافذة الطباعة. اسمح بالنوافذ المنبثقة ثم أعد المحاولة.");',
        1299: '    flash("تم فتح نموذج عربي جاهز لحفظ PDF.");',
        1304: '      flash("لا يوجد ملف مرتبط لفتحه.");',
        1314: '      flash("هذا تذكير بالحفظ فقط. افتح ملف الـ PDF الذي حفظته يدوياً من المتصفح.");',
        1319: '      flash("فتح المسارات المحلية المباشرة يحتاج نسخة سطح المكتب أو EXE.");',
        1361: '          aria-label={sidebarCollapsed ? "إظهار القائمة" : "إخفاء القائمة"}',
        1362: '          title={sidebarCollapsed ? "إظهار القائمة" : "إخفاء القائمة"}',
        1364: '          {sidebarCollapsed ? "☰" : "×"}',
        1369: '            إصدار الذرعات',
        1372: '            المتعهدون والعقود',
        1375: '            الأرشيف',
        1378: '            الإعدادات الأولية',
        1384: '            <span>المشروع:</span>',
        1388: '            <span>رمز المشروع:</span>',
        1392: '            <span>التسلسل:</span>',
        1414: '                <img src={data.settings.logoPath} alt="شعار المشروع" className="top-strip-logo" />',
        1416: '                <div className="top-strip-logo placeholder">شعار المشروع</div>',
        1432: '                <h3>الإعدادات الأولية</h3>',
        1433: '                <span>هنا يتم تعريف بيانات المشروع الأساسية ومسارات الحفظ والتفعيل.</span>',
        1438: '                اسم الشركة',
        1445: '                اسم المشروع',
        1452: '                تسلسل المشروع',
        1459: '                رمز المشروع',
        1466: '                مسار قاعدة البيانات',
        1470: '                    اختيار',
        1475: '                مسار حفظ الملفات',
        1482: '                مسار حفظ النسخ الجديدة',
        1489: '                شعار المشروع',
        1493: '                    اختيار',
        1498: '                طريقة المبلغ الواجب دفعه سابقاً',
        1503: '                  <option value="auto">تلقائي من آخر ذرعة</option>',
        1504: '                  <option value="manual">يدوي داخل الذرعة</option>',
        1508: '                كلمة مرور السوبر أدمن',
        1518: '                <h4>التفعيل الأوفلاين</h4>',
        1521: '                  ? `الحالة: ${licenseInfo.status} / الخطة: ${licenseInfo.plan || "-"}`',
        1522: '                  : "لا توجد معلومات تفعيل حتى الآن."}',
        1528: '                بصمة الجهاز',
        1532: '                كود التفعيل',
        1536: '                  placeholder="ألصق كود التفعيل هنا"',
        1540: '                تفعيل أوفلاين',
        1542: '                  تفعيل الرخصة',
        1553: '                <h3>قائمة المتعهدين</h3>',
        1555: '                  متعهد جديد',
        1581: '                <h3>بيانات المتعهد والعقد</h3>',
        1583: '                  حفظ البيانات',
        1589: '                  اسم المتعهد',
        1596: '                  رقم العقد',
        1605: '                  رقم العمل',
        1612: '                  العمل',
        1619: '                  تأمينات العقد %',
        1629: '                  عقد PDF اختياري',
        1634: '                        اختيار',
        1641: '                        فتح',
        1649: '                <h4>فقرات العمل</h4>',
        1651: '                  إضافة فقرة',
        1659: '                      <th>الفقرة</th>',
        1660: '                      <th>الوحدة</th>',
        1661: '                      <th>الكمية العقدية</th>',
        1662: '                      <th>سعر الفقرة</th>',
        1721: '                  <h3>أرشيف الذرعات</h3>',
        1722: '                  <span>قائمة موحدة للذرعات الصادرة والمغلقة مع البحث السريع وفتح الملفات.</span>',
        1736: '                فتح الذرعة في شاشة الذرعات',
        1742: '                  ابحث في الأرشيف',
        1744: '                    placeholder="ابحث بالاسم أو رقم العقد أو رقم الذرعة"',
        1755: '                    <th>اسم المتعهد</th>',
        1756: '                    <th>رقم العقد</th>',
        1757: '                    <th>رقم العمل</th>',
        1758: '                    <th>رقم الذرعة</th>',
        1759: '                    <th>النوع</th>',
        1760: '                    <th>الحالة</th>',
        1761: '                    <th>التاريخ</th>',
        1762: '                    <th>المبلغ</th>',
        1763: '                    <th>التوقيع</th>',
        1812: '                                فتح المصدر',
        1815: '                            <span>غير مصدر</span>',
        1826: '                                فتح المرفق',
        1838: '              <div className="empty-note">لا توجد نتائج أرشيف مطابقة لبحثك الحالي.</div>',
        1848: '                  <h3>اختيار المتعهد</h3>',
        1849: '                  <span>ابحث باسم المتعهد أو رقم العقد أو رقم العمل ثم اختر الصف المطلوب.</span>',
        1859: '                  إصدار سلفة جديدة',
        1865: '                  ابحث عن المتعهد',
        1869: '                    placeholder="الاسم أو رقم العقد أو رقم العمل"',
        1878: '                      <th>اسم المتعهد</th>',
        1879: '                      <th>رقم العقد</th>',
        1880: '                      <th>رقم العمل</th>',
        1881: '                      <th>العمل</th>',
        1906: '                <div className="empty-note">لا توجد نتائج مطابقة لبحث المتعهد الحالي.</div>',
        1914: '                    <h3>إصدار الذرعة</h3>',
        1925: '                          تعديل الذرعة',
        1932: '                          حذف الذرعة',
        1938: '                        إصدار وأرشفة',
        1943: '                        إغلاق الذرعة',
        1953: '                        <span>نوع الذرعة</span>',
        1957: '                        <span>الحالة</span>',
        1961: '                        <span>حالة التوقيع</span>',
        1965: '                        <span>تاريخ الإصدار</span>',
        1969: '                        <span>مبلغ الذرعة</span>',
        1976: '                        رقم الذرعة',
        1984: '                        التاريخ',
        1993: '                        النوع',
        1999: '                          <option value="regular">ذرعة اعتيادية</option>',
        2000: '                          <option value="clearance">ذرعة تصفية</option>',
        2004: '                        المبلغ الواجب دفعه سابقاً',
        2017: '                        حالة الذرعة',
        2021: '                        محضر الاستلام',
        2029: '                          <option value="no">غير صادر</option>',
        2030: '                          <option value="yes">صادر</option>',
        2037: '                        ملاحظات عامة للذرعة',
        2057: '                          ذرعة التصفية تكون بدون تأمينات، ويجب إصدار محضر استلام وإرفاقه قبل الاعتماد. ولا يمكن إصدار ذرعة جديدة بعد التصفية.',
        2061: '                            ملف محضر الاستلام',
        2066: '                                  إرفاق المحضر',
        2073: '                                  فتح',
        2083: '                      <h4>تفاصيل الفقرات</h4>',
        2090: '                          إضافة فقرة',
        2098: '                            <th>الفقرة</th>',
        2099: '                            <th>الوحدة</th>',
        2100: '                            <th>سعر الفقرة</th>',
        2101: '                            <th>الكمية العقدية</th>',
        2102: '                            <th>الكمية السابقة</th>',
        2103: '                            <th>الإنجاز الحالي</th>',
        2104: '                            <th>التراكمي الكلي</th>',
        2105: '                            <th>المتبقي</th>',
        2106: '                            <th>مبلغ السابق</th>',
        2107: '                            <th>مبلغ الحالي</th>',
        2108: '                            <th>المبلغ الكلي</th>',
        2109: '                            <th>الملاحظات</th>',
        2132: '                                      <option value="">اختر فقرة من القائمة</option>',
        2142: '                                      placeholder="أو اكتب فقرة جديدة"',
        2227: '                        <span>مبلغ الإنجاز التراكمي الكلي</span>',
        2231: '                        <span>المبلغ الواجب دفعه سابقاً</span>',
        2235: '                        <span>مبلغ الإنجاز الحالي</span>',
        2239: '                        <span>مبلغ التأمينات</span>',
        2243: '                        <span>المبلغ الواجب دفعه لهذه الذرعة</span>',
        2249: '                      <h4>الطباعة والأرشفة</h4>',
        2254: '                        ملف PDF المصدر',
        2259: '                              تصدير PDF',
        2266: '                              فتح',
        2272: '                        النسخة الموقعة PDF',
        2277: '                              إرفاق',
        2284: '                              فتح',
        2292: '                      <h4>سجل التدقيق</h4>',
        2296: '                        <div className="empty-note">لا يوجد سجل بعد.</div>',
        2311: '                      <h4>الذرعات السابقة لهذا المتعهد</h4>',
        2318: '                            <th>رقم الذرعة</th>',
        2319: '                            <th>رقم العمل</th>',
        2320: '                            <th>الحالة</th>',
        2321: '                            <th>التاريخ</th>',
        2322: '                            <th>المبلغ</th>',
        2324: '                            <th>فتح</th>',
        2351: '                                      فتح المصدر',
        2354: '                                    <span>غير مصدر</span>',
        2365: '                                      فتح المرفق',
        2377: '                                    عرض الذرعة',
        2385: '                                      حذف',
        2397: '                  <div className="empty-note">اختر متعهداً لعرض نموذج الذرعة الجديدة.</div>',
        2403: '                  اختر متعهداً من الجدول أعلاه لبدء إصدار ذرعة جديدة أو متابعة ذرعة موجودة.',
    }

    for number in sorted(replacements.keys(), reverse=True):
        set_line(lines, number, replacements[number])

    replace_range(
        lines,
        375,
        595,
        """
function buildPrintHtml({ settings, contractor, measurement, summary }) {
  const rowsHtml = summary.rows
    .map(
      (row, index) => `
        <tr>
          <td>${escapeHtml(index + 1)}</td>
          <td class="text-right">${escapeHtml(row.title)}</td>
          <td>${escapeHtml(row.unit)}</td>
          <td>${escapeHtml(money(row.unitPrice))}</td>
          <td>${escapeHtml(blankIfZero(row.contractQuantity))}</td>
          <td>${escapeHtml(row.previousQty)}</td>
          <td>${escapeHtml(row.currentQty)}</td>
          <td>${escapeHtml(row.totalQty)}</td>
          <td>${escapeHtml(row.remainingQty)}</td>
          <td>${escapeHtml(money(row.previousAmount))}</td>
          <td>${escapeHtml(money(row.currentAmount))}</td>
          <td>${escapeHtml(money(row.totalAmount))}</td>
          <td>${escapeHtml(row.notes)}</td>
        </tr>
      `
    )
    .join("");

  const measurementTypeText = measurementTypeLabel(measurement.type);
  const retentionLabel =
    measurement.type === "clearance" ? "0%" : `${contractor.retentionPercent || 0}%`;
  const logoHtml = settings.logoPath
    ? `<img src="${escapeHtml(settings.logoPath)}" alt="شعار المشروع" class="logo" />`
    : `<div class="logo placeholder">شعار المشروع</div>`;
  const programLogoHtml = `<img src="${escapeHtml(PROGRAM_LOGO_URL)}" alt="${escapeHtml(
    APP_NAME
  )}" class="logo app-logo" />`;

  return `
    <!doctype html>
    <html lang="ar" dir="rtl">
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(measurement.issueNo)}</title>
        <style>
          * { box-sizing: border-box; }
          html, body { height: 100%; }
          body { font-family: Tahoma, Arial, sans-serif; margin: 12px; color: #111; direction: rtl; background: #fff; }
          h1,h2,h3,h4,p { margin: 0; }
          .sheet { width: 100%; min-height: calc(100vh - 24px); display:flex; flex-direction:column; }
          .top-zone { display:grid; grid-template-columns: 240px 1fr; gap: 12px; align-items: start; margin-bottom: 6px; }
          .logos-stack { display:grid; grid-template-columns: repeat(2, 1fr); gap: 10px; align-items: start; }
          .company { text-align: center; margin-bottom: 2px; }
          .company h1 { font-size: 20px; margin-bottom: 2px; color: #0f3f6d; }
          .company h2 { font-size: 15px; margin-bottom: 2px; color: #2f4f4f; }
          .company p { font-size: 12px; color: #5a4d2d; }
          .logo { width: 110px; height: 90px; object-fit: contain; border: 1px solid #7f9db9; border-radius: 6px; display:flex; align-items:center; justify-content:center; font-size: 12px; color:#444; }
          .app-logo { background: #f7fbff; }
          .logo.placeholder { background:#f5f8fb; }
          .header-table, .summary-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          .header-table td, .summary-table td { border: 1px solid #8ea3b5; padding: 6px 8px; vertical-align: top; background: #fbfcfe; }
          .label { font-size: 11px; font-weight: 700; color: #38536b; margin-bottom: 3px; }
          .value { font-size: 14px; font-weight: 700; }
          .small-value { font-size: 12px; }
          .main-content { flex: 1; display:flex; flex-direction:column; }
          table { width:100%; border-collapse: collapse; margin-top: 8px; }
          th, td { border:1px solid #9dadbb; padding:8px 7px; font-size:13px; text-align:center; }
          th { background:#dfe9f3; font-weight:700; font-size: 13px; color: #123b62; }
          .subhead { background:#eef3f8; font-size: 11px; color: #3d556c; }
          .text-right { text-align:right; }
          .section-title { margin-top: 10px; margin-bottom: 8px; font-size: 16px; font-weight: 700; color: #7a4e15; }
          .summary-title { margin-top: 14px; font-size: 15px; font-weight: 700; color: #7a4e15; }
          .highlight-cell { background:#e7f3eb !important; font-weight: 700; }
          .summary-table .value { font-size: 16px; }
          .signatures { display:grid; grid-template-columns: repeat(6, 1fr); gap:10px; margin-top: auto; padding-top: 26px; }
          .signature-box { border-top: 1px solid #777; padding-top: 8px; text-align:center; min-height: 42px; font-size: 12px; }
          @page { size: A4 landscape; margin: 12mm; }
        </style>
      </head>
      <body>
        <div class="sheet">
          <div class="top-zone">
            <div class="logos-stack">${logoHtml}${programLogoHtml}</div>
            <div class="company">
              <h1>${escapeHtml(settings.companyName)}</h1>
              <h2>${escapeHtml(APP_NAME)}</h2>
              <p>ذرعة أعمال المتعهد</p>
            </div>
          </div>

          <table class="header-table">
            <tr>
              <td>
                <div class="label">رقم الذرعة</div>
                <div class="value">${escapeHtml(measurement.issueNo)}</div>
              </td>
              <td>
                <div class="label">نوع الذرعة</div>
                <div class="value small-value">${measurementTypeText}</div>
              </td>
              <td>
                <div class="label">التاريخ</div>
                <div class="value small-value">${escapeHtml(measurement.date)}</div>
              </td>
              <td>
                <div class="label">رمز المشروع</div>
                <div class="value">${escapeHtml(settings.projectCode)}</div>
              </td>
            </tr>
            <tr>
              <td>
                <div class="label">اسم المتعهد</div>
                <div class="value small-value">${escapeHtml(contractor.name)}</div>
              </td>
              <td>
                <div class="label">رقم العقد</div>
                <div class="value">${escapeHtml(contractor.contractNumber)}</div>
              </td>
              <td>
                <div class="label">رقم العمل</div>
                <div class="value">${escapeHtml(contractor.workNumber)}</div>
              </td>
              <td>
                <div class="label">تسلسل المشروع</div>
                <div class="value">${escapeHtml(settings.projectSequence)}</div>
              </td>
            </tr>
            <tr>
              <td colspan="2">
                <div class="label">العمل</div>
                <div class="value small-value">${escapeHtml(contractor.workName)}</div>
              </td>
              <td>
                <div class="label">التأمينات</div>
                <div class="value">${retentionLabel}</div>
              </td>
              <td>
                <div class="label">حالة الذرعة</div>
                <div class="value small-value">${measurementStatusLabel(measurement)}</div>
              </td>
            </tr>
          </table>

          <div class="main-content">
            <div class="section-title">تفاصيل فقرات الأعمال</div>
            <table>
              <thead>
                <tr>
                  <th>ت</th>
                  <th>اسم الفقرة</th>
                  <th>الوحدة</th>
                  <th>سعر الفقرة</th>
                  <th>الكمية العقدية</th>
                  <th colspan="3">الكميات المنجزة</th>
                  <th>المتبقي</th>
                  <th colspan="3">مبالغ الإنجاز</th>
                  <th>الملاحظات</th>
                </tr>
                <tr>
                  <th class="subhead"></th>
                  <th class="subhead"></th>
                  <th class="subhead"></th>
                  <th class="subhead"></th>
                  <th class="subhead"></th>
                  <th class="subhead">التراكمي السابق</th>
                  <th class="subhead">الإنجاز الحالي</th>
                  <th class="subhead">التراكمي الحالي</th>
                  <th class="subhead"></th>
                  <th class="subhead">مبلغ السابق</th>
                  <th class="subhead">مبلغ الحالي</th>
                  <th class="subhead">المبلغ الكلي</th>
                  <th class="subhead"></th>
                </tr>
              </thead>
              <tbody>${rowsHtml}</tbody>
            </table>

            <div class="summary-title">الخلاصة المالية (دينار)</div>
            <table class="summary-table">
              <tr>
                <td>
                  <div class="label">مبلغ الإنجاز التراكمي الكلي</div>
                  <div class="value">${escapeHtml(money(summary.totalDue))}</div>
                </td>
                <td>
                  <div class="label">المبلغ الواجب دفعه سابقاً</div>
                  <div class="value">${escapeHtml(money(summary.previousDue))}</div>
                </td>
                <td>
                  <div class="label">مبلغ الإنجاز الحالي</div>
                  <div class="value">${escapeHtml(money(summary.currentAmount))}</div>
                </td>
                <td>
                  <div class="label">مبلغ التأمينات</div>
                  <div class="value">${escapeHtml(money(summary.retentionAmount))}</div>
                </td>
                <td class="highlight-cell">
                  <div class="label">المبلغ الواجب دفعه لهذه الذرعة</div>
                  <div class="value">${escapeHtml(money(summary.payableThisMeasurement))}</div>
                </td>
              </tr>
            </table>

            <div class="summary-title">ملاحظات عامة</div>
            <table class="summary-table">
              <tr>
                <td>
                  <div class="value small-value">${escapeHtml(
                    measurement.generalNotes || "لا توجد ملاحظات عامة."
                  )}</div>
                </td>
              </tr>
            </table>
          </div>

          <div class="signatures">
            <div class="signature-box">المتعهد</div>
            <div class="signature-box">قسم تخطيط المشروع</div>
            <div class="signature-box">محاسب المشروع</div>
            <div class="signature-box">مدير المشروع</div>
            <div class="signature-box">المدقق الفني</div>
            <div class="signature-box">قسم المشاريع</div>
          </div>
        </div>
      </body>
    </html>
  `;
}
        """,
    )

    APP_JS.write_text("\n".join(lines) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
