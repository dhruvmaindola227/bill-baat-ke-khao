export class Router {
  constructor() {
    this._routes = [];
    this._handleChange = this._handleChange.bind(this);
    window.addEventListener('hashchange', this._handleChange);
  }

  on(pattern, handler) {
    this._routes.push({ pattern, handler });
    return this;
  }

  start() {
    this._handleChange();
    return this;
  }

  navigate(path) {
    const current = window.location.hash.slice(1) || '/';
    if (current === path) {
      this._handleChange();
    } else {
      window.location.hash = path;
    }
  }

  _handleChange() {
    const path = window.location.hash.slice(1) || '/';
    for (const route of this._routes) {
      const params = this._match(route.pattern, path);
      if (params !== null) {
        route.handler(params);
        return;
      }
    }
  }

  _match(pattern, path) {
    if (pattern === '/') return (path === '/' || path === '') ? {} : null;
    const pParts = pattern.split('/').filter(Boolean);
    const pathParts = path.split('/').filter(Boolean);
    if (pParts.length !== pathParts.length) return null;
    const params = {};
    for (let i = 0; i < pParts.length; i++) {
      if (pParts[i].startsWith(':')) {
        params[pParts[i].slice(1)] = decodeURIComponent(pathParts[i]);
      } else if (pParts[i] !== pathParts[i]) {
        return null;
      }
    }
    return params;
  }
}
