/* global TrelloPowerUp */

const t = TrelloPowerUp.iframe();

// === CARD MODE ===

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

document.getElementById('save').addEventListener('click', function(evt) {
  evt.preventDefault();
  const newEst = parseFloat(document.getElementById('est').value || 0);
  const newAct = parseFloat(document.getElementById('act').value || 0);

  t.set('card', 'shared', 'estimatedEffort', newEst).then(function() {
    t.set('card', 'shared', 'actualEffort', newAct).then(function() {
      t.closePopup();
    });
  });
  
});
