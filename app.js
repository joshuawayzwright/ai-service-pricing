(function () {
  'use strict';
  var P = window.PricingLib;
  var $ = function (id) { return document.getElementById(id); };
  var rateFields = ['income', 'superRate', 'costs', 'bufferPercent', 'weeksOff', 'hoursPerWeek', 'daysPerWeek', 'billablePercent'];
  var current = { text: '', prompt: '' };

  function read() {
    var input = {};
    rateFields.forEach(function (f) { input[f] = $(f).value; });
    input.gstRegistered = $('gstRegistered').checked;
    return input;
  }

  function render() {
    var input = read();
    var r = P.computeRate(input);
    var job = r.ok ? P.withGst(P.priceJob(r.hourlyRounded, {
      hours: $('hours').value, materials: $('materials').value, markupPercent: $('markupPercent').value, callOut: $('callOut').value
    }), r.gstRegistered) : null;
    $('s-hourly').textContent = r.ok ? P.money(r.hourlyRounded) : '—';
    $('s-day').textContent = r.ok ? P.money(r.dayRate) : '—';
    $('s-job').textContent = job ? P.money(job.total) : '—';
    $('s-turnover').textContent = r.ok ? P.money(r.target) : '—';
    $('errors').textContent = r.errors.join(' ');
    current.text = r.ok ? P.buildSummary(input, r, job) : 'Fix the highlighted inputs to see your numbers.';
    current.prompt = r.ok ? P.buildAiPrompt(input, r, { service: $('service').value, area: $('area').value }) : '';
    $('output').textContent = current.text;
  }

  function say(msg) { $('status').textContent = msg; }
  function copy(text, done) {
    if (!text) { say('Nothing to copy yet.'); return; }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { say(done); }, function () { say('Copy blocked: select the text and copy it instead.'); });
    } else { say('Copy isn\'t available here: select the text and copy it instead.'); }
  }

  $('form').addEventListener('input', render);
  $('form').addEventListener('change', render);
  $('form').addEventListener('submit', function (e) { e.preventDefault(); });
  $('copy').addEventListener('click', function () { copy(current.text, 'Summary copied.'); });
  $('copy-ai').addEventListener('click', function () { copy(current.prompt, 'AI prompt copied. Paste it into your AI assistant.'); });
  $('print').addEventListener('click', function () { window.print(); });
  render();
})();
