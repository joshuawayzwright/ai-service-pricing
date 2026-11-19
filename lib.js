/* Service pricing maths. Pure functions: no DOM, no network. */
(function (root) {
  'use strict';

  var GST_RATE = 0.1;
  var GST_THRESHOLD = 75000; // ATO turnover threshold for compulsory GST registration (most businesses)

  function num(v, fallback) {
    var n = typeof v === 'number' ? v : parseFloat(String(v == null ? '' : v).replace(/[$,\s%]/g, ''));
    return isFinite(n) ? n : fallback;
  }

  function roundUpTo(value, step) {
    if (!(step > 0)) return value;
    return Math.ceil(value / step - 1e-9) * step;
  }

  function money(value) {
    var cents = Math.round(value * 100);
    var neg = cents < 0;
    cents = Math.abs(cents);
    var d = Math.floor(cents / 100).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return (neg ? '-$' : '$') + d + '.' + String(cents % 100).padStart(2, '0');
  }

  /**
   * Works out the hourly rate needed to pay yourself, your super and your costs.
   * input: { income, superRate, costs, weeksOff, hoursPerWeek, daysPerWeek, billablePercent, bufferPercent, gstRegistered }
   */
  function computeRate(input) {
    var i = input || {};
    var errors = [];
    var income = num(i.income, 0);
    var superRate = num(i.superRate, 12) / 100;
    var costs = num(i.costs, 0);
    var weeksOff = num(i.weeksOff, 6);
    var hoursPerWeek = num(i.hoursPerWeek, 38);
    var daysPerWeek = num(i.daysPerWeek, 5);
    var billable = num(i.billablePercent, 70) / 100;
    var buffer = num(i.bufferPercent, 10) / 100;

    if (income < 0) errors.push('Income can\'t be negative.');
    if (costs < 0) errors.push('Business costs can\'t be negative.');
    if (superRate < 0 || superRate > 0.5) errors.push('Super rate should be between 0% and 50%.');
    if (weeksOff < 0 || weeksOff >= 52) errors.push('Weeks off must be between 0 and 51.');
    if (hoursPerWeek <= 0 || hoursPerWeek > 100) errors.push('Hours per week must be between 1 and 100.');
    if (daysPerWeek <= 0 || daysPerWeek > 7) errors.push('Days per week must be between 1 and 7.');
    if (billable <= 0 || billable > 1) errors.push('Billable time must be between 1% and 100%.');
    if (buffer < 0 || buffer > 1) errors.push('Profit buffer must be between 0% and 100%.');

    var workingWeeks = 52 - weeksOff;
    var totalHours = workingWeeks * hoursPerWeek;
    var billableHours = totalHours * billable;
    var superAmount = income * superRate;
    var needed = income + superAmount + costs;
    var target = needed * (1 + buffer);
    var ok = errors.length === 0 && billableHours > 0;
    var hourly = ok ? target / billableHours : 0;
    var hoursPerDay = hoursPerWeek / daysPerWeek;
    var dayRate = hourly * hoursPerDay * billable;
    var gst = !!i.gstRegistered;

    var warnings = [];
    if (ok && !gst && target >= GST_THRESHOLD) {
      warnings.push('Your target turnover is ' + money(target) + ', which is at or above the $75,000 GST threshold. Check with the ATO whether you need to register for GST.');
    }
    if (ok && billable > 0.85) warnings.push('More than 85% billable is rare for sole traders once quoting, travel and admin are counted.');

    return {
      ok: ok,
      errors: errors,
      warnings: warnings,
      workingWeeks: workingWeeks,
      totalHours: totalHours,
      billableHours: billableHours,
      superAmount: superAmount,
      needed: needed,
      target: target,
      hourly: hourly,
      hourlyRounded: roundUpTo(hourly, 5),
      hourlyIncGst: gst ? hourly * (1 + GST_RATE) : hourly,
      dayRate: dayRate,
      dayRateIncGst: gst ? dayRate * (1 + GST_RATE) : dayRate,
      gstRegistered: gst
    };
  }

  /** Prices a single job from hours and materials. */
  function priceJob(rate, job) {
    var j = job || {};
    var hours = Math.max(0, num(j.hours, 0));
    var materials = Math.max(0, num(j.materials, 0));
    var markup = Math.max(0, num(j.markupPercent, 15)) / 100;
    var callOut = Math.max(0, num(j.callOut, 0));
    var labour = hours * rate;
    var materialsCharged = materials * (1 + markup);
    var exGst = labour + materialsCharged + callOut;
    return {
      labour: labour,
      materialsCharged: materialsCharged,
      callOut: callOut,
      exGst: exGst,
      gst: 0,
      total: exGst
    };
  }

  function withGst(job, registered) {
    if (!registered) return job;
    var gst = Math.round(job.exGst * GST_RATE * 100) / 100;
    return Object.assign({}, job, { gst: gst, total: job.exGst + gst });
  }

  function buildSummary(input, r, job) {
    var lines = [];
    lines.push('SERVICE PRICING SUMMARY');
    lines.push('');
    lines.push('Pay yourself (before tax): ' + money(num(input.income, 0)));
    lines.push('Super (' + num(input.superRate, 12) + '%): ' + money(r.superAmount));
    lines.push('Business costs per year: ' + money(num(input.costs, 0)));
    lines.push('Profit buffer: ' + num(input.bufferPercent, 10) + '%');
    lines.push('Turnover you need (ex GST): ' + money(r.target));
    lines.push('');
    lines.push('Working weeks: ' + r.workingWeeks + ' · Billable hours a year: ' + Math.round(r.billableHours));
    lines.push('Minimum hourly rate (ex GST): ' + money(r.hourly) + '  → round to ' + money(r.hourlyRounded));
    if (r.gstRegistered) lines.push('Hourly rate incl. GST: ' + money(r.hourlyIncGst));
    lines.push('Day rate (ex GST): ' + money(r.dayRate) + (r.gstRegistered ? ' · incl. GST: ' + money(r.dayRateIncGst) : ''));
    if (job) {
      lines.push('');
      lines.push('EXAMPLE JOB');
      lines.push('Labour: ' + money(job.labour));
      lines.push('Materials incl. markup: ' + money(job.materialsCharged));
      if (job.callOut) lines.push('Call-out fee: ' + money(job.callOut));
      lines.push('Price ex GST: ' + money(job.exGst));
      if (r.gstRegistered) lines.push('GST: ' + money(job.gst));
      lines.push('Price to quote: ' + money(job.total));
    }
    r.warnings.forEach(function (w) { lines.push(''); lines.push('Note: ' + w); });
    return lines.join('\n');
  }

  function buildAiPrompt(input, r, extra) {
    var e = extra || {};
    return [
      'I am an Australian sole trader. Help me present my prices with confidence.',
      'Trade/service: ' + (e.service || '[my service]') + '. Area: ' + (e.area || '[my area]') + '.',
      'My worked-out minimum rate is ' + money(r.hourlyRounded) + ' per hour ex GST (' + money(r.dayRate) + ' per day).',
      'Do NOT lower these numbers. Do not invent competitor prices or market statistics.',
      '1. Suggest three packages (basic, standard, premium) built on this rate, with what each includes.',
      '2. Write a short, friendly paragraph for my website explaining my pricing.',
      '3. Give me two calm replies for when a customer says "that\'s too expensive".',
      'Use Australian English.'
    ].join('\n');
  }

  var api = {
    GST_RATE: GST_RATE, GST_THRESHOLD: GST_THRESHOLD,
    num: num, money: money, roundUpTo: roundUpTo,
    computeRate: computeRate, priceJob: priceJob, withGst: withGst,
    buildSummary: buildSummary, buildAiPrompt: buildAiPrompt
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.PricingLib = api;
})(this);
