/* global TrelloPowerUp */

const t = TrelloPowerUp.iframe();


t.render(function () {
  const container = document.getElementById('content');

  var est = t.get('card', 'shared', 'estimatedEffort').then(function(e) {return e || '';});
  var act = t.get('card', 'shared', 'actualEffort').then(function(e) {return e || '';});
  
  container.innerHTML = `
    <label>Estimated Effort (hours):
      <input type="number" id="est" value="${est}" />
    </label>
    <label>Actual Effort (hours):
      <input type="number" id="act" value="${act}" />
    </label>
    <button id="save">Save</button>
  `;

  document.getElementById('save').addEventListener('click', function (evt) {
    evt.preventDefault();
    const newEst = parseFloat(document.getElementById('est').value || 0);
    const newAct = parseFloat(document.getElementById('act').value || 0);

    t.set('card', 'shared', 'estimatedEffort', newEst);
    t.set('card', 'shared', 'actualEffort', newAct);    
  });
});
