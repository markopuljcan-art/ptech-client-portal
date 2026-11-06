/* V8: proper project detail routing; no modification of existing RPC editor. */
(() => {
  'use strict';
  document.addEventListener('click', event => {
    const link = event.target.closest('a.project-action-primary');
    if (!link || !link.closest('#projectsList')) return;
    const url = new URL(link.href, location.href);
    const id = url.searchParams.get('project');
    if (!id || !/^\d+$/.test(id)) return;
    event.preventDefault();
    location.href = 'admin-project-detail.html?id=' + encodeURIComponent(id);
  });
})();
