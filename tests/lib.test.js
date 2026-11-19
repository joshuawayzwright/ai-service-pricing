const test = require('node:test');
const assert = require('node:assert/strict');
const P = require('../lib.js');

const base = { income: 80000, superRate: 12, costs: 15000, weeksOff: 6, hoursPerWeek: 40, daysPerWeek: 5, billablePercent: 75, bufferPercent: 10 };

test('hourly rate covers income, super, costs and buffer over billable hours', () => {
  const r = P.computeRate(base);
  assert.equal(r.ok, true);
  assert.equal(r.workingWeeks, 46);
  assert.equal(r.billableHours, 46 * 40 * 0.75);
  assert.equal(r.superAmount, 9600);
  assert.ok(Math.abs(r.target - (80000 + 9600 + 15000) * 1.1) < 1e-6);
  assert.ok(Math.abs(r.hourly * r.billableHours - r.target) < 1e-6);
  assert.equal(r.hourlyRounded % 5, 0);
  assert.ok(r.hourlyRounded >= r.hourly);
});

test('day rate is hourly rate times billable hours in a day', () => {
  const r = P.computeRate(base);
  assert.ok(Math.abs(r.dayRate - r.hourly * 8 * 0.75) < 1e-9);
});

test('GST adds 10% only when registered', () => {
  const a = P.computeRate({ ...base, gstRegistered: false });
  const b = P.computeRate({ ...base, gstRegistered: true });
  assert.equal(a.hourlyIncGst, a.hourly);
  assert.ok(Math.abs(b.hourlyIncGst - b.hourly * 1.1) < 1e-9);
});

test('warns about the GST threshold when unregistered and above $75,000', () => {
  const r = P.computeRate({ ...base, gstRegistered: false });
  assert.ok(r.warnings.some(w => /\$75,000 GST threshold/.test(w)));
  const small = P.computeRate({ ...base, income: 30000, costs: 2000 });
  assert.ok(!small.warnings.some(w => /GST threshold/.test(w)));
});

test('rejects impossible inputs instead of dividing by zero', () => {
  const r = P.computeRate({ ...base, weeksOff: 52 });
  assert.equal(r.ok, false);
  assert.equal(r.hourly, 0);
  assert.ok(r.errors.length > 0);
  assert.equal(P.computeRate({ ...base, billablePercent: 0 }).ok, false);
});

test('job price includes labour, marked-up materials and call-out, plus GST when registered', () => {
  const job = P.withGst(P.priceJob(100, { hours: 3, materials: 200, markupPercent: 20, callOut: 50 }), true);
  assert.equal(job.labour, 300);
  assert.equal(job.materialsCharged, 240);
  assert.equal(job.exGst, 590);
  assert.equal(job.gst, 59);
  assert.equal(job.total, 649);
  const noGst = P.withGst(P.priceJob(100, { hours: 1 }), false);
  assert.equal(noGst.total, 100);
});

test('money and roundUpTo behave', () => {
  assert.equal(P.money(1234.5), '$1,234.50');
  assert.equal(P.roundUpTo(81.01, 5), 85);
  assert.equal(P.roundUpTo(85, 5), 85);
  assert.equal(P.num('$1,200', 0), 1200);
  assert.equal(P.num('', 7), 7);
});

test('summary and AI prompt contain the worked-out figures', () => {
  const r = P.computeRate(base);
  const s = P.buildSummary(base, r, P.priceJob(r.hourlyRounded, { hours: 2 }));
  assert.match(s, /Minimum hourly rate/);
  assert.match(s, /EXAMPLE JOB/);
  const prompt = P.buildAiPrompt(base, r, { service: 'Lawn mowing', area: 'Gold Coast' });
  assert.match(prompt, /Do NOT lower these numbers/);
  assert.ok(prompt.includes(P.money(r.hourlyRounded)));
  assert.match(prompt, /Lawn mowing/);
});
