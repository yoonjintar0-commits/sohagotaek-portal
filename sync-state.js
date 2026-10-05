(function (root) {
  'use strict';
  const own = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
  const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
  const copy = value => value === undefined ? undefined : JSON.parse(JSON.stringify(value));
  function equal(a, b) {
    if (a === b) return true;
    if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every((value, i) => equal(value, b[i]));
    if (!object(a) || !object(b)) return false;
    const keys = Object.keys(a);
    return keys.length === Object.keys(b).length && keys.every(key => own(b, key) && equal(a[key], b[key]));
  }
  function keyed(values) {
    return Array.isArray(values) && values.every(value => object(value) && own(value, 'id'))
      && new Set(values.map(value => typeof value.id + ':' + value.id)).size === values.length;
  }
  // Each field is compared to the last acknowledged state, never just overwritten.
  // New rows sharing an ID and delete/edit races require an explicit choice.
  function merge(base, local, remote, preference = 'local') {
    const conflicts = [];
    const readonly = new Set(['attendanceLogs', 'branchPhotos', 'requests']);
    function visit(before, mine, theirs, path) {
      if (path.length === 1 && readonly.has(path[0])) return copy(theirs);
      if (equal(mine, before)) return copy(theirs);
      if (equal(theirs, before) || equal(mine, theirs)) return copy(mine);
      if (path.length === 1 && path[0] === 'storeSerial' && Number.isFinite(mine) && Number.isFinite(theirs)) return Math.max(mine, theirs);
      if (keyed(before) && keyed(mine) && keyed(theirs)) {
        const entries = values => new Map(values.map(value => [typeof value.id + ':' + value.id, value]));
        const a = entries(before), b = entries(mine), c = entries(theirs), result = [];
        for (const id of new Set([...c.keys(), ...b.keys(), ...a.keys()])) {
          const value = visit(a.get(id), b.get(id), c.get(id), [...path, id]);
          if (value !== undefined) result.push(value);
        }
        return result;
      }
      if (object(before) && object(mine) && object(theirs)) {
        const result = Object.create(null);
        for (const key of new Set([...Object.keys(theirs), ...Object.keys(mine), ...Object.keys(before)])) {
          const value = visit(before[key], mine[key], theirs[key], [...path, key]);
          if (value !== undefined) result[key] = value;
        }
        return result;
      }
      conflicts.push({path, local: copy(mine), remote: copy(theirs)});
      return copy(preference === 'remote' ? theirs : mine);
    }
    return {data: visit(base, local, remote, []), conflicts};
  }
  const api = {merge, equal, copy};
  root.SohaSync = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof globalThis === 'object' ? globalThis : this);
