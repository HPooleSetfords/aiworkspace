// ============================================================
//  Search — "find and open client matters by typing in any
//  search criteria" (Figma node 5570:491832).
//
//  Every field on a matter is indexed, not just the reference and
//  the client. A result row is titled with the value that actually
//  matched, so the user can see *why* a matter came back — which
//  is what the four rows in the design are showing.
// ============================================================
window.HALO = window.HALO || {};

(function (HALO) {
  'use strict';

  // weight nudges the obvious identifiers above the incidental ones,
  // so typing "Guildford" ranks the office match below a client called
  // Guildford would rank, but still finds it.
  var FIELDS = [
    { key: 'ref',          label: 'Reference',            weight: 1.30 },
    { key: 'client',       label: 'Client',               weight: 1.25 },
    { key: 'description',  label: 'Matter',               weight: 1.20 },
    { key: 'area',         label: 'Matter area',          weight: 1.00 },
    { key: 'previousArea', label: 'Previous matter area', weight: 0.95,
      format: function (v) { return 'Previously “' + v + '”'; } },
    { key: 'salutation',   label: 'Client',               weight: 0.90 },
    { key: 'address',      label: 'Property',             weight: 0.85 },
    { key: 'postcode',     label: 'Postcode',             weight: 0.85 },
    { key: 'feeEarner',    label: 'Fee earner',           weight: 0.80 },
    { key: 'office',       label: 'Office',               weight: 0.70 },
    { key: 'status',       label: 'Status',               weight: 0.60 },
    { key: 'email',        label: 'Email',                weight: 0.60 },
    { key: 'phone',        label: 'Phone',                weight: 0.60 },
    { key: 'keyDate',      label: 'Key date',             weight: 0.55 },
    { key: 'openedOn',     label: 'Opened',               weight: 0.50 },
    { key: 'valueText',    label: 'Value',                weight: 0.50 },
  ];

  function valueText(matter) {
    return matter.value ? '£' + matter.value.toLocaleString('en-GB') : '';
  }

  // References get typed every which way — "a25/1", "A25-1", "a251".
  function loose(s) { return s.toLowerCase().replace(/[^a-z0-9]/g, ''); }

  function scoreValue(value, query) {
    var hay = value.toLowerCase();
    var needle = query.toLowerCase();
    if (hay === needle) return 100;
    if (loose(value) === loose(query)) return 95;
    if (hay.indexOf(needle) === 0) return 70;
    if (loose(value).indexOf(loose(query)) === 0) return 65;
    if (new RegExp('\\b' + needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).test(hay)) return 50;
    if (hay.indexOf(needle) !== -1) return 30;
    return 0;
  }

  // The single best-matching field on a matter decides how the row reads.
  function bestMatch(matter, query) {
    var best = null;
    FIELDS.forEach(function (field) {
      var raw = field.key === 'valueText' ? valueText(matter) : matter[field.key];
      if (!raw) return;
      var score = scoreValue(String(raw), query) * field.weight;
      if (score > 0 && (!best || score > best.score)) {
        best = { field: field, raw: String(raw), score: score };
      }
    });
    return best;
  }

  /**
   * @param {string} query
   * @param {number} [limit]
   * @returns {Array<{matter:Object, title:string, label:string, score:number}>}
   */
  function run(query, limit) {
    query = (query || '').trim();
    if (!query) return recent(limit || 6);

    return HALO.matters
      .map(function (matter) {
        var hit = bestMatch(matter, query);
        if (!hit) return null;
        return {
          matter: matter,
          label: hit.field.label,
          title: hit.field.format ? hit.field.format(hit.raw) : hit.raw,
          score: hit.score,
        };
      })
      .filter(Boolean)
      .sort(function (a, b) {
        return (b.score - a.score) || a.matter.ref.localeCompare(b.matter.ref);
      })
      .slice(0, limit || 8);
  }

  // Empty field: the "Recent Matters" tab in the design.
  function recent(limit) {
    return HALO.matters
      .filter(function (m) { return m.recent; })
      .slice(0, limit)
      .map(function (matter) {
        return { matter: matter, label: 'Matter', title: matter.description, score: 0 };
      });
  }

  // Wrap the matched run of characters so the row shows what was hit.
  function highlight(text, query) {
    query = (query || '').trim();
    var safe = escapeHtml(text);
    if (!query) return safe;
    var at = text.toLowerCase().indexOf(query.toLowerCase());
    if (at === -1) return safe;
    return escapeHtml(text.slice(0, at)) +
      '<mark>' + escapeHtml(text.slice(at, at + query.length)) + '</mark>' +
      escapeHtml(text.slice(at + query.length));
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /**
   * Plain filter for the matter picker: every matter that matches, best first,
   * and the whole caseload when the query is empty. Unlike run(), this does not
   * collapse to one row per matter's best field — the picker wants matters.
   * @param {string} query
   * @param {number} [limit]
   */
  function filter(query, limit) {
    query = (query || '').trim();
    if (!query) return HALO.matters.slice(0, limit || HALO.matters.length);

    return HALO.matters
      .map(function (matter) {
        var hit = bestMatch(matter, query);
        return hit ? { matter: matter, score: hit.score } : null;
      })
      .filter(Boolean)
      .sort(function (a, b) {
        return (b.score - a.score) || a.matter.ref.localeCompare(b.matter.ref);
      })
      .slice(0, limit || HALO.matters.length)
      .map(function (r) { return r.matter; });
  }

  HALO.search = {
    run: run,
    recent: recent,
    filter: filter,
    highlight: highlight,
    escapeHtml: escapeHtml,
  };
})(window.HALO);
