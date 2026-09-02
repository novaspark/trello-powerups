// Shared helpers for the list-level and board-level effort reports.
var EffortLib = (function () {
    var APP_KEY = 'b8689879d76dbda1e35b2284538ae174';
    var ACTIONS_PAGE = 1000; // Trello's max page size for the actions endpoint

    // Returns null when no range is set, otherwise an object whose includes()
    // tests whether a Date falls within [from 00:00, to 23:59].
    function parseRange(fromStr, toStr) {
        if (!fromStr && !toStr) return null;
        var from = fromStr ? new Date(fromStr + 'T00:00:00') : null;
        var to = toStr ? new Date(toStr + 'T23:59:59.999') : null;
        return {
            from: from,
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

    // Current stored effort for one card -> { estDisplay, actDisplay, estNum, actNum }.
    async function currentEffort(t, cardId) {
        var effort = await t.get(cardId, 'shared', 'effort');
        var eff = JSON.parse(effort || '{"est":"0","act":"0"}');
        return {
            estDisplay: eff.est,
            actDisplay: eff.act,
            estNum: Number(eff.est) || 0,
            actNum: Number(eff.act) || 0
        };
    }

    // Effort logged within the range, for every card on the board, in a single
    // paginated pass over the board's comment actions (one request per ~1000
    // comments instead of one per card - which trips Trello's rate limit).
    // Returns { <cardId>: { est, act } } for cards touched inside the window.
    async function rangedEffortByCard(boardId, token, range) {
        var byCard = {};
        var before = '';
        for (var page = 0; page < 50; page++) {
            var url = 'https://api.trello.com/1/boards/' + boardId +
                '/actions?filter=commentCard&limit=' + ACTIONS_PAGE +
                '&key=' + APP_KEY + '&token=' + token +
                (before ? '&before=' + before : '');
            var actions = await getJsonWithRetry(url);
            if (!actions.length) break;

            for (var i = 0; i < actions.length; i++) {
                var a = actions[i];
                var text = a.data && a.data.text;
                var cardId = a.data && a.data.card && a.data.card.id;
                if (!text || !cardId || text.indexOf('Effort updated by') !== 0) continue;
                if (!range.includes(new Date(a.date))) continue;
                var cur = byCard[cardId] || { est: 0, act: 0 };
                cur.est += parseEffortDelta(text, 'Estimated');
                cur.act += parseEffortDelta(text, 'Actual');
                byCard[cardId] = cur;
            }

            var oldest = new Date(actions[actions.length - 1].date);
            if (actions.length < ACTIONS_PAGE) break;
            if (range.from && oldest < range.from) break; // gone past the window
            before = actions[actions.length - 1].id;
        }
        return byCard;
    }

    async function getJsonWithRetry(url, attempts) {
        attempts = attempts || 4;
        for (var i = 0; i < attempts; i++) {
            var res = await fetch(url);
            if (res.status === 429) {
                var wait = Number(res.headers.get('Retry-After')) || Math.pow(2, i);
                await sleep(wait * 1000);
                continue;
            }
            if (!res.ok) throw new Error('Trello API returned ' + res.status);
            var data = await res.json();
            if (!Array.isArray(data)) throw new Error('unexpected Trello API response');
            return data;
        }
        throw new Error('Trello API rate limit hit - try a narrower date range');
    }

    function sleep(ms) {
        return new Promise(function (resolve) { setTimeout(resolve, ms); });
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

    // Trims floating-point noise from summed effort (0.1 + 0.2 etc).
    function round2(n) {
        return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
    }

    // Shapes a { est, act } delta (or missing) into the same fields as currentEffort().
    function deltaToEffort(delta) {
        var d = delta || { est: 0, act: 0 };
        return { estDisplay: d.est, actDisplay: d.act, estNum: d.est, actNum: d.act };
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
        currentEffort: currentEffort,
        rangedEffortByCard: rangedEffortByCard,
        deltaToEffort: deltaToEffort,
        round2: round2,
        downloadCsv: downloadCsv
    };
})();
