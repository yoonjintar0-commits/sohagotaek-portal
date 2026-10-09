(function (root) {
  'use strict';
  const categories = ['커피', '논커피', '티', '에이드', '잎차'];
  function category(p) {
    if (p.family === 'bread') return '소금찰빵';
    if (categories.includes(p.category)) return p.category;
    if (/에이드/.test(p.name)) return '에이드';
    if (/논커피|샷\s*[xX]|샷\s*없음/.test(p.name)) return '논커피';
    if (/잎차/.test(p.name)) return '잎차';
    if (/\(티\)|차HOT|차ICE|대추차/.test(p.name)) return '티';
    return '커피';
  }
  function available(p, branch, includeInactive = false) {
    if (!p || branch === 'hq' || !includeInactive && p.active === false) return false;
    if (Array.isArray(p.branches)) return p.branches.includes(branch);
    if (p.family === 'drink') return p.id === 'latte' || branch === 'soha';
    return branch !== 'soha' || ['소금', '소보루', '소보로', '치즈', '인절미', '쑥', '츄러스'].includes(p.name);
  }
  function visible(menus, branches) {
    return menus.map((p, i) => ({p, i})).filter(({p}) => branches.some(b => available(p, b)))
      .sort((a, b) => (Number.isFinite(a.p.order) ? a.p.order : a.i) - (Number.isFinite(b.p.order) ? b.p.order : b.i))
      .map(({p}) => p);
  }
  function renewalDate(issued) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(issued || '')) return '';
    const date = new Date(issued + 'T12:00:00Z');
    if (!Number.isFinite(+date) || date.toISOString().slice(0, 10) !== issued) return '';
    const year = date.getUTCFullYear() + 1, month = date.getUTCMonth();
    const last = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    return new Date(Date.UTC(year, month, Math.min(date.getUTCDate(), last), 12)).toISOString().slice(0, 10);
  }
  function photoValid(value) {
    return typeof value === 'string' && value.length <= 120000 && /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(value);
  }
  const api = {categories, category, available, visible, renewalDate, photoValid};
  root.SohaCatalog = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof globalThis === 'object' ? globalThis : this);
