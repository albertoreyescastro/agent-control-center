/* A tiny, executable, fictional export project. Only authored functions run. */
(function (root) {
  'use strict';
  const tasks = {
    csv: 'Fix the CSV export for names containing commas.',
    empty: 'Add a regression test for empty exports.',
  };
  const rows = [
    { name: 'Doe, Jane', archived: false },
    { name: 'Lake, Ari', archived: true },
  ];
  const comma = (name) => (name.includes(',') ? '"' + name + '"' : name);
  const quotes = (name) => (/[",]/.test(name) ? '"' + name.replaceAll('"', '""') + '"' : name);
  const cases = {
    comma: {
      name: 'Comma stays in one cell',
      expression: 'field("Doe, Jane")',
      expected: '"Doe, Jane"',
    },
    empty: { name: 'Empty export retains header', expression: 'exportRows([])', expected: 'name' },
    quote: {
      name: 'Literal quote is escaped',
      expression: 'field(\'Jo "JJ"\')',
      expected: '"Jo ""JJ"""',
    },
    multiline: {
      name: 'Multiline cell is quoted',
      expression: 'field("Ada\\nLee")',
      expected: '"Ada\nLee"',
    },
  };
  function scopeCase(archived) {
    return {
      name: 'Archive scope',
      expression: 'exportRows(mixedRows)',
      expected: 'name\n"Doe, Jane"' + (archived ? '\n"Lake, Ari"' : ''),
    };
  }
  function checkNames(kind, version) {
    return [kind === 'csv' ? 'comma' : 'empty', 'scope', ...(version > 1 ? ['quote'] : [])];
  }
  function probe(candidate, id, header = 'name') {
    const field = candidate.version === 1 ? comma : quotes;
    const exportRows = (list) =>
      [
        header,
        ...list.filter((row) => candidate.archived || !row.archived).map((row) => field(row.name)),
      ].join('\n');
    const result = {
      comma: () => field('Doe, Jane'),
      quote: () => field('Jo "JJ"'),
      multiline: () => field('Ada\nLee'),
      empty: () => exportRows([]),
      scope: () => exportRows(rows),
    }[id]();
    const spec = id === 'scope' ? scopeCase(candidate.archived) : cases[id];
    return { name: spec.name, actual: result, expected: spec.expected, pass: result === spec.expected };
  }
  function validate(candidate, header) {
    return checkNames(candidate.kind, candidate.version).map((id) => probe(candidate, id, header));
  }
  function candidate(kind, version, archived) {
    const field = version === 1 ? comma : quotes;
    const scope = archived ? 'All rows, including archived' : 'Active rows only';
    const specs = checkNames(kind, version).map((id) =>
      id === 'scope' ? scopeCase(archived) : cases[id],
    );
    const diff = [];
    if (kind === 'csv' || version > 1)
      diff.push(
        'src/export.js',
        '- const field = ' + (kind === 'csv' ? 'name => name;' : comma.toString() + ';'),
        '+ const field = ' + field.toString() + ';',
      );
    if (kind === 'csv')
      diff.push(
        'src/export.js · row selection',
        '- const visible = rows;',
        archived
          ? '+ const visible = rows.slice();'
          : '+ const visible = rows.filter(row => !row.archived);',
      );
    diff.push(
      'tests/export.test.js',
      ...specs.map((c) => '+ assert.equal(' + c.expression + ', ' + JSON.stringify(c.expected) + ');'),
    );
    const key = (kind === 'csv' ? 'c' : 'e') + (archived ? 'a' : 'b') + String(version);
    return {
      kind,
      version,
      sha: ('d1' + key).repeat(8),
      base: 'b0a5e'.repeat(8),
      scope,
      files:
        kind === 'empty' && version === 1
          ? ['tests/export.test.js']
          : ['src/export.js', 'tests/export.test.js'],
      archived,
      diff,
    };
  }
  const api = { tasks, candidate, validate, probe };
  if (typeof module === 'object') module.exports = api;
  else root.ExportProject = api;
})(globalThis);
