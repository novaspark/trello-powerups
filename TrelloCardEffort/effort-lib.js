// Shared helpers for the list-level and board-level effort reports.
var EffortLib = (function () {
    var APP_KEY = 'b8689879d76dbda1e35b2284538ae174';

    // Returns null when no range is set, otherwise an object whose includes()
    // tests whether a Date falls within [from 00:00, to 23:59].
    function parseRange(fromStr, toStr) {
        if (!fromStr && !toStr) return null;
        var from = fromStr ? new Date(fromStr + 'T00:00:00') : null;
        var to = toStr ? new Date(toStr + 'T23:59:59.999') : null;
        return {
            fromLabel: fromStr || 'start',
            toLabel: toStr || 'now',
            includes: function (date) {
                if (from && date < from) return false;
                if (to && date > to) return false;
                return true;
            }
        };
    }

    async function getToken(t) {
        var restApi = await t.getRestApi();
        if (!await restApi.isAuthorized()) {
            await restApi.authorize({ scope: 'read,write', expiration: 'never' });
        }
        return restApi.getToken();
    }

    async function fetchCardEffort(t, cardId) {
        var effort = await t.get(cardId, 'shared', 'effort');
        return JSON.parse(effort || '{"est":"0","act":"0"}');
    }

    // Sums the change to Estimate/Actual recorded by "Effort updated by..."
    // audit comments dated inside the range. Cards with no matching comments
    // come back as { est: 0, act: 0 }.
    async function fetchEffortInRange(cardId, token, range) {
        var est = 0, act = 0;
        var res = await fetch('https://api.trello.com/1/cards/' + cardId +
            '/actions?filter=commentCard&limit=1000&key=' + APP_KEY + '&token=' + token);
        if (!res.ok) throw new Error('Trello API returned ' + res.status);
        var actions = await res.json();
        if (!Array.isArray(actions)) throw new Error('unexpected Trello API response');
        for (var i = 0; i < actions.length; i++) {
            var a = actions[i];
            var text = a.data && a.data.text;
            if (!text || text.indexOf('Effort updated by') !== 0) continue;
            if (!range.includes(new Date(a.date))) continue;
            est += parseEffortDelta(text, 'Estimated');
            act += parseEffortDelta(text, 'Actual');
        }
        return { est: est, act: act };
    }

    function parseEffortDelta(text, label) {
        // "<label>: <old> <arrow> <new>" - the separator is matched as any
        // non-space token so mis-encoded arrows in older comments still parse.
        var match = text.match(new RegExp(label + ':\\s*(\\S+)\\s+\\S+\\s+(\\S+)'));
        if (!match) return 0;
        return toEffortNumber(match[2]) - toEffortNumber(match[1]);
    }

    function toEffortNumber(value) {
        value = (value || '').trim();
        if (value === '' || value === '-') return 0;
        var n = Number(value);
        return isNaN(n) ? 0 : n;
    }

    // Resolves one card to { estDisplay, actDisplay, estNum, actNum }. Without a
    // range this is the current stored value; with a range it is the effort
    // logged within the window.
    async function resolveCardEffort(t, cardId, range, token) {
        if (range) {
            var delta = await fetchEffortInRange(cardId, token, range);
            return { estDisplay: delta.est, actDisplay: delta.act, estNum: delta.est, actNum: delta.act };
        }
        var eff = await fetchCardEffort(t, cardId);
        return {
            estDisplay: eff.est,
            actDisplay: eff.act,
            estNum: Number(eff.est) || 0,
            actNum: Number(eff.act) || 0
        };
    }

    function downloadCsv(header, rows, filename) {
        var csv = [header].concat(rows)
            .map(function (r) { return r.map(csvCell).join(','); })
            .join('\n');
        var link = document.createElement('a');
        link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
        link.download = filename;
        link.click();
    }

    function csvCell(value) {
        var s = String(value == null ? '' : value);
        return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    }

    return {
        parseRange: parseRange,
        getToken: getToken,
        resolveCardEffort: resolveCardEffort,
        downloadCsv: downloadCsv
    };
})();
