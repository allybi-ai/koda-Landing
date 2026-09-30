/** Allybi diagnostic journey controller. No network or raw-result persistence. */
(function () {
  'use strict';

  if (typeof window === 'undefined') return;

  var RAW_SCHEMA_VERSION = 3;
  var RESULT_PROTOCOL_VERSION = 3;
  var MAX_CLOCK_SKEW_MS = 1000;

  var ICON_MAP = {
    'envelope': 'mail', 'cloud': 'cloud', 'folder': 'folder', 'conversation': 'chat',
    'people': 'people', 'archive': 'archive', 'calendar-one': 'calendar',
    'calendar-few': 'calendar', 'calendar-week': 'calendar', 'calendar-many': 'calendar',
    'calendar-full': 'calendar', 'timer-short': 'timer', 'timer': 'timer',
    'timer-medium': 'timer', 'timer-long': 'timer', 'hourglass': 'hourglass',
    'documents-compare': 'documents', 'document-source': 'source', 'reviewer': 'person',
    'outbox': 'outbox', 'address-book': 'people', 'ready-folder': 'ready',
    'calendar-clear': 'calendar', 'calendar-return': 'return',
    'desk-document-return': 'return', 'inbox-return': 'return', 'stacked-inbox': 'archive',
    'complete-request': 'request', 'follow-up-message': 'chat', 'search-document': 'search',
    'conversation-thread': 'chat', 'single-folder': 'folder', 'two-folders': 'folders',
    'multiple-folders': 'folders', 'search-team': 'people', 'approved-document': 'ready',
    'dated-folder': 'calendar', 'uncertain-document': 'question', 'source-link': 'link',
    'search-source': 'search', 'missing-source': 'question', 'review-one': 'review',
    'review-two': 'review', 'review-three': 'review', 'review-many': 'review',
    'shared-checklist': 'checklist', 'handoff': 'handoff', 'conversation-review': 'chat',
    'waiting-review': 'waiting', 'ready-outbox': 'outbox', 'review-outbox': 'review',
    'split-workspace': 'split', 'rebuild-outbox': 'return'
  };

  var ICON_PATHS = {
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/>',
    cloud: '<path d="M7 18h10a4 4 0 0 0 .5-8 6 6 0 0 0-11-1.5A4.8 4.8 0 0 0 7 18Z"/>',
    folder: '<path d="M3 7.5h7l2-2h9v13H3Z"/><path d="M3 10h18"/>',
    folders: '<path d="M5 7h6l2-2h7v11H5Z"/><path d="M3 9v10h15"/>',
    chat: '<path d="M4 5h16v11H9l-5 4Z"/><path d="M8 9h8M8 12h6"/>',
    people: '<circle cx="9" cy="9" r="3"/><circle cx="17" cy="10" r="2.5"/><path d="M3.5 19c.5-3.2 2.4-5 5.5-5s5 1.8 5.5 5M14 15c2.8-.7 5 .7 6 3.5"/>',
    archive: '<rect x="4" y="6" width="16" height="14" rx="1"/><path d="M3 4h18v4H3M9 12h6"/>',
    calendar: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 3v4M16 3v4M4 9h16M8 13h2M14 13h2M8 17h2"/>',
    timer: '<circle cx="12" cy="13" r="8"/><path d="M12 13V8M9 3h6M17.5 6.5 19 5"/>',
    hourglass: '<path d="M6 3h12M6 21h12M7 3c0 5 5 5 5 9s-5 4-5 9M17 3c0 5-5 5-5 9s5 4 5 9"/>',
    documents: '<path d="M6 4h9l3 3v12H6Z"/><path d="M15 4v4h3M9 11h6M9 14h5M3 7v14h12"/>',
    source: '<path d="M5 3h10l4 4v14H5Z"/><path d="M15 3v5h4M8 12h8M8 16h5"/><circle cx="17.5" cy="17.5" r="2.5"/>',
    person: '<circle cx="12" cy="8" r="3"/><path d="M6 20c.5-4 2.5-6 6-6s5.5 2 6 6M17 11l2 2 3-4"/>',
    outbox: '<path d="M4 12h4l2 3h4l2-3h4v8H4Z"/><path d="M12 4v8M8.5 7.5 12 4l3.5 3.5"/>',
    ready: '<path d="M4 6h7l2-2h7v15H4Z"/><path d="m8 13 2.5 2.5L16 10"/>',
    return: '<path d="M8 7H4v-4M4 7c2-3 5-4 8-4a8 8 0 1 1-7.3 11.3"/><path d="M9 12h6M12 9l-3 3 3 3"/>',
    request: '<path d="M5 3h14v18H5Z"/><path d="M8 8h8M8 12h5M8 16h4"/><path d="m14 16 1.5 1.5L19 14"/>',
    search: '<circle cx="10" cy="10" r="6"/><path d="m14.5 14.5 5 5M8 8h4M8 11h3"/>',
    question: '<path d="M7 8a5 5 0 0 1 10 1c0 3-5 3-5 6M12 19h.01"/>',
    link: '<path d="m9 15-2 2a4 4 0 0 1-6-6l3-3a4 4 0 0 1 6 0M15 9l2-2a4 4 0 0 1 6 6l-3 3a4 4 0 0 1-6 0M8 12h8"/>',
    review: '<path d="M5 3h12v18H5Z"/><path d="M8 8h6M8 12h5M8 16h3"/><circle cx="18" cy="16" r="3"/>',
    checklist: '<path d="M6 3h12v18H6Z"/><path d="m9 8 1.5 1.5L13 7M9 14l1.5 1.5L13 13M14 9h2M14 15h2"/>',
    handoff: '<path d="M3 8h12M12 5l3 3-3 3M21 16H9M12 13l-3 3 3 3"/>',
    waiting: '<circle cx="12" cy="12" r="9"/><path d="M12 7v6l4 2"/>',
    split: '<rect x="3" y="5" width="7" height="14" rx="1"/><rect x="14" y="5" width="7" height="14" rx="1"/><path d="M10 12h4"/>',

    'calendar-subweekly': '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 3v4M16 3v4M4 9h16"/><circle cx="8" cy="14" r="1"/><circle cx="16" cy="17" r="1"/>',
    'calendar-one': '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 3v4M16 3v4M4 9h16"/><circle cx="12" cy="14.5" r="1.5"/>',
    'calendar-few': '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 3v4M16 3v4M4 9h16"/><circle cx="8" cy="13" r="1"/><circle cx="12" cy="16" r="1"/><circle cx="16" cy="13" r="1"/>',
    'calendar-week': '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 3v4M16 3v4M4 9h16M8 13h2M14 13h2M8 17h2M14 17h2"/>',
    'calendar-many': '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 3v4M16 3v4M4 9h16M7 12h3M12 12h2M16 12h2M7 15h2M11 15h3M16 15h2M7 18h3M12 18h2M16 18h2"/>',
    'calendar-full': '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 3v4M16 3v4M4 9h16M7 12h2M11 12h2M15 12h2M7 15h2M11 15h2M15 15h2M7 18h2M11 18h2M15 18h2"/><circle cx="19" cy="19" r="2"/>',

    'timer-short': '<circle cx="12" cy="13" r="8"/><path d="M12 13V9M9 3h6M17.5 6.5 19 5"/><circle cx="12" cy="13" r="1"/>',
    'timer-medium': '<circle cx="12" cy="13" r="8"/><path d="m12 13 4-3M9 3h6M17.5 6.5 19 5M7 13H5M19 13h-2"/>',
    'timer-long': '<circle cx="12" cy="13" r="8"/><path d="m12 13-2 5M9 3h6M17.5 6.5 19 5M12 7V5M6.5 17.5 5 19"/>',

    'calendar-clear': '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 3v4M16 3v4M4 9h16m4 4 2 2 4-5"/>',
    'calendar-return': '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 3v4M16 3v4M4 9h16M10 16H7v-3M7 16c1.5-3 5.5-4 8-1.5"/>',
    'desk-document-return': '<path d="M3 19h18M5 15h14v4M8 5h8v8H8Z"/><path d="M10 8h4M10 11h3M7 7H4v-3M4 7c1-2 3-3 5-3"/>',
    'inbox-return': '<path d="M4 11h4l2 3h4l2-3h4v9H4Z"/><path d="M9 7H5V3M5 7c2-3 7-4 10-1M17 5l2 2-2 2"/>',
    'stacked-inbox': '<path d="M4 13h4l2 3h4l2-3h4v7H4ZM6 9h4l2 3h3l2-3h1M8 5h3l2 3h2l1-3"/><path d="M5 6V3h3M5 6c2-2 5-3 8-2"/>',

    'single-folder': '<path d="M3 7.5h7l2-2h9v13H3Z"/><path d="M3 10h18"/>',
    'two-folders': '<path d="M6 6h6l2-2h7v11H6Z"/><path d="M3 9h6l2-2h7v12H3ZM3 12h15"/>',
    'multiple-folders': '<path d="M8 5h5l2-2h6v9H8ZM5 8h5l2-2h7v10H5ZM3 11h6l2-2h7v11H3Z"/>',
    'search-team': '<circle cx="8" cy="9" r="2.5"/><circle cx="14" cy="9" r="2"/><path d="M3 17c.5-3 2-4.5 5-4.5 2.5 0 4 1 4.8 3M13 13c2-.5 3.5.2 4.5 1.5"/><circle cx="17" cy="17" r="3"/><path d="m19.2 19.2 2 2"/>',

    'document-source': '<path d="M5 3h10l4 4v14H5Z"/><path d="M15 3v5h4M8 12h8M8 16h5"/><circle cx="17.5" cy="17.5" r="2.5"/>',
    'source-link': '<path d="M4 3h10l3 3v8H4Z"/><path d="M14 3v4h3M7 9h6M10 18l-1 1a3 3 0 0 1-4-4l2-2M14 16l1-1a3 3 0 0 1 4 4l-2 2M8 17h8"/>',
    'search-source': '<path d="M4 3h10l3 3v8H4Z"/><path d="M14 3v4h3M7 9h6"/><circle cx="15" cy="16" r="4"/><path d="m18 19 3 3"/>',
    'missing-source': '<path d="M4 3h10l3 3v15H4Z"/><path d="M14 3v4h3M8 11a3 3 0 1 1 4 2.8c-1 .5-1 1.2-1 2.2M11 19h.01"/>',

    'one-review-desk': '<path d="M3 19h18M5 15h14v4"/><rect x="9" y="5" width="7" height="9" rx="1"/><path d="M11 8h3M11 11h2"/>',
    'two-review-desks': '<path d="M3 19h18M5 15h14v4"/><rect x="5" y="6" width="6" height="8" rx="1"/><rect x="13" y="6" width="6" height="8" rx="1"/><path d="M7 9h2M15 9h2"/>',
    'three-review-desks': '<path d="M2 19h20M4 15h16v4"/><rect x="3" y="7" width="5" height="7" rx="1"/><rect x="9.5" y="5" width="5" height="9" rx="1"/><rect x="16" y="7" width="5" height="7" rx="1"/>',
    'many-review-desks': '<path d="M2 19h20M4 15h16v4"/><rect x="3" y="8" width="4" height="6" rx="1"/><rect x="8" y="6" width="4" height="8" rx="1"/><rect x="13" y="5" width="4" height="9" rx="1"/><rect x="18" y="8" width="3" height="6" rx="1"/><path d="M5 11h.01M10 9h.01M15 8h.01M19.5 11h.01"/>',

    'shared-checklist': '<path d="M6 3h12v18H6Z"/><path d="m9 8 1.5 1.5L13 7M9 14l1.5 1.5L13 13M14 9h2M14 15h2"/>',
    'conversation-review': '<path d="M3 5h14v10H8l-4 4V5Z"/><path d="M7 9h6M7 12h4m6 3 2 2 3-5"/>',
    'waiting-review': '<path d="M4 3h9v13H4Z"/><path d="M7 7h3M7 10h2"/><circle cx="16" cy="16" r="5"/><path d="M16 13v3l2 1"/>'
  };

  document.addEventListener('DOMContentLoaded', function () {
    var root = document.getElementById('allybi-questionnaire-root');
    if (!root) return;
    var Data = window.AllybiToolsData;
    if (!Data) return;

    var kind = root.getAttribute('data-quiz') === 'time' ? 'time' : 'flow';
    var instrument = kind === 'time' ? 'tempo' : 'fluxo';
    var questions = kind === 'time' ? Data.CALCULATOR_QUESTIONS : Data.DIAGNOSTIC_QUESTIONS;
    var rawKey = kind === 'time' ? Data.STORAGE_KEYS.timeQuiz : Data.STORAGE_KEYS.flowQuiz;
    var resultKey = kind === 'time' ? Data.STORAGE_KEYS.timeResult : Data.STORAGE_KEYS.flowResult;
    var instrumentVersion = Data.INSTRUMENT_VERSIONS[instrument];
    var resultHref = root.getAttribute('data-result-href') || '/';
    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var timers = [];
    var locked = true;
    var state;

    if (new URLSearchParams(location.search).get('restart') === '1') {
      removeRaw();
      state = freshState();
      history.replaceState({ step: 0 }, '', location.pathname);
    } else {
      state = readState();
    }

    root.innerHTML =
      '<div class="dj-gradient" data-dj-gradient-layer="base"></div>' +
      '<div class="dj-gradient" data-dj-gradient-layer="shift"></div>' +
      '<div class="dj-shell" data-dj-shell data-dj-state="idle" data-dj-direction="forward" data-dj-step="0" data-dj-locked="true" data-dj-ready="false" data-dj-initial="true" data-dj-short-motion="false">' +
        '<header class="dj-topbar">' +
          '<a class="dj-brand" href="/" aria-label="Allybi, início">Allybi <span>' + (kind === 'time' ? 'Tempo' : 'Fluxo') + '</span></a>' +
          '<a class="dj-close" data-dj-close href="/" aria-label="Fechar e voltar ao início">' +
            '<svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5"><path d="m6 6 12 12M18 6 6 18"/></svg>' +
          '</a>' +
        '</header>' +
        '<main class="dj-content">' +
          '<div class="dj-progress-line">' +
            '<span data-dj-progress-text></span>' +
            '<progress data-dj-progress value="1" max="' + questions.length + '"></progress>' +
          '</div>' +
          '<div class="dj-frame" data-dj-frame></div>' +
          '<div class="dj-controls" data-dj-controls>' +
            '<button class="dj-back" data-dj-back type="button">Voltar</button>' +
            '<button class="dj-restart" data-dj-restart type="button">Recomeçar</button>' +
            '<button class="dj-continue" data-dj-continue type="button">Continuar</button>' +
          '</div>' +
        '</main>' +
      '</div>';

    var shell = root.querySelector('[data-dj-shell]');
    var frame = root.querySelector('[data-dj-frame]');
    var back = root.querySelector('[data-dj-back]');
    var restart = root.querySelector('[data-dj-restart]');
    var continueButton = root.querySelector('[data-dj-continue]');
    var close = root.querySelector('[data-dj-close]');
    var progress = root.querySelector('[data-dj-progress]');
    var progressText = root.querySelector('[data-dj-progress-text]');
    var shiftGradient = root.querySelector('[data-dj-gradient-layer="shift"]');

    history.replaceState({ step: state.currentStep }, '');
    renderContent(state.currentStep, 'forward');
    shell.setAttribute('data-dj-short-motion', String(reduced));
    setMotionState('entering');
    setLock(false);
    enterMountedContent();
    schedule(reduced ? 140 : 600, settle);

    continueButton.addEventListener('click', onContinue);
    back.addEventListener('click', function () {
      if (locked || state.currentStep === 0) return;
      history.back();
    });
    restart.addEventListener('click', function () {
      if (locked) return;
      removeRaw();
      state = freshState();
      history.replaceState({ step: 0 }, '', location.pathname);
      interruptTo(0, 'back');
    });
    document.addEventListener('keydown', onKeydown);
    window.addEventListener('popstate', onPopstate);

    function freshState() {
      var now = Date.now();
      return {
        version: RAW_SCHEMA_VERSION,
        calculationVersion: Data.CALCULATION_VERSION,
        instrumentVersion: instrumentVersion,
        startedAt: now,
        updatedAt: now,
        currentStep: 0,
        answers: {}
      };
    }

    function readState() {
      var raw;
      try { raw = localStorage.getItem(rawKey); } catch (_error) { return freshState(); }
      if (!raw) return freshState();
      try {
        var candidate = JSON.parse(raw);
        if (!validState(candidate)) {
          removeRaw();
          return freshState();
        }
        return candidate;
      } catch (_error) {
        removeRaw();
        return freshState();
      }
    }

    function validState(candidate) {
      if (!candidate || Array.isArray(candidate) || typeof candidate !== 'object') return false;
      if (candidate.version !== RAW_SCHEMA_VERSION) return false;
      if (candidate.calculationVersion !== Data.CALCULATION_VERSION) return false;
      if (candidate.instrumentVersion !== instrumentVersion) return false;
      var now = Date.now();
      if (!Number.isFinite(candidate.startedAt) || candidate.startedAt <= 0) return false;
      if (!Number.isFinite(candidate.updatedAt) || candidate.updatedAt <= 0) return false;
      if (candidate.startedAt > candidate.updatedAt) return false;
      if (candidate.startedAt > now + MAX_CLOCK_SKEW_MS || candidate.updatedAt > now + MAX_CLOCK_SKEW_MS) return false;
      if (now - candidate.startedAt > Data.QUIZ_EXPIRY_MS) return false;
      if (!Number.isInteger(candidate.currentStep) || candidate.currentStep < 0 || candidate.currentStep >= questions.length) return false;
      if (!candidate.answers || Array.isArray(candidate.answers) || typeof candidate.answers !== 'object') return false;
      var allProvidedAnswersAreValid = Object.keys(candidate.answers).every(function (id) {
        var question = questions.find(function (item) { return item.id === id; });
        return !!question && validAnswer(question, candidate.answers[id], false);
      });
      if (!allProvidedAnswersAreValid) return false;
      for (var index = 0; index < candidate.currentStep; index += 1) {
        var precedingQuestion = questions[index];
        if (!validAnswer(precedingQuestion, candidate.answers[precedingQuestion.id], true)) return false;
      }
      return true;
    }

    function validAnswer(question, answer, requireAnswered) {
      var allowed = question.options.map(function (option) { return option.value; });
      if (question.type === 'multi') {
        if (!Array.isArray(answer) || (requireAnswered && answer.length === 0)) return false;
        if (new Set(answer).size !== answer.length) return false;
        if (!answer.every(function (value) { return allowed.indexOf(value) !== -1; })) return false;
        var exclusive = question.options.find(function (option) { return option.exclusive; });
        return !(exclusive && answer.indexOf(exclusive.value) !== -1 && answer.length > 1);
      }
      return typeof answer === 'string' && allowed.indexOf(answer) !== -1;
    }

    function removeRaw() {
      try { localStorage.removeItem(rawKey); } catch (_error) {}
    }

    function writeState() {
      state.updatedAt = Date.now();
      try { localStorage.setItem(rawKey, JSON.stringify(state)); } catch (_error) {}
    }

    function renderContent(step, direction) {
      var question = questions[step];
      shell.setAttribute('data-dj-step', String(step));
      shell.setAttribute('data-dj-direction', direction);
      shell.setAttribute('data-dj-enter-ready', 'false');
      progress.value = step + 1;
      progress.max = questions.length;
      progressText.textContent = 'Passo ' + (step + 1) + ' de ' + questions.length;
      back.hidden = step === 0;
      continueButton.textContent = step === questions.length - 1
        ? (kind === 'time' ? 'Ver meu resultado' : 'Ver meu diagnóstico')
        : 'Continuar';

      var answer = state.answers[question.id];
      var rows = question.options.map(function (option, index) {
        var selected = question.type === 'multi'
          ? Array.isArray(answer) && answer.indexOf(option.value) !== -1
          : answer === option.value;
        return '<label class="dj-option" data-dj-option data-dj-type="' + question.type + '" data-dj-value="' + escapeHtml(option.value) + '" data-dj-exclusive="' + (option.exclusive ? 'true' : 'false') + '" data-dj-selected="' + selected + '" style="--dj-row-delay:' + (50 + index * 28) + 'ms">' +
          '<input class="dj-answer-input" type="' + (question.type === 'multi' ? 'checkbox' : 'radio') + '" name="' + escapeHtml(question.id) + '" value="' + escapeHtml(option.value) + '"' + (selected ? ' checked' : '') + '>' +
          '<span class="dj-icon" data-dj-icon data-dj-icon-key="' + escapeHtml(option.icon) + '" aria-hidden="true">' + renderIcon(option.icon) + '</span>' +
          '<span class="dj-option-copy">' + escapeHtml(option.label) + '</span>' +
          '<span class="dj-indicator" aria-hidden="true"></span>' +
        '</label>';
      }).join('');

      frame.innerHTML =
        '<fieldset class="dj-fieldset">' +
          '<legend class="dj-legend" data-dj-legend tabindex="-1">' + escapeHtml(question.question) + '</legend>' +
          '<p class="dj-helper" data-dj-helper>' + escapeHtml(question.helper || '') + '</p>' +
          '<div class="dj-options" data-dj-options role="' + (question.type === 'multi' ? 'group' : 'radiogroup') + '">' + rows + '</div>' +
          '<p class="dj-error" data-dj-error role="alert" aria-live="assertive"></p>' +
        '</fieldset>';

      frame.querySelectorAll('[data-dj-option] input').forEach(function (input) {
        input.addEventListener('change', function () {
          toggleOption(question, input.closest('[data-dj-option]'));
        });
      });
      updateReady(question);
    }

    function renderIcon(key) {
      var type = ICON_MAP[key];
      var paths = ICON_PATHS[key] || ICON_PATHS[type];
      if (!paths) paths = ICON_PATHS.question;
      return '<svg aria-hidden="true" focusable="false" viewBox="0 0 24 24">' + paths + '</svg>';
    }

    function toggleOption(question, row) {
      if (locked) return;
      abandonInitialMotion();
      var value = row.getAttribute('data-dj-value');
      var exclusive = row.getAttribute('data-dj-exclusive') === 'true';
      if (question.type === 'multi') {
        var current = Array.isArray(state.answers[question.id]) ? state.answers[question.id].slice() : [];
        var found = current.indexOf(value);
        if (exclusive) {
          state.answers[question.id] = found === -1 ? [value] : [];
        } else {
          if (found === -1) current.push(value);
          else current.splice(found, 1);
          question.options.forEach(function (option) {
            if (option.exclusive) {
              var exclusiveIndex = current.indexOf(option.value);
              if (exclusiveIndex !== -1) current.splice(exclusiveIndex, 1);
            }
          });
          state.answers[question.id] = current;
        }
      } else {
        state.answers[question.id] = value;
      }
      writeState();
      reflectSelection(question);
      clearError();
      setMotionState('selected');
      updateReady(question);
    }

    function reflectSelection(question) {
      var answer = state.answers[question.id];
      frame.querySelectorAll('[data-dj-option]').forEach(function (row) {
        var value = row.getAttribute('data-dj-value');
        var selected = question.type === 'multi'
          ? Array.isArray(answer) && answer.indexOf(value) !== -1
          : answer === value;
        row.setAttribute('data-dj-selected', String(selected));
        row.querySelector('input').checked = selected;
      });
    }

    function answered(question) {
      var answer = state.answers[question.id];
      return question.type === 'multi'
        ? Array.isArray(answer) && answer.length > 0
        : typeof answer === 'string' && answer.length > 0;
    }

    function updateReady(question) {
      shell.setAttribute('data-dj-ready', String(answered(question)));
    }

    function onContinue() {
      if (locked) return;
      var question = questions[state.currentStep];
      if (!answered(question)) {
        showError(question.type === 'multi'
          ? 'Escolha pelo menos uma opção para continuar.'
          : 'Escolha uma opção para continuar.');
        return;
      }
      if (state.currentStep === questions.length - 1) finish();
      else transitionTo(state.currentStep + 1, 'forward', true);
    }

    function transitionTo(target, direction, pushHistory) {
      if (locked || target < 0 || target >= questions.length || target === state.currentStep) return;
      if (reduced) {
        shortenedTransitionTo(target, direction, pushHistory);
        return;
      }
      cancelTimers();
      shell.setAttribute('data-dj-initial', 'false');
      shell.setAttribute('data-dj-short-motion', 'false');
      setLock(true);
      shell.setAttribute('data-dj-direction', direction);
      setMotionState('exiting');
      schedule(40, function () { shiftGradient.setAttribute('data-dj-active', String(target % 2 === 1)); });
      schedule(160, function () {
        state.currentStep = target;
        writeState();
        renderContent(target, direction);
        setMotionState('entering');
        enterMountedContent();
        if (pushHistory) history.pushState({ step: target }, '');
      });
      schedule(720, settle);
    }

    function interruptTo(target, direction) {
      shortenedTransitionTo(target, direction, false);
    }

    function shortenedTransitionTo(target, direction, pushHistory) {
      cancelTimers();
      shell.setAttribute('data-dj-initial', 'false');
      shell.setAttribute('data-dj-short-motion', 'true');
      setLock(true);
      shell.setAttribute('data-dj-direction', direction);
      setMotionState('exiting');
      schedule(60, function () {
        state.currentStep = target;
        writeState();
        renderContent(target, direction);
        shiftGradient.setAttribute('data-dj-active', String(target % 2 === 1));
        setMotionState('entering');
        enterMountedContent();
        if (pushHistory) history.pushState({ step: target }, '');
      });
      schedule(140, settle);
    }

    function enterMountedContent() {
      requestAnimationFrame(function () {
        requestAnimationFrame(function () { shell.setAttribute('data-dj-enter-ready', 'true'); });
      });
    }

    function settle() {
      setMotionState('settled');
      setLock(false);
      shell.setAttribute('data-dj-initial', 'false');
      shell.setAttribute('data-dj-short-motion', 'false');
      var legend = frame.querySelector('[data-dj-legend]');
      if (legend) {
        try { legend.focus({ preventScroll: true }); } catch (_error) { legend.focus(); }
      }
    }

    function onPopstate(event) {
      var target = event.state && Number.isInteger(event.state.step) ? event.state.step : 0;
      target = Math.max(0, Math.min(questions.length - 1, target));
      var previous = state.currentStep;
      if (target === previous && !locked) return;
      var direction = target < previous ? 'back' : 'forward';
      if (locked) interruptTo(target, direction);
      else if (reduced) interruptTo(target, direction);
      else transitionTo(target, direction, false);
    }

    function onKeydown(event) {
      if (event.key === 'Escape') {
        try { close.focus({ preventScroll: true }); } catch (_error) { close.focus(); }
        return;
      }
      if (locked) return;
      var question = questions[state.currentStep];
      if (/^[1-9]$/.test(event.key)) {
        var numbered = frame.querySelectorAll('[data-dj-option]')[Number(event.key) - 1];
        if (numbered) {
          event.preventDefault();
          toggleOption(question, numbered);
        }
        return;
      }
      var row = event.target && event.target.closest ? event.target.closest('[data-dj-option]') : null;
      if (row && (event.key === 'Enter' || event.key === ' ')) {
        event.preventDefault();
        toggleOption(question, row);
        return;
      }
      if (event.key === 'Enter' && !event.shiftKey && !event.metaKey && !event.ctrlKey && !event.altKey) {
        if (event.target !== continueButton && event.target.closest && event.target.closest('a,button')) return;
        event.preventDefault();
        onContinue();
      }
    }

    function showError(message) {
      abandonInitialMotion();
      var error = frame.querySelector('[data-dj-error]');
      if (error) error.textContent = message;
      setMotionState('error');
      var first = frame.querySelector('[data-dj-option] input');
      if (first) first.focus();
    }

    function clearError() {
      var error = frame.querySelector('[data-dj-error]');
      if (error) error.textContent = '';
    }

    function abandonInitialMotion() {
      if (shell.getAttribute('data-dj-initial') !== 'true') return;
      cancelTimers();
      shell.setAttribute('data-dj-initial', 'false');
      shell.setAttribute('data-dj-short-motion', 'false');
    }

    function finish() {
      if (locked) return;
      setLock(true);
      var calculated;
      try {
        calculated = kind === 'time' ? Data.calculateTime(state.answers) : Data.calculateDiagnostic(state.answers);
      } catch (_error) {
        setLock(false);
        showError('Não foi possível calcular agora. Revise as respostas e tente novamente.');
        return;
      }

      var derived = stripResult(calculated);
      if (kind === 'time') {
        derived.placeCount = uniqueAnswerCount(state.answers.places);
        derived.postFindCount = Array.isArray(state.answers.afterFind) && state.answers.afterFind.indexOf('none') === -1
          ? uniqueAnswerCount(state.answers.afterFind) : 0;
        derived.bandIndex = Data.CALCULATOR_BANDS.indexOf(calculated.band);
      } else {
        derived.stagesAtOrAbove50 = Object.keys(calculated.stagePercents).filter(function (key) {
          return calculated.stagePercents[key] >= 50;
        }).length;
        derived.bandIndex = Data.DIAGNOSTIC_BANDS.indexOf(calculated.band);
      }

      var summary = {
        version: RESULT_PROTOCOL_VERSION,
        calculationVersion: Data.CALCULATION_VERSION,
        instrumentVersion: instrumentVersion,
        savedAt: Date.now(),
        kind: kind,
        result: derived
      };
      try { localStorage.setItem(resultKey, JSON.stringify(summary)); } catch (_error) {}
      removeRaw();
      location.href = resultHref + '?' + buildResultQuery(calculated, derived);
    }

    function uniqueAnswerCount(answer) {
      return Array.isArray(answer) ? new Set(answer).size : 0;
    }

    function stripResult(result) {
      if (kind === 'time') {
        return {
          monthlyDisplay: result.monthlyDisplay,
          monthlyLow: result.monthlyLow,
          monthlyHigh: result.monthlyHigh,
          annualHoursDisplay: result.annualHoursDisplay,
          annualDaysDisplay: result.annualDaysDisplay,
          stageMonthlyHours: result.stageMonthlyHours,
          bottleneck: result.bottleneck,
          band: result.band
        };
      }
      return {
        score: result.score,
        stagePercents: result.stagePercents,
        bottleneck: result.bottleneck,
        bottleneckLabel: result.bottleneckLabel,
        band: result.band
      };
    }

    function buildResultQuery(result, derived) {
      var params = new URLSearchParams();
      params.set('v', String(RESULT_PROTOCOL_VERSION));
      params.set('calculationVersion', Data.CALCULATION_VERSION);
      params.set('instrumentVersion', instrumentVersion);
      params.set('bandIndex', String(derived.bandIndex));
      if (kind === 'time') {
        params.set('m', result.monthlyDisplay);
        params.set('y', result.annualHoursDisplay);
        params.set('d', result.annualDaysDisplay);
        params.set('lo', result.monthlyLow);
        params.set('hi', result.monthlyHigh);
        params.set('b', result.bottleneck);
        params.set('placeCount', String(derived.placeCount));
        params.set('postFindCount', String(derived.postFindCount));
        params.set('st', Object.keys(result.stageMonthlyHours).map(function (key) {
          return key + ':' + (Math.round(result.stageMonthlyHours[key] * 100) / 100);
        }).join(','));
      } else {
        params.set('score', result.score);
        params.set('band', result.band.label.replace(/\s+/g, '_'));
        params.set('b', result.bottleneck);
        params.set('stagesAtOrAbove50', String(derived.stagesAtOrAbove50));
        params.set('st', Object.keys(result.stagePercents).map(function (key) {
          return key + ':' + result.stagePercents[key];
        }).join(','));
      }
      return params.toString();
    }

    function setMotionState(value) { shell.setAttribute('data-dj-state', value); }
    function setLock(value) { locked = value; shell.setAttribute('data-dj-locked', String(value)); }
    function schedule(delay, callback) {
      var timer = setTimeout(callback, delay);
      timers.push(timer);
      return timer;
    }
    function cancelTimers() {
      timers.forEach(function (timer) { clearTimeout(timer); });
      timers = [];
    }
    function escapeHtml(value) {
      return String(value == null ? '' : value)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }
  });
})();
