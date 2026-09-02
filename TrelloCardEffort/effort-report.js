var t = TrelloPowerUp.iframe();

var APP_KEY = 'b8689879d76dbda1e35b2284538ae174';

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
    const range = parseRange(fromStr, toStr);
    container.textContent = 'Loading…';

    const list = await t.list('all');

    // Effort within a range is reconstructed from the "Effort updated by..."
    // audit comments, which are only reachable through the REST API.
    const token = range ? await getToken() : null;

    let totalEst = 0, totalAct = 0, rows = [], cards = [];
    await Promise.all(list.cards.map(async (c) => {
        let estDisplay, actDisplay, estNum, actNum;

        if (range) {
            const delta = await fetchEffortInRange(c.id, token, range);
            estDisplay = estNum = delta.est;
            actDisplay = actNum = delta.act;
        } else {
            const eff = await fetchCardEffort(c.id);
            estDisplay = eff.est;
            actDisplay = eff.act;
            estNum = Number(eff.est) || 0;
            actNum = Number(eff.act) || 0;
        }

        totalEst += estNum;
        totalAct += actNum;
        rows[rows.length] = `<tr><td>${c.name}</td><td>${estDisplay}</td><td>${actDisplay}</td></tr>`;
        cards[cards.length] = {
            name: c.name,
            id: c.id,
            shared: {
                estimatedEffort: estDisplay, actualEffort: actDisplay
            }
        };
    }));

    const title = range
        ? `${list.name} - Effort Summary (${range.fromLabel} to ${range.toLabel})`
        : `${list.name} - Effort Summary`;

    const tableHtml =
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

    container.innerHTML = tableHtml;

    document.getElementById('exportCsv').addEventListener('click', () => exportToCSV(cards, list.name));

    t.sizeTo(450);
}

function parseRange(fromStr, toStr) {
    if (!fromStr && !toStr) return null;
    const from = fromStr ? new Date(fromStr + 'T00:00:00') : null;
    const to = toStr ? new Date(toStr + 'T23:59:59.999') : null;
    return {
        fromLabel: fromStr || '…',
        toLabel: toStr || '…',
        includes: function (date) {
            if (from && date < from) return false;
            if (to && date > to) return false;
            return true;
        }
    };
}

async function getToken() {
    const restApi = await t.getRestApi();
    if (!await restApi.isAuthorized()) {
        await restApi.authorize({ scope: 'read,write', expiration: 'never' });
    }
    return restApi.getToken();
}

async function fetchCardEffort(cardId) {
    var effort = await t.get(cardId, "shared", "effort");
    var eff = JSON.parse(effort || "{\"est\":\"0\",\"act\":\"0\"}");
    return eff;
}

// Sums the change to Estimate/Actual recorded by audit comments dated inside
// the range. Cards with no matching comments come back as { est: 0, act: 0 }.
async function fetchEffortInRange(cardId, token, range) {
    let est = 0, act = 0;
    try {
        const res = await fetch(`https://api.trello.com/1/cards/${cardId}/actions?filter=commentCard&limit=1000&key=${APP_KEY}&token=${token}`);
        const actions = await res.json();
        for (const a of actions) {
            const text = a.data && a.data.text;
            if (!text || text.indexOf('Effort updated by') !== 0) continue;
            if (!range.includes(new Date(a.date))) continue;
            est += parseEffortDelta(text, 'Estimated');
            act += parseEffortDelta(text, 'Actual');
        }
    } catch (err) {
        console.error('Failed to read effort history for card', cardId, err);
    }
    return { est, act };
}

function parseEffortDelta(text, label) {
    const match = text.match(new RegExp('- ' + label + ': (.+?) (?:→|->) (.+)'));
    if (!match) return 0;
    return toEffortNumber(match[2]) - toEffortNumber(match[1]);
}

function toEffortNumber(value) {
    value = (value || '').trim();
    if (value === '' || value === '-') return 0;
    const n = Number(value);
    return isNaN(n) ? 0 : n;
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
