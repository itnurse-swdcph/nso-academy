/**
 * router.js — Hash-based SPA Router
 * Manages navigation between pages without page reload.
 * Compatible with GitHub Pages (no server-side routing needed).
 */

const Router = {
  routes: {},       // { path: { component, title, guard } }
  current: null,    // current route path
  _container: null, // #app element

  /**
   * ลงทะเบียน route
   * @param {string} path - เช่น '/', '/create', '/register'
   * @param {object} component - { render(container, params), cleanup() }
   * @param {object} [options] - { title, guard }
   */
  register(path, component, options = {}) {
    this.routes[path] = { component, ...options };
    return this;
  },

  /** เริ่มต้น Router */
  init(containerId = 'app') {
    this._container = document.getElementById(containerId);
    if (!this._container) {
      console.error('[Router] Container not found:', containerId);
      return;
    }

    // Listen for hash changes
    window.addEventListener('hashchange', () => this._handleRoute());
    window.addEventListener('load', () => this._handleRoute());

    // If no hash, set default
    if (!window.location.hash) {
      window.location.hash = '#/';
    }
  },

  /** Navigate to a path */
  navigate(path) {
    window.location.hash = '#' + path;
  },

  /** Get current URL params from hash */
  getParams() {
    const hash = window.location.hash.slice(1); // remove #
    const [path, queryStr] = hash.split('?');
    const params = {};
    if (queryStr) {
      queryStr.split('&').forEach(pair => {
        const [k, v] = pair.split('=');
        if (k) params[decodeURIComponent(k)] = decodeURIComponent(v || '');
      });
    }
    return { path, params };
  },

  /** Parse the current hash and render matching route */
  async _handleRoute() {
    const { path, params } = this.getParams();

    // Find matching route (exact or prefix)
    let matchedPath = path;
    let route = this.routes[path];

    // Try parent paths if no exact match
    if (!route) {
      const parts = path.split('/').filter(Boolean);
      for (let i = parts.length; i > 0; i--) {
        const candidate = '/' + parts.slice(0, i).join('/');
        if (this.routes[candidate]) {
          route = this.routes[candidate];
          matchedPath = candidate;
          break;
        }
      }
    }

    // Fallback to home
    if (!route) {
      route = this.routes['/'];
      matchedPath = '/';
    }

    // Cleanup current page
    if (this.current && this.routes[this.current]?.component?.cleanup) {
      try { this.routes[this.current].component.cleanup(); } catch(e) {}
    }

    this.current = matchedPath;

    // Update active nav links
    this._updateNav(matchedPath);

    // Update page title in header
    if (route.title) {
      const titleEl = document.getElementById('headerTitle');
      if (titleEl) titleEl.textContent = route.title;
    }

    // Render
    if (route.component?.render) {
      try {
        this._container.innerHTML = '';
        await route.component.render(this._container, params);
        // Scroll to top
        this._container.scrollIntoView({ behavior: 'instant' });
        window.scrollTo(0, 0);
      } catch (err) {
        console.error('[Router] Render error:', err);
        UI.showError(this._container, err.message, () => this._handleRoute());
      }
    }
  },

  /** Highlight active nav items */
  _updateNav(path) {
    // Sidebar nav
    document.querySelectorAll('.nav-item[data-route]').forEach(el => {
      const route = el.getAttribute('data-route');
      el.classList.toggle('active', path === route || path.startsWith(route + '/') && route !== '/');
    });

    // Bottom nav
    document.querySelectorAll('.bottom-nav-item[data-route]').forEach(el => {
      const route = el.getAttribute('data-route');
      el.classList.toggle('active', path === route);
    });
  }
};
