/* AKUHS website: loads Faculty, Faculty publications and Events & News from Supabase.
   If the database cannot be reached, the page keeps the content already written in it. */
(function () {
  var SUPABASE_URL = 'https://wpwgvafkfryvgjzkslwc.supabase.co';
  var SUPABASE_KEY = 'sb_publishable_MZwacmdP8vsT9XEuS2dqYg_UCDtQlEY'; // public, read-only key (safe in a browser)
  var COLLEGE = document.documentElement.getAttribute('data-college') || 'dentistry';

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function safeUrl(u) { u = u || ''; return (/^(https?:\/\/|mailto:|\/)/i.test(u) || /^[\w\-.\/]+\.(jpe?g|png|webp|svg)$/i.test(u)) ? u : ''; }
  function get(table, query) {
    return fetch(SUPABASE_URL + '/rest/v1/' + table + '?' + query, { headers: { apikey: SUPABASE_KEY, Accept: 'application/json' } })
      .then(function (r) { if (!r.ok) { throw new Error(table + ' ' + r.status); } return r.json(); });
  }
  var base = 'college=eq.' + encodeURIComponent(COLLEGE) + '&is_published=eq.true';

  /* ---------- Faculty ---------- */
  function renderFaculty(rows) {
    var grid = document.querySelector('#people .fgrid');
    if (!grid || !rows.length) { return; }
    var iconTpl = grid.querySelector('.dean-links');               // reuse the icons already drawn in the page
    var staticDialog = document.getElementById('dean-bio');
    var staticName = staticDialog ? (staticDialog.querySelector('h3') || {}).textContent : '';
    grid.innerHTML = '';
    rows.forEach(function (f) {
      var card = document.createElement('article'); card.className = 'fcard';
      var photo = safeUrl(f.photo_url);
      card.innerHTML =
        '<div class="fphoto">' + (photo
          ? '<img src="' + esc(photo) + '" alt="Portrait of ' + esc(f.full_name) + '" loading="lazy">'
          : '<svg viewBox="0 0 24 24"><circle cx="12" cy="9" r="4"/><path d="M4 21c0-4.500 3.500-7.500 8-7.500s8 3 8 7.500"/></svg>') + '</div>' +
        '<div class="fbody"><h3>' + esc(f.full_name) + '</h3>' +
        (f.position_title ? '<p class="frole">' + esc(f.position_title) + '</p>' : '') +
        (f.academic_rank ? '<p class="fdept">' + esc(f.academic_rank) + '</p>' : '') +
        (f.department ? '<p class="fdept">' + esc(f.department) + '</p>' : '') +
        (f.email ? '<p class="fmail"><a href="mailto:' + esc(f.email) + '"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3.500 7l8.500 6 8.500-6"/></svg>' + esc(f.email) + '</a></p>' : '') +
        '</div>';
      var body = card.querySelector('.fbody');
      if (iconTpl) {
        var ul = iconTpl.cloneNode(true), urls = [f.linkedin_url, f.instagram_url, f.scholar_url, f.orcid_url], kept = 0;
        [].forEach.call(ul.querySelectorAll('li'), function (li, i) {
          var u = safeUrl(urls[i]); if (u) { li.querySelector('a').setAttribute('href', u); kept++; } else { li.remove(); }
        });
        ul.setAttribute('aria-label', 'Profiles of ' + f.full_name);
        if (kept) { body.appendChild(ul); }
      }
      var hasStatic = staticDialog && staticName && staticName.trim() === String(f.full_name).trim();
      if (f.biography || hasStatic) {
        var btn = document.createElement('button'); btn.type = 'button'; btn.className = 'fbtn'; btn.textContent = 'View profile';
        btn.addEventListener('click', function () { hasStatic && !f.biography ? staticDialog.showModal() : openBio(f); });
        body.appendChild(btn);
      }
      grid.appendChild(card);
    });
  }
  function openBio(f) {
    var d = document.getElementById('bio-generic');
    if (!d) {
      d = document.createElement('dialog'); d.id = 'bio-generic'; d.className = 'bio';
      d.innerHTML = '<div class="bio-head"><h3></h3><p></p><button class="bio-close" type="button" aria-label="Close biography">&times;</button></div><div class="bio-body"></div>';
      document.body.appendChild(d);
      d.querySelector('.bio-close').addEventListener('click', function () { d.close(); });
      d.addEventListener('click', function (e) { if (e.target === d) { d.close(); } });
    }
    d.querySelector('h3').textContent = f.full_name;
    d.querySelector('.bio-head p').textContent = f.position_title || f.academic_rank || '';
    d.querySelector('.bio-body').innerHTML = String(f.biography).split(/\n\s*\n/).map(function (p) { return '<p>' + esc(p) + '</p>'; }).join('');
    d.showModal();
  }

  /* ---------- Faculty publications, grouped by calendar year ---------- */
  function renderPublications(rows) {
    var box = document.getElementById('faculty-publications');
    if (!box || !rows.length) { return; }
    var html = '<h3>Faculty publications</h3>', year = null;
    rows.forEach(function (p) {
      if (p.pub_year !== year) { if (year !== null) { html += '</ol>'; } year = p.pub_year; html += '<p class="ayear">' + esc(year) + '</p><ol class="pubs">'; }
      var link = safeUrl(p.url) || (p.doi ? 'https://doi.org/' + encodeURIComponent(p.doi).replace(/%2F/g, '/') : '');
      html += '<li><span><b>' + (link ? '<a href="' + esc(link) + '" target="_blank" rel="noopener">' + esc(p.title) + '</a>' : esc(p.title)) + '</b><br>' +
        esc(p.authors) + '. ' + (p.journal ? '<i>' + esc(p.journal) + '.</i> ' : '') + (p.volume_pages ? esc(p.volume_pages) + '. ' : '') + (p.doi ? 'doi:' + esc(p.doi) : '') + '</span></li>';
    });
    box.innerHTML = html + '</ol>';
  }

  /* ---------- Events & News ---------- */
  function renderNews(rows) {
    var sec = document.querySelector('#news .frame > div:last-child');
    if (!sec || !rows.length) { return; }
    var fmt = function (d) { try { return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }); } catch (e) { return d; } };
    sec.innerHTML = '<ol class="pubs">' + rows.map(function (n) {
      var link = safeUrl(n.link_url), when = n.kind === 'event' && n.event_date ? fmt(n.event_date) : fmt(n.published_at);
      return '<li><span><span class="ayear" style="font-size:.85rem !important;margin:0 0 6px">' + (n.kind === 'event' ? 'Event' : 'News') + '</span><br><b>' +
        (link ? '<a href="' + esc(link) + '">' + esc(n.title) + '</a>' : esc(n.title)) + '</b><br>' + esc(when) + (n.location ? ', ' + esc(n.location) : '') +
        (n.summary ? '<br>' + esc(n.summary) : '') + '</span></li>';
    }).join('') + '</ol>';
  }

  function quiet(e) { if (window.console) { console.warn('AKUHS content not loaded, showing built-in content.', e); } }
  if (!window.fetch) { return; }
  get('faculty', base + '&order=sort_order.asc,full_name.asc&select=*').then(renderFaculty).catch(quiet);
  get('publications', base + '&order=pub_year.desc,created_at.desc&select=*').then(renderPublications).catch(quiet);
  get('events_news', base + '&order=published_at.desc&limit=12&select=*').then(renderNews).catch(quiet);
})();
