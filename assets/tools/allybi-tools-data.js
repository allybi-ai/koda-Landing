/**
 * allybi-tools-data.js
 *
 * Single source of truth for the Allybi tools system.
 *
 * Imported by:
 *   - allybi-questionnaire.js
 *   - allybi-results.js
 *   - allybi-methodology.js
 *   - allybi-tools-qa.js
 *
 * Contains:
 *   - TIME_CONFIG          (§10 - Calculator formula constants)
 *   - FLOW_CONFIG          (§11 - Diagnostic formula constants)
 *   - CALCULATOR_QUESTIONS (§33 - 5 questions, exact options)
 *   - DIAGNOSTIC_QUESTIONS (§50 - 7 questions, exact options)
 *   - CALCULATOR_BANDS     (§10 - 4 bands by monthly hours)
 *   - DIAGNOSTIC_BANDS     (§11 - 4 bands by 0..100 score)
 *   - BOTTLENECK_LABELS    (§11 - request/search/version/source/confirmation/send)
 *   - ALLYBI_BRIDGE        (§12 - bottleneck → title + bridge copy)
 *   - SHARE_TEMPLATES      (§13 - calculator + diagnostic share text)
 *   - VERSION              (calculationVersion stamp for localStorage)
 *
 * Pure functions exported:
 *   - calculateTime(answers)        → { monthlyRaw, monthlyHigh, monthlyLow, monthlyDisplay,
 *                                       annualHours, annualDays, stageAdjusted, bottleneck,
 *                                       band, version }
 *   - calculateDiagnostic(answers)  → { score, stagePercents, bottleneck, band, version }
 *   - roundHours(value)             → spec §10 rounding rule
 *   - formatHoursDisplay(value)     → "8h30" style
 *
 * No side effects. No DOM access. No network. No localStorage.
 * Works in both browser (via <script>) and Node.js (via `module.exports` shim).
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.AllybiToolsData = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // ───────────────────────────────────────────────────────────────────
  // §10 - TIME_CONFIG (Calculator constants)
  // ───────────────────────────────────────────────────────────────────
  var TIME_CONFIG = {
    weeksPerMonth: 4.33,
    frequency: {
      // "Cerca de duas vezes por mês" represented as 0.5 occurrence/week.
      'less-than-weekly': 0.5,
      '1-2': 1.5,
      '3-5': 4,
      '6-10': 8,
      '11-20': 15.5,
      '20+': 22
    },
    searchMinutes: {
      'under-2': 1,
      '2-5': 3.5,
      '6-10': 8,
      '11-20': 15.5,
      '20+': 25
    },
    postFindMinutes: {
      version: 3,
      source: 2.5,
      approval: 3,
      message: 2.5,
      recipient: 1.5
    },
    recheckRate: {
      never: 0,
      rare: 0.08,
      sometimes: 0.25,
      often: 0.5,
      almostAlways: 0.75
    },
    repeatedPathFraction: 0.50,
    estimateLow: 0.80,
    estimateHigh: 1.20
  };

  // ───────────────────────────────────────────────────────────────────
  // §11 - FLOW_CONFIG (Diagnostic constants)
  // ───────────────────────────────────────────────────────────────────
  var FLOW_CONFIG = {
    weights: {
      request: 12,
      search: 18,
      version: 20,
      source: 20,
      confirmationPasses: 9,
      confirmationDependency: 9,
      send: 12
    },
    tieBreak: [
      'version',
      'source',
      'search',
      'confirmation',
      'request',
      'send'
    ]
  };

  // ───────────────────────────────────────────────────────────────────
  // §10 - Calculator bottleneck tie-break order (search/version/source/
  // confirmation/send mapped to stageAdjusted output)
  // §10 says order: 1.version 2.source 3.search 4.confirmation 5.send
  // ───────────────────────────────────────────────────────────────────
  var CALCULATOR_TIE_BREAK = ['version', 'source', 'search', 'confirmation', 'send'];

  // ───────────────────────────────────────────────────────────────────
  // §10 - Calculator bands (by monthly hours)
  // ───────────────────────────────────────────────────────────────────
  var CALCULATOR_BANDS = [
    { max: 3,        copy: 'Poucas horas no mês.' },
    { max: 10,       copy: 'Uma parte recorrente do mês.' },
    { max: 25,       copy: 'Horas relevantes ao longo do mês.' },
    { max: Infinity, copy: 'Uma fatia alta do tempo mensal.' }
  ];

  // ───────────────────────────────────────────────────────────────────
  // §11 - Diagnostic bands (by 0..100 score)
  // ───────────────────────────────────────────────────────────────────
  var DIAGNOSTIC_BANDS = [
    { max: 24,  label: 'Fluxo claro' },
    { max: 49,  label: 'Atrito moderado' },
    { max: 74,  label: 'Atrito alto' },
    { max: 100, label: 'Atrito muito alto' }
  ];

  // ───────────────────────────────────────────────────────────────────
  // §11 - Bottleneck labels (Diagnostic)
  // ───────────────────────────────────────────────────────────────────
  var DIAGNOSTIC_BOTTLENECK_LABELS = {
    none: 'Sem gargalo dominante',
    request: 'Pedido incompleto',
    search: 'Busca espalhada',
    version: 'Versão frágil',
    source: 'Fonte invisível',
    confirmation: 'Confirmação dependente',
    send: 'Envio manual'
  };

  // ───────────────────────────────────────────────────────────────────
  // §12 - Allybi bridge per bottleneck
  // ───────────────────────────────────────────────────────────────────
  var ALLYBI_BRIDGE_CALCULATOR = {
    search: {
      title: 'Busca espalhada',
      bridge: 'Outlook, OneDrive, SharePoint e uploads entram no mesmo chat.'
    },
    version: {
      title: 'Confirmar versão',
      bridge: 'O Allybi compara versões e mantém a fonte visível.'
    },
    source: {
      title: 'Achar fonte e contexto',
      bridge: 'A resposta mostra arquivo, localização e data quando disponíveis.'
    },
    confirmation: {
      title: 'Pedir validação',
      bridge: 'Contexto, arquivo, fonte, destinatário e canal ficam juntos na revisão.'
    },
    send: {
      title: 'Preparar o envio',
      bridge: 'O Allybi organiza mensagem e arquivo. Outlook envia depois da confirmação. WhatsApp abre como handoff.'
    }
  };

  var ALLYBI_BRIDGE_DIAGNOSTIC = {
    none: {
      label: 'Sem gargalo dominante',
      bridge: 'O fluxo não indicou uma etapa dominante.'
    },
    request: {
      label: 'Pedido incompleto',
      bridge: 'O pedido entra em uma conversa com contexto reunido.'
    },
    search: {
      label: 'Busca espalhada',
      bridge: 'As fontes autorizadas e uploads ficam disponíveis no chat.'
    },
    version: {
      label: 'Versão frágil',
      bridge: 'Versões podem ser comparadas antes de escolher o arquivo.'
    },
    source: {
      label: 'Fonte invisível',
      bridge: 'Cada resposta mostra de onde veio.'
    },
    confirmation: {
      label: 'Confirmação dependente',
      bridge: 'A revisão reúne o que precisa ser confirmado antes de sair.'
    },
    send: {
      label: 'Envio manual',
      bridge: 'Outlook envia depois da confirmação. WhatsApp abre como handoff.'
    }
  };

  // ───────────────────────────────────────────────────────────────────
  // §33 - CALCULATOR_QUESTIONS (5 questions, exact options)
  // ───────────────────────────────────────────────────────────────────
  var CALCULATOR_QUESTIONS = [
    {
      id: 'places',
      type: 'multi',
      question: 'Quando chega um “você acha aquele arquivo?”, em quais pontos — lugares ou com quem — você realmente procura até ele aparecer?',
      helper: 'Marque os que entram numa semana comum.',
      options: [
        { label: 'E-mail ou Outlook',              value: 'email', icon: 'envelope' },
        { label: 'OneDrive ou SharePoint',         value: 'microsoft-cloud', icon: 'cloud' },
        { label: 'Pasta local ou desktop',         value: 'local', icon: 'folder' },
        { label: 'WhatsApp ou conversa antiga',    value: 'old-message', icon: 'conversation' },
        { label: 'Com alguém do time',             value: 'team', icon: 'people' },
        { label: 'Outro repositório',              value: 'other', icon: 'archive' }
      ]
    },
    {
      id: 'frequency',
      type: 'single',
      question: 'Numa semana comum, quantas vezes essa cena se repete?',
      helper: '',
      options: [
        { label: 'Menos de uma vez por semana (cerca de duas vezes por mês)', value: 'less-than-weekly', icon: 'calendar-subweekly' },
        { label: '1 a 2 vezes',       value: '1-2', icon: 'calendar-one' },
        { label: '3 a 5 vezes',       value: '3-5', icon: 'calendar-few' },
        { label: '6 a 10 vezes',      value: '6-10', icon: 'calendar-week' },
        { label: '11 a 20 vezes',     value: '11-20', icon: 'calendar-many' },
        { label: 'Mais de 20 vezes',  value: '20+', icon: 'calendar-full' }
      ]
    },
    {
      id: 'searchTime',
      type: 'single',
      question: 'Da primeira busca até aparecer algo que parece ser o arquivo certo, quanto tempo costuma passar?',
      helper: '',
      options: [
        { label: 'Menos de 2 minutos',  value: 'under-2', icon: 'timer-short' },
        { label: '2 a 5 minutos',       value: '2-5', icon: 'timer' },
        { label: '6 a 10 minutos',      value: '6-10', icon: 'timer-medium' },
        { label: '11 a 20 minutos',     value: '11-20', icon: 'timer-long' },
        { label: 'Mais de 20 minutos',  value: '20+', icon: 'hourglass' }
      ]
    },
    {
      id: 'afterFind',
      type: 'multi',
      question: 'O arquivo apareceu. O que ainda falta para confirmar que ele está certo e preparar o envio?',
      helper: '',
      options: [
        { label: 'Confirmar se é a última versão',    value: 'version', icon: 'documents-compare' },
        { label: 'Achar a fonte ou o contexto',       value: 'source', icon: 'document-source' },
        { label: 'Pedir validação para alguém',       value: 'approval', icon: 'reviewer' },
        { label: 'Montar mensagem e anexar',          value: 'message', icon: 'outbox' },
        { label: 'Revisar destinatário e canal',      value: 'recipient', icon: 'address-book' },
        { label: 'Nada. Já está pronto para sair.',   value: 'none', icon: 'ready-folder', exclusive: true }
      ]
    },
    {
      id: 'recheck',
      type: 'single',
      question: 'Com que frequência alguém precisa voltar a uma etapa porque algo ficou incerto?',
      helper: '',
      options: [
        { label: 'Nunca',                                       value: 'never', icon: 'calendar-clear' },
        { label: 'Raramente, menos de 1 em 10',                 value: 'rare', icon: 'calendar-return' },
        { label: 'Às vezes, cerca de 1 em 4',                   value: 'sometimes', icon: 'desk-document-return' },
        { label: 'Frequentemente, cerca da metade',             value: 'often', icon: 'inbox-return' },
        { label: 'Quase sempre',                                value: 'almostAlways', icon: 'stacked-inbox' }
      ]
    }
  ];

  // ───────────────────────────────────────────────────────────────────
  // §50 - DIAGNOSTIC_QUESTIONS (7 questions, values "0".."3")
  // ───────────────────────────────────────────────────────────────────
  var DIAGNOSTIC_QUESTIONS = [
    {
      id: 'request',
      type: 'single',
      question: 'Qual destas cenas mais se parece com o começo de um pedido no seu time?',
      options: [
        { label: 'Objetivo, prazo e arquivo já chegam juntos.',         value: '0', icon: 'complete-request' },
        { label: 'Uma informação costuma vir logo depois.',             value: '1', icon: 'follow-up-message' },
        { label: 'O time precisa buscar uma parte importante.',         value: '2', icon: 'search-document' },
        { label: 'O contexto é reunido em mais de uma conversa.',       value: '3', icon: 'conversation-thread' }
      ]
    },
    {
      id: 'search',
      type: 'single',
      question: 'Quando a busca começa, quantos pontos — lugares ou pessoas — entram no caminho?',
      options: [
        { label: 'Um ponto.',                                                   value: '0', icon: 'single-folder' },
        { label: 'Dois pontos.',                                                value: '1', icon: 'two-folders' },
        { label: 'Três ou quatro pontos.',                                      value: '2', icon: 'multiple-folders' },
        { label: 'Cinco ou mais pontos.',                                       value: '3', icon: 'search-team' }
      ]
    },
    {
      id: 'version',
      type: 'single',
      question: 'Quando aparecem arquivos parecidos, o que normalmente decide qual pode ser usado?',
      options: [
        { label: 'Uma versão aprovada já aparece junto do arquivo.',     value: '0', icon: 'approved-document' },
        { label: 'A data e a pasta geralmente resolvem.',                value: '1', icon: 'dated-folder' },
        { label: 'É preciso comparar arquivos ou confirmar com alguém.', value: '2', icon: 'documents-compare' },
        { label: 'Mesmo depois da busca, ainda há dúvida.',               value: '3', icon: 'uncertain-document' }
      ]
    },
    {
      id: 'source',
      type: 'single',
      question: 'Na mesma visualização, há uma origem verificável para a informação?',
      options: [
        { label: 'Sim. Arquivo, localização e data aparecem junto da informação.', value: '0', icon: 'document-source' },
        { label: 'Na maior parte das vezes, a origem verificável aparece na mesma visualização.', value: '1', icon: 'source-link' },
        { label: 'Às vezes é preciso abrir outro lugar para verificar a origem.', value: '2', icon: 'search-source' },
        { label: 'A origem verificável geralmente não está disponível na mesma visualização.', value: '3', icon: 'missing-source' }
      ]
    },
    {
      id: 'confirmationPasses',
      type: 'single',
      question: 'Antes de sair, por quantas confirmações o pedido costuma passar?',
      options: [
        { label: 'Nenhuma ou uma',                                              value: '0', icon: 'one-review-desk' },
        { label: 'Duas',                                                        value: '1', icon: 'two-review-desks' },
        { label: 'Três',                                                        value: '2', icon: 'three-review-desks' },
        { label: 'Quatro ou mais',                                              value: '3', icon: 'many-review-desks' }
      ]
    },
    {
      id: 'confirmationDependency',
      type: 'single',
      question: 'Se quem costuma confirmar estiver indisponível, o pedido consegue seguir?',
      options: [
        { label: 'Sim. Não depende de uma pessoa específica.',                    value: '0', icon: 'shared-checklist' },
        { label: 'Na maior parte das vezes, outra pessoa consegue seguir.',       value: '1', icon: 'handoff' },
        { label: 'Às vezes é preciso alguém explicar ou liberar.',                value: '2', icon: 'conversation-review' },
        { label: 'Não. O pedido costuma esperar essa pessoa voltar.',              value: '3', icon: 'waiting-review' }
      ]
    },
    {
      id: 'send',
      type: 'single',
      question: 'Na hora do envio, tudo que precisa ser revisado está no mesmo lugar?',
      options: [
        { label: 'Tudo já está reunido para revisar.',                     value: '0', icon: 'ready-outbox' },
        { label: 'Quase tudo está junto, com uma checagem adicional.',    value: '1', icon: 'review-outbox' },
        { label: 'Partes da revisão ficam em ferramentas diferentes.',    value: '2', icon: 'split-workspace' },
        { label: 'É preciso reunir novamente o necessário antes de cada envio.', value: '3', icon: 'rebuild-outbox' }
      ]
    }
  ];

  // ───────────────────────────────────────────────────────────────────
  // §10 - roundHours rule
  // ───────────────────────────────────────────────────────────────────
  function roundHours(value) {
    if (value < 10) return Math.round(value * 2) / 2;
    if (value < 30) return Math.round(value);
    return Math.round(value / 2) * 2;
  }

  // ───────────────────────────────────────────────────────────────────
  // §35 - formatHoursDisplay → "8h30" style (used by hero copy)
  // For values < 10: half-hour granularity → "0h30", "1h00", "8h30"
  // For 10..29: integer hours → "12h"
  // For ≥30: even integer → "30h", "32h"
  // ───────────────────────────────────────────────────────────────────
  function formatHoursDisplay(value) {
    if (value == null || isNaN(value) || !isFinite(value)) return '0h';
    var rounded = roundHours(value);
    if (rounded < 10) {
      var whole = Math.floor(rounded);
      var half = (rounded - whole) >= 0.5 ? 30 : 0;
      return whole + 'h' + (half === 30 ? '30' : '00');
    }
    return rounded + 'h';
  }

  // ───────────────────────────────────────────────────────────────────
  // §10 - calculateTime(answers)
  //   answers = {
  //     frequency: "6-10",
  //     places: ["email","microsoft-cloud","local","old-message"],   // array, may be empty
  //     searchTime: "6-10",
  //     afterFind: ["version","source","message"],                   // array, may be ["none"]
  //     recheck: "sometimes"
  //   }
  // ───────────────────────────────────────────────────────────────────
  function calculateTime(answers) {
    if (!answers) throw new Error('calculateTime: answers required');

    var freq = TIME_CONFIG.frequency[answers.frequency];
    var baseSearch = TIME_CONFIG.searchMinutes[answers.searchTime];
    if (freq == null || baseSearch == null) {
      throw new Error('calculateTime: invalid frequency or searchTime');
    }

    // searchTime is the respondent's total elapsed time from the first search
    // until a likely file appears. Places describe where that elapsed path ran;
    // they must not multiply a duration the respondent already totaled.
    var searchPerOccurrence = baseSearch;

    var rawAfter = Array.isArray(answers.afterFind) ? answers.afterFind : [];
    // 'none' is exclusive: if present, treat as empty post-find list
    var selectedPostFind = rawAfter.indexOf('none') !== -1
      ? []
      : rawAfter;

    var postFindPerOccurrence = selectedPostFind.reduce(function (sum, key) {
      return sum + (TIME_CONFIG.postFindMinutes[key] || 0);
    }, 0);

    var recheckRate = TIME_CONFIG.recheckRate[answers.recheck];
    if (recheckRate == null) {
      throw new Error('calculateTime: invalid recheck');
    }

    var repeatedPath = (searchPerOccurrence + postFindPerOccurrence)
      * recheckRate
      * TIME_CONFIG.repeatedPathFraction;

    var minutesPerOccurrence = searchPerOccurrence + postFindPerOccurrence + repeatedPath;
    var monthlyHoursRaw = freq * TIME_CONFIG.weeksPerMonth * minutesPerOccurrence / 60;
    var annualHoursRaw = monthlyHoursRaw * 12;
    var annualDaysRaw = annualHoursRaw / 8;

    var monthlyDisplay = roundHours(monthlyHoursRaw);
    var monthlyLow = roundHours(monthlyHoursRaw * TIME_CONFIG.estimateLow);
    var monthlyHigh = roundHours(monthlyHoursRaw * TIME_CONFIG.estimateHigh);

    // Stage breakdown (§10)
    var stageBase = {
      search: searchPerOccurrence,
      version: selectedPostFind.indexOf('version') !== -1 ? 3 : 0,
      source: selectedPostFind.indexOf('source') !== -1 ? 2.5 : 0,
      confirmation: selectedPostFind.indexOf('approval') !== -1 ? 3 : 0,
      send:
        (selectedPostFind.indexOf('message') !== -1 ? 2.5 : 0) +
        (selectedPostFind.indexOf('recipient') !== -1 ? 1.5 : 0)
    };
    var stageBaseTotal = Object.keys(stageBase).reduce(function (a, k) { return a + stageBase[k]; }, 0);
    var reworkFactor = stageBaseTotal > 0
      ? 1 + repeatedPath / stageBaseTotal
      : 1;
    var stageAdjustedMinutes = {};
    Object.keys(stageBase).forEach(function (k) {
      stageAdjustedMinutes[k] = stageBase[k] * reworkFactor;
    });

    // Convert per-occurrence minutes to monthly hours via freq × 4.33 / 60
    var stageMonthlyHours = {};
    Object.keys(stageAdjustedMinutes).forEach(function (k) {
      stageMonthlyHours[k] = freq * TIME_CONFIG.weeksPerMonth * stageAdjustedMinutes[k] / 60;
    });

    // Bottleneck: max value, with tie-break per §10
    var bottleneck = findBottleneckOrdered(stageAdjustedMinutes, CALCULATOR_TIE_BREAK);

    var band = CALCULATOR_BANDS.find(function (b) {
      return monthlyHoursRaw < b.max;
    }) || CALCULATOR_BANDS[CALCULATOR_BANDS.length - 1];

    return {
      monthlyHoursRaw: monthlyHoursRaw,
      monthlyDisplay: monthlyDisplay,
      monthlyLow: monthlyLow,
      monthlyHigh: monthlyHigh,
      annualHoursRaw: annualHoursRaw,
      annualHoursDisplay: roundHours(annualHoursRaw),
      annualDaysRaw: annualDaysRaw,
      annualDaysDisplay: Math.round(annualDaysRaw),
      stageAdjustedMinutes: stageAdjustedMinutes,
      stageMonthlyHours: stageMonthlyHours,
      bottleneck: bottleneck,
      band: band,
      version: VERSION
    };
  }

  // ───────────────────────────────────────────────────────────────────
  // §11 - calculateDiagnostic(answers)
  //   answers = { request:"1", search:"2", version:"2", source:"3",
  //               confirmationPasses:"2", confirmationDependency:"2", send:"2" }
  //   (values come in as strings from the questionnaire)
  // ───────────────────────────────────────────────────────────────────
  function calculateDiagnostic(answers) {
    if (!answers) throw new Error('calculateDiagnostic: answers required');

    var stages = Object.keys(FLOW_CONFIG.weights);
    var normalized = {};
    stages.forEach(function (s) {
      var v = parseInt(answers[s], 10);
      if (isNaN(v) || v < 0 || v > 3) {
        throw new Error('calculateDiagnostic: invalid value for ' + s + ': ' + answers[s]);
      }
      normalized[s] = v;
    });

    var totalScore = Math.round(
      stages.reduce(function (sum, stage) {
        return sum + FLOW_CONFIG.weights[stage] * (normalized[stage] / 3);
      }, 0)
    );

    var stagePercents = {
      request: Math.round(normalized.request / 3 * 100),
      search: Math.round(normalized.search / 3 * 100),
      version: Math.round(normalized.version / 3 * 100),
      source: Math.round(normalized.source / 3 * 100),
      confirmation: Math.round(
        ((normalized.confirmationPasses + normalized.confirmationDependency) / 6) * 100
      ),
      send: Math.round(normalized.send / 3 * 100)
    };

    // Bottleneck is selected at the public stage level, with confirmation combined.
    var stageValues = {
      request: normalized.request,
      search: normalized.search,
      version: normalized.version,
      source: normalized.source,
      confirmation: (normalized.confirmationPasses + normalized.confirmationDependency) / 2,
      send: normalized.send
    };
    var stageNames = Object.keys(stageValues);
    var maxValue = Math.max.apply(null, stageNames.map(function (stage) { return stageValues[stage]; }));
    var bottleneck;
    if (maxValue === 0) {
      bottleneck = 'none';
    } else {
      var candidates = stageNames.filter(function (stage) { return stageValues[stage] === maxValue; });
      bottleneck = FLOW_CONFIG.tieBreak.find(function (key) {
        return candidates.indexOf(key) !== -1;
      });
    }

    var band = DIAGNOSTIC_BANDS.find(function (b) {
      return totalScore <= b.max;
    }) || DIAGNOSTIC_BANDS[DIAGNOSTIC_BANDS.length - 1];

    return {
      score: totalScore,
      stagePercents: stagePercents,
      bottleneck: bottleneck,
      bottleneckLabel: DIAGNOSTIC_BOTTLENECK_LABELS[bottleneck],
      band: band,
      version: CALCULATION_VERSION,
      calculationVersion: CALCULATION_VERSION,
      instrumentVersion: INSTRUMENT_VERSIONS.fluxo
    };
  }

  // ───────────────────────────────────────────────────────────────────
  // §10 - Calculator bottleneck helper with tie-break
  // ───────────────────────────────────────────────────────────────────
  function findBottleneckOrdered(stageMap, tieOrder) {
    var keys = Object.keys(stageMap);
    var maxVal = -Infinity;
    keys.forEach(function (k) {
      if (stageMap[k] > maxVal) maxVal = stageMap[k];
    });
    if (maxVal <= 0) {
      // All zeros - return tieOrder[2] (search) as default per spec implication
      // (when nothing is selected post-find, search is always > 0 in real cases)
      return tieOrder.find(function (k) { return stageMap[k] > 0; }) || tieOrder[2];
    }
    var winners = keys.filter(function (k) { return stageMap[k] === maxVal; });
    return tieOrder.find(function (k) { return winners.indexOf(k) !== -1; });
  }

  // ───────────────────────────────────────────────────────────────────
  // §13 - Share templates
  // ───────────────────────────────────────────────────────────────────
  function buildCalculatorShareText(result) {
    return 'Meu fluxo consome cerca de ' + formatHoursDisplay(result.monthlyDisplay) +
      ' por mês antes do arquivo sair certo. Maior gargalo: ' +
      (ALLYBI_BRIDGE_CALCULATOR[result.bottleneck] || {}).title +
      '. Fiz a Calculadora do Tempo Perdido do Allybi.';
  }

  function buildDiagnosticShareText(result) {
    var bottleneckSentence = result.bottleneck === 'none'
      ? 'Sem gargalo dominante.'
      : 'Maior gargalo: ' + result.bottleneckLabel + '.';
    return 'Nosso fluxo marcou ' + result.score + '/100 de atrito. ' +
      bottleneckSentence +
      ' Faz também para a gente comparar? Diagnóstico do Fluxo do Allybi.';
  }

  // ───────────────────────────────────────────────────────────────────
  // localStorage keys + schema version
  // ───────────────────────────────────────────────────────────────────
  var CALCULATION_VERSION = '2026-08-v3';
  var INSTRUMENT_VERSIONS = {
    tempo: '2026-08-tempo-v3',
    fluxo: '2026-08-fluxo-v3'
  };
  // Backward-compatible alias for consumers that only persist result versions.
  var VERSION = CALCULATION_VERSION;
  var STORAGE_KEYS = {
    timeQuiz: 'allybi.timeQuiz.v2',
    timeResult: 'allybi.timeResult.v2',
    flowQuiz: 'allybi.flowQuiz.v2',
    flowResult: 'allybi.flowResult.v2'
  };
  var QUIZ_EXPIRY_MS = 24 * 60 * 60 * 1000;     // 24h
  var RESULT_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000; // 30d

  return {
    VERSION: VERSION,
    CALCULATION_VERSION: CALCULATION_VERSION,
    INSTRUMENT_VERSIONS: INSTRUMENT_VERSIONS,
    TIME_CONFIG: TIME_CONFIG,
    FLOW_CONFIG: FLOW_CONFIG,
    CALCULATOR_QUESTIONS: CALCULATOR_QUESTIONS,
    DIAGNOSTIC_QUESTIONS: DIAGNOSTIC_QUESTIONS,
    CALCULATOR_BANDS: CALCULATOR_BANDS,
    DIAGNOSTIC_BANDS: DIAGNOSTIC_BANDS,
    DIAGNOSTIC_BOTTLENECK_LABELS: DIAGNOSTIC_BOTTLENECK_LABELS,
    ALLYBI_BRIDGE_CALCULATOR: ALLYBI_BRIDGE_CALCULATOR,
    ALLYBI_BRIDGE_DIAGNOSTIC: ALLYBI_BRIDGE_DIAGNOSTIC,
    STORAGE_KEYS: STORAGE_KEYS,
    QUIZ_EXPIRY_MS: QUIZ_EXPIRY_MS,
    RESULT_EXPIRY_MS: RESULT_EXPIRY_MS,
    roundHours: roundHours,
    formatHoursDisplay: formatHoursDisplay,
    calculateTime: calculateTime,
    calculateDiagnostic: calculateDiagnostic,
    buildCalculatorShareText: buildCalculatorShareText,
    buildDiagnosticShareText: buildDiagnosticShareText
  };
});
