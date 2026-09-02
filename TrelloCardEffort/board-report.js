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

    const [board, lists, cards] = await Promise.all([
        t.board('id', 'name'),
        t.lists('id', 'name'),
        t.cards('id', 'name', 'idList')
    ]);

    let boardEst = 0, boardAct = 0;
    const sections = [];
    const csvRows = [];

    try {
        // With a range, effort is reconstructed from the board's "Effort updated
        // by..." audit comments in one paginated pass; otherwise it's the current
        // stored value per card.
        let byCard = null;
        if (range) {
            const token = await EffortLib.getToken(t);
            byCard = await EffortLib.rangedEffortByCard(board.id, token, range);
        }

        const effortById = {};
        await Promise.all(cards.map(async (c) => {
            effortById[c.id] = range
                ? EffortLib.deltaToEffort(byCard[c.id])
                : await EffortLib.currentEffort(t, c.id);
        }));

        lists.forEach((list) => {
            const listCards = cards.filter((c) => c.idList === list.id);
            let listEst = 0, listAct = 0;
            const rows = [];

            listCards.forEach((c) => {
                const eff = effortById[c.id];
                listEst += eff.estNum;
                listAct += eff.actNum;
                rows[rows.length] = `<tr><td>${c.name}</td><td>${eff.estDisplay}</td><td>${eff.actDisplay}</td></tr>`;
                csvRows[csvRows.length] = [list.name, c.name, eff.estDisplay || 0, eff.actDisplay || 0];
            });

            boardEst += listEst;
            boardAct += listAct;

            sections[sections.length] =
                `<h4>${list.name} <span class="muted">(est ${listEst} / act ${listAct})</span></h4>
                 <table border="1" cellspacing="0" cellpadding="4">
                   <thead><tr><th>Card</th><th>Estimate</th><th>Actual</th></tr></thead>
                   <tbody>${rows.join('') || '<tr><td colspan="3" class="muted">No cards</td></tr>'}</tbody>
                 </table>`;
        });
    } catch (err) {
        console.error('Board effort report failed:', err);
        container.innerHTML = `<p style="color:#b04632">Could not build the report: ${err.message}</p>`;
        return;
    }

    const title = range
        ? `${board.name} - Effort Summary (${range.fromLabel} to ${range.toLabel})`
        : `${board.name} - Effort Summary`;

    container.innerHTML =
        `<h3>${title}</h3>
         <p>
           <strong>Board total estimated:</strong> ${boardEst} hours<br>
           <strong>Board total actual:</strong> ${boardAct} hours
         </p>
         <button id="exportCsv">Export to CSV</button>
         ${sections.join('')}`;

    document.getElementById('exportCsv').addEventListener('click', function () {
        EffortLib.downloadCsv(
            ['List', 'Card Name', 'Estimated Effort', 'Actual Effort'],
            csvRows,
            `${board.name.replace(/\s+/g, '_')}_Board_Effort_Report.csv`
        );
    });
}
