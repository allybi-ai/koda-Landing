(function () {
  'use strict';
  if (typeof window === 'undefined') return;

  var TIME_STAGES = ['search', 'version', 'source', 'confirmation', 'send'];
  var FLOW_STAGES = ['request', 'search', 'version', 'source', 'confirmation', 'send'];
  var TIME_LABELS = { search: 'Busca', version: 'Versão', source: 'Fonte e contexto', confirmation: 'Confirmação', send: 'Envio' };
  var FLOW_LABELS = { request: 'Pedido', search: 'Busca', version: 'Versão', source: 'Fonte', confirmation: 'Confirmação', send: 'Envio' };
  var LEGACY_TIME_BANDS = [
    { max: 3, copy: 'Pequeno no mês. Caro no momento errado.' },
    { max: 10, copy: 'Uma rotina invisível já ocupa parte do mês.' },
    { max: 25, copy: 'Dias úteis estão indo para confirmação manual.' },
    { max: Infinity, copy: 'Esse fluxo está caro demais para depender de memória.' }
  ];
  var LEGACY_FLOW_BANDS = [
    { max: 24, label: 'Fluxo claro' },
    { max: 49, label: 'Atrito moderado' },
    { max: 74, label: 'Atrito alto' },
    { max: 100, label: 'Atrito crítico' }
  ];

  document.addEventListener('DOMContentLoaded', function () {
    var root = document.querySelector('[data-dj-result]');
    if (!root) return;
    var Data = window.AllybiToolsData;
    if (!Data) {
      showRuntimeError(root);
      return;
    }

    var kind = root.getAttribute('data-dj-result-kind');
    var key = kind === 'time' ? Data.STORAGE_KEYS.timeResult : Data.STORAGE_KEYS.flowResult;
    try {
      var projection = readStored(key, kind, Data) || readQuery(kind, Data);
      if (!projection) {
        showEmpty(root);
        return;
      }
      render(root, projection, Data);
      wireActions(root, projection, Data);
      startReveal(root);
    } catch (_error) {
      showRuntimeError(root);
    }
  });

  function readStored(key, kind, Data) {
    var raw;
    try { raw = localStorage.getItem(key); } catch (_error) { return null; }
    if (!raw) return null;
    var summary;
    try { summary = JSON.parse(raw); } catch (_error) { remove(key); return null; }
    if (!summary || summary.kind !== kind || !finite(summary.savedAt) || summary.savedAt <= 0 || Date.now() - summary.savedAt > Data.RESULT_EXPIRY_MS || summary.savedAt > Date.now() + 1000) {
      remove(key);
      return null;
    }
    var normalized = normalizeSummary(summary, kind, Data);
    if (!normalized) remove(key);
    return normalized;

    function remove(storageKey) {
      try { localStorage.removeItem(storageKey); } catch (_error) {}
    }
  }

  function normalizeSummary(summary, kind, Data) {
    if (summary.version === 2) return normalizeLegacy(summary.result, kind, Data, true);
    if (summary.version !== 3 || summary.calculationVersion !== Data.CALCULATION_VERSION || summary.instrumentVersion !== Data.INSTRUMENT_VERSIONS[kind === 'time' ? 'tempo' : 'fluxo']) return null;
    return normalizeCurrent(summary.result, kind, Data, true);
  }

  function normalizeLegacy(result, kind, Data, fromStorage) {
    if (!result || typeof result !== 'object') return null;
    if (kind === 'time') {
      if (!validTimeNumbers(result) || !validStages(result.stageMonthlyHours, TIME_STAGES, Infinity) || TIME_STAGES.indexOf(result.bottleneck) === -1) return null;
      var timeBand = fromStorage && result.band && typeof result.band.copy === 'string'
        ? { copy: result.band.copy, label: result.band.label || '' }
        : legacyTimeBand(result.monthlyDisplay);
      return { protocol: 2, kind: kind, result: copyTime(result, timeBand), legacy: true };
    }
    if (!finite(result.score) || result.score < 0 || result.score > 100 || !validStages(result.stagePercents, FLOW_STAGES, 100) || FLOW_STAGES.indexOf(result.bottleneck) === -1) return null;
    var flowBand = fromStorage && result.band && typeof result.band.label === 'string'
      ? { label: result.band.label, copy: result.band.copy || '' }
      : legacyFlowBand(result.score);
    return { protocol: 2, kind: kind, result: copyFlow(result, flowBand, Data), legacy: true };
  }

  function normalizeCurrent(result, kind, Data) {
    if (!result || typeof result !== 'object' || !Number.isInteger(result.bandIndex) || result.bandIndex < 0 || result.bandIndex > 3) return null;
    if (kind === 'time') {
      if (!validTimeNumbers(result) || !validStages(result.stageMonthlyHours, TIME_STAGES, Infinity) || TIME_STAGES.indexOf(result.bottleneck) === -1 || !count(result.placeCount, 0, 6) || !count(result.postFindCount, 0, 5)) return null;
      var timeBand = Data.CALCULATOR_BANDS[result.bandIndex];
      if (!timeBand) return null;
      var currentTime = copyTime(result, timeBand);
      currentTime.placeCount = result.placeCount;
      currentTime.postFindCount = result.postFindCount;
      currentTime.bandIndex = result.bandIndex;
      return { protocol: 3, kind: kind, result: currentTime, legacy: false };
    }
    if (!finite(result.score) || result.score < 0 || result.score > 100 || !validStages(result.stagePercents, FLOW_STAGES, 100) || FLOW_STAGES.indexOf(result.bottleneck) === -1 || !count(result.stagesAtOrAbove50, 0, 6)) return null;
    var flowBand = Data.DIAGNOSTIC_BANDS[result.bandIndex];
    if (!flowBand) return null;
    var currentFlow = copyFlow(result, flowBand, Data);
    currentFlow.stagesAtOrAbove50 = result.stagesAtOrAbove50;
    currentFlow.bandIndex = result.bandIndex;
    return { protocol: 3, kind: kind, result: currentFlow, legacy: false };
  }

  function readQuery(kind, Data) {
    var params = new URLSearchParams(location.search);
    var version = params.get('v');
    if (version !== '2' && version !== '3') return null;
    var stages = parseStages(params.get('st'), kind === 'time' ? TIME_STAGES : FLOW_STAGES, kind === 'time' ? Infinity : 100);
    if (!stages) return null;
    var raw;
    if (kind === 'time') {
      raw = {
        monthlyDisplay: number(params.get('m')),
        annualHoursDisplay: number(params.get('y')),
        annualDaysDisplay: number(params.get('d')),
        monthlyLow: number(params.get('lo')),
        monthlyHigh: number(params.get('hi')),
        bottleneck: params.get('b'),
        stageMonthlyHours: stages
      };
    } else {
      raw = {
        score: number(params.get('score')),
        bottleneck: params.get('b'),
        bottleneckLabel: Data.DIAGNOSTIC_BOTTLENECK_LABELS[params.get('b')] || '',
        stagePercents: stages
      };
    }
    if (version === '2') return normalizeLegacy(raw, kind, Data, false);
    if (params.get('calculationVersion') !== Data.CALCULATION_VERSION || params.get('instrumentVersion') !== Data.INSTRUMENT_VERSIONS[kind === 'time' ? 'tempo' : 'fluxo']) return null;
    raw.bandIndex = integer(params.get('bandIndex'));
    if (kind === 'time') {
      raw.placeCount = integer(params.get('placeCount'));
      raw.postFindCount = integer(params.get('postFindCount'));
    } else {
      raw.stagesAtOrAbove50 = integer(params.get('stagesAtOrAbove50'));
    }
    return normalizeCurrent(raw, kind, Data, false);
  }

  function render(root, projection, Data) {
    var result = projection.result;
    var body = root.querySelector('[data-dj-result-body]');
    root.querySelector('[data-dj-empty]').hidden = true;
    root.querySelector('[data-dj-runtime-error]').hidden = true;
    body.hidden = false;
    if (projection.kind === 'time') renderTime(root, result, projection.legacy, Data);
    else renderFlow(root, result, projection.legacy);
  }

  function renderTime(root, result, legacy, Data) {
    text(root, '[data-dj-result-factual]', legacy
      ? 'Esta é uma estimativa registrada em uma versão anterior do instrumento.'
      : 'Seu caminho passa por ' + result.placeCount + ' lugares e ainda tem ' + result.postFindCount + ' etapas depois de encontrar o arquivo.');
    text(root, '[data-dj-result-value]', Data.formatHoursDisplay(result.monthlyDisplay) + ' por mês');
    text(root, '[data-dj-result-interpretation]', legacy
      ? ((result.band && result.band.copy) || 'Uma estimativa registrada em uma versão anterior.')
      : 'Volume mensal estimado a partir das cenas que você descreveu.');
    renderTrail(root, result.stageMonthlyHours, TIME_STAGES, TIME_LABELS, result.bottleneck, function (value) { return Data.formatHoursDisplay(value); });
    text(root, '[data-dj-result-bottleneck]', 'Maior concentração: ' + TIME_LABELS[result.bottleneck] + '.');
    root.querySelector('[data-dj-result-facts]').innerHTML = [
      fact('Equivalente anual', Data.formatHoursDisplay(result.annualHoursDisplay) + ' · ' + Math.round(result.annualDaysDisplay) + ' dias úteis'),
      fact('Faixa mensal', Data.formatHoursDisplay(result.monthlyLow) + ' a ' + Data.formatHoursDisplay(result.monthlyHigh)),
      fact('Protocolo do resultado', 'v' + (legacyVersion(result) || '3'))
    ].join('');
  }

  function renderFlow(root, result, legacy) {
    var concentration = flowConcentration(result);
    text(root, '[data-dj-result-factual]', legacy
      ? 'Este é um resultado anterior, preservado como foi registrado.'
      : result.stagesAtOrAbove50 + ' de 6 etapas chegaram a 50/100 ou mais.');
    text(root, '[data-dj-result-value]', Math.round(result.score) + '/100');
    text(root, '[data-dj-result-interpretation]', (result.band && result.band.label) || 'Leitura do caminho registrado.');
    renderTrail(root, result.stagePercents, FLOW_STAGES, FLOW_LABELS, concentration.keys, function (value) { return Math.round(value) + '/100'; });
    text(root, '[data-dj-result-bottleneck]', concentration.text);
    root.querySelector('[data-dj-result-facts]').innerHTML = [
      fact('Pontuação derivada', Math.round(result.score) + ' de 100'),
      fact('Faixa', (result.band && result.band.label) || 'Sem faixa'),
      fact('Confirmação pública', Math.round(result.stagePercents.confirmation) + '/100')
    ].join('');
  }

  function renderTrail(root, values, order, labels, bottleneck, format) {
    var highlighted = Array.isArray(bottleneck) ? bottleneck : [bottleneck];
    root.querySelector('[data-dj-result-path]').innerHTML = order.map(function (key, index) {
      var value = values[key];
      return '<div class="dj-trail-row" data-dj-stage="' + key + '" data-dj-bottleneck="' + String(highlighted.indexOf(key) !== -1) + '">' +
        '<span class="dj-trail-row__index">' + String(index + 1).padStart(2, '0') + '</span>' +
        '<span class="dj-trail-row__label">' + escape(labels[key]) + '</span>' +
        '<span class="dj-trail-row__line" aria-hidden="true"><i style="--dj-stage-value:' + Math.max(2, Math.min(100, value)) + '%"></i></span>' +
        '<span class="dj-trail-row__value">' + escape(format(value)) + '</span></div>';
    }).join('');
  }

  function wireActions(root, projection, Data) {
    var result = projection.result;
    var kind = projection.kind;
    var shareText = kind === 'time'
      ? 'Meu caminho foi estimado em ' + Data.formatHoursDisplay(result.monthlyDisplay) + ' por mês. Maior concentração: ' + TIME_LABELS[result.bottleneck] + '. Resultado do Allybi.'
      : 'Meu fluxo registrou ' + Math.round(result.score) + '/100. ' + flowConcentration(result).text + ' Resultado do Allybi.';
    var feedback = root.querySelector('[data-dj-share-feedback]');
    var nativeButton = root.querySelector('[data-dj-share-native]');
    var copyButton = root.querySelector('[data-dj-share-copy]');
    var whatsapp = root.querySelector('[data-dj-share-whatsapp]');
    var restart = root.querySelector('[data-dj-restart]');
    restart.href = restart.getAttribute('href').split('?')[0] + '?restart=1';
    whatsapp.href = 'https://wa.me/?text=' + encodeURIComponent(shareText + '\n' + location.href);

    nativeButton.addEventListener('click', function () {
      setState(root, 'share-pending');
      if (!navigator.share) {
        copyText(shareText).then(function () { success('Resumo copiado.'); }, function () { fail('Não foi possível compartilhar agora.'); });
        return;
      }
      navigator.share({ text: shareText, url: location.href }).then(function () {
        success('Resultado compartilhado.');
      }, function (error) {
        if (error && error.name === 'AbortError') {
          feedback.textContent = 'Compartilhamento cancelado.';
          setState(root, 'ready');
        } else fail('Não foi possível compartilhar agora.');
      });
    });
    copyButton.addEventListener('click', function () {
      setState(root, 'share-pending');
      copyText(shareText).then(function () { success('Resumo copiado.'); }, function () { fail('Não foi possível copiar agora.'); });
    });
    function success(message) { feedback.textContent = message; setState(root, 'share-success'); }
    function fail(message) { feedback.textContent = message; setState(root, 'share-error'); }
  }

  function startReveal(root) {
    var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setState(root, 'revealing-value');
    if (reduced) {
      setTimeout(function () { setState(root, 'ready'); }, 140);
      return;
    }
    setTimeout(function () { setState(root, 'drawing-path'); }, 160);
    setTimeout(function () { setState(root, 'highlighting-bottleneck'); }, 440);
    setTimeout(function () { setState(root, 'showing-details'); }, 560);
    setTimeout(function () { setState(root, 'ready'); }, 900);
  }

  function showEmpty(root) {
    root.querySelector('[data-dj-result-body]').hidden = true;
    root.querySelector('[data-dj-runtime-error]').hidden = true;
    root.querySelector('[data-dj-empty]').hidden = false;
    setState(root, 'empty');
  }

  function showRuntimeError(root) {
    root.querySelector('[data-dj-result-body]').hidden = true;
    root.querySelector('[data-dj-empty]').hidden = true;
    root.querySelector('[data-dj-runtime-error]').hidden = false;
    setState(root, 'runtime-error');
  }

  function copyText(value) {
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(value);
    return new Promise(function (resolve, reject) {
      var field = document.createElement('textarea');
      field.value = value;
      field.setAttribute('readonly', '');
      field.style.position = 'fixed';
      field.style.left = '-10000px';
      document.body.appendChild(field);
      field.select();
      var copied = false;
      try { copied = document.execCommand('copy'); } catch (_error) {}
      field.remove();
      if (copied) resolve(); else reject(new Error('clipboard-unavailable'));
    });
  }

  function validTimeNumbers(result) {
    return ['monthlyDisplay', 'monthlyLow', 'monthlyHigh', 'annualHoursDisplay', 'annualDaysDisplay'].every(function (key) { return finite(result[key]) && result[key] >= 0; }) && result.monthlyLow <= result.monthlyHigh;
  }
  function validStages(map, order, max) {
    if (!map || typeof map !== 'object' || Object.keys(map).length !== order.length) return false;
    return order.every(function (key) { return finite(map[key]) && map[key] >= 0 && map[key] <= max; });
  }
  function parseStages(raw, order, max) {
    if (!raw) return null;
    var out = {};
    for (var pair of raw.split(',')) {
      var parts = pair.split(':');
      if (parts.length !== 2 || order.indexOf(parts[0]) === -1 || Object.prototype.hasOwnProperty.call(out, parts[0])) return null;
      var value = number(parts[1]);
      if (!finite(value) || value < 0 || value > max) return null;
      out[parts[0]] = value;
    }
    return validStages(out, order, max) ? out : null;
  }
  function copyTime(result, band) {
    return { monthlyDisplay: result.monthlyDisplay, monthlyLow: result.monthlyLow, monthlyHigh: result.monthlyHigh, annualHoursDisplay: result.annualHoursDisplay, annualDaysDisplay: result.annualDaysDisplay, stageMonthlyHours: copyStages(result.stageMonthlyHours, TIME_STAGES), bottleneck: result.bottleneck, band: band };
  }
  function copyFlow(result, band, Data) {
    return { score: result.score, stagePercents: copyStages(result.stagePercents, FLOW_STAGES), bottleneck: result.bottleneck, bottleneckLabel: result.bottleneckLabel || Data.DIAGNOSTIC_BOTTLENECK_LABELS[result.bottleneck] || '', band: band };
  }
  function copyStages(source, order) { var out = {}; order.forEach(function (key) { out[key] = source[key]; }); return out; }
  function flowConcentration(result) {
    var maximum = Math.max.apply(null, FLOW_STAGES.map(function (key) { return result.stagePercents[key]; }));
    if (maximum <= 0) return { keys: [], text: 'Nenhuma etapa concentrou atrito nas respostas.' };
    var keys = FLOW_STAGES.filter(function (key) { return result.stagePercents[key] === maximum; });
    if (keys.length === 1) {
      var label = result.bottleneck === keys[0] && result.bottleneckLabel ? result.bottleneckLabel : FLOW_LABELS[keys[0]];
      return { keys: keys, text: 'Maior concentração: ' + label + '.' };
    }
    return { keys: keys, text: 'Maiores concentrações: ' + humanList(keys.map(function (key) { return FLOW_LABELS[key]; })) + '.' };
  }
  function humanList(values) {
    if (values.length < 2) return values[0] || '';
    return values.slice(0, -1).join(', ') + ' e ' + values[values.length - 1];
  }
  function legacyTimeBand(value) { return LEGACY_TIME_BANDS.find(function (band) { return value < band.max; }) || LEGACY_TIME_BANDS[3]; }
  function legacyFlowBand(value) { return LEGACY_FLOW_BANDS.find(function (band) { return value <= band.max; }) || LEGACY_FLOW_BANDS[3]; }
  function legacyVersion(result) { return result && result.bandIndex != null ? 3 : 2; }
  function number(value) { if (value == null || value === '') return null; var parsed = Number(value); return finite(parsed) ? parsed : null; }
  function integer(value) { var parsed = number(value); return Number.isInteger(parsed) ? parsed : null; }
  function finite(value) { return typeof value === 'number' && Number.isFinite(value); }
  function count(value, min, max) { return Number.isInteger(value) && value >= min && value <= max; }
  function fact(label, value) { return '<div class="dj-fact"><dt>' + escape(label) + '</dt><dd>' + escape(value) + '</dd></div>'; }
  function text(root, selector, value) { var node = root.querySelector(selector); if (node) node.textContent = value; }
  function setState(root, value) { root.setAttribute('data-dj-result-state', value); }
  function escape(value) { return String(value == null ? '' : value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
})();
