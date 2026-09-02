var t = TrelloPowerUp.iframe({
    appKey: 'b8689879d76dbda1e35b2284538ae174',
    appName: 'Effort Tracker'
});

document.getElementById('apply').addEventListener('click', function () {
    renderReport(document.getElementById('from').value, document.getElementById('to').value);
});

document.getElementById('clear').addEventListener('click', function () {
    document.getElementById('from').value = '';
    document.getElementById('to').value = '';
    renderReport();
});

t.render(function () {
    return renderReport(document.getElementById('from').value, document.getElementById('to').value);
});

async function renderReport(fromStr, toStr) {
    const container = document.getElementById('container');
    const range = EffortLib.parseRange(fromStr, toStr);
    container.textContent = 'Loading...';

    const list = await t.list('all');

    // Effort within a range is reconstructed from the "Effort updated by..."
    // audit comments, which are only reachable through the REST API.
    const token = range ? await EffortLib.getToken(t) : null;

    let totalEst = 0, totalAct = 0, rows = [], csvRows = [];
    try {
        await Promise.all(list.cards.map(async (c) => {
            const eff = await EffortLib.resolveCardEffort(t, c.id, range, token);
            totalEst += eff.estNum;
            totalAct += eff.actNum;
            rows[rows.length] = `<tr><td>${c.name}</td><td>${eff.estDisplay}</td><td>${eff.actDisplay}</td></tr>`;
            csvRows[csvRows.length] = [c.name, eff.estDisplay || 0, eff.actDisplay || 0];
        }));
    } catch (err) {
        console.error('Effort report failed:', err);
        container.innerHTML = `<p style="color:#b04632">Could not build the report: ${err.message}</p>`;
        t.sizeTo(450);
        return;
    }

    const title = range
        ? `${list.name} - Effort Summary (${range.fromLabel} to ${range.toLabel})`
        : `${list.name} - Effort Summary`;

    container.innerHTML =
        `<h3>${title}</h3>
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

    document.getElementById('exportCsv').addEventListener('click', function () {
        EffortLib.downloadCsv(
            ['Card Name', 'Estimated Effort', 'Actual Effort'],
            csvRows,
            `${list.name.replace(/\s+/g, '_')}_Effort_Report.csv`
        );
    });

    t.sizeTo(450);
}
