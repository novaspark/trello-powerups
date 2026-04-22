var t = TrelloPowerUp.iframe();

t.render(async () => {

    const list = await t.list("all");

    let totalEst = 0, totalAct = 0, rows = [], cards = [];
    await Promise.all(list.cards.map(async (c) => {
        var eff = await fetchCardEffort(c.id);
        totalEst += Number(eff.est) || 0;
        totalAct += Number(eff.act) || 0;
        rows[rows.length] = `<tr><td>${c.name}</td><td>${eff.est}</td><td>${eff.act}</td></tr>`;
        cards[cards.length] = {
            name: c.name,
            id: c.id,
            shared: {
                estimatedEffort: eff.est, actualEffort: eff.act
            }
        };
    }));

    const tableHtml =
        `<h3>${list.name} - Effort Summary</h3>
        <p>
          <strong>Total Estimated:</strong> ${totalEst} hours<br>
          <strong>Total Actual:</strong> ${totalAct} hours
        </p>
        <table border="1" cellspacing="0" cellpadding="4">
          <thead><tr><th>Card</th><th>Estimate</th><th>Actual</th></tr></thead>
          <tbody>${rows.join('')}</tbody>
        </table>
        <button id="exportCsv">Export to CSV</button>
      `;

    document.getElementById("container").innerHTML = tableHtml;

    document.getElementById('exportCsv').addEventListener('click', () => exportToCSV(cards, list.name));

    t.sizeTo(450);
});

async function fetchCardEffort(cardId) {
    var effort = await t.get(cardId, "shared", "effort");
    var eff = JSON.parse(effort || "{\"est\":\"0\",\"act\":\"0\"}");
    return eff;
}

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