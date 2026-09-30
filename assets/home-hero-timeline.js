(function(root, factory) {
  var timeline = factory();
  if (typeof module === 'object' && module.exports) module.exports = timeline;
  if (root) root.AllybiHeroTimeline = timeline;
})(typeof window !== 'undefined' ? window : null, function() {
  'use strict';

  function clamp01(value) {
    return Math.min(1, Math.max(0, Number(value) || 0));
  }

  function runwayHeight(viewportHeight) {
    return Math.round(Math.max(0, Number(viewportHeight) || 0) * 2);
  }

  function stagePresence(intersectionHeight, fadeDistance) {
    var distance = Math.max(1, Number(fadeDistance) || 1);
    return clamp01((Number(intersectionHeight) || 0) / distance);
  }

  return {
    clamp01: clamp01,
    runwayHeight: runwayHeight,
    stagePresence: stagePresence
  };
});
