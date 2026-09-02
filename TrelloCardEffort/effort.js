var t = TrelloPowerUp.iframe({
    appKey: 'b8689879d76dbda1e35b2284538ae174',
    appName: 'Effort Tracker'
});

var EMPTY_EFFORT = '{"est":"","act":""}';

window.effort.addEventListener("submit", async function (event) {
    event.preventDefault();

    const oldEff = JSON.parse(await t.get("card", "shared", "effort", EMPTY_EFFORT));
    const newEff = { est: window.est.value, act: window.act.value };

    await t.set("card", "shared", "effort", JSON.stringify(newEff));
    await postAuditComment(oldEff, newEff);
    t.closePopup();
});

t.render(function () {
    return t
        .get("card", "shared", "effort", EMPTY_EFFORT)
        .then(function (effort) {
            const eff = JSON.parse(effort);
            window.est.value = eff.est;
            window.act.value = eff.act;
        })
        .then(function () {
            t.sizeTo("#effort").done();
        });
});

async function postAuditComment(oldEff, newEff) {
    const changes = [];
    if (newEff.est !== oldEff.est) changes.push(`- Estimated: ${oldEff.est || '-'} -> ${newEff.est || '-'}`);
    if (newEff.act !== oldEff.act) changes.push(`- Actual: ${oldEff.act || '-'} -> ${newEff.act || '-'}`);
    if (changes.length === 0) return;

    try {
        const restApi = await t.getRestApi();
        if (!await restApi.isAuthorized()) {
            await restApi.authorize({ scope: 'read,write', expiration: 'never' });
        }
        const token = await restApi.getToken();
        const [member, card] = await Promise.all([t.member('fullName'), t.card('id')]);
        const text = `Effort updated by ${member.fullName} on ${new Date().toLocaleString()}\n${changes.join('\n')}`;
        await fetch(`https://api.trello.com/1/cards/${card.id}/actions/comments?key=b8689879d76dbda1e35b2284538ae174&token=${token}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text })
        });
    } catch (err) {
        console.error('Failed to post audit comment:', err);
    }
}