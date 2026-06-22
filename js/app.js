 /* ==================== Store ==================== */
 const STORE_KEY = 'myblog_data';
 const SESSION_KEY = 'myblog_auth';
 
 function defaultData() {
   return {
     posts: [],
     settings: {
       blogTitle: '我的博客',
       blogSubtitle: '记录思考，分享见闻',
       adminPasswordHash: hashPassword('admin123'),
       categories: ['技�?, '生活', '随笔', '阅读'],
     }
   };
 }
 
 let data = loadData();
 
 function loadData() {
   try {
     var raw = localStorage.getItem(STORE_KEY);
     if (raw) {
       var parsed = JSON.parse(raw);
       if (!parsed.settings.categories || !Array.isArray(parsed.settings.categories)) {
         parsed.settings.categories = ['技�?, '生活', '随笔', '阅读'];
       }
       return parsed;
     }
   } catch (e) { /* ignore */ }
   return defaultData();
 }
 
 async function seedFromDataFile() {
   try {
     var resp = await fetch('data/posts.json?_t=' + Date.now());
     var fileData = await resp.json();
     var raw = localStorage.getItem(STORE_KEY);
     if (!raw) {
       localStorage.setItem(STORE_KEY, JSON.stringify(fileData));
       data = loadData();
       return;
     }
     var localData = JSON.parse(raw);
     var fileIds = {};
     var localIds = {};
     fileData.posts.forEach(function(p) { fileIds[p.id] = true; });
     localData.posts.forEach(function(p) { localIds[p.id] = true; });
     var changed = false;
     fileData.posts.forEach(function(fp) {
       if (!localIds[fp.id]) {
         localData.posts.push(fp);
         changed = true;
       }
     });
     localData.posts = localData.posts.filter(function(lp) {
       if (lp.id.indexOf('demo') === 0 && !fileIds[lp.id]) {
         changed = true;
         return false;
       }
       return true;
     });
     if (changed) {
       localStorage.setItem(STORE_KEY, JSON.stringify(localData));
     }
     data = loadData();
   } catch (e) {
     data = loadData();
   }
 }
 
 function saveData() {
   localStorage.setItem(STORE_KEY, JSON.stringify(data));
   renderSidebar();
 }
 
 function exportData() {
   var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
   var url = URL.createObjectURL(blob);
   var a = document.createElement('a');
   a.href = url;
   a.download = 'posts.json';
   document.body.appendChild(a);
   a.click();
   document.body.removeChild(a);
   URL.revokeObjectURL(url);
   showToast('数据已导出，请替�?data/posts.json 文件');
 }
 
 function hashPassword(pw) {
   var h = 0;
   for (var i = 0; i < pw.length; i++) {
     var c = pw.charCodeAt(i);
     h = ((h << 5) - h) + c;
     h |= 0;
   }
   return 'h' + Math.abs(h).toString(36);
 }
 
 function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
 
 /* ==================== Auth ==================== */
 function isLoggedIn() { return sessionStorage.getItem(SESSION_KEY) === '1'; }
 function requireAuth() {
   if (!isLoggedIn()) { navigate('login'); return false; }
   return true;
 }
 
 /* ==================== Router ==================== */
 var currentRoute = { page: 'home', params: {} };
 
 function navigate(page, params) {
   if (!params) params = {};
   currentRoute = { page: page, params: params };
   render();
   window.scrollTo(0, 0);
 }
 
 function getRoute() { return currentRoute; }
 
 /* ==================== Toast ==================== */
 function showToast(msg) {
   var el = document.getElementById('toast');
   if (!el) {
     el = document.createElement('div');
     el.id = 'toast';
     el.className = 'toast';
     document.body.appendChild(el);
   }
   el.textContent = msg;
   el.classList.add('show');
   clearTimeout(el._timer);
   el._timer = setTimeout(function() { el.classList.remove('show'); }, 2500);
 }
 
 /* ==================== Confirm Dialog ==================== */
 function showConfirm(title, msg) {
   return new Promise(function(resolve) {
     var overlay = document.createElement('div');
     overlay.className = 'dialog-overlay';
     overlay.innerHTML =
       '<div class="dialog">' +
         '<h3>' + title + '</h3>' +
         '<p>' + msg + '</p>' +
         '<div class="dialog-actions">' +
           '<button class="btn" data-action="cancel">取消</button>' +
           '<button class="btn btn-primary" data-action="confirm">确认</button>' +
         '</div>' +
       '</div>';
     overlay.querySelector('[data-action="cancel"]').onclick = function() { overlay.remove(); resolve(false); };
     overlay.querySelector('[data-action="confirm"]').onclick = function() { overlay.remove(); resolve(true); };
     overlay.onclick = function(e) { if (e.target === overlay) { overlay.remove(); resolve(false); } };
     document.body.appendChild(overlay);
   });
 }
 
 /* ==================== Utilities ==================== */
 function escapeHtml(s) {
   var div = document.createElement('div');
   div.appendChild(document.createTextNode(s));
   return div.innerHTML;
 }
 
 function formatDate(ts) {
   var d = new Date(ts);
   var y = d.getFullYear();
   var m = String(d.getMonth() + 1).padStart(2, '0');
   var day = String(d.getDate()).padStart(2, '0');
   return y + '-' + m + '-' + day;
 }
 
 function truncate(text, len) {
   if (!len) len = 120;
   if (text.length <= len) return text;
   return text.slice(0, len).replace(/\s+\S*$/, '') + String.fromCharCode(8230);
 }
 
 /* ==================== Render ==================== */
 function render() {
   var root = document.getElementById('app');
   var route = currentRoute;
   var html = '';
   switch (route.page) {
     case 'home': html = renderHome(); break;
     case 'post': html = renderPost(route.params.id); break;
     case 'login': html = renderLogin(); break;
     case 'admin': html = renderAdmin(); break;
     case 'editor': html = renderEditor(route.params.id); break;
     default: html = renderHome();
   }
   root.innerHTML = html;
  document.title = data.settings.blogTitle;
   afterRender(route.page, route.params);
   setActiveNav(route.page);
 }
 
 function setActiveNav(page) {
   document.querySelectorAll('.header-nav a, .header-nav button').forEach(function(el) {
     el.classList.toggle('active', el.dataset.page === page);
   });
 }
 
 function afterRender(page, params) {
   if (page === 'home') renderSidebar();
 }
 
 /* ==================== Home ==================== */
 function renderHome() {
   var title = escapeHtml(data.settings.blogTitle);
   var subtitle = escapeHtml(data.settings.blogSubtitle);
   var published = data.posts.filter(function(p) { return p.published; });
   published.sort(function(a, b) { return b.createdAt - a.createdAt; });
 
   var postsHtml = '';
   if (published.length) {
     postsHtml = published.map(function(p) { return renderPostCard(p); }).join('');
   } else {
     postsHtml =
       '<div class="empty-state">' +
         '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"/></svg>' +
         '<h3>还没有文�?/h3>' +
         '<p>快去后台写第一篇吧</p>' +
       '</div>';
   }
 
   return (
     '<div class="container-wide">' +
       '<div class="page-header">' +
         '<h1>' + title + '</h1>' +
         '<p>' + subtitle + '</p>' +
       '</div>' +
       '<div class="layout-sidebar">' +
         '<div><div class="post-list">' + postsHtml + '</div></div>' +
         '<div class="sidebar" id="sidebar"></div>' +
       '</div>' +
     '</div>'
   );
 }
 
 function renderPostCard(p) {
   var raw = (p.content || '').replace(/[#*`\[\]()>|~_\-]/g, '');
   var tagsHtml = (p.tags && p.tags.length) ? '<div class="tags">' + p.tags.map(function(t) { return '<span>' + escapeHtml(t) + '</span>'; }).join('') + '</div>' : '';
   return (
     '<div class="post-card" onclick="navigate(\'post\',{id:\'' + p.id + '\'})">' +
       '<div class="post-card-meta">' +
         '<span>' + formatDate(p.createdAt) + '</span>' +
         '<span class="category">' + escapeHtml(p.category || '未分�?) + '</span>' +
       '</div>' +
       '<h2><a href="javascript:" onclick="event.stopPropagation();navigate(\'post\',{id:\'' + p.id + '\'})">' + escapeHtml(p.title) + '</a></h2>' +
       '<div class="excerpt">' + escapeHtml(truncate(raw, 160)) + '</div>' +
       tagsHtml +
       '<div class="post-card-footer">' +
         '<span>' + escapeHtml(p.author || '佚名') + '</span>' +
         '<span>' + p.content.length + ' �?/span>' +
       '</div>' +
     '</div>'
   );
 }
 
 /* ==================== Post Detail ==================== */
 function renderPost(id) {
   var post = data.posts.find(function(p) { return p.id === id && p.published; });
   if (!post) {
     return '<div class="container"><div class="empty-state"><h3>文章不存在或未发�?/h3><p><a href="javascript:navigate(\'home\')">返回首页</a></p></div></div>';
   }
 
   var mdHtml = marked.parse(post.content);
   var tagsHtml = (post.tags && post.tags.length) ? post.tags.map(function(t) { return '<span class="tag">' + escapeHtml(t) + '</span>'; }).join('') : '';
 
   return (
     '<article class="post-detail">' +
       '<div class="post-detail-header">' +
         '<a class="back-link" href="javascript:navigate(\'home\')">' +
           '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"/></svg>' +
           '返回' +
         '</a>' +
         '<h1>' + escapeHtml(post.title) + '</h1>' +
         '<div class="post-detail-meta">' +
           '<span>' + formatDate(post.createdAt) + '</span>' +
           '<span class="category" style="display:inline-block;padding:1px 8px;border-radius:10px;background:var(--accent-light);color:var(--accent);font-size:.75rem;font-weight:500;">' + escapeHtml(post.category || '未分�?) + '</span>' +
           '<span>' + escapeHtml(post.author || '佚名') + '</span>' +
           tagsHtml +
         '</div>' +
       '</div>' +
       '<div class="post-content">' + mdHtml + '</div>' +
     '</article>'
   );
 }
 
 /* ==================== Sidebar ==================== */
 function renderSidebar() {
   var el = document.getElementById('sidebar');
   if (!el) return;
 
   var published = data.posts.filter(function(p) { return p.published; });
 
   var catCount = {};
   published.forEach(function(p) { var c = p.category || '未分�?; catCount[c] = (catCount[c] || 0) + 1; });
   var cats = data.settings.categories.slice();
   cats.sort();
 
   var tagSet = new Set();
   published.forEach(function(p) { (p.tags || []).forEach(function(t) { tagSet.add(t); }); });
   var tags = Array.from(tagSet).sort();
 
   var recent = [].concat(published).sort(function(a, b) { return b.createdAt - a.createdAt; }).slice(0, 5);
 
   var catsHtml = cats.map(function(c) {
     return '<li><a href="javascript:" onclick="filterCategory(\'' + c.replace(/'/g, "\\'") + '\')">' + escapeHtml(c) + '</a><span class="category-count">' + (catCount[c] || 0) + '</span></li>';
   }).join('');
 
   var tagsHtml = tags.length
     ? '<div class="widget"><h3>标签</h3><div class="tag-cloud">' + tags.map(function(t) {
         return '<a href="javascript:" onclick="filterTag(\'' + t.replace(/'/g, "\\'") + '\')">' + escapeHtml(t) + '</a>';
       }).join('') + '</div></div>'
     : '';
 
   var recentHtml = recent.map(function(p) {
     return '<li><a href="javascript:navigate(\'post\',{id:\'' + p.id + '\'})">' + escapeHtml(p.title) + '</a></li>';
   }).join('');
 
   el.innerHTML =
     '<div class="widget"><h3>搜索</h3><input class="search-input" type="text" placeholder="搜索文章�? id="searchInput" oninput="onSearch(this.value)"></div>' +
     '<div class="widget"><h3>分类</h3><ul>' + catsHtml + '</ul></div>' +
     tagsHtml +
     '<div class="widget"><h3>近期文章</h3><ul>' + recentHtml + '</ul></div>';
 }
 
 /* ==================== Search / Filter ==================== */
 var filterText = '';
 var filterCategoryVal = '';
 var filterTagVal = '';
 
 function onSearch(val) {
   filterText = val.toLowerCase().trim();
   filterCategoryVal = '';
   filterTagVal = '';
   applyFilters();
 }
 
 function filterCategory(c) {
   filterCategoryVal = c;
   filterTagVal = '';
   var inp = document.getElementById('searchInput');
   if (inp) inp.value = '';
   filterText = '';
   applyFilters();
 }
 
 function filterTag(t) {
   filterTagVal = t;
   filterCategoryVal = '';
   var inp = document.getElementById('searchInput');
   if (inp) inp.value = '';
   filterText = '';
   applyFilters();
 }
 
 function applyFilters() {
   var root = document.getElementById('app');
   var posts = data.posts.filter(function(p) { return p.published; });
 
   if (filterCategoryVal) {
     posts = posts.filter(function(p) { return (p.category || '未分�?) === filterCategoryVal; });
   }
   if (filterTagVal) {
     posts = posts.filter(function(p) { return (p.tags || []).indexOf(filterTagVal) !== -1; });
   }
   if (filterText) {
     posts = posts.filter(function(p) {
       return p.title.toLowerCase().indexOf(filterText) !== -1 ||
              p.content.toLowerCase().indexOf(filterText) !== -1;
     });
   }
 
   posts.sort(function(a, b) { return b.createdAt - a.createdAt; });
 
   var listEl = root.querySelector('.post-list');
   if (!listEl) return;
 
   if (!posts.length) {
     listEl.innerHTML = '<div class="empty-state"><h3>没有找到文章</h3><p>试试其他关键�?/p></div>';
     return;
   }
   listEl.innerHTML = posts.map(function(p) { return renderPostCard(p); }).join('');
 }
 
 /* ==================== Login ==================== */
 function renderLogin() {
   return (
     '<div class="login-page">' +
       '<h1>后台管理</h1>' +
       '<div class="login-form">' +
         '<div class="login-error" id="loginError">密码错误</div>' +
         '<label for="loginPw">管理员密�?/label>' +
         '<input type="password" id="loginPw" placeholder="请输入密�? onkeydown="if(event.key===\'Enter\')doLogin()">' +
         '<button class="btn btn-primary" style="width:100%;justify-content:center;" onclick="doLogin()">登录</button>' +
       '</div>' +
     '</div>'
   );
 }
 
 function doLogin() {
   var pw = document.getElementById('loginPw').value;
   if (hashPassword(pw) === data.settings.adminPasswordHash) {
     sessionStorage.setItem(SESSION_KEY, '1');
     navigate('admin');
     showToast('登录成功');
   } else {
     document.getElementById('loginError').style.display = 'block';
   }
 }
 
 /* ==================== Admin Dashboard ==================== */
 function renderAdmin() {
   if (!isLoggedIn()) return renderLogin();
 
   var allPosts = [].concat(data.posts).sort(function(a, b) { return b.createdAt - a.createdAt; });
   var rows = '';
   if (allPosts.length) {
     rows = allPosts.map(function(p) {
       return '<tr>' +
         '<td>' + escapeHtml(p.title) + '</td>' +
         '<td><span class="status-badge ' + (p.published ? 'published' : 'draft') + '">' + (p.published ? '已发�? : '草稿') + '</span></td>' +
         '<td>' + escapeHtml(p.category || '-') + '</td>' +
         '<td>' + formatDate(p.createdAt) + '</td>' +
         '<td class="actions">' +
           '<button class="btn btn-sm" onclick="navigate(\'editor\',{id:\'' + p.id + '\'})">编辑</button>' +
           '<button class="btn btn-sm btn-danger" onclick="deletePost(\'' + p.id + '\')">删除</button>' +
         '</td>' +
       '</tr>';
     }).join('');
   } else {
     rows = '<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:40px;">还没有文章，开始写第一篇吧</td></tr>';
   }
 
   return (
     '<div class="container-wide">' +
       '<div class="admin-header">' +
         '<h1>文章管理</h1>' +
         '<div style="display:flex;gap:8px;">' +
           '<button class="btn btn-primary" onclick="navigate(\'editor\',{})">' +
             '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15"/></svg>' +
             '写新文章' +
           '</button>' +
         '</div>' +
       '</div>' +
       '<table class="admin-table">' +
         '<thead><tr><th>标题</th><th>状�?/th><th>分类</th><th>日期</th><th>操作</th></tr></thead>' +
         '<tbody>' + rows + '</tbody>' +
       '</table>' +
       '<div style="margin-top:24px;padding-top:24px;border-top:1px solid var(--border);display:flex;gap:8px;flex-wrap:wrap;">' +
         '<button class="btn" onclick="navigate(\'home\')">�?返回前台</button>' +
         '<button class="btn" onclick="exportData()">导出数据</button>' +
         '<button class="btn" onclick="logout()">退出登�?/button>' +
       '</div>' +
     '</div>'
   );
 }
 
 function deletePost(id) {
   showConfirm('确认删除', '删除后无法恢复，确定要继续吗�?).then(function(ok) {
     if (!ok) return;
     data.posts = data.posts.filter(function(p) { return p.id !== id; });
     saveData();
     showToast('已删�?);
     navigate('admin');
   });
 }
 
 function logout() {
   sessionStorage.removeItem(SESSION_KEY);
   navigate('home');
   showToast('已退�?);
 }
 
 /* ==================== Editor ==================== */
 function renderEditor(id) {
   if (!requireAuth()) return '';
 
   var post = null;
   var isNew = true;
   if (id) {
     post = data.posts.find(function(p) { return p.id === id; });
     isNew = false;
   }
 
   var title = post ? escapeHtml(post.title) : '';
   var content = post ? escapeHtml(post.content) : '';
   var category = post ? escapeHtml(post.category || '') : '';
   var tags = post ? escapeHtml((post.tags || []).join(', ')) : '';
   var published = post ? post.published : true;
   var author = post ? escapeHtml(post.author || '') : '';
 
   var cats = data.settings.categories.map(function(c) {
     return '<option value="' + escapeHtml(c) + '"' + (c === category ? ' selected' : '') + '>' + escapeHtml(c) + '</option>';
   }).join('');
 
   return (
     '<div class="editor-page">' +
       '<div class="editor-header">' +
         '<h1>' + (isNew ? '写新文章' : '编辑文章') + '</h1>' +
         '<div style="display:flex;gap:8px;">' +
           '<button class="btn" onclick="navigate(\'admin\')">返回</button>' +
           '<button class="btn btn-primary" onclick="savePost(\'' + (id || '') + '\')">' + (isNew ? '发布' : '保存') + '</button>' +
         '</div>' +
       '</div>' +
       '<div class="editor-form">' +
         '<div><label for="postTitle">标题</label><input type="text" id="postTitle" value="' + title + '" placeholder="文章标题"></div>' +
         '<div class="form-row">' +
           '<div><label for="postCategory">分类</label><select id="postCategory">' + cats + '</select></div>' +
           '<div><label for="postTags">标签（逗号分隔�?/label><input type="text" id="postTags" value="' + tags + '" placeholder="标签1, 标签2"></div>' +
         '</div>' +
         '<div><label for="postAuthor">作�?/label><input type="text" id="postAuthor" value="' + author + '" placeholder="作者名"></div>' +
         '<div class="checkbox-row">' +
           '<input type="checkbox" id="postPublished" ' + (published ? 'checked' : '') + '>' +
           '<label for="postPublished" style="margin-bottom:0;">立即发布</label>' +
         '</div>' +
         '<div>' +
           '<label>内容 (Markdown)</label>' +
           '<div class="editor-tabs">' +
             '<button class="active" data-editortab="write" onclick="switchEditorTab(\'write\')">编辑</button>' +
             '<button data-editortab="preview" onclick="switchEditorTab(\'preview\')">预览</button>' +
           '</div>' +
           '<textarea id="postContent" ' + (window._editorTab === 'preview' ? 'style="display:none;"' : '') + '>' + content + '</textarea>' +
           '<div class="editor-preview" id="editorPreview" ' + (window._editorTab === 'preview' ? '' : 'style="display:none;"') + '>' +
             '<h3>预览</h3>' +
             '<div id="previewContent"></div>' +
           '</div>' +
         '</div>' +
       '</div>' +
     '</div>'
   );
 }
 
 window._editorTab = 'write';
 function switchEditorTab(tab) {
   window._editorTab = tab;
   document.querySelectorAll('[data-editortab]').forEach(function(b) {
     b.classList.toggle('active', b.dataset.editortab === tab);
   });
   var textarea = document.getElementById('postContent');
   var preview = document.getElementById('editorPreview');
   if (tab === 'write') {
     textarea.style.display = '';
     preview.style.display = 'none';
   } else {
     textarea.style.display = 'none';
     preview.style.display = '';
     document.getElementById('previewContent').innerHTML = marked.parse(textarea.value);
   }
 }
 
 function savePost(id) {
   var title = document.getElementById('postTitle').value.trim();
   var content = document.getElementById('postContent').value.trim();
   var category = document.getElementById('postCategory').value;
   var tagsStr = document.getElementById('postTags').value.trim();
   var author = document.getElementById('postAuthor').value.trim();
   var published = document.getElementById('postPublished').checked;
 
   if (!title) { showToast('请输入标�?); return; }
   if (!content) { showToast('请输入内�?); return; }
 
   var tags = tagsStr ? tagsStr.split(/[,，]/).map(function(s) { return s.trim(); }).filter(Boolean) : [];
 
   var now = Date.now();
 
   if (id) {
     var idx = data.posts.findIndex(function(p) { return p.id === id; });
     if (idx === -1) { showToast('文章不存�?); return; }
     data.posts[idx] = Object.assign({}, data.posts[idx], {
       title: title, content: content, category: category,
       tags: tags, author: author, published: published, updatedAt: now
     });
   } else {
     data.posts.push({
       id: uid(),
       title: title, content: content, category: category, tags: tags,
       author: author || '佚名',
       published: published,
       createdAt: now,
       updatedAt: now
     });
   }
 
   saveData();
   showToast(id ? '已保�? : '已发�?);
   navigate('admin');
 }
 
 /* ==================== Theme ==================== */
 function initTheme() {
   var saved = localStorage.getItem('myblog_theme');
   if (saved === 'dark') { document.documentElement.setAttribute('data-theme', 'dark'); }
 }
 
 function toggleTheme() {
   var html = document.documentElement;
   var isDark = html.getAttribute('data-theme') === 'dark';
   if (isDark) {
     html.removeAttribute('data-theme');
     localStorage.setItem('myblog_theme', 'light');
   } else {
     html.setAttribute('data-theme', 'dark');
     localStorage.setItem('myblog_theme', 'dark');
   }
 }
 
 /* ==================== Init ==================== */
 document.addEventListener('DOMContentLoaded', function() {
   initTheme();
   seedFromDataFile().then(function() { render(); });
 });
