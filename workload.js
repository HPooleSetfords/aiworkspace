// ============================================================
//  Ticket 33593 — Workload delivery
//  Turns the pre-canned opening prompt into the task columns.
//  Nothing here knows about the DOM; it just answers "given this
//  much time, these task types and these matters, what should
//  Halo put in front of Harry?".
// ============================================================
window.HALO = window.HALO || {};

(function (HALO) {
  'use strict';

  // A working day is 7.5 hours and a working month is 20 of those —
  // not 24 hours and not 30 days.
  var UNIT_MINUTES = {
    Minutes: 1,
    Hour: 60,
    Hours: 60,
    Days: 60 * 7.5,
    Months: 60 * 7.5 * 20,
  };

  // "I have 1 Hour" -> 60.
  function budgetMinutes(prompt) {
    var per = UNIT_MINUTES[prompt.unit] || 60;
    return Math.round(prompt.amount * per);
  }

  // The lanes the "Let's take a look at" filter puts in scope, always in the
  // canonical Finance / Operations / Communications order however they were
  // picked, so the columns never reshuffle.
  function lanesInScope(prompt) {
    var picked = prompt.taskTypes || [];
    return HALO.lanes
      .map(function (l) { return l.id; })
      .filter(function (id) { return picked.indexOf(id) !== -1; });
  }

  // An empty matter list means the whole caseload.
  function inMatterScope(task, matters) {
    return !matters || !matters.length || matters.indexOf(task.matterRef) !== -1;
  }

  // A task is only worth offering if every lane it leans on is also in scope —
  // there is no point drafting a closing letter for a file whose money and
  // admin you have explicitly excluded from this session.
  function dependenciesInScope(task, lanes) {
    if (!task.requiresLanes) return true;
    return task.requiresLanes.every(function (lane) { return lanes.indexOf(lane) !== -1; });
  }

  /**
   * Pack the caseload into the time available.
   * @param {{amount:number, unit:string, taskTypes:string[], matters:string[]}} prompt
   * @param {Array} [pool] tasks to draw from; defaults to the whole pool
   * @returns {{budget:number, planned:number, columns:Array}}
   */
  function build(prompt, pool) {
    var budget = budgetMinutes(prompt);
    var lanes = lanesInScope(prompt);

    var candidates = (pool || HALO.tasks).filter(function (task) {
      return lanes.indexOf(task.lane) !== -1 &&
        inMatterScope(task, prompt.matters) &&
        dependenciesInScope(task, lanes);
    });

    // Most valuable work first, and where two tasks are worth the same, the
    // quicker one — so a tight budget still clears something.
    candidates.sort(function (a, b) {
      return (b.priority - a.priority) || (a.mins - b.mins);
    });

    var spent = 0;
    var chosen = [];
    candidates.forEach(function (task) {
      if (spent + task.mins <= budget) {
        chosen.push(task);
        spent += task.mins;
      }
    });

    return { budget: budget, planned: spent, columns: group(chosen, lanes) };
  }

  // Chosen tasks -> one column per lane in scope, each column a list of section
  // stacks. The first card in a stack is the one on top; the rest sit behind it,
  // which is what the peeking card in the deck represents.
  function group(chosen, lanes) {
    return lanes.map(function (laneId) {
      var lane = HALO.lanes.filter(function (l) { return l.id === laneId; })[0];
      var order = HALO.sectionOrder[laneId] || [];
      var bySection = {};

      chosen.forEach(function (task) {
        if (task.lane !== laneId) return;
        (bySection[task.section] = bySection[task.section] || []).push(task);
      });

      var sections = Object.keys(bySection)
        .sort(function (a, b) { return order.indexOf(a) - order.indexOf(b); })
        .map(function (name) {
          var tasks = bySection[name];
          return {
            name: name,
            tasks: tasks,
            mins: tasks.reduce(function (sum, t) { return sum + t.mins; }, 0),
          };
        });

      return { lane: laneId, label: lane.label, sections: sections };
    });
  }

  // Ticket 33748 — a card that is blocked stays visible but inert until every
  // task in the lanes it waits on has been dealt with.
  function isBlocked(task, state) {
    if (!task.blockedBy) return false;
    return task.blockedBy.some(function (laneId) {
      return state.workload.columns.some(function (col) {
        if (col.lane !== laneId) return false;
        return col.sections.some(function (section) {
          return section.tasks.some(function (t) { return !state.resolved[t.id]; });
        });
      });
    });
  }

  // ------------------------------------------------------------
  //  How the prompt reads back
  // ------------------------------------------------------------

  function describeTime(prompt) {
    var unit = prompt.unit.toLowerCase();
    if (prompt.amount === 1) unit = unit.replace(/s$/, '');
    else if (!/s$/.test(unit)) unit += 's';
    return prompt.amount + ' ' + unit;
  }

  // "Hours" with an amount of 1 reads "Hour".
  function unitLabel(prompt) {
    return prompt.amount === 1 ? prompt.unit.replace(/s$/, '') : prompt.unit;
  }

  function laneLabels(prompt) {
    return lanesInScope(prompt).map(function (id) {
      return HALO.lanes.filter(function (l) { return l.id === id; })[0].label;
    });
  }

  /**
   * Multi-select reads as the names while they still fit, then as a count.
   * @param {string[]} names
   * @param {{all:string, noun:string, total:number, joiner?:string}} opts
   */
  function summarise(names, opts) {
    var joiner = opts.joiner || ' + ';
    if (!names.length || names.length === opts.total) return opts.all;
    if (names.length <= 2) return names.join(joiner);
    return names.length + ' ' + opts.noun;
  }

  function taskTypeLabel(prompt, joiner) {
    return summarise(laneLabels(prompt), {
      all: 'All task types', noun: 'task types', total: HALO.lanes.length, joiner: joiner,
    });
  }

  /**
   * For the picker field: the refs comma-separated while they still fit, and
   * a count past three, where the list stops being readable at a glance.
   */
  function matterLabel(prompt) {
    var refs = prompt.matters || [];
    if (!refs.length) return 'All matters';
    if (refs.length < 4) return refs.join(', ');
    return refs.length + ' matters selected';
  }

  /** For the toolbar sentence, where a long list of refs would not read. */
  function matterSummary(prompt, joiner) {
    return summarise(prompt.matters || [], {
      all: 'All matters', noun: 'matters', total: -1, joiner: joiner,
    });
  }

  function formatMins(mins) {
    return mins + (mins === 1 ? ' min' : ' mins');
  }

  HALO.workload = {
    build: build,
    isBlocked: isBlocked,
    budgetMinutes: budgetMinutes,
    lanesInScope: lanesInScope,
    describeTime: describeTime,
    unitLabel: unitLabel,
    taskTypeLabel: taskTypeLabel,
    matterLabel: matterLabel,
    matterSummary: matterSummary,
    formatMins: formatMins,
  };
})(window.HALO);
