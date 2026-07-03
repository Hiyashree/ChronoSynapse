/**
 * GitHub Pages → Render redirect
 * Used only by root index.html and 404.html (not served by the Express app).
 */
(function () {
    const DEFAULT_RENDER_URL = 'https://chronosynapse.onrender.com';

    function getRenderBase() {
        const meta = document.querySelector('meta[name="chronosynapse-render-url"]');
        return (meta?.content || DEFAULT_RENDER_URL).replace(/\/$/, '');
    }

    function mapPath(pathname) {
        let path = pathname || '/';

        // GitHub project site: /ChronoSynapse/...
        path = path.replace(/^\/ChronoSynapse/i, '') || '/';

        // Old static layout: /public/...
        path = path.replace(/^\/public(?=\/|$)/i, '') || '/';

        if (!path.startsWith('/')) {
            path = '/' + path;
        }

        const routes = {
            '/': '/',
            '/index.html': '/',
            '/login.html': '/login',
            '/signup.html': '/signup',
            '/dashboard.html': '/dashboard'
        };

        return routes[path] || path;
    }

    window.redirectToRender = function redirectToRender() {
        const base = getRenderBase();
        const path = mapPath(window.location.pathname);
        const target = base + path + window.location.search + window.location.hash;

        const link = document.getElementById('manual-link');
        if (link) {
            link.href = target;
        }

        window.location.replace(target);
    };
})();
