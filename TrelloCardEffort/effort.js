/* global TrelloPowerUp */

const t = TrelloPowerUp.iframe();

// === CARD MODE ===

const container = document.getElementById('content');

const est = t.get('card', 'shared', 'estimatedEffort') || '';
const act = t.get('card', 'shared', 'actualEffort') || '';

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
