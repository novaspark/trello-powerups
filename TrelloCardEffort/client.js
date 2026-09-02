var ICON = 'https://www.novaspark.co.uk/Trello/EffortTracker/img/icon.png';

window.TrelloPowerUp.initialize({
    "board-buttons": function (t, opts) {
        return [{
            icon: { dark: ICON, light: ICON },
            text: "Effort report",
            callback: function (t) {
                return t.modal({
                    title: "Board effort report",
                    url: './board-report.html',
                    fullscreen: false,
                    accentColor: 'blue'
                });
            }
        }];
    },
    "card-badges": function (t, opts) {
        return t.get("card", "shared", "effort", "{\"est\":\"-\",\"act\":\"-\"}")
            .then(function (effort) {
                const eff = JSON.parse(effort);
                if (eff.est != "-" || eff.act != "-") {
                    return [
                        {
                            text: "E:" + eff.est,
                            title: "Estimate",
                            color: 'green',
                        },
                        {
                            text: "A:" + eff.act,
                            title: "Actual",
                            color: 'orange',
                        },
                    ];
                }
            });
    },
    "card-detail-badges": function (t, opts) {
        return t.get("card", "shared", "effort", "{\"est\":\"-\",\"act\":\"-\"}")
            .then(function (effort) {
                const eff = JSON.parse(effort);
                return [
                    {
                        text: eff.est,
                        title: "Estimated effort",
                        color: 'green',
                        callback: function (t, opts) {
                           return t.popup({
                               title: "Update effort",
                               url: './effort-popup.html',
                            });
                        },
                    },
                    {
                        text: eff.act,
                        color: 'orange',
                        title: 'Actual effort',
                        callback: function (t, opts) {
                            return t.popup({
                                title: "Update effort",
                                url: './effort-popup.html',
                            });
                        },
                    },
                ];
            });
    },
    'list-actions': function (t) {
        return [{
            text: "Effort report",
            callback: function (t) {
                t.popup({
                    title: "Effort report",
                    url: './effort-report.html',
                });
            }
        }];
    }
}, {
    appKey: 'b8689879d76dbda1e35b2284538ae174',
    appName: 'Effort Tracker'
});
