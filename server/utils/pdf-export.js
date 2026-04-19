/**
 * PDF Export Utility
 * Generates a styled HTML page from reports and converts to PDF using Puppeteer.
 * Falls back to simple HTML download if Puppeteer is not available.
 */

const fs = require('fs');
const path = require('path');

const severityConfig = {
  escalation: { label: 'Escalation', color: '#ef4444', icon: '⚠️' },
  lowlight: { label: 'Lowlight', color: '#94a3b8', icon: '☁️' },
  highlight: { label: 'Highlight', color: '#f59e0b', icon: '☀️' },
  info: { label: 'Info', color: '#3b82f6', icon: 'ℹ️' },
};

function generateReportHTML(reports, week, year, teamName) {
  const grouped = {};
  reports.forEach(r => {
    const key = r.severity;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(r);
  });

  const severityOrder = ['escalation', 'highlight', 'lowlight', 'info'];

  let cardsHtml = '';
  severityOrder.forEach(sev => {
    const items = grouped[sev];
    if (!items || items.length === 0) return;
    const cfg = severityConfig[sev];

    items.forEach(report => {
      cardsHtml += `
        <div class="card" style="border-left: 4px solid ${cfg.color};">
          <div class="card-header">
            <span class="icon">${cfg.icon}</span>
            <span class="severity" style="color: ${cfg.color};">${cfg.label}</span>
            <span class="app-name">${report.appName}</span>
            <span class="category">${report.category}</span>
          </div>
          <div class="card-user">${report.user?.name || 'Unknown'}</div>
          <div class="card-content">${report.content}</div>
        </div>
      `;
    });
  });

  // Try to load logo as base64
  let logoDataUri = '';
  try {
    const logoPath = path.join(__dirname, '..', '..', 'client', 'public', 'logo.png');
    if (fs.existsSync(logoPath)) {
      const logoBuffer = fs.readFileSync(logoPath);
      logoDataUri = `data:image/png;base64,${logoBuffer.toString('base64')}`;
    }
  } catch (e) { /* ignore */ }

  const teamBadge = teamName
    ? `<span class="team-badge">${teamName}</span>`
    : '';

  const logoHtml = logoDataUri
    ? `<img src="${logoDataUri}" alt="Logo" class="logo" />`
    : '';

  return `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <title>Haftalık Rapor - ${year} W${week}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Tahoma, sans-serif; background: #f8fafc; color: #1e293b; padding: 40px; }
    .report-header { display: flex; align-items: center; gap: 16px; margin-bottom: 8px; }
    .logo { width: 48px; height: 48px; border-radius: 8px; object-fit: contain; }
    h1 { font-size: 24px; color: #0f172a; }
    .team-badge { display: inline-block; padding: 4px 14px; font-size: 12px; font-weight: 600; color: #1d4ed8; background: #dbeafe; border: 1px solid #bfdbfe; border-radius: 999px; margin-left: 12px; vertical-align: middle; }
    .subtitle { font-size: 14px; color: #64748b; margin-bottom: 32px; margin-top: 4px; }
    .card { background: #fff; border-radius: 8px; padding: 20px; margin-bottom: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
    .card-header { display: flex; align-items: center; gap: 12px; margin-bottom: 8px; }
    .icon { font-size: 18px; }
    .severity { font-weight: 700; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; }
    .app-name { font-weight: 600; font-size: 14px; color: #334155; }
    .category { font-size: 12px; color: #94a3b8; background: #f1f5f9; padding: 2px 8px; border-radius: 4px; }
    .card-user { font-size: 12px; color: #64748b; margin-bottom: 8px; }
    .card-content { font-size: 14px; line-height: 1.6; color: #334155; }
    .card-content ul { padding-left: 20px; }
    .card-content li { margin-bottom: 4px; }
    .card-content strong { color: #0f172a; }
    @media print { body { padding: 20px; } .card { break-inside: avoid; } }
  </style>
</head>
<body>
  <div class="report-header">
    ${logoHtml}
    <div>
      <h1>📋 Haftalık Rapor - ${year} W${week}${teamBadge}</h1>
      <p class="subtitle">Weekly Report • Week ${week}, ${year}</p>
    </div>
  </div>
  ${cardsHtml}
</body>
</html>`;
}

async function exportToPDF(reports, week, year, teamName) {
  const html = generateReportHTML(reports, week, year, teamName);

  try {
    const puppeteer = require('puppeteer');
    const browser = await puppeteer.launch({
      headless: 'new',
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '20mm', right: '15mm', bottom: '20mm', left: '15mm' },
    });
    await browser.close();
    return { type: 'pdf', buffer: pdf };
  } catch (err) {
    // Fallback: return HTML if puppeteer is not installed
    console.warn('Puppeteer not available, falling back to HTML export:', err.message);
    return { type: 'html', buffer: Buffer.from(html, 'utf-8') };
  }
}

function generateTemplateHTML(template, items) {
  // Try to load logo as base64
  let logoDataUri = '';
  try {
    const logoPath = path.join(__dirname, '..', '..', 'client', 'public', 'logo.png');
    if (fs.existsSync(logoPath)) {
      const logoBuffer = fs.readFileSync(logoPath);
      logoDataUri = `data:image/png;base64,${logoBuffer.toString('base64')}`;
    }
  } catch (e) { /* ignore */ }

  const logoHtml = logoDataUri
    ? `<img src="${logoDataUri}" alt="Logo" class="logo" />`
    : '';

  const severityOrder = ['escalation', 'highlight', 'lowlight', 'info'];

  // Sort items by severity
  const sorted = [...items].sort((a, b) => {
    return (severityOrder.indexOf(a.severity) ?? 99) - (severityOrder.indexOf(b.severity) ?? 99);
  });

  let cardsHtml = '';
  sorted.forEach(item => {
    const cfg = severityConfig[item.severity] || severityConfig.info;
    const stars = item.importance > 1 ? ' ' + '★'.repeat(item.importance) : '';
    cardsHtml += `
      <div class="card" style="border-left: 4px solid ${cfg.color};">
        <div class="card-header">
          <span class="icon">${cfg.icon}</span>
          <span class="severity" style="color: ${cfg.color};">${cfg.label}</span>
          <span class="app-name">${item.appName || 'Uygulama'}</span>
          ${stars ? `<span class="stars" style="color: ${item.importance === 3 ? '#ef4444' : '#f59e0b'};">${stars}</span>` : ''}
        </div>
        <div class="card-content">${item.content || ''}</div>
      </div>
    `;
  });

  return `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <title>${template.name}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Tahoma, sans-serif; background: #f8fafc; color: #1e293b; padding: 40px; }
    .report-header { display: flex; align-items: center; gap: 16px; margin-bottom: 8px; }
    .logo { width: 48px; height: 48px; border-radius: 8px; object-fit: contain; }
    h1 { font-size: 24px; color: #0f172a; }
    .subtitle { font-size: 14px; color: #64748b; margin-bottom: 32px; margin-top: 4px; }
    .card { background: #fff; border-radius: 8px; padding: 20px; margin-bottom: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
    .card-header { display: flex; align-items: center; gap: 12px; margin-bottom: 8px; }
    .icon { font-size: 18px; }
    .severity { font-weight: 700; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; }
    .app-name { font-weight: 600; font-size: 14px; color: #334155; }
    .stars { font-weight: 700; font-size: 14px; }
    .card-content { font-size: 14px; line-height: 1.6; color: #334155; }
    .card-content ul { padding-left: 20px; }
    .card-content li { margin-bottom: 4px; }
    .card-content strong { color: #0f172a; }
    .card-content img { max-width: 100%; border-radius: 8px; margin: 8px 0; }
    .meta { font-size: 11px; color: #94a3b8; margin-top: 24px; text-align: center; }
    @media print { body { padding: 20px; } .card { break-inside: avoid; } }
  </style>
</head>
<body>
  <div class="report-header">
    ${logoHtml}
    <div>
      <h1>📋 ${template.name}</h1>
      <p class="subtitle">${items.length} madde</p>
    </div>
  </div>
  ${cardsHtml}
  <p class="meta">Oluşturulma: ${new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
</body>
</html>`;
}

async function exportTemplateToPDF(template, items) {
  const html = generateTemplateHTML(template, items);

  try {
    const puppeteer = require('puppeteer');
    const browser = await puppeteer.launch({
      headless: 'new',
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '20mm', right: '15mm', bottom: '20mm', left: '15mm' },
    });
    await browser.close();
    return { type: 'pdf', buffer: pdf };
  } catch (err) {
    console.warn('Puppeteer not available, falling back to HTML export:', err.message);
    return { type: 'html', buffer: Buffer.from(html, 'utf-8') };
  }
}

module.exports = { exportToPDF, generateReportHTML, exportTemplateToPDF, generateTemplateHTML };
