/**
 * Admin Panel JavaScript
 * Manages the admin interface for user and permission management
 */

class AdminPanel {
  constructor() {
    this.currentPage = 1;
    this.currentSection = 'dashboard';
    this.pageSize = 20;
    this.authToken = null;

    this.init();
  }

  init() {
    // Check if user is authenticated
    this.authToken = localStorage.getItem('admin_token');

    console.log('Admin Panel initializing. Token exists:', !!this.authToken);

    if (!this.authToken) {
      console.log('No token found, showing login modal');
      this.showLoginModal();
      return;
    }

    console.log('Token found, initializing admin panel');
    this.bindEvents();
    this.loadDashboardStats();
    this.createModals();
  }

  showLoginModal() {
    console.log('showLoginModal called');
    const loginModal = document.getElementById('loginModal');
    if (!loginModal) {
      console.log('Login modal not found, creating it');
      this.createLoginModal();
    } else {
      console.log('Login modal already exists');
    }
    // Wait for DOM to be ready before showing modal
    setTimeout(() => {
      console.log('Attempting to show modal');
      if (typeof bootstrap === 'undefined') {
        console.error('Bootstrap is not loaded!');
        alert('Errore: Bootstrap non caricato. Ricaricare la pagina.');
        return;
      }
      try {
        const modal = new bootstrap.Modal(document.getElementById('loginModal'), {
          backdrop: 'static',
          keyboard: false
        });
        console.log('Modal instance created, showing...');
        modal.show();
      } catch (error) {
        console.error('Error showing modal:', error);
        alert('Errore nel mostrare il modal di login: ' + error.message);
      }
    }, 100);
  }

  createLoginModal() {
    console.log('createLoginModal called');
    const modalHTML = `
            <div class="modal fade" id="loginModal" tabindex="-1">
                <div class="modal-dialog modal-dialog-centered">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">
                                <i class="bi bi-shield-lock-fill me-2"></i>
                                Accesso Pannello Admin
                            </h5>
                        </div>
                        <div class="modal-body">
                            <form id="loginForm">
                                <div class="mb-3">
                                    <label for="login-username" class="form-label">Username</label>
                                    <input type="text" class="form-control" id="login-username" required autocomplete="username">
                                </div>
                                <div class="mb-3">
                                    <label for="login-password" class="form-label">Password</label>
                                    <input type="password" class="form-control" id="login-password" required autocomplete="current-password">
                                </div>
                                <div id="loginError" class="alert alert-danger d-none"></div>
                                <button type="submit" class="btn btn-primary w-100" id="loginBtn">
                                    <i class="bi bi-box-arrow-in-right me-1"></i>
                                    Accedi
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        `;

    console.log('Inserting modal HTML into body');
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    console.log('Modal HTML inserted');

    console.log('Adding event listener to login form');
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
      loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        console.log('Login form submitted');
        this.handleLogin();
      });
      console.log('Event listener added');
    } else {
      console.error('Login form not found after insertion!');
    }
  }

  handleLogin() {
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;
    const loginBtn = document.getElementById('loginBtn');
    const loginError = document.getElementById('loginError');

    loginBtn.disabled = true;
    loginBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Accesso in corso...';
    loginError.classList.add('d-none');

    // Set flag to prevent logout during login process
    this._loginInProgress = true;

    console.log('Attempting login for user:', username);

    const requestBody = {
      login: username,
      password: password,
      scopi: 'admin-manage',
      ambito: 'api'
    };

    console.log('Request body:', requestBody);

    fetch('/api/v1/login/get-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    })
      .then(response => {
        console.log('Response status:', response.status);
        return response.json();
      })
      .then(result => {
        console.log('Response data:', result);

        if (!result.ok) {
          throw new Error(result.err.msg || 'Errore di autenticazione');
        }

        // Store token
        this.authToken = result.data.token;
        console.log('Saving token to localStorage...');
        localStorage.setItem('admin_token', this.authToken);

        // Verify token was saved
        const savedToken = localStorage.getItem('admin_token');
        if (savedToken === this.authToken) {
          console.log('✓ Token saved successfully:', this.authToken.substring(0, 20) + '...');
        } else {
          console.error('✗ Token NOT saved! localStorage may be disabled');
          throw new Error('Impossibile salvare il token. Controlla le impostazioni del browser.');
        }

        // Hide modal and initialize admin panel
        const loginModalEl = document.getElementById('loginModal');
        const modal = bootstrap.Modal.getInstance(loginModalEl);
        if (modal) {
          console.log('Hiding login modal...');
          modal.hide();
        }

        console.log('Initializing admin panel components...');
        this.bindEvents();
        this.loadDashboardStats();
        this.createModals();

        console.log('Admin panel fully initialized');
        this.showToast('Successo', 'Accesso effettuato con successo', 'success');

        // Clear login in progress flag after successful initialization
        setTimeout(() => {
          this._loginInProgress = false;
          console.log('Login process complete, flag cleared');
        }, 2000);
      })
      .catch(error => {
        loginError.textContent = error.message;
        loginError.classList.remove('d-none');
        this._loginInProgress = false;
      })
      .finally(() => {
        loginBtn.disabled = false;
        loginBtn.innerHTML = '<i class="bi bi-box-arrow-in-right me-1"></i>Accedi';
      });
  }

  logout() {
    console.log('LOGOUT called');
    console.trace('Logout stack trace');
    localStorage.removeItem('admin_token');
    this.authToken = null;
    window.location.reload();
  }

  bindEvents() {
    // Navigation
    document.querySelectorAll('.nav-link[data-section]').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const navLink = e.target.closest('[data-section]');
        if (navLink) {
          this.switchSection(navLink.getAttribute('data-section'));
        }
      });
    });

    // Mobile sidebar toggle
    const sidebarToggle = document.getElementById('sidebarToggle');
    if (sidebarToggle) {
      sidebarToggle.addEventListener('click', () => {
        document.querySelector('.sidebar').classList.toggle('show');
      });
    }

    // Search functionality
    const userSearch = document.getElementById('user-search');
    if (userSearch) {
      userSearch.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') {
          this.loadUsers();
        }
      });
    }
  }

  switchSection(section) {
    console.log('switchSection called:', section);
    console.log('Current token exists:', !!this.authToken);

    // Update navigation
    document.querySelectorAll('.nav-link').forEach(link => {
      link.classList.remove('active');
    });
    document.querySelector(`[data-section="${section}"]`).classList.add('active');

    // Show content
    document.querySelectorAll('.content-section').forEach(sec => {
      sec.classList.remove('active');
    });
    document.getElementById(`${section}-section`).classList.add('active');

    this.currentSection = section;

    // Load data based on section
    switch (section) {
      case 'users':
        this.loadUsers();
        break;
      case 'scopes':
        this.loadScopes();
        break;
      case 'domains':
        this.loadDomains();
        break;
      case 'levels':
        this.loadLevels();
        break;
      case 'dashboard':
        this.loadDashboardStats();
        break;
      case 'mpi-apps':
        loadMpiApps();
        break;
      case 'mpi-records':
        loadMpiAppSelect();
        searchMpiRecords();
        break;
    }
  }

  async apiCall(url, method = 'GET', data = null) {
    const options = {
      method: method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    // Add authorization header if token exists
    if (this.authToken) {
      options.headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    if (data) {
      options.body = JSON.stringify(data);
    }

    try {
      console.log(`API Call: ${method} ${url}`);
      const response = await fetch(url, options);
      console.log(`API Response status: ${response.status}`);
      const result = await response.json();
      console.log(`API Response:`, result);

      if (!result.ok) {
        // Handle Sails native validation errors (400) which have a different format
        if (!result.err) {
          const message = result.problems
            ? result.problems.join('; ')
            : (result.message || 'Errore di validazione');
          throw new Error(message);
        }

        // Check if token is expired or invalid - force logout
        if (result.err.code === 'TOKEN_SCADUTO' || result.err.code === 'TOKEN_NON_VALIDO') {
          localStorage.removeItem('admin_token');
          this.authToken = null;
          this.showToast('Sessione scaduta', 'Il token è scaduto. Effettua nuovamente il login.', 'warning');
          setTimeout(function() { location.reload(); }, 1500);
          throw new Error('Token scaduto');
        }
        throw new Error(result.err.msg || 'Errore sconosciuto');
      }

      return result.data;
    } catch (error) {
      console.error('API Call error:', error);
      this.showToast('Errore', error.message, 'danger');
      throw error;
    }
  }

  async loadDashboardStats() {
    console.log('loadDashboardStats called');
    try {
      console.log('Fetching dashboard stats with token:', !!this.authToken);
      const [users, scopes, domains, levels] = await Promise.all([
        this.apiCall('/api/v1/admin/users?limit=1'),
        this.apiCall('/api/v1/admin/scopes?limit=1'),
        this.apiCall('/api/v1/admin/domains?limit=1'),
        this.apiCall('/api/v1/admin/levels')
      ]);

      console.log('Dashboard stats loaded successfully');
      document.getElementById('total-users').textContent = users.pagination.total || 0;
      document.getElementById('total-scopes').textContent = scopes.pagination.total || 0;
      document.getElementById('total-domains').textContent = domains.pagination.total || 0;
      document.getElementById('total-levels').textContent = levels.levels.length || 0;
    } catch (error) {
      console.error('Error loading dashboard stats:', error);
    }
  }

  async loadUsers() {
    const loading = document.getElementById('users-loading');
    const tbody = document.getElementById('users-tbody');
    const search = document.getElementById('user-search').value;

    loading.style.display = 'block';
    tbody.innerHTML = '';

    try {
      const params = new URLSearchParams({
        limit: 10000
      });

      if (search) {
        params.append('search', search);
      }

      const data = await this.apiCall(`/api/v1/admin/users?${params}`);

      data.users.forEach(user => {
        const row = this.createUserRow(user);
        tbody.appendChild(row);
      });

      // Show total count
      const paginationContainer = document.getElementById('users-pagination');
      if (paginationContainer) {
        paginationContainer.innerHTML = `<div class="text-center mt-2"><small class="text-muted">Totale: ${data.users.length} utenti</small></div>`;
      }

      this.initTableSortFilter('users-table', 1);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      loading.style.display = 'none';
    }
  }

  createUserRow(user) {
    const row = document.createElement('tr');

    const statusBadge = user.attivo
      ? '<span class="badge bg-success">Attivo</span>'
      : '<span class="badge bg-danger">Disattivo</span>';

    const otpBadge = user.otp_enabled
      ? '<span class="badge bg-warning text-dark ms-1" title="OTP Abilitato"><i class="bi bi-shield-lock"></i></span>'
      : '';

    const scopesList = user.scopi.map(scope =>
      `<span class="badge bg-primary me-1">${scope.scopo}</span>`
    ).join('');

    row.innerHTML = `
            <td>${user.id}</td>
            <td><strong>${user.username}</strong>${otpBadge}</td>
            <td>${user.mail}</td>
            <td>${user.ambito.ambito || '-'}</td>
            <td>${user.livello.livello || '-'}</td>
            <td>${statusBadge}</td>
            <td>${scopesList}</td>
            <td>
                <div class="btn-group btn-group-sm">
                    <button class="btn btn-outline-primary" onclick="adminPanel.editUser(${user.id})" title="Modifica">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-outline-danger" onclick="adminPanel.deleteUser(${user.id}, '${user.username}')" title="Elimina">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </td>
        `;

    return row;
  }

  async loadScopes() {
    const loading = document.getElementById('scopes-loading');
    const tbody = document.getElementById('scopes-tbody');

    loading.style.display = 'block';
    tbody.innerHTML = '';

    try {
      const data = await this.apiCall('/api/v1/admin/scopes');

      data.scopes.forEach(scope => {
        const row = this.createScopeRow(scope);
        tbody.appendChild(row);
      });

      this.initTableSortFilter('scopes-table', 1);
    } catch (error) {
      console.error('Error loading scopes:', error);
    } finally {
      loading.style.display = 'none';
    }
  }

  createScopeRow(scope) {
    const row = document.createElement('tr');

    const statusBadge = scope.attivo
      ? '<span class="badge bg-success">Attivo</span>'
      : '<span class="badge bg-danger">Disattivo</span>';

    const date = new Date(scope.createdAt).toLocaleDateString('it-IT');

    row.innerHTML = `
            <td><strong>${scope.scopo}</strong></td>
            <td>${statusBadge}</td>
            <td><span class="badge bg-info">${scope.userCount}</span></td>
            <td>${date}</td>
            <td>
                <div class="btn-group btn-group-sm">
                    <button class="btn btn-outline-primary" onclick="adminPanel.editScope(${scope.id})" title="Modifica">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-outline-danger" onclick="adminPanel.deleteScope(${scope.id}, '${scope.scopo}')" title="Elimina">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </td>
        `;

    return row;
  }

  async loadDomains() {
    const loading = document.getElementById('domains-loading');
    const tbody = document.getElementById('domains-tbody');

    loading.style.display = 'block';
    tbody.innerHTML = '';

    try {
      const data = await this.apiCall('/api/v1/admin/domains');

      data.domains.forEach(domain => {
        const row = this.createDomainRow(domain);
        tbody.appendChild(row);
      });

      this.initTableSortFilter('domains-table', 1);
    } catch (error) {
      console.error('Error loading domains:', error);
    } finally {
      loading.style.display = 'none';
    }
  }

  createDomainRow(domain) {
    const row = document.createElement('tr');

    const typeBadge = domain.is_dominio
      ? '<span class="badge bg-warning">Dominio AD</span>'
      : '<span class="badge bg-info">Standard</span>';

    const date = new Date(domain.createdAt).toLocaleDateString('it-IT');

    row.innerHTML = `
            <td><strong>${domain.ambito}</strong></td>
            <td>${typeBadge}</td>
            <td><span class="badge bg-info">${domain.userCount}</span></td>
            <td>${date}</td>
            <td>
                <div class="btn-group btn-group-sm">
                    <button class="btn btn-outline-primary" onclick="adminPanel.editDomain(${domain.id})" title="Modifica">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-outline-danger" onclick="adminPanel.deleteDomain(${domain.id}, '${domain.ambito}')" title="Elimina">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </td>
        `;

    return row;
  }

  async loadLevels() {
    const loading = document.getElementById('levels-loading');
    const tbody = document.getElementById('levels-tbody');

    loading.style.display = 'block';
    tbody.innerHTML = '';

    try {
      const data = await this.apiCall('/api/v1/admin/levels');

      data.levels.forEach(level => {
        const row = this.createLevelRow(level);
        tbody.appendChild(row);
      });

      this.initTableSortFilter('levels-table', 0);
    } catch (error) {
      console.error('Error loading levels:', error);
    } finally {
      loading.style.display = 'none';
    }
  }

  createLevelRow(level) {
    const row = document.createElement('tr');

    const superAdminBadge = level.isSuperAdmin
      ? '<span class="badge bg-danger">Sì</span>'
      : '<span class="badge bg-secondary">No</span>';

    const date = new Date(level.createdAt).toLocaleDateString('it-IT');

    row.innerHTML = `
            <td><strong>${level.livello}</strong></td>
            <td>${level.descrizione || '-'}</td>
            <td>${superAdminBadge}</td>
            <td><span class="badge bg-info">${level.userCount}</span></td>
            <td>${date}</td>
        `;

    return row;
  }

  createPagination(section, pagination) {
    const container = document.getElementById(`${section}-pagination`);
    if (!container || !pagination) return;

    const {page, pages, total} = pagination;

    if (pages <= 1) {
      container.innerHTML = '';
      return;
    }

    let html = '<ul class="pagination justify-content-center">';

    // Previous page
    if (page > 1) {
      html += `<li class="page-item"><a class="page-link" href="#" onclick="adminPanel.load${this.capitalize(section)}(${page - 1})">Precedente</a></li>`;
    }

    // Page numbers
    for (let i = Math.max(1, page - 2); i <= Math.min(pages, page + 2); i++) {
      const active = i === page ? 'active' : '';
      html += `<li class="page-item ${active}"><a class="page-link" href="#" onclick="adminPanel.load${this.capitalize(section)}(${i})">${i}</a></li>`;
    }

    // Next page
    if (page < pages) {
      html += `<li class="page-item"><a class="page-link" href="#" onclick="adminPanel.load${this.capitalize(section)}(${page + 1})">Successiva</a></li>`;
    }

    html += '</ul>';
    html += `<div class="text-center mt-2"><small class="text-muted">Totale: ${total} elementi</small></div>`;

    container.innerHTML = html;
  }

  capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  showToast(title, message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast align-items-center text-white bg-${type} border-0`;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    toast.setAttribute('aria-atomic', 'true');

    toast.innerHTML = `
            <div class="d-flex">
                <div class="toast-body">
                    <strong>${title}</strong><br>
                    ${message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
        `;

    document.getElementById('toast-container').appendChild(toast);

    const bsToast = new bootstrap.Toast(toast);
    bsToast.show();

    toast.addEventListener('hidden.bs.toast', () => {
      toast.remove();
    });
  }

  initTableSortFilter(tableId, excludeLastCols = 1) {
    const table = document.getElementById(tableId);
    if (!table) return;

    const thead = table.querySelector('thead');
    const headers = thead.querySelectorAll('tr:first-child th');
    const totalCols = headers.length;
    const sortableCols = totalCols - excludeLastCols;

    // Track sort state
    if (!this._tableSortState) this._tableSortState = {};
    this._tableSortState[tableId] = { col: null, asc: true };

    // Style headers as sortable
    headers.forEach((th, idx) => {
      if (idx < sortableCols) {
        th.style.cursor = 'pointer';
        th.style.userSelect = 'none';
        th.style.whiteSpace = 'nowrap';
        // Remove old sort indicator if present
        const oldIcon = th.querySelector('.sort-icon');
        if (oldIcon) oldIcon.remove();
        const icon = document.createElement('i');
        icon.className = 'bi bi-arrow-down-up ms-1 sort-icon text-muted';
        icon.style.fontSize = '0.75em';
        th.appendChild(icon);

        th.onclick = () => this._sortTable(tableId, idx, sortableCols);
      }
    });

    // Remove existing filter row if present
    const existingFilter = thead.querySelector('tr.filter-row');
    if (existingFilter) existingFilter.remove();

    // Add filter row
    const filterRow = document.createElement('tr');
    filterRow.className = 'filter-row';
    for (let i = 0; i < totalCols; i++) {
      const td = document.createElement('th');
      td.style.padding = '4px';
      if (i < sortableCols) {
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'form-control form-control-sm';
        input.placeholder = 'Filtra...';
        input.style.fontSize = '0.8em';
        input.dataset.colIndex = i;
        input.addEventListener('input', () => this._filterTable(tableId, sortableCols));
        td.appendChild(input);
      }
      filterRow.appendChild(td);
    }
    thead.appendChild(filterRow);
  }

  _sortTable(tableId, colIdx, sortableCols) {
    const table = document.getElementById(tableId);
    const tbody = table.querySelector('tbody');
    const state = this._tableSortState[tableId];

    // Toggle direction
    if (state.col === colIdx) {
      state.asc = !state.asc;
    } else {
      state.col = colIdx;
      state.asc = true;
    }

    // Update sort icons
    const headers = table.querySelectorAll('thead tr:first-child th');
    headers.forEach((th, idx) => {
      const icon = th.querySelector('.sort-icon');
      if (icon) {
        if (idx === colIdx) {
          icon.className = `bi ${state.asc ? 'bi-sort-down' : 'bi-sort-up'} ms-1 sort-icon text-primary`;
        } else {
          icon.className = 'bi bi-arrow-down-up ms-1 sort-icon text-muted';
        }
      }
    });

    const rows = Array.from(tbody.querySelectorAll('tr'));
    rows.sort((a, b) => {
      const aCell = a.cells[colIdx];
      const bCell = b.cells[colIdx];
      const aText = (aCell ? aCell.textContent : '').trim().toLowerCase();
      const bText = (bCell ? bCell.textContent : '').trim().toLowerCase();
      const aNum = parseFloat(aText);
      const bNum = parseFloat(bText);

      let cmp;
      if (!isNaN(aNum) && !isNaN(bNum)) {
        cmp = aNum - bNum;
      } else {
        cmp = aText.localeCompare(bText, 'it');
      }
      return state.asc ? cmp : -cmp;
    });

    rows.forEach(row => tbody.appendChild(row));
  }

  _filterTable(tableId, sortableCols) {
    const table = document.getElementById(tableId);
    const tbody = table.querySelector('tbody');
    const filterInputs = table.querySelectorAll('tr.filter-row input');
    const filters = [];
    filterInputs.forEach(input => {
      filters.push({
        col: parseInt(input.dataset.colIndex),
        value: input.value.toLowerCase().trim()
      });
    });

    const rows = tbody.querySelectorAll('tr');
    rows.forEach(row => {
      let visible = true;
      for (const f of filters) {
        if (f.value && row.cells[f.col]) {
          const cellText = row.cells[f.col].textContent.toLowerCase();
          if (!cellText.includes(f.value)) {
            visible = false;
            break;
          }
        }
      }
      row.style.display = visible ? '' : 'none';
    });
  }

  createModals() {
    // Create modal HTML and append to body
    const modalsHTML = `
            <!-- User Modal -->
            <div class="modal fade" id="userModal" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title" id="userModalTitle">Nuovo Utente</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <form id="userForm" autocomplete="off">
                                <input type="hidden" id="userId" name="id">
                                <div class="row">
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label for="username" class="form-label">Username *</label>
                                            <input type="text" class="form-control" id="username" name="username" required autocomplete="off">
                                        </div>
                                    </div>
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label for="mail" class="form-label">Email *</label>
                                            <input type="email" class="form-control" id="mail" name="mail" required>
                                        </div>
                                    </div>
                                </div>
                                <div class="row">
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label for="password" class="form-label">Password</label>
                                            <div class="input-group">
                                                <input type="password" class="form-control" id="password" name="password" autocomplete="new-password">
                                                <button class="btn btn-outline-secondary" type="button" id="togglePasswordBtn" title="Mostra/nascondi password">
                                                    <i class="bi bi-eye"></i>
                                                </button>
                                                <button class="btn btn-outline-primary" type="button" id="generatePasswordBtn" title="Genera password forte">
                                                    <i class="bi bi-key-fill"></i> Genera
                                                </button>
                                            </div>
                                            <div class="form-text">Lascia vuoto per non modificare</div>
                                        </div>
                                    </div>
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label for="domain" class="form-label">Dominio</label>
                                            <input type="text" class="form-control" id="domain" name="domain">
                                        </div>
                                    </div>
                                </div>
                                <div class="row">
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label for="ambito" class="form-label">Ambito *</label>
                                            <select class="form-select" id="ambito" name="ambito" required>
                                                <option value="">Seleziona ambito...</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label for="livello" class="form-label">Livello *</label>
                                            <select class="form-select" id="livello" name="livello" required>
                                                <option value="">Seleziona livello...</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                                <div class="mb-3">
                                    <label for="scopi" class="form-label">Scopi</label>
                                    <div id="scopi-checkboxes" class="border rounded p-3" style="max-height: 200px; overflow-y: auto;">
                                    </div>
                                </div>
                                <div class="row">
                                    <div class="col-md-4">
                                        <div class="form-check">
                                            <input class="form-check-input" type="checkbox" id="attivo" name="attivo" checked>
                                            <label class="form-check-label" for="attivo">Utente attivo</label>
                                        </div>
                                    </div>
                                    <div class="col-md-4">
                                        <div class="form-check">
                                            <input class="form-check-input" type="checkbox" id="allow_domain_login" name="allow_domain_login">
                                            <label class="form-check-label" for="allow_domain_login">Login con dominio</label>
                                        </div>
                                    </div>
                                    <div class="col-md-4">
                                        <div class="form-check">
                                            <input class="form-check-input" type="checkbox" id="otp_enabled" name="otp_enabled">
                                            <label class="form-check-label" for="otp_enabled">
                                                <i class="bi bi-shield-lock me-1"></i>OTP abilitato
                                            </label>
                                        </div>
                                    </div>
                                </div>
                                <div class="row mt-3" id="otp-settings" style="display: none;">
                                    <div class="col-12">
                                        <div class="alert alert-info">
                                            <i class="bi bi-info-circle me-2"></i>
                                            <strong>Autenticazione OTP:</strong> L'utente dovrà inserire un codice inviato via email ad ogni login
                                        </div>
                                    </div>
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label for="otp_type" class="form-label">Tipo OTP *</label>
                                            <select class="form-select" id="otp_type" name="otp_type">
                                                <option value="">Seleziona tipo...</option>
                                                <option value="mail">Email</option>
                                            </select>
                                            <div class="form-text">Seleziona come inviare il codice OTP</div>
                                        </div>
                                    </div>
                                </div>
                            </form>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Annulla</button>
                            <button type="button" class="btn btn-primary" onclick="adminPanel.saveUser()">Salva</button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Scope Modal -->
            <div class="modal fade" id="scopeModal" tabindex="-1">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title" id="scopeModalTitle">Nuovo Scopo</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <form id="scopeForm">
                                <input type="hidden" id="scopeId" name="id">
                                <div class="mb-3">
                                    <label for="scopo" class="form-label">Nome Scopo *</label>
                                    <input type="text" class="form-control" id="scopo" name="scopo" required>
                                </div>
                                <div class="form-check">
                                    <input class="form-check-input" type="checkbox" id="scopeAttivo" name="attivo" checked>
                                    <label class="form-check-label" for="scopeAttivo">Scopo attivo</label>
                                </div>
                            </form>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Annulla</button>
                            <button type="button" class="btn btn-primary" onclick="adminPanel.saveScope()">Salva</button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Domain Modal -->
            <div class="modal fade" id="domainModal" tabindex="-1">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title" id="domainModalTitle">Nuovo Ambito</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <form id="domainForm">
                                <input type="hidden" id="domainId" name="id">
                                <div class="mb-3">
                                    <label for="ambitoName" class="form-label">Nome Ambito *</label>
                                    <input type="text" class="form-control" id="ambitoName" name="ambito" required>
                                </div>
                                <div class="form-check">
                                    <input class="form-check-input" type="checkbox" id="is_dominio" name="is_dominio">
                                    <label class="form-check-label" for="is_dominio">È un dominio per login AD/LDAP</label>
                                </div>
                            </form>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Annulla</button>
                            <button type="button" class="btn btn-primary" onclick="adminPanel.saveDomain()">Salva</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

    document.body.insertAdjacentHTML('beforeend', modalsHTML);
  }

  async showCreateUserModal() {
    document.getElementById('userModalTitle').textContent = 'Nuovo Utente';
    document.getElementById('userForm').reset();
    document.getElementById('userId').value = '';

    await this.loadFormData();

    // Setup OTP toggle handler
    this.setupOtpToggle();
    // Setup password generation buttons
    this.setupPasswordButtons();

    const modal = new bootstrap.Modal(document.getElementById('userModal'));
    modal.show();
  }

  setupOtpToggle() {
    const otpCheckbox = document.getElementById('otp_enabled');
    const otpSettings = document.getElementById('otp-settings');
    const otpTypeSelect = document.getElementById('otp_type');

    // Remove any existing listeners
    const newOtpCheckbox = otpCheckbox.cloneNode(true);
    otpCheckbox.parentNode.replaceChild(newOtpCheckbox, otpCheckbox);

    newOtpCheckbox.addEventListener('change', function() {
      if (this.checked) {
        otpSettings.style.display = 'block';
        otpTypeSelect.setAttribute('required', 'required');
        // Default to 'mail' if not set
        if (!otpTypeSelect.value) {
          otpTypeSelect.value = 'mail';
        }
      } else {
        otpSettings.style.display = 'none';
        otpTypeSelect.removeAttribute('required');
        otpTypeSelect.value = '';
      }
    });

    // Trigger initial state
    if (newOtpCheckbox.checked) {
      otpSettings.style.display = 'block';
      otpTypeSelect.setAttribute('required', 'required');
    }
  }

  setupPasswordButtons() {
    const generateBtn = document.getElementById('generatePasswordBtn');
    const toggleBtn = document.getElementById('togglePasswordBtn');
    const passwordInput = document.getElementById('password');

    // Remove existing listeners via clone
    const newGenerateBtn = generateBtn.cloneNode(true);
    generateBtn.parentNode.replaceChild(newGenerateBtn, generateBtn);
    const newToggleBtn = toggleBtn.cloneNode(true);
    toggleBtn.parentNode.replaceChild(newToggleBtn, toggleBtn);

    newGenerateBtn.addEventListener('click', () => {
      const password = this.generateStrongPassword();
      passwordInput.value = password;
      passwordInput.type = 'text';
      newToggleBtn.innerHTML = '<i class="bi bi-eye-slash"></i>';
    });

    newToggleBtn.addEventListener('click', () => {
      if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        newToggleBtn.innerHTML = '<i class="bi bi-eye-slash"></i>';
      } else {
        passwordInput.type = 'password';
        newToggleBtn.innerHTML = '<i class="bi bi-eye"></i>';
      }
    });
  }

  generateStrongPassword(length = 16) {
    const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const lower = 'abcdefghjkmnpqrstuvwxyz';
    const digits = '23456789';
    const symbols = '!@#$%&*?+-';
    const all = upper + lower + digits + symbols;

    const crypto = window.crypto || window.msCrypto;
    const array = new Uint32Array(length);
    crypto.getRandomValues(array);

    // Ensure at least one of each type
    let password = '';
    password += upper[array[0] % upper.length];
    password += lower[array[1] % lower.length];
    password += digits[array[2] % digits.length];
    password += symbols[array[3] % symbols.length];

    for (let i = 4; i < length; i++) {
      password += all[array[i] % all.length];
    }

    // Shuffle the password
    const shuffleArray = new Uint32Array(password.length);
    crypto.getRandomValues(shuffleArray);
    const chars = password.split('');
    for (let i = chars.length - 1; i > 0; i--) {
      const j = shuffleArray[i] % (i + 1);
      var tmp = chars[i]; chars[i] = chars[j]; chars[j] = tmp;
    }
    return chars.join('');
  }

  showPasswordReport(username, password) {
    // Remove existing report modal if present
    const existing = document.getElementById('passwordReportModal');
    if (existing) existing.remove();

    const modalHTML = `
      <div class="modal fade" id="passwordReportModal" tabindex="-1" data-bs-backdrop="static" data-bs-keyboard="false">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content">
            <div class="modal-header bg-success text-white">
              <h5 class="modal-title">
                <i class="bi bi-check-circle-fill me-2"></i>Utente creato con successo
              </h5>
            </div>
            <div class="modal-body">
              <div class="alert alert-warning mb-3">
                <i class="bi bi-exclamation-triangle-fill me-2"></i>
                <strong>Attenzione:</strong> La password non potr&agrave; pi&ugrave; essere visualizzata dopo la chiusura di questa finestra.
                Copia il testo sottostante e conservalo in modo sicuro.
              </div>
              <div class="mb-3">
                <div class="input-group">
                  <textarea class="form-control font-monospace" id="reportSummary" rows="3" readonly>Username: ${username}\nPassword: ${password}</textarea>
                  <button class="btn btn-outline-primary" type="button" id="copyPasswordBtn" title="Copia negli appunti">
                    <i class="bi bi-clipboard"></i> Copia
                  </button>
                </div>
                <div id="copyFeedback" class="form-text text-success d-none">
                  <i class="bi bi-check2"></i> Copiato negli appunti!
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-primary" data-bs-dismiss="modal">
                <i class="bi bi-check-lg me-1"></i>Ho copiato la password, chiudi
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    const reportModal = new bootstrap.Modal(document.getElementById('passwordReportModal'));
    reportModal.show();

    // Copy button handler
    document.getElementById('copyPasswordBtn').addEventListener('click', () => {
      var summaryField = document.getElementById('reportSummary');
      navigator.clipboard.writeText(summaryField.value).then(() => {
        const feedback = document.getElementById('copyFeedback');
        feedback.classList.remove('d-none');
        document.getElementById('copyPasswordBtn').innerHTML = '<i class="bi bi-clipboard-check"></i> Copiato!';
        setTimeout(() => {
          feedback.classList.add('d-none');
          document.getElementById('copyPasswordBtn').innerHTML = '<i class="bi bi-clipboard"></i> Copia';
        }, 3000);
      });
    });

    // Cleanup on close
    document.getElementById('passwordReportModal').addEventListener('hidden.bs.modal', () => {
      document.getElementById('passwordReportModal').remove();
    });
  }

  async loadFormData() {
    try {
      const [domains, levels, scopes] = await Promise.all([
        this.apiCall('/api/v1/admin/domains'),
        this.apiCall('/api/v1/admin/levels'),
        this.apiCall('/api/v1/admin/scopes')
      ]);

      // Load domains
      const ambitoSelect = document.getElementById('ambito');
      ambitoSelect.innerHTML = '<option value="">Seleziona ambito...</option>';
      domains.domains.forEach(domain => {
        ambitoSelect.innerHTML += `<option value="${domain.id}">${domain.ambito}</option>`;
      });

      // Load levels
      const livelloSelect = document.getElementById('livello');
      livelloSelect.innerHTML = '<option value="">Seleziona livello...</option>';
      levels.levels.forEach(level => {
        livelloSelect.innerHTML += `<option value="${level.id}">${level.livello} - ${level.descrizione || ''}</option>`;
      });

      // Load scopes
      const scopiContainer = document.getElementById('scopi-checkboxes');
      scopiContainer.innerHTML = '';
      scopes.scopes.forEach(scope => {
        const checkbox = document.createElement('div');
        checkbox.className = 'form-check';
        checkbox.innerHTML = `
                    <input class="form-check-input" type="checkbox" value="${scope.id}" id="scope_${scope.id}" name="scopi">
                    <label class="form-check-label" for="scope_${scope.id}">
                        ${scope.scopo} ${scope.attivo ? '' : '<small class="text-muted">(disattivo)</small>'}
                    </label>
                `;
        scopiContainer.appendChild(checkbox);
      });

    } catch (error) {
      console.error('Error loading form data:', error);
    }
  }

  async saveUser() {
    const form = document.getElementById('userForm');
    const formData = new FormData(form);
    const userId = formData.get('id');

    const data = {
      username: formData.get('username'),
      mail: formData.get('mail'),
      ambito: parseInt(formData.get('ambito')),
      livello: parseInt(formData.get('livello')),
      attivo: formData.get('attivo') === 'on',
      allow_domain_login: formData.get('allow_domain_login') === 'on',
      domain: formData.get('domain') || null,
      otp_enabled: formData.get('otp_enabled') === 'on',
      otp_type: formData.get('otp_type') || null
    };

    if (formData.get('password')) {
      data.password = formData.get('password');
    }

    // Get selected scopes
    const scopeCheckboxes = document.querySelectorAll('input[name="scopi"]:checked');
    data.scopi = Array.from(scopeCheckboxes).map(cb => parseInt(cb.value));

    try {
      let result;
      const generatedPassword = data.password || null;
      if (userId) {
        data.id = parseInt(userId);
        result = await this.apiCall(`/api/v1/admin/users/${userId}`, 'PUT', data);
        this.showToast('Successo', 'Utente aggiornato con successo', 'success');
      } else {
        result = await this.apiCall('/api/v1/admin/users', 'POST', data);
        this.showToast('Successo', 'Utente creato con successo', 'success');
      }

      bootstrap.Modal.getInstance(document.getElementById('userModal')).hide();
      this.loadUsers();
      this.loadDashboardStats();

      // Show password report whenever a password was set
      if (generatedPassword) {
        this.showPasswordReport(data.username, generatedPassword);
      }
    } catch (error) {
      console.error('Error saving user:', error);
    }
  }

  async editUser(id) {
    try {
      const users = await this.apiCall(`/api/v1/admin/users?limit=1000`);
      const user = users.users.find(u => u.id === id);

      if (!user) {
        this.showToast('Errore', 'Utente non trovato', 'danger');
        return;
      }

      document.getElementById('userModalTitle').textContent = 'Modifica Utente';
      await this.loadFormData();

      // Fill form with user data
      document.getElementById('userId').value = user.id;
      document.getElementById('username').value = user.username;
      document.getElementById('mail').value = user.mail;
      document.getElementById('domain').value = user.domain || '';
      document.getElementById('ambito').value = user.ambito.id || '';
      document.getElementById('livello').value = user.livello.id || '';
      document.getElementById('attivo').checked = user.attivo;
      document.getElementById('allow_domain_login').checked = user.allow_domain_login;
      document.getElementById('otp_enabled').checked = user.otp_enabled || false;
      document.getElementById('otp_type').value = user.otp_type || '';

      // Check user scopes
      user.scopi.forEach(scope => {
        const checkbox = document.getElementById(`scope_${scope.id}`);
        if (checkbox) checkbox.checked = true;
      });

      // Setup OTP toggle handler and trigger display
      this.setupOtpToggle();
      this.setupPasswordButtons();
      if (user.otp_enabled) {
        document.getElementById('otp-settings').style.display = 'block';
      }

      const modal = new bootstrap.Modal(document.getElementById('userModal'));
      modal.show();
    } catch (error) {
      console.error('Error editing user:', error);
    }
  }

  async deleteUser(id, username) {
    if (!confirm(`Sei sicuro di voler eliminare l'utente "${username}"?`)) {
      return;
    }

    try {
      await this.apiCall(`/api/v1/admin/users/${id}`, 'DELETE');
      this.showToast('Successo', 'Utente eliminato con successo', 'success');
      this.loadUsers();
      this.loadDashboardStats();
    } catch (error) {
      console.error('Error deleting user:', error);
    }
  }

  async saveScope() {
    const form = document.getElementById('scopeForm');
    const formData = new FormData(form);
    const scopeId = formData.get('id');

    const data = {
      scopo: formData.get('scopo'),
      attivo: formData.get('attivo') === 'on'
    };

    try {
      if (scopeId) {
        data.id = parseInt(scopeId);
        await this.apiCall(`/api/v1/admin/scopes/${scopeId}`, 'PUT', data);
        this.showToast('Successo', 'Scopo aggiornato con successo', 'success');
      } else {
        await this.apiCall('/api/v1/admin/scopes', 'POST', data);
        this.showToast('Successo', 'Scopo creato con successo', 'success');
      }

      bootstrap.Modal.getInstance(document.getElementById('scopeModal')).hide();
      this.loadScopes();
      this.loadDashboardStats();
    } catch (error) {
      console.error('Error saving scope:', error);
    }
  }

  async editScope(id) {
    try {
      const scopes = await this.apiCall('/api/v1/admin/scopes');
      const scope = scopes.scopes.find(s => s.id === id);

      if (!scope) {
        this.showToast('Errore', 'Scopo non trovato', 'danger');
        return;
      }

      document.getElementById('scopeModalTitle').textContent = 'Modifica Scopo';
      document.getElementById('scopeId').value = scope.id;
      document.getElementById('scopo').value = scope.scopo;
      document.getElementById('scopeAttivo').checked = scope.attivo;

      const modal = new bootstrap.Modal(document.getElementById('scopeModal'));
      modal.show();
    } catch (error) {
      console.error('Error editing scope:', error);
    }
  }

  async deleteScope(id, scopo) {
    if (!confirm(`Sei sicuro di voler eliminare lo scopo "${scopo}"?`)) {
      return;
    }

    try {
      await this.apiCall(`/api/v1/admin/scopes/${id}`, 'DELETE');
      this.showToast('Successo', 'Scopo eliminato con successo', 'success');
      this.loadScopes();
      this.loadDashboardStats();
    } catch (error) {
      console.error('Error deleting scope:', error);
    }
  }

  async saveDomain() {
    const form = document.getElementById('domainForm');
    const formData = new FormData(form);
    const domainId = formData.get('id');

    const data = {
      ambito: formData.get('ambito'),
      is_dominio: formData.get('is_dominio') === 'on'
    };

    try {
      if (domainId) {
        data.id = parseInt(domainId);
        await this.apiCall(`/api/v1/admin/domains/${domainId}`, 'PUT', data);
        this.showToast('Successo', 'Ambito aggiornato con successo', 'success');
      } else {
        await this.apiCall('/api/v1/admin/domains', 'POST', data);
        this.showToast('Successo', 'Ambito creato con successo', 'success');
      }

      bootstrap.Modal.getInstance(document.getElementById('domainModal')).hide();
      this.loadDomains();
      this.loadDashboardStats();
    } catch (error) {
      console.error('Error saving domain:', error);
    }
  }

  async editDomain(id) {
    try {
      const domains = await this.apiCall('/api/v1/admin/domains');
      const domain = domains.domains.find(d => d.id === id);

      if (!domain) {
        this.showToast('Errore', 'Ambito non trovato', 'danger');
        return;
      }

      document.getElementById('domainModalTitle').textContent = 'Modifica Ambito';
      document.getElementById('domainId').value = domain.id;
      document.getElementById('ambitoName').value = domain.ambito;
      document.getElementById('is_dominio').checked = domain.is_dominio;

      const modal = new bootstrap.Modal(document.getElementById('domainModal'));
      modal.show();
    } catch (error) {
      console.error('Error editing domain:', error);
    }
  }

  async deleteDomain(id, ambito) {
    if (!confirm(`Sei sicuro di voler eliminare l'ambito "${ambito}"?`)) {
      return;
    }

    try {
      await this.apiCall(`/api/v1/admin/domains/${id}`, 'DELETE');
      this.showToast('Successo', 'Ambito eliminato con successo', 'success');
      this.loadDomains();
      this.loadDashboardStats();
    } catch (error) {
      console.error('Error deleting domain:', error);
    }
  }
}

// Initialize admin panel when DOM is loaded
let adminPanel;
document.addEventListener('DOMContentLoaded', function () {
  adminPanel = new AdminPanel();
});

// Global functions for modal actions
function showCreateUserModal() {
  adminPanel.showCreateUserModal();
}

function showCreateScopeModal() {
  document.getElementById('scopeModalTitle').textContent = 'Nuovo Scopo';
  document.getElementById('scopeForm').reset();
  document.getElementById('scopeId').value = '';

  const modal = new bootstrap.Modal(document.getElementById('scopeModal'));
  modal.show();
}

function showCreateDomainModal() {
  document.getElementById('domainModalTitle').textContent = 'Nuovo Ambito';
  document.getElementById('domainForm').reset();
  document.getElementById('domainId').value = '';

  const modal = new bootstrap.Modal(document.getElementById('domainModal'));
  modal.show();
}

// ===== MPI APPLICAZIONI =====

async function loadMpiApps() {
  const loading = document.getElementById('mpi-apps-loading');
  const tbody = document.getElementById('mpi-apps-tbody');
  loading.style.display = 'block';
  tbody.innerHTML = '';
  try {
    const data = await adminPanel.apiCall('/api/v1/admin/mpi/applicazioni');
    (data || []).forEach(app => {
      const row = document.createElement('tr');
      const badge = app.attivo
        ? '<span class="badge bg-success">Attiva</span>'
        : '<span class="badge bg-danger">Disattiva</span>';
      row.innerHTML = `
        <td>${app.id}</td>
        <td><strong>${app.codice}</strong></td>
        <td>${app.nome}</td>
        <td>${app.versione || '-'}</td>
        <td>${app.contatto || '-'}</td>
        <td>${badge}</td>
        <td>
          <div class="btn-group btn-group-sm">
            <button class="btn btn-outline-primary" onclick="editMpiApp(${app.id})" title="Modifica"><i class="bi bi-pencil"></i></button>
            <button class="btn btn-outline-danger" onclick="deleteMpiApp(${app.id}, '${app.codice}')" title="Disattiva"><i class="bi bi-trash"></i></button>
          </div>
        </td>`;
      tbody.appendChild(row);
    });
  } catch (e) {
    console.error('Error loading MPI apps:', e);
  } finally {
    loading.style.display = 'none';
  }
}

function showCreateMpiAppModal() {
  document.getElementById('mpiAppModalTitle').textContent = 'Nuova Applicazione MPI';
  document.getElementById('mpiAppForm').reset();
  document.getElementById('mpiAppId').value = '';
  document.getElementById('mpiAppCodice').removeAttribute('disabled');
  const modal = new bootstrap.Modal(document.getElementById('mpiAppModal'));
  modal.show();
}

let _mpiAppsCache = [];

async function editMpiApp(id) {
  if (_mpiAppsCache.length === 0) {
    _mpiAppsCache = await adminPanel.apiCall('/api/v1/admin/mpi/applicazioni');
  }
  const app = (_mpiAppsCache || []).find(a => a.id === id);
  if (!app) { adminPanel.showToast('Errore', 'App non trovata', 'danger'); return; }

  document.getElementById('mpiAppModalTitle').textContent = 'Modifica Applicazione MPI';
  document.getElementById('mpiAppId').value = app.id;
  document.getElementById('mpiAppCodice').value = app.codice;
  document.getElementById('mpiAppCodice').setAttribute('disabled', 'disabled');
  document.getElementById('mpiAppNome').value = app.nome;
  document.getElementById('mpiAppDescrizione').value = app.descrizione || '';
  document.getElementById('mpiAppVersione').value = app.versione || '';
  document.getElementById('mpiAppContatto').value = app.contatto || '';

  const modal = new bootstrap.Modal(document.getElementById('mpiAppModal'));
  modal.show();
}

async function saveMpiApp() {
  const id = document.getElementById('mpiAppId').value;
  const data = {
    codice: document.getElementById('mpiAppCodice').value.toUpperCase(),
    nome: document.getElementById('mpiAppNome').value,
    descrizione: document.getElementById('mpiAppDescrizione').value || null,
    versione: document.getElementById('mpiAppVersione').value || null,
    contatto: document.getElementById('mpiAppContatto').value || null,
  };

  try {
    if (id) {
      data.id = parseInt(id);
      await adminPanel.apiCall(`/api/v1/admin/mpi/applicazioni/${id}`, 'PUT', data);
      adminPanel.showToast('Successo', 'Applicazione aggiornata', 'success');
    } else {
      await adminPanel.apiCall('/api/v1/admin/mpi/applicazioni', 'POST', data);
      adminPanel.showToast('Successo', 'Applicazione creata. Scopi auto-generati.', 'success');
    }
    bootstrap.Modal.getInstance(document.getElementById('mpiAppModal')).hide();
    _mpiAppsCache = [];
    loadMpiApps();
  } catch (e) {
    console.error('Error saving MPI app:', e);
  }
}

async function deleteMpiApp(id, codice) {
  if (!confirm(`Disattivare l'applicazione "${codice}"?`)) return;
  try {
    await adminPanel.apiCall(`/api/v1/admin/mpi/applicazioni/${id}`, 'DELETE');
    adminPanel.showToast('Successo', 'Applicazione disattivata', 'success');
    _mpiAppsCache = [];
    loadMpiApps();
  } catch (e) {
    console.error('Error deleting MPI app:', e);
  }
}

// ===== MPI RECORDS =====

async function loadMpiAppSelect() {
  const select = document.getElementById('mpiSearchApp');
  if (select.options.length > 1) return;
  try {
    const data = await adminPanel.apiCall('/api/v1/admin/mpi/applicazioni');
    (data || []).forEach(app => {
      if (app.attivo) {
        const opt = document.createElement('option');
        opt.value = app.codice;
        opt.textContent = `${app.codice} - ${app.nome}`;
        select.appendChild(opt);
      }
    });
  } catch (e) {
    console.error('Error loading MPI app select:', e);
  }
}

async function searchMpiRecords() {
  const loading = document.getElementById('mpi-records-loading');
  const tbody = document.getElementById('mpi-records-tbody');
  const countEl = document.getElementById('mpiRecordsCount');
  loading.style.display = 'inline-block';
  tbody.innerHTML = '';

  var body = {};
  var searchId = document.getElementById('mpiSearchId').value.trim();
  var codice = document.getElementById('mpiSearchCodice').value.trim();
  var cf = document.getElementById('mpiSearchCf').value.trim();
  var cognome = document.getElementById('mpiSearchCognome').value.trim();
  var nome = document.getElementById('mpiSearchNome').value.trim();
  var stato = document.getElementById('mpiSearchStato').value;
  var app = document.getElementById('mpiSearchApp').value;
  var mpiId = document.getElementById('mpiSearchMpiId').value.trim();
  var idEsterno = document.getElementById('mpiSearchIdEsterno').value.trim();

  if (searchId) body.id = parseInt(searchId);
  if (codice) body.codice = codice;
  if (cf) body.cf = cf;
  if (cognome) body.cognome = cognome;
  if (nome) body.nome = nome;
  if (stato) body.stato = stato;
  if (app) body.applicazione = app;
  if (mpiId) body.mpiId = mpiId;
  if (idEsterno) body.idEsterno = idEsterno;

  // Se nessun criterio, cerca tutti i record aperti
  if (Object.keys(body).length === 0) {
    body.stato = 'aperto';
  }

  try {
    const data = await adminPanel.apiCall('/api/v1/admin/mpi/records/search', 'POST', body);
    const records = data || [];
    countEl.textContent = `${records.length} risultati`;

    records.forEach(r => {
      const row = document.createElement('tr');
      const statoBadge = {
        'aperto': '<span class="badge bg-warning text-dark">Aperto</span>',
        'identificato': '<span class="badge bg-success">Identificato</span>',
        'annullato': '<span class="badge bg-secondary">Annullato</span>'
      }[r.stato] || r.stato;

      var editBtn = r.stato !== 'annullato' ? '<button class="btn btn-outline-warning" onclick="editMpiRecord(\'' + r.mpiId + '\')" title="Modifica"><i class="bi bi-pencil"></i></button>' : '';
      var linkBtn = r.stato === 'aperto' ? '<button class="btn btn-outline-success" onclick="showMpiLinkModal(\'' + r.mpiId + '\')" title="Collega"><i class="bi bi-link-45deg"></i></button>' : '';
      var annullaBtn = r.stato !== 'annullato' ? '<button class="btn btn-outline-danger" onclick="annullaMpiRecord(\'' + r.mpiId + '\')" title="Annulla"><i class="bi bi-x-circle"></i></button>' : '';

      row.innerHTML =
        '<td>' + r.id + '</td>' +
        '<td><code>' + (r.codice || r.mpiId.substring(0, 8)) + '</code></td>' +
        '<td><span class="badge bg-info">' + r.applicazione + '</span></td>' +
        '<td>' + (r.idEsterno || '-') + '</td>' +
        '<td>' + statoBadge + '</td>' +
        '<td>' + (r.cf || '-') + '</td>' +
        '<td>' + (r.cognome || '-') + '</td>' +
        '<td>' + (r.nome || '-') + '</td>' +
        '<td class="small">' + (r.createdAt || '-') + '</td>' +
        '<td>' +
          '<div class="btn-group btn-group-sm">' +
            '<button class="btn btn-outline-primary" onclick="viewMpiRecord(\'' + r.mpiId + '\')" title="Dettaglio"><i class="bi bi-eye"></i></button>' +
            editBtn + linkBtn + annullaBtn +
          '</div>' +
        '</td>';
      tbody.appendChild(row);
    });

    // Evidenzia potenziali collisioni (stesso cognome+nome in app diverse)
    highlightCollisions(records);
  } catch (e) {
    console.error('Error searching MPI records:', e);
  } finally {
    loading.style.display = 'none';
  }
}

function highlightCollisions(records) {
  const groups = {};
  records.forEach(r => {
    if (r.cognome && r.nome) {
      const key = `${r.cognome.toLowerCase()}_${r.nome.toLowerCase()}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(r);
    }
  });

  const tbody = document.getElementById('mpi-records-tbody');
  const rows = tbody.querySelectorAll('tr');
  let collisionCount = 0;

  records.forEach((r, i) => {
    if (r.cognome && r.nome) {
      const key = `${r.cognome.toLowerCase()}_${r.nome.toLowerCase()}`;
      if (groups[key].length > 1) {
        rows[i].classList.add('table-warning');
        rows[i].title = `Possibile collisione: ${groups[key].length} record con stesso nome`;
        collisionCount++;
      }
    }
  });

  if (collisionCount > 0) {
    adminPanel.showToast('Attenzione', `${collisionCount} record con possibili collisioni (stesso nome/cognome)`, 'warning');
  }
}

async function viewMpiRecord(mpiId) {
  const detailCard = document.getElementById('mpi-record-detail');
  const body = document.getElementById('mpi-record-detail-body');
  detailCard.style.display = 'block';
  body.innerHTML = '<div class="spinner-border spinner-border-sm"></div> Caricamento...';

  try {
    const data = await adminPanel.apiCall('/api/v1/admin/mpi/records/' + mpiId);
    const r = data;

    let html = `
      <div class="row">
        <div class="col-md-6">
          <h6 class="text-primary">Informazioni Record</h6>
          <table class="table table-sm">
            <tr><td class="text-muted" style="width:40%">Codice</td><td><code class="fs-5">${r.codice || '-'}</code></td></tr>
            <tr><td class="text-muted" style="width:40%">MPI ID</td><td><code class="small text-muted">${r.mpiId}</code></td></tr>
            <tr><td class="text-muted">Applicazione</td><td><span class="badge bg-info">${r.applicazione}</span></td></tr>
            <tr><td class="text-muted">ID Esterno</td><td>${r.idEsterno || '-'}</td></tr>
            <tr><td class="text-muted">Stato</td><td>${r.stato}</td></tr>
            <tr><td class="text-muted">Creato</td><td>${r.createdAt}</td></tr>
            <tr><td class="text-muted">Aggiornato</td><td>${r.updatedAt}</td></tr>
          </table>
        </div>
        <div class="col-md-6">
          <h6 class="text-primary">Dati Demografici ${r.assistito ? '(da Anagrafica Reale)' : '(da MPI)'}</h6>
          <table class="table table-sm">`;

    const campi = ['cf', 'cognome', 'nome', 'sesso', 'dataNascita', 'comuneNascita', 'comuneResidenza', 'indirizzoResidenza', 'capResidenza'];
    const labels = {'cf':'CF', 'cognome':'Cognome', 'nome':'Nome', 'sesso':'Sesso', 'dataNascita':'Data Nascita', 'comuneNascita':'Comune Nascita', 'comuneResidenza':'Comune Residenza', 'indirizzoResidenza':'Indirizzo', 'capResidenza':'CAP'};

    for (const c of campi) {
      const val = r.demografici[c] || '-';
      const mpiVal = r.demograficiMpi[c];
      const highlight = r.assistito && mpiVal && val !== mpiVal ? ` <small class="text-muted" title="Valore MPI originale">(MPI: ${mpiVal})</small>` : '';
      html += `<tr><td class="text-muted" style="width:40%">${labels[c] || c}</td><td>${val}${highlight}</td></tr>`;
    }

    html += '</table></div></div>';

    if (r.assistito) {
      html += `<div class="alert alert-success mt-2"><i class="bi bi-check-circle me-2"></i><strong>Identificato:</strong> collegato a CF <code>${r.assistito.cf}</code> il ${r.assistito.dataIdentificazione || '?'} da ${r.assistito.utenteIdentificazione || '?'}</div>`;
    }

    // Pulsanti azione
    html += '<div class="mt-3">';
    html += '<button class="btn btn-sm btn-outline-secondary me-2" onclick="viewMpiStorico(\'' + mpiId + '\')"><i class="bi bi-clock-history me-1"></i>Storico</button>';
    if (r.stato !== 'annullato') {
      html += '<button class="btn btn-sm btn-outline-warning me-2" onclick="editMpiRecord(\'' + mpiId + '\')"><i class="bi bi-pencil me-1"></i>Modifica</button>';
    }
    if (r.stato === 'aperto') {
      html += '<button class="btn btn-sm btn-outline-success me-2" onclick="showMpiLinkModal(\'' + mpiId + '\')"><i class="bi bi-link-45deg me-1"></i>Collega</button>';
    }
    html += '</div>';

    // Container storico
    html += '<div id="mpi-storico-container" class="mt-3" style="display:none;"></div>';

    body.innerHTML = html;
    detailCard.scrollIntoView({behavior: 'smooth'});
  } catch (e) {
    body.innerHTML = '<div class="alert alert-danger">Errore nel caricamento</div>';
    console.error('Error viewing MPI record:', e);
  }
}

function closeMpiRecordDetail() {
  document.getElementById('mpi-record-detail').style.display = 'none';
}

async function viewMpiStorico(mpiId) {
  const container = document.getElementById('mpi-storico-container');
  container.style.display = 'block';
  container.innerHTML = '<div class="spinner-border spinner-border-sm"></div> Caricamento storico...';

  try {
    const data = await adminPanel.apiCall('/api/v1/admin/mpi/records/' + mpiId + '/storico');
    const storico = data.storico || [];

    if (storico.length === 0) {
      container.innerHTML = '<p class="text-muted">Nessuna operazione nello storico</p>';
      return;
    }

    let html = '<h6 class="text-primary mt-2"><i class="bi bi-clock-history me-2"></i>Storico Operazioni</h6>';
    html += '<div class="table-responsive"><table class="table table-sm table-striped"><thead><tr><th>Data</th><th>Operazione</th><th>Utente</th><th>Dettaglio</th></tr></thead><tbody>';

    storico.forEach(s => {
      const opBadge = {
        'CREATE': 'bg-success', 'UPDATE': 'bg-primary', 'LINK': 'bg-info',
        'UNLINK': 'bg-warning', 'ANNULLA': 'bg-danger'
      }[s.operazione] || 'bg-secondary';

      const dettaglio = s.dettaglio ? `<code class="small">${JSON.stringify(s.dettaglio).substring(0, 100)}...</code>` : '-';
      html += `<tr><td class="small">${s.createdAt}</td><td><span class="badge ${opBadge}">${s.operazione}</span></td><td>${s.utente}</td><td>${dettaglio}</td></tr>`;
    });

    html += '</tbody></table></div>';
    container.innerHTML = html;
  } catch (e) {
    container.innerHTML = '<div class="alert alert-danger">Errore nel caricamento storico</div>';
    console.error('Error loading MPI storico:', e);
  }
}

function showMpiLinkModal(mpiId) {
  document.getElementById('mpiLinkMpiId').value = mpiId;
  document.getElementById('mpiLinkCf').value = '';
  document.getElementById('mpiLinkResult').style.display = 'none';
  const modal = new bootstrap.Modal(document.getElementById('mpiLinkModal'));
  modal.show();
}

async function confirmMpiLink() {
  const mpiId = document.getElementById('mpiLinkMpiId').value;
  const cf = document.getElementById('mpiLinkCf').value.trim().toUpperCase();
  const resultDiv = document.getElementById('mpiLinkResult');

  if (!cf) { adminPanel.showToast('Attenzione', 'Inserire il codice fiscale', 'warning'); return; }

  try {
    const data = await adminPanel.apiCall('/api/v1/admin/mpi/records/' + mpiId + '/link', 'POST', {cf: cf});
    resultDiv.style.display = 'block';
    resultDiv.innerHTML = `<div class="alert alert-success"><i class="bi bi-check-circle me-2"></i>Collegato a <strong>${data.assistito.cognome} ${data.assistito.nome}</strong> (${data.assistito.cf})</div>`;
    adminPanel.showToast('Successo', 'Record MPI collegato all\'assistito', 'success');

    setTimeout(() => {
      bootstrap.Modal.getInstance(document.getElementById('mpiLinkModal')).hide();
      searchMpiRecords();
      closeMpiRecordDetail();
    }, 1500);
  } catch (e) {
    resultDiv.style.display = 'block';
    resultDiv.innerHTML = `<div class="alert alert-danger">${e.message}</div>`;
  }
}

async function annullaMpiRecord(mpiId) {
  var motivo = prompt('Motivo dell\'annullamento (opzionale):');
  if (motivo === null) return;

  try {
    await adminPanel.apiCall('/api/v1/admin/mpi/records/' + mpiId + '/annulla', 'POST', {motivo: motivo || null});
    adminPanel.showToast('Successo', 'Record annullato', 'success');
    searchMpiRecords();
    closeMpiRecordDetail();
  } catch (e) {
    console.error('Error annulling MPI record:', e);
  }
}

// ===== MPI RECORD CREATE/EDIT =====

function _ensureMpiRecordModal() {
  if (document.getElementById('mpiRecordModal')) return;

  var modalHTML = '<div class="modal fade" id="mpiRecordModal" tabindex="-1">' +
    '<div class="modal-dialog modal-xl">' +
      '<div class="modal-content">' +
        '<div class="modal-header">' +
          '<h5 class="modal-title" id="mpiRecordModalTitle">Nuovo Record MPI</h5>' +
          '<button type="button" class="btn-close" data-bs-dismiss="modal"></button>' +
        '</div>' +
        '<div class="modal-body">' +
          '<form id="mpiRecordForm" autocomplete="off">' +
            '<input type="hidden" id="mpiRecordId">' +
            '<input type="hidden" id="mpiRecordMpiId">' +

            '<ul class="nav nav-tabs mb-3" role="tablist">' +
              '<li class="nav-item"><a class="nav-link active" data-bs-toggle="tab" href="#mpiTabBase">Base</a></li>' +
              '<li class="nav-item"><a class="nav-link" data-bs-toggle="tab" href="#mpiTabNascita">Nascita</a></li>' +
              '<li class="nav-item"><a class="nav-link" data-bs-toggle="tab" href="#mpiTabResidenza">Residenza</a></li>' +
              '<li class="nav-item"><a class="nav-link" data-bs-toggle="tab" href="#mpiTabSsn">SSN</a></li>' +
              '<li class="nav-item"><a class="nav-link" data-bs-toggle="tab" href="#mpiTabAltro">Altro</a></li>' +
            '</ul>' +

            '<div class="tab-content">' +
              // Tab Base
              '<div class="tab-pane fade show active" id="mpiTabBase">' +
                '<div class="row">' +
                  '<div class="col-md-4"><div class="mb-3">' +
                    '<label class="form-label">Applicazione *</label>' +
                    '<select class="form-select" id="mpiRecordApp" required></select>' +
                  '</div></div>' +
                  '<div class="col-md-4"><div class="mb-3">' +
                    '<label class="form-label">ID Esterno</label>' +
                    '<input type="text" class="form-control" id="mpiRecordIdEsterno">' +
                  '</div></div>' +
                  '<div class="col-md-4"><div class="mb-3">' +
                    '<label class="form-label">Codice Fiscale</label>' +
                    '<input type="text" class="form-control" id="mpiRecordCf" maxlength="16" style="text-transform:uppercase">' +
                    '<div class="form-text">Se corrisponde a un assistito, verr&agrave; collegato automaticamente</div>' +
                  '</div></div>' +
                '</div>' +
                '<div class="row">' +
                  '<div class="col-md-4"><div class="mb-3">' +
                    '<label class="form-label">Cognome</label>' +
                    '<input type="text" class="form-control" id="mpiRecordCognome">' +
                  '</div></div>' +
                  '<div class="col-md-4"><div class="mb-3">' +
                    '<label class="form-label">Nome</label>' +
                    '<input type="text" class="form-control" id="mpiRecordNome">' +
                  '</div></div>' +
                  '<div class="col-md-4"><div class="mb-3">' +
                    '<label class="form-label">Sesso</label>' +
                    '<select class="form-select" id="mpiRecordSesso">' +
                      '<option value="">-</option><option value="M">M</option><option value="F">F</option>' +
                    '</select>' +
                  '</div></div>' +
                '</div>' +
              '</div>' +

              // Tab Nascita
              '<div class="tab-pane fade" id="mpiTabNascita">' +
                '<div class="row">' +
                  '<div class="col-md-4"><div class="mb-3">' +
                    '<label class="form-label">Data di Nascita</label>' +
                    '<input type="date" class="form-control" id="mpiRecordDataNascita">' +
                  '</div></div>' +
                  '<div class="col-md-4"><div class="mb-3">' +
                    '<label class="form-label">Comune di Nascita</label>' +
                    '<input type="text" class="form-control" id="mpiRecordComuneNascita">' +
                  '</div></div>' +
                  '<div class="col-md-4"><div class="mb-3">' +
                    '<label class="form-label">Provincia Nascita</label>' +
                    '<input type="text" class="form-control" id="mpiRecordProvinciaNascita" maxlength="2">' +
                  '</div></div>' +
                '</div>' +
                '<div class="row">' +
                  '<div class="col-md-4"><div class="mb-3">' +
                    '<label class="form-label">Cod. Comune Nascita</label>' +
                    '<input type="text" class="form-control" id="mpiRecordCodComuneNascita">' +
                  '</div></div>' +
                  '<div class="col-md-4"><div class="mb-3">' +
                    '<label class="form-label">Cod. ISTAT Comune Nascita</label>' +
                    '<input type="text" class="form-control" id="mpiRecordCodIstatComuneNascita">' +
                  '</div></div>' +
                '</div>' +
              '</div>' +

              // Tab Residenza
              '<div class="tab-pane fade" id="mpiTabResidenza">' +
                '<div class="row">' +
                  '<div class="col-md-6"><div class="mb-3">' +
                    '<label class="form-label">Indirizzo Residenza</label>' +
                    '<input type="text" class="form-control" id="mpiRecordIndirizzoResidenza">' +
                  '</div></div>' +
                  '<div class="col-md-3"><div class="mb-3">' +
                    '<label class="form-label">CAP</label>' +
                    '<input type="text" class="form-control" id="mpiRecordCapResidenza" maxlength="5">' +
                  '</div></div>' +
                  '<div class="col-md-3"><div class="mb-3">' +
                    '<label class="form-label">Comune Residenza</label>' +
                    '<input type="text" class="form-control" id="mpiRecordComuneResidenza">' +
                  '</div></div>' +
                '</div>' +
                '<div class="row">' +
                  '<div class="col-md-4"><div class="mb-3">' +
                    '<label class="form-label">Cod. Comune Residenza</label>' +
                    '<input type="text" class="form-control" id="mpiRecordCodComuneResidenza">' +
                  '</div></div>' +
                  '<div class="col-md-4"><div class="mb-3">' +
                    '<label class="form-label">Cod. ISTAT Comune Residenza</label>' +
                    '<input type="text" class="form-control" id="mpiRecordCodIstatComuneResidenza">' +
                  '</div></div>' +
                '</div>' +
              '</div>' +

              // Tab SSN
              '<div class="tab-pane fade" id="mpiTabSsn">' +
                '<div class="row">' +
                  '<div class="col-md-3"><div class="mb-3">' +
                    '<label class="form-label">ASP</label>' +
                    '<input type="text" class="form-control" id="mpiRecordAsp">' +
                  '</div></div>' +
                  '<div class="col-md-3"><div class="mb-3">' +
                    '<label class="form-label">Tipo Assistito</label>' +
                    '<input type="text" class="form-control" id="mpiRecordSsnTipoAssistito">' +
                  '</div></div>' +
                  '<div class="col-md-3"><div class="mb-3">' +
                    '<label class="form-label">Numero Tessera</label>' +
                    '<input type="text" class="form-control" id="mpiRecordSsnNumeroTessera">' +
                  '</div></div>' +
                  '<div class="col-md-3"><div class="mb-3">' +
                    '<label class="form-label">Motiv. Fine Assistenza</label>' +
                    '<input type="text" class="form-control" id="mpiRecordSsnMotivazione">' +
                  '</div></div>' +
                '</div>' +
                '<div class="row">' +
                  '<div class="col-md-4"><div class="mb-3">' +
                    '<label class="form-label">Inizio Assistenza</label>' +
                    '<input type="date" class="form-control" id="mpiRecordSsnInizio">' +
                  '</div></div>' +
                  '<div class="col-md-4"><div class="mb-3">' +
                    '<label class="form-label">Fine Assistenza</label>' +
                    '<input type="date" class="form-control" id="mpiRecordSsnFine">' +
                  '</div></div>' +
                '</div>' +
              '</div>' +

              // Tab Altro
              '<div class="tab-pane fade" id="mpiTabAltro">' +
                '<div class="row">' +
                  '<div class="col-md-4"><div class="mb-3">' +
                    '<label class="form-label">Data Decesso</label>' +
                    '<input type="date" class="form-control" id="mpiRecordDataDecesso">' +
                  '</div></div>' +
                '</div>' +
                '<div class="row">' +
                  '<div class="col-12"><div class="mb-3">' +
                    '<label class="form-label">Note</label>' +
                    '<textarea class="form-control" id="mpiRecordNote" rows="3"></textarea>' +
                  '</div></div>' +
                '</div>' +
              '</div>' +

            '</div>' +
          '</form>' +
        '</div>' +
        '<div class="modal-footer">' +
          '<button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Annulla</button>' +
          '<button type="button" class="btn btn-primary" onclick="saveMpiRecord()">Salva</button>' +
        '</div>' +
      '</div>' +
    '</div>' +
  '</div>';

  document.body.insertAdjacentHTML('beforeend', modalHTML);
}

async function showCreateMpiRecordModal() {
  _ensureMpiRecordModal();
  document.getElementById('mpiRecordModalTitle').textContent = 'Nuovo Record MPI';
  document.getElementById('mpiRecordForm').reset();
  document.getElementById('mpiRecordId').value = '';
  document.getElementById('mpiRecordMpiId').value = '';
  document.getElementById('mpiRecordApp').removeAttribute('disabled');

  // Load apps
  await _loadMpiRecordAppSelect();

  var modal = new bootstrap.Modal(document.getElementById('mpiRecordModal'));
  modal.show();
}

async function editMpiRecord(mpiId) {
  _ensureMpiRecordModal();
  document.getElementById('mpiRecordModalTitle').textContent = 'Modifica Record MPI';
  document.getElementById('mpiRecordForm').reset();

  try {
    var data = await adminPanel.apiCall('/api/v1/admin/mpi/records/' + mpiId);
    var r = data;

    await _loadMpiRecordAppSelect();

    document.getElementById('mpiRecordId').value = '';
    document.getElementById('mpiRecordMpiId').value = mpiId;

    // Find app by codice
    var appSelect = document.getElementById('mpiRecordApp');
    for (var i = 0; i < appSelect.options.length; i++) {
      if (appSelect.options[i].textContent.indexOf(r.applicazione) === 0) {
        appSelect.value = appSelect.options[i].value;
        break;
      }
    }
    appSelect.setAttribute('disabled', 'disabled');

    // Fill fields from demograficiMpi (original MPI values)
    var mpi = r.demograficiMpi || {};
    document.getElementById('mpiRecordIdEsterno').value = r.idEsterno || '';
    document.getElementById('mpiRecordCf').value = mpi.cf || '';
    document.getElementById('mpiRecordCognome').value = mpi.cognome || '';
    document.getElementById('mpiRecordNome').value = mpi.nome || '';
    document.getElementById('mpiRecordSesso').value = mpi.sesso || '';
    document.getElementById('mpiRecordComuneNascita').value = mpi.comuneNascita || '';
    document.getElementById('mpiRecordProvinciaNascita').value = mpi.provinciaNascita || '';
    document.getElementById('mpiRecordCodComuneNascita').value = mpi.codComuneNascita || '';
    document.getElementById('mpiRecordCodIstatComuneNascita').value = mpi.codIstatComuneNascita || '';
    document.getElementById('mpiRecordIndirizzoResidenza').value = mpi.indirizzoResidenza || '';
    document.getElementById('mpiRecordCapResidenza').value = mpi.capResidenza || '';
    document.getElementById('mpiRecordComuneResidenza').value = mpi.comuneResidenza || '';
    document.getElementById('mpiRecordCodComuneResidenza').value = mpi.codComuneResidenza || '';
    document.getElementById('mpiRecordCodIstatComuneResidenza').value = mpi.codIstatComuneResidenza || '';
    document.getElementById('mpiRecordAsp').value = mpi.asp || '';
    document.getElementById('mpiRecordSsnTipoAssistito').value = mpi.ssnTipoAssistito || '';
    document.getElementById('mpiRecordSsnNumeroTessera').value = mpi.ssnNumeroTessera || '';
    document.getElementById('mpiRecordSsnMotivazione').value = mpi.ssnMotivazioneFineAssistenza || '';
    document.getElementById('mpiRecordNote').value = mpi.note || '';

    // Date fields
    if (mpi.dataNascita) document.getElementById('mpiRecordDataNascita').value = _toDateInput(mpi.dataNascita);
    if (mpi.ssnInizioAssistenza) document.getElementById('mpiRecordSsnInizio').value = _toDateInput(mpi.ssnInizioAssistenza);
    if (mpi.ssnFineAssistenza) document.getElementById('mpiRecordSsnFine').value = _toDateInput(mpi.ssnFineAssistenza);
    if (mpi.dataDecesso) document.getElementById('mpiRecordDataDecesso').value = _toDateInput(mpi.dataDecesso);

    var modal = new bootstrap.Modal(document.getElementById('mpiRecordModal'));
    modal.show();
  } catch (e) {
    console.error('Error loading MPI record for edit:', e);
    adminPanel.showToast('Errore', 'Impossibile caricare il record', 'danger');
  }
}

function _toDateInput(val) {
  // val can be "DD/MM/YYYY" string (from customToJSON) or timestamp
  if (!val) return '';
  if (typeof val === 'string' && val.indexOf('/') !== -1) {
    var parts = val.split('/');
    if (parts.length === 3) return parts[2] + '-' + parts[1] + '-' + parts[0];
  }
  if (typeof val === 'number') {
    var d = new Date(val);
    return d.toISOString().split('T')[0];
  }
  return val;
}

async function _loadMpiRecordAppSelect() {
  var select = document.getElementById('mpiRecordApp');
  select.innerHTML = '<option value="">Seleziona applicazione...</option>';
  try {
    var data = await adminPanel.apiCall('/api/v1/admin/mpi/applicazioni');
    (data || []).forEach(function(app) {
      if (app.attivo) {
        var opt = document.createElement('option');
        opt.value = app.id;
        opt.textContent = app.codice + ' - ' + app.nome;
        select.appendChild(opt);
      }
    });
  } catch (e) {
    console.error('Error loading MPI apps for select:', e);
  }
}

async function saveMpiRecord() {
  var id = document.getElementById('mpiRecordId').value;
  var appId = document.getElementById('mpiRecordApp').value;

  if (!appId && !id) {
    adminPanel.showToast('Attenzione', 'Selezionare un\'applicazione', 'warning');
    return;
  }

  var data = {
    idEsterno: document.getElementById('mpiRecordIdEsterno').value || '',
    cf: document.getElementById('mpiRecordCf').value.toUpperCase() || '',
    cognome: document.getElementById('mpiRecordCognome').value || '',
    nome: document.getElementById('mpiRecordNome').value || '',
    sesso: document.getElementById('mpiRecordSesso').value || '',
    dataNascita: document.getElementById('mpiRecordDataNascita').value || '',
    comuneNascita: document.getElementById('mpiRecordComuneNascita').value || '',
    codComuneNascita: document.getElementById('mpiRecordCodComuneNascita').value || '',
    codIstatComuneNascita: document.getElementById('mpiRecordCodIstatComuneNascita').value || '',
    provinciaNascita: document.getElementById('mpiRecordProvinciaNascita').value || '',
    indirizzoResidenza: document.getElementById('mpiRecordIndirizzoResidenza').value || '',
    capResidenza: document.getElementById('mpiRecordCapResidenza').value || '',
    comuneResidenza: document.getElementById('mpiRecordComuneResidenza').value || '',
    codComuneResidenza: document.getElementById('mpiRecordCodComuneResidenza').value || '',
    codIstatComuneResidenza: document.getElementById('mpiRecordCodIstatComuneResidenza').value || '',
    asp: document.getElementById('mpiRecordAsp').value || '',
    ssnTipoAssistito: document.getElementById('mpiRecordSsnTipoAssistito').value || '',
    ssnNumeroTessera: document.getElementById('mpiRecordSsnNumeroTessera').value || '',
    ssnMotivazioneFineAssistenza: document.getElementById('mpiRecordSsnMotivazione').value || '',
    ssnInizioAssistenza: document.getElementById('mpiRecordSsnInizio').value || '',
    ssnFineAssistenza: document.getElementById('mpiRecordSsnFine').value || '',
    dataDecesso: document.getElementById('mpiRecordDataDecesso').value || '',
    note: document.getElementById('mpiRecordNote').value || ''
  };

  try {
    var mpiId = document.getElementById('mpiRecordMpiId').value;
    if (mpiId) {
      await adminPanel.apiCall('/api/v1/admin/mpi/records/' + mpiId, 'PUT', data);
      adminPanel.showToast('Successo', 'Record MPI aggiornato', 'success');
    } else {
      data.applicazione = parseInt(appId);
      var result = await adminPanel.apiCall('/api/v1/admin/mpi/records', 'POST', data);
      var msg = 'Record MPI creato: ' + result.mpiId;
      if (result.assistito) {
        msg += ' - Collegato automaticamente a ' + result.assistito.cognome + ' ' + result.assistito.nome;
      }
      adminPanel.showToast('Successo', msg, 'success');
    }
    bootstrap.Modal.getInstance(document.getElementById('mpiRecordModal')).hide();
    searchMpiRecords();
  } catch (e) {
    console.error('Error saving MPI record:', e);
  }
}
