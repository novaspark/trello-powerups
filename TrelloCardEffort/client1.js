/* global TrelloPowerUp */

var Promise = TrelloPowerUp.Promise;
const t = TrelloPowerUp.iframe();

var BLACK_ROCKET_ICON = 'https://cdn.glitch.com/1b42d7fe-bda8-4af8-a6c8-eff0cea9e08a%2Frocket-ship.png?1494946700421';

TrelloPowerUp.initialize({

    'card-buttons': function (t, options) {
        return t.set("member", "shared", "hello", "world")
            .then(function () {
                return [{
                    icon: BLACK_ROCKET_ICON,
                    text: 'Estimate Size',
                    callback: function (t) {
                        return t.popup({
                            title: "Estimation",
                            url: 'estimate.html',
                        });
                    }
                }];
            })
    },
    'card-back-section': function (t, options) {
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
