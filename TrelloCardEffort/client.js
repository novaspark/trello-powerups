/* global TrelloPowerUp */

const t = TrelloPowerUp.iframe();

TrelloPowerUp.initialize({
  'card-back-section': function(t, options) {
    return {
      title: 'Effort Tracking',
      icon: 'https://cdn.hyperdev.com/us-east-1%3A3d31b21c-01a0-4da2-8827-4bc6e88b7618%2Ficon-gray.svg',
      content: {
        type: 'iframe',
        url: t.signUrl('./index.html?mode=card'),
        height: 200
      }
    };
  },

  'list-actions': function(t, options) {
    return [
      {
        text: 'View Effort Report',
        callback: function(t) {
          return t.popup({
            title: 'Effort Report',
            url: './index.html?mode=report',
            height: 400
          });
        }
      }
    ];
  }
});

const params = new URLSearchParams(window.location.search);
const mode = params.get('mode');

if (mode === 'card') {
  renderCardSection();
} else if (mode === 'report') {
  renderReport();
}

// === CARD MODE ===
async function renderCardSection() {
  const card = await t.card('id', 'name', 'shared');
  const container = document.getElementById('content');

  const est = card.shared.estimatedEffort || '';
  const act = card.shared.actualEffort || '';

  container.innerHTML = `
    <label>Estimated Effort (hours):
      <input type="number" id="est" value="${est}" />
    </label>
    <label>Actual Effort (hours):
      <input type="number" id="act" value="${act}" />
    </label>
    <button id="save">Save</button>
  `;

  document.getElementById('save').addEventListener('click', async () => {
    const newEst = parseFloat(document.getElementById('est').value || 0);
    const newAct = parseFloat(document.getElementById('act').value || 0);

    await t.set('card', 'shared', 'estimatedEffort', newEst);
    await t.set('card', 'shared', 'actualEffort', newAct);
    t.closePopup();
  });
}

// === REPORT MODE ===
async function renderReport() {
  const list = await t.list('id', 'name');
  const cards = await t.cards('id', 'name', 'shared');
  const container = document.getElementById('content');

  let totalEst = 0, totalAct = 0;
  cards.forEach(c => {
    totalEst += Number(c.shared.estimatedEffort) || 0;
    totalAct += Number(c.shared.actualEffort) || 0;
  });

  const colorClass =
    totalAct === totalEst ? 'yellow'
      : totalAct < totalEst ? 'green'
      : 'red';

  const rows = cards.map(c => `
    <tr>
      <td>${c.name}</td>
      <td>${c.shared.estimatedEffort || 0}</td>
      <td>${c.shared.actualEffort || 0}</td>
    </tr>
  `).join('');

  container.innerHTML = `
    <h3>${list.name} - Effort Summary</h3>
    <p class="${colorClass}">
      <strong>Total Estimated:</strong> ${totalEst} hours<br>
      <strong>Total Actual:</strong> ${totalAct} hours
    </p>
    <table border="1" cellspacing="0" cellpadding="4">
      <thead><tr><th>Card</th><th>Estimate</th><th>Actual</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <button id="exportCsv">Export to CSV</button>
    <button id="close">Close</button>
  `;

  document.getElementById('close').addEventListener('click', () => t.closePopup());
  document.getElementById('exportCsv').addEventListener('click', () => exportToCSV(cards, list.name));
}

// === CSV Export Function ===
function exportToCSV(cards, listName) {
  const header = ['Card Name', 'Estimated Effort', 'Actual Effort'];
  const rows = cards.map(c => [
    `"${c.name.replace(/"/g, '""')}"`,
    c.shared.estimatedEffort || 0,
    c.shared.actualEffort || 0
  ]);

  const csv = [header.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });

  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${listName.replace(/\s+/g, '_')}_Effort_Report.csv`;
  link.click();
}