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

    async handleLogin() {
        const username = document.getElementById('login-username').value;
        const password = document.getElementById('login-password').value;
        const loginBtn = document.getElementById('loginBtn');
        const loginError = document.getElementById('loginError');

        loginBtn.disabled = true;
        loginBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Accesso in corso...';
        loginError.classList.add('d-none');

        // Set flag to prevent logout during login process
        this._loginInProgress = true;

        try {
            console.log('Attempting login for user:', username);

            const requestBody = {
                login: username,
                password: password,
                scopi: 'admin-manage',
                ambito: 'api'
            };

            console.log('Request body:', requestBody);

            const response = await fetch('/api/v1/login/get-token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody)
            });

            console.log('Response status:', response.status);

            const result = await response.json();
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
        } catch (error) {
            loginError.textContent = error.message;
            loginError.classList.remove('d-none');
            this._loginInProgress = false;
        } finally {
            loginBtn.disabled = false;
            loginBtn.innerHTML = '<i class="bi bi-box-arrow-in-right me-1"></i>Accedi';
        }
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
                this.switchSection(e.target.getAttribute('data-section'));
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
                // Check if token is expired or invalid
                if (result.err?.code === 'TOKEN_SCADUTO' || result.err?.code === 'TOKEN_NON_VALIDO') {
                    console.error('Token error detected:', result.err);

                    // Don't automatically logout - it might be a configuration issue
                    // Just show an error and let the user manually logout if needed
                    console.warn('API call failed due to token error. This might be a configuration issue.');
                    console.warn('Token will remain in localStorage. User can logout manually if needed.');

                    // Throw error so calling function knows it failed
                    throw new Error('Token error: ' + result.err.msg);
                }
                throw new Error(result.err?.msg || 'Errore sconosciuto');
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
            document.getElementById('total-users').textContent = users.pagination?.total || 0;
            document.getElementById('total-scopes').textContent = scopes.pagination?.total || 0;
            document.getElementById('total-domains').textContent = domains.pagination?.total || 0;
            document.getElementById('total-levels').textContent = levels.levels?.length || 0;
        } catch (error) {
            console.error('Error loading dashboard stats:', error);
        }
    }

    async loadUsers(page = 1) {
        const loading = document.getElementById('users-loading');
        const tbody = document.getElementById('users-tbody');
        const search = document.getElementById('user-search').value;

        loading.style.display = 'block';
        tbody.innerHTML = '';

        try {
            const params = new URLSearchParams({
                page: page,
                limit: this.pageSize
            });

            if (search) {
                params.append('search', search);
            }

            const data = await this.apiCall(`/api/v1/admin/users?${params}`);

            data.users.forEach(user => {
                const row = this.createUserRow(user);
                tbody.appendChild(row);
            });

            this.createPagination('users', data.pagination);
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

        const scopesList = user.scopi.map(scope =>
            `<span class="badge bg-primary me-1">${scope.scopo}</span>`
        ).join('');

        row.innerHTML = `
            <td><strong>${user.username}</strong></td>
            <td>${user.mail}</td>
            <td>${user.ambito?.ambito || '-'}</td>
            <td>${user.livello?.livello || '-'}</td>
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

        const { page, pages, total } = pagination;

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
                            <form id="userForm">
                                <input type="hidden" id="userId" name="id">
                                <div class="row">
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label for="username" class="form-label">Username *</label>
                                            <input type="text" class="form-control" id="username" name="username" required>
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
                                            <input type="password" class="form-control" id="password" name="password">
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
                                    <div class="col-md-6">
                                        <div class="form-check">
                                            <input class="form-check-input" type="checkbox" id="attivo" name="attivo" checked>
                                            <label class="form-check-label" for="attivo">Utente attivo</label>
                                        </div>
                                    </div>
                                    <div class="col-md-6">
                                        <div class="form-check">
                                            <input class="form-check-input" type="checkbox" id="allow_domain_login" name="allow_domain_login">
                                            <label class="form-check-label" for="allow_domain_login">Login con dominio</label>
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

        const modal = new bootstrap.Modal(document.getElementById('userModal'));
        modal.show();
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
            domain: formData.get('domain') || null
        };

        if (formData.get('password')) {
            data.password = formData.get('password');
        }

        // Get selected scopes
        const scopeCheckboxes = document.querySelectorAll('input[name="scopi"]:checked');
        data.scopi = Array.from(scopeCheckboxes).map(cb => parseInt(cb.value));

        try {
            let result;
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
            document.getElementById('ambito').value = user.ambito?.id || '';
            document.getElementById('livello').value = user.livello?.id || '';
            document.getElementById('attivo').checked = user.attivo;
            document.getElementById('allow_domain_login').checked = user.allow_domain_login;

            // Check user scopes
            user.scopi.forEach(scope => {
                const checkbox = document.getElementById(`scope_${scope.id}`);
                if (checkbox) checkbox.checked = true;
            });

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
document.addEventListener('DOMContentLoaded', function() {
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
