/* global TrelloPowerUp */

const t = TrelloPowerUp.iframe();


t.render(function () {
  const container = document.getElementById('content');

  return t.get('card', 'shared', 'estimatedEffort').then(function (e) {
    console.log(e);
    t.get('card', 'shared', 'actualEffort').then(function (f) {
      console.log(f);
      container.innerHTML = `
          <label>Estimated Effort (hours):
            <input type="number" id="est" value="${e}" />
          </label>
          <label>Actual Effort (hours):
            <input type="number" id="act" value="${f}" />
          </label>
          <button id="save">Save</button>
        `;
    });
  });


  document.getElementById('save').addEventListener('click', function (evt) {
    evt.preventDefault();
    const newEst = parseFloat(document.getElementById('est').value || 0);
    const newAct = parseFloat(document.getElementById('act').value || 0);

    t.set('card', 'shared', 'estimatedEffort', newEst);
    t.set('card', 'shared', 'actualEffort', newAct);
  });
});
