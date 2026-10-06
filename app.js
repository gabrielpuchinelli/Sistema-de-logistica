const menuItems = [
    ["dashboard", "Dashboard", "dashboard.html"],
    ["entregadores", "Entregadores", "entregadores.html"],
    ["nova-saida", "Nova Saida", "nova_Saida.html"],
    ["fechamento", "Fechamento", "fechamento.html"],
    ["historico", "Historico", "historico.html"],
    ["fechamento-semanal", "Fechamento Semanal", "fechamento_Semanal.html"],
    ["fechamento-quinzenal", "Fechamento Quinzenal", "fechamento_Quinzenal.html"],
    ["pagamentos", "Pagamentos", "pagamentos.html"],
    ["configuracoes", "Configuracoes", "configuracoes.html"]
];

const today = new Date().toISOString().slice(0, 10);

function makeId() {
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

const seedData = {
    settings: {
        empresa: "RMSLogis",
        operador: "Operador 01",
        valorPacote: 1,
        empresas: [],
        valoresVeiculo: { moto: 1, carro: 1, van: 1 }
    },
    user: null,
    role: null,
    drivers: [],
    routes: [],
    recebimentos: [],
    entradasGalpao: []
};

function loadData() {
    return JSON.parse(JSON.stringify(seedData));
}

function saveData(data) {
    window.rmsSupabase.saveState(data, state.role).catch((error) => {
        console.error("Falha ao salvar no Supabase:", error);
        toast("Nao foi possivel salvar no banco. Verifique a conexao.");
    });
}

let state = loadData();

function money(value) {
    return Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (character) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[character]);
}

function validatePixKey(type, value) {
    const key = value.trim();
    if (!key) return "";
    if (!type) return "Selecione o tipo da chave Pix.";

    if (type === "cpf") {
        if (!/^[\d.\-]+$/.test(key)) return "Informe um CPF valido como chave Pix.";
        const digits = key.replace(/\D/g, "");
        if (digits.length !== 11 || /^(\d)\1+$/.test(digits)) return "Informe um CPF valido como chave Pix.";
        const digitAt = (length) => {
            const sum = digits.slice(0, length).split("").reduce((total, digit, index) => total + Number(digit) * (length + 1 - index), 0);
            const remainder = (sum * 10) % 11;
            return remainder === 10 ? 0 : remainder;
        };
        return digitAt(9) === Number(digits[9]) && digitAt(10) === Number(digits[10])
            ? ""
            : "Informe um CPF valido como chave Pix.";
    }

    if (type === "cnpj") {
        if (!/^[\d./\-]+$/.test(key)) return "Informe um CNPJ valido como chave Pix.";
        const digits = key.replace(/\D/g, "");
        if (digits.length !== 14 || /^(\d)\1+$/.test(digits)) return "Informe um CNPJ valido como chave Pix.";
        const checkDigit = (source, weights) => {
            const remainder = source.split("").reduce((sum, digit, index) => sum + Number(digit) * weights[index], 0) % 11;
            return remainder < 2 ? 0 : 11 - remainder;
        };
        const first = checkDigit(digits.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
        const second = checkDigit(digits.slice(0, 12) + first, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
        return first === Number(digits[12]) && second === Number(digits[13])
            ? ""
            : "Informe um CNPJ valido como chave Pix.";
    }

    if (type === "telefone") {
        if (!/^[\d\s()+\-]+$/.test(key)) return "Informe um telefone com DDD como chave Pix.";
        const hasCountryPrefix = key.startsWith("+");
        let digits = key.replace(/\D/g, "");
        if (hasCountryPrefix && (digits.length === 12 || digits.length === 13) && digits.startsWith("55")) digits = digits.slice(2);
        return digits.length >= 10 && digits.length <= 11 && Number(digits.slice(0, 2)) >= 11
            ? ""
            : "Informe um telefone com DDD como chave Pix.";
    }

    if (type === "email") {
        return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(key) ? "" : "Informe um e-mail valido como chave Pix.";
    }

    if (type === "aleatoria") {
        return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(key)
            ? ""
            : "Informe uma chave aleatoria Pix valida.";
    }

    return "Selecione um tipo de chave Pix valido.";
}

function formatDate(value) {
    if (!value) return "-";
    const [year, month, day] = value.split("-");
    return `${day}/${month}/${year}`;
}

function addCalendarDays(value, days) {
    const date = new Date(`${value}T00:00:00`);
    date.setDate(date.getDate() + days);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function getDriver(id) {
    return state.drivers.find((driver) => driver.id === id);
}

function vehicleKey(vehicle) {
    const normalized = String(vehicle || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    return ["moto", "carro", "van"].includes(normalized) ? normalized : "moto";
}

function routeTotal(route) {
    return Math.max(0, Number(route.entregues || 0) * Number(route.valorPacote || 0) - Number(route.desconto || 0));
}

function dailyStock(date) {
    const received = state.entradasGalpao
        .filter((entry) => entry.data === date)
        .reduce((sum, entry) => sum + Number(entry.quantidade || 0), 0);
    const dispatched = state.routes
        .filter((route) => route.data === date)
        .reduce((sum, route) => sum + Number(route.saida || 0), 0);
    return { received, dispatched, available: received - dispatched };
}

function setText(selector, value) {
    document.querySelectorAll(selector).forEach((element) => {
        element.textContent = value;
    });
}

function toast(message) {
    const oldToast = document.querySelector(".toast");
    if (oldToast) oldToast.remove();

    const element = document.createElement("div");
    element.className = "toast";
    element.textContent = message;
    document.body.appendChild(element);
    setTimeout(() => element.remove(), 2800);
}

function renderShell(page) {
    const logo = document.querySelector(".logo");
    if (logo && !logo.querySelector("img")) {
        logo.innerHTML = '<img src="rms-logo.svg" alt="RMS Logistica">';
    }

    const menu = document.querySelector(".menu");
    if (menu) {
        menu.id = "main-navigation";
        const visibleMenu = state.role === "operador"
            ? menuItems.filter(([key]) => ["dashboard", "nova-saida", "fechamento"].includes(key))
            : menuItems;
        menu.innerHTML = `${visibleMenu.map(([key, label, href]) => (
            `<a href="${href}" class="${key === page ? "active" : ""}">${label}</a>`
        )).join("")}<button type="button" data-logout>Sair</button>`;
    }

    document.body.dataset.role = state.role || "";
    document.body.classList.toggle("role-operador", state.role === "operador");

    const sidebar = document.querySelector(".sidebar");
    if (sidebar && !document.querySelector("[data-mobile-menu-toggle]")) {
        const toggle = document.createElement("button");
        toggle.className = "mobile-menu-toggle";
        toggle.type = "button";
        toggle.dataset.mobileMenuToggle = "";
        toggle.setAttribute("aria-controls", "main-navigation");
        toggle.setAttribute("aria-expanded", "false");
        toggle.textContent = "Menu";
        document.body.insertBefore(toggle, sidebar);

        const backdrop = document.createElement("button");
        backdrop.className = "mobile-menu-backdrop";
        backdrop.type = "button";
        backdrop.dataset.mobileMenuClose = "";
        backdrop.setAttribute("aria-label", "Fechar menu");
        backdrop.hidden = true;
        sidebar.insertAdjacentElement("afterend", backdrop);
    }

    setText("[data-user]", state.role === "admin" ? "Admin" : "Operador");

}

function setMobileMenuOpen(isOpen) {
    const sidebar = document.querySelector(".sidebar");
    const toggle = document.querySelector("[data-mobile-menu-toggle]");
    const backdrop = document.querySelector("[data-mobile-menu-close]");
    if (!sidebar || !toggle || !backdrop) return;

    sidebar.classList.toggle("menu-open", isOpen);
    document.body.classList.toggle("menu-open", isOpen);
    toggle.setAttribute("aria-expanded", String(isOpen));
    toggle.textContent = isOpen ? "Fechar" : "Menu";
    backdrop.hidden = !isOpen;

    if (isOpen) sidebar.querySelector(".menu a")?.focus({ preventScroll: true });
    else toggle.focus({ preventScroll: true });
}

function ensureLogged(page) {
    if (page === "login") {
        if (state.user && state.role) {
            window.location.replace("dashboard.html");
            return false;
        }
        return true;
    }

    if (!state.user || !state.role) {
        window.location.replace("index.html");
        return false;
    }

    const operatorPages = ["dashboard", "nova-saida", "fechamento"];
    if (state.role === "operador" && !operatorPages.includes(page)) {
        window.location.replace("dashboard.html");
        return false;
    }

    return true;
}

function renderEmpty(tbody, columns, message) {
    tbody.innerHTML = `<tr><td class="empty-row" colspan="${columns}">${message}</td></tr>`;
}

function dashboardMetrics() {
    const todaysRoutes = state.routes.filter((route) => route.data === today);
    const closedToday = todaysRoutes.filter((route) => route.status === "Fechado");

    return {
        activeDrivers: state.drivers.filter((driver) => driver.status === "Ativo").length,
        packagesOut: todaysRoutes.reduce((sum, route) => sum + Number(route.saida || 0), 0),
        delivered: closedToday.reduce((sum, route) => sum + Number(route.entregues || 0), 0),
        returned: closedToday.reduce((sum, route) => sum + Number(route.retornados || 0), 0),
        totalValue: closedToday.reduce((sum, route) => sum + routeTotal(route), 0)
    };
}

function renderDashboard() {
    const metrics = dashboardMetrics();
    setText('[data-metric="activeDrivers"]', metrics.activeDrivers);
    setText('[data-metric="packagesOut"]', metrics.packagesOut);
    setText('[data-metric="delivered"]', metrics.delivered);
    setText('[data-metric="returned"]', metrics.returned);
    setText('[data-metric="totalValue"]', money(metrics.totalValue));
    setText("[data-today-title]", `Resumo de hoje - ${formatDate(today)}`);

    const tbody = document.querySelector("[data-dashboard-table]");
    if (!tbody) return;

    const todaysRoutes = state.routes.filter((route) => route.data === today);
    setText("[data-record-count]", `${todaysRoutes.length} registros`);

    if (!todaysRoutes.length) {
        renderEmpty(tbody, 7, "Nenhuma saida registrada hoje.");
        return;
    }

    tbody.innerHTML = todaysRoutes.map((route) => {
        const driver = getDriver(route.driverId);
        const statusClass = route.status === "Fechado" ? "status-fechado" : "status-aberto";
        return `
            <tr>
                <td>${driver?.nome || "Entregador removido"}</td>
                <td>${escapeHtml(route.empresa || "-")}</td>
                <td>${route.saida}</td>
                <td>${route.entregues || 0}</td>
                <td>${route.retornados || 0}</td>
                <td>${money(routeTotal(route))}</td>
                <td><span class="status ${statusClass}">${route.status}</span></td>
            </tr>
        `;
    }).join("");
}

function renderDrivers() {
    const tbody = document.querySelector("[data-drivers-table]");
    if (!tbody) return;

    setText("[data-driver-count]", `${state.drivers.length} cadastrados`);

    if (!state.drivers.length) {
        renderEmpty(tbody, 8, "Nenhum entregador cadastrado.");
        return;
    }

    tbody.innerHTML = state.drivers.map((driver) => `
        <tr>
            <td>${escapeHtml(driver.nome)}</td>
            <td>${escapeHtml(driver.cpf || "-")}</td>
            <td>${escapeHtml(driver.telefone)}</td>
            <td>${escapeHtml(driver.email || "-")}</td>
            <td>${escapeHtml(driver.veiculo)}</td>
            <td>${driver.pixChave
                ? `<span class="pix-type">${escapeHtml(driver.pixTipo || "Chave")}</span><span class="pix-key">${escapeHtml(driver.pixChave)}</span>`
                : "Sem chave cadastrada"}</td>
            <td><span class="status ${driver.status === "Ativo" ? "status-ativo" : "status-inativo"}">${driver.status}</span></td>
            <td class="table-actions">
                <button class="btn btn-small btn-secondary" data-edit-driver="${escapeHtml(driver.id)}" type="button">
                    Editar
                </button>
                <button class="btn btn-small btn-muted" data-toggle-driver="${escapeHtml(driver.id)}" type="button">
                    ${driver.status === "Ativo" ? "Inativar" : "Ativar"}
                </button>
            </td>
        </tr>
    `).join("");
}

function fillDriverSelects() {
    document.querySelectorAll("[data-driver-select]").forEach((select) => {
        const activeDrivers = state.drivers.filter((driver) => driver.status === "Ativo");
        select.innerHTML = activeDrivers.length
            ? activeDrivers.map((driver) => `<option value="${escapeHtml(driver.id)}">${escapeHtml(driver.nome)} - ${escapeHtml(driver.veiculo)}</option>`).join("")
            : '<option value="">Cadastre um entregador ativo</option>';
    });
}

function fillCompanySelects() {
    document.querySelectorAll("[data-company-select]").forEach((select) => {
        const selectedCompany = select.value;
        const companies = [...new Set([
            ...(state.settings.empresas || []),
            ...state.recebimentos.map((receipt) => receipt.empresa)
        ])];
        select.innerHTML = [
            '<option value="">Selecione uma empresa</option>',
            ...companies.map((company) => `<option value="${escapeHtml(company)}">${escapeHtml(company)}</option>`)
        ].join("");
        if (companies.includes(selectedCompany)) select.value = selectedCompany;
    });
}

function fillRouteSelects() {
    document.querySelectorAll("[data-route-select]").forEach((select) => {
        const openRoutes = state.routes.filter((route) => route.status === "Aberto");
        select.innerHTML = openRoutes.length
            ? openRoutes.map((route) => {
                const driver = getDriver(route.driverId);
                return `<option value="${escapeHtml(route.id)}">${formatDate(route.data)} - ${escapeHtml(driver?.nome || "Entregador")} - ${escapeHtml(route.empresa || "Empresa nao informada")} - ${route.saida} pacotes</option>`;
            }).join("")
            : '<option value="">Nenhuma saida em aberto</option>';
    });
}

function renderOpenRoutes() {
    const tbody = document.querySelector("[data-open-routes-table]");
    if (!tbody) return;

    const openRoutes = state.routes.filter((route) => route.status === "Aberto");
    setText("[data-open-count]", `${openRoutes.length} abertas`);

    if (!openRoutes.length) {
        renderEmpty(tbody, 7, "Nenhuma saida em aberto.");
        return;
    }

    tbody.innerHTML = openRoutes.map((route) => {
        const driver = getDriver(route.driverId);
        return `
            <tr>
                <td>${formatDate(route.data)}</td>
                <td>${driver?.nome || "Entregador removido"}</td>
                <td>${escapeHtml(route.empresa || "-")}</td>
                <td>${escapeHtml(driver?.veiculo || "-")}</td>
                <td>${route.saida}</td>
                <td>${money(route.valorPacote)}</td>
                <td><span class="status status-aberto">Aberto</span></td>
            </tr>
        `;
    }).join("");
}

function renderClosedRoutes() {
    const tbody = document.querySelector("[data-closed-table]");
    if (!tbody) return;

    const closedRoutes = state.routes.filter((route) => route.status === "Fechado").slice().reverse();
    setText("[data-closed-count]", `${closedRoutes.length} fechados`);

    if (!closedRoutes.length) {
        renderEmpty(tbody, 7, "Nenhum fechamento realizado.");
        return;
    }

    tbody.innerHTML = closedRoutes.map((route) => {
        const driver = getDriver(route.driverId);
        return `
            <tr>
                <td>${formatDate(route.data)}</td>
                <td>${driver?.nome || "Entregador removido"}</td>
                <td>${escapeHtml(route.empresa || "-")}</td>
                <td>${route.saida}</td>
                <td>${Math.max(0, Number(route.saida || 0) - Number(route.retornados || 0))}</td>
                <td>${route.retornados}</td>
                <td>${money(routeTotal(route))}</td>
            </tr>
        `;
    }).join("");
}

function renderHistory(filter = "") {
    const tbody = document.querySelector("[data-history-table]");
    if (!tbody) return;

    const term = filter.toLowerCase().trim();
    const rows = state.routes.filter((route) => {
        const driver = getDriver(route.driverId);
        const text = `${driver?.nome || ""} ${route.empresa || ""} ${route.data} ${route.status}`.toLowerCase();
        return text.includes(term);
    }).slice().reverse();

    setText("[data-history-count]", `${rows.length} registros`);

    if (!rows.length) {
        renderEmpty(tbody, 8, "Nenhum registro encontrado.");
        return;
    }

    tbody.innerHTML = rows.map((route) => {
        const driver = getDriver(route.driverId);
        const statusClass = route.status === "Fechado" ? "status-fechado" : "status-aberto";
        return `
            <tr>
                <td>${formatDate(route.data)}</td>
                <td>${driver?.nome || "Entregador removido"}</td>
                <td>${escapeHtml(route.empresa || "-")}</td>
                <td>${route.saida}</td>
                <td>${Math.max(0, Number(route.saida || 0) - Number(route.retornados || 0))}</td>
                <td>${route.retornados || 0}</td>
                <td>${money(routeTotal(route))}</td>
                <td><span class="status ${statusClass}">${route.status}</span></td>
            </tr>
        `;
    }).join("");
}

function renderWeek() {
    const closedRoutes = state.routes.filter((route) => route.status === "Fechado");
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 6);
    weekStart.setHours(0, 0, 0, 0);

    const weekRoutes = closedRoutes.filter((route) => new Date(`${route.data}T00:00:00`) >= weekStart);
    const byDriver = new Map();

    weekRoutes.forEach((route) => {
        const groupKey = `${route.driverId}|${route.empresa || ""}`;
        const item = byDriver.get(groupKey) || { driverId: route.driverId, empresa: route.empresa || "-", saidas: 0, entregues: 0, retornados: 0, total: 0 };
        item.saidas += Number(route.saida || 0);
        item.entregues += Math.max(0, Number(route.saida || 0) - Number(route.retornados || 0));
        item.retornados += Number(route.retornados || 0);
        item.total += routeTotal(route);
        byDriver.set(groupKey, item);
    });

    setText('[data-week="delivered"]', weekRoutes.reduce((sum, route) => sum + Number(route.entregues || 0), 0));
    setText('[data-week="returned"]', weekRoutes.reduce((sum, route) => sum + Number(route.retornados || 0), 0));
    setText('[data-week="value"]', money(weekRoutes.reduce((sum, route) => sum + routeTotal(route), 0)));
    setText('[data-week="drivers"]', new Set(weekRoutes.map((route) => route.driverId)).size);

    const tbody = document.querySelector("[data-week-table]");
    if (!tbody) return;

    if (!byDriver.size) {
        renderEmpty(tbody, 6, "Nenhum fechamento nos ultimos 7 dias.");
        return;
    }

    tbody.innerHTML = [...byDriver.values()].map((item) => {
        const driver = getDriver(item.driverId);
        return `
            <tr>
                <td>${driver?.nome || "Entregador removido"}</td>
                <td>${escapeHtml(item.empresa)}</td>
                <td>${item.saidas}</td>
                <td>${item.entregues}</td>
                <td>${item.retornados}</td>
                <td>${money(item.total)}</td>
            </tr>
        `;
    }).join("");
}

function renderPayments() {
    const tbody = document.querySelector("[data-payments-table]");
    if (!tbody) return;

    const closedRoutes = state.routes.filter((route) => route.status === "Fechado");
    const pending = closedRoutes.filter((route) => route.pagamento !== "Pago");
    const paid = closedRoutes.filter((route) => route.pagamento === "Pago");

    setText('[data-payments="pending"]', money(pending.reduce((sum, route) => sum + routeTotal(route), 0)));
    setText('[data-payments="paid"]', money(paid.reduce((sum, route) => sum + routeTotal(route), 0)));
    setText("[data-payment-count]", `${closedRoutes.length} itens`);

    if (!closedRoutes.length) {
        renderEmpty(tbody, 6, "Nenhum fechamento disponivel para pagamento.");
        return;
    }

    tbody.innerHTML = closedRoutes.slice().reverse().map((route) => {
        const driver = getDriver(route.driverId);
        const isPaid = route.pagamento === "Pago";
        return `
            <tr>
                <td>${formatDate(route.data)}</td>
                <td>${escapeHtml(driver?.nome || "Entregador removido")}</td>
                <td>${driver?.pixChave
                    ? `<span class="pix-type">${escapeHtml(driver.pixTipo || "Chave")}</span><span class="pix-key">${escapeHtml(driver.pixChave)}</span>`
                    : "Sem chave cadastrada"}</td>
                <td>${money(routeTotal(route))}</td>
                <td><span class="status ${isPaid ? "status-pago" : "status-pendente"}">${isPaid ? "Pago" : "Pendente"}</span></td>
                <td class="table-actions">
                    <button class="btn btn-small ${isPaid ? "btn-muted" : "btn-primary"}" data-pay-route="${route.id}" type="button">
                        ${isPaid ? "Desfazer" : "Marcar pago"}
                    </button>
                </td>
            </tr>
        `;
    }).join("");
}

function fortnightRange() {
    const month = document.querySelector("[data-fortnight-month]")?.value || today.slice(0, 7);
    const half = document.querySelector("[data-fortnight-half]")?.value || "1";
    const [year, monthNumber] = month.split("-").map(Number);
    const lastDay = new Date(year, monthNumber, 0).getDate();
    const start = `${month}-${half === "1" ? "01" : "16"}`;
    const endDay = half === "1" ? 15 : lastDay;
    const end = `${month}-${String(endDay).padStart(2, "0")}`;
    return { start, end, half };
}

function renderFortnight() {
    const tbodyCompanies = document.querySelector("[data-fortnight-company-table]");
    const tbodyDrivers = document.querySelector("[data-fortnight-driver-table]");
    if (!tbodyCompanies || !tbodyDrivers) return;

    const range = fortnightRange();
    const inPeriod = (date) => date >= range.start && date <= range.end;
    const receipts = state.recebimentos.filter((receipt) => inPeriod(receipt.data));
    const paidRoutes = state.routes.filter((route) => (
        route.status === "Fechado"
        && route.pagamento === "Pago"
        && inPeriod(route.dataPagamento || route.data)
    ));
    const pendingRoutes = state.routes.filter((route) => (
        route.status === "Fechado"
        && route.pagamento !== "Pago"
        && inPeriod(route.data)
    ));
    const totalReceived = receipts.reduce((sum, receipt) => sum + Number(receipt.valor || 0), 0);
    const totalPaid = paidRoutes.reduce((sum, route) => sum + routeTotal(route), 0);
    const totalPending = pendingRoutes.reduce((sum, route) => sum + routeTotal(route), 0);
    const result = totalReceived - totalPaid;

    setText('[data-fortnight="received"]', money(totalReceived));
    setText('[data-fortnight="paid"]', money(totalPaid));
    setText('[data-fortnight="result"]', money(result));
    setText('[data-fortnight="pending"]', money(totalPending));
    setText("[data-fortnight-period]", `${formatDate(range.start)} a ${formatDate(range.end)}`);
    setText("[data-fortnight-receipt-count]", `${receipts.length} recebimentos`);

    const resultElement = document.querySelector('[data-fortnight="result"]');
    if (resultElement) {
        resultElement.classList.toggle("financial-positive", result >= 0);
        resultElement.classList.toggle("financial-negative", result < 0);
    }

    const byCompany = new Map();
    receipts.forEach((receipt) => {
        const company = receipt.empresa || "Empresa nao informada";
        const item = byCompany.get(company) || { count: 0, total: 0 };
        item.count += 1;
        item.total += Number(receipt.valor || 0);
        byCompany.set(company, item);
    });

    if (!byCompany.size) {
        renderEmpty(tbodyCompanies, 3, "Nenhum recebimento registrado nesta quinzena.");
    } else {
        tbodyCompanies.innerHTML = [...byCompany.entries()].sort((a, b) => b[1].total - a[1].total).map(([company, item]) => `
            <tr>
                <td>${escapeHtml(company)}</td>
                <td>${item.count}</td>
                <td>${money(item.total)}</td>
            </tr>
        `).join("");
    }

    const byDriver = new Map();
    paidRoutes.forEach((route) => {
        const item = byDriver.get(route.driverId) || { count: 0, total: 0 };
        item.count += 1;
        item.total += routeTotal(route);
        byDriver.set(route.driverId, item);
    });

    if (!byDriver.size) {
        renderEmpty(tbodyDrivers, 3, "Nenhum pagamento a motorista registrado nesta quinzena.");
    } else {
        tbodyDrivers.innerHTML = [...byDriver.entries()].sort((a, b) => b[1].total - a[1].total).map(([driverId, item]) => {
            const driver = getDriver(driverId);
            return `
                <tr>
                    <td>${escapeHtml(driver?.nome || "Entregador removido")}</td>
                    <td>${item.count}</td>
                    <td>${money(item.total)}</td>
                </tr>
            `;
        }).join("");
    }
}

function renderSettings() {
    const form = document.querySelector('[data-form="settings"]');
    if (!form) return;

    form.empresa.value = state.settings.empresa;
    form.operador.value = state.settings.operador;
    form.valorMoto.value = state.settings.valoresVeiculo.moto;
    form.valorCarro.value = state.settings.valoresVeiculo.carro;
    form.valorVan.value = state.settings.valoresVeiculo.van;
    form.empresas.value = (state.settings.empresas || []).join("\n");
}

function renderWarehouse() {
    const dateInput = document.querySelector('[data-form="warehouse"]')?.elements.namedItem("data");
    const date = dateInput?.value || today;
    const stock = dailyStock(date);
    setText("[data-stock-received]", stock.received);
    setText("[data-stock-dispatched]", stock.dispatched);
    setText("[data-stock-available]", stock.available);

    const tbody = document.querySelector("[data-warehouse-table]");
    if (!tbody) return;
    const entries = state.entradasGalpao.filter((entry) => entry.data === date).slice().reverse();
    if (!entries.length) {
        renderEmpty(tbody, 3, "Nenhuma entrada registrada para esta data.");
        return;
    }
    tbody.innerHTML = entries.map((entry) => `
        <tr>
            <td>${formatDate(entry.data)}</td>
            <td>${entry.quantidade}</td>
            <td>${escapeHtml(entry.observacao || "-")}</td>
        </tr>
    `).join("");
}

function updateRoutePrice(routeForm) {
    const driver = getDriver(routeForm.elements.namedItem("driverId").value);
    const vehicle = vehicleKey(driver?.veiculo);
    routeForm.elements.namedItem("valorPacote").value = state.settings.valoresVeiculo[vehicle];
    setText("[data-route-vehicle]", driver?.veiculo || "Selecione um entregador");
    refreshStockForRoute(routeForm);
}

function refreshStockForRoute(routeForm) {
    const date = routeForm.elements.namedItem("data").value;
    const stock = dailyStock(date);
    const quantity = routeForm.elements.namedItem("saida");
    quantity.removeAttribute("max");
    setText("[data-route-stock]", stock.available);

    const warning = document.querySelector("[data-stock-warning]");
    const entryLink = document.querySelector("[data-stock-entry-link]");
    if (warning) {
        warning.hidden = stock.available > 0;
        warning.textContent = stock.received > 0
            ? "O saldo desta data ja foi totalmente liberado em outras saidas."
            : "Nenhuma entrada de pacotes foi registrada para esta data.";
    }
    if (entryLink) entryLink.hidden = stock.available > 0;
}

function updateClosurePreview(closeForm) {
    const route = state.routes.find((item) => item.id === closeForm.elements.namedItem("routeId").value);
    const returned = Number(closeForm.elements.namedItem("retornados").value || 0);
    const discount = Number(closeForm.elements.namedItem("desconto").value || 0);
    const delivered = route ? Math.max(0, Number(route.saida || 0) - returned) : 0;
    const total = route ? Math.max(0, delivered * Number(route.valorPacote || 0) - discount) : 0;
    setText("[data-close-outbound]", route?.saida || 0);
    setText("[data-close-delivered]", delivered);
    setText("[data-close-unit-value]", money(route?.valorPacote || 0));
    setText("[data-close-total]", money(total));
    closeForm.elements.namedItem("retornados").max = route?.saida || 0;
    closeForm.elements.namedItem("desconto").max = route ? delivered * Number(route.valorPacote || 0) : 0;
}

function resetDriverForm(driverForm) {
    driverForm.reset();
    driverForm.elements.namedItem("driverId").value = "";
    document.querySelector("[data-driver-form-title]").textContent = "Novo entregador";
    driverForm.querySelector("[data-driver-submit]").textContent = "Cadastrar";
    driverForm.querySelector("[data-driver-cancel]").hidden = true;
}

function startDriverEdit(driverForm, driver) {
    driverForm.elements.namedItem("driverId").value = driver.id;
    driverForm.elements.namedItem("nome").value = driver.nome || "";
    driverForm.elements.namedItem("telefone").value = driver.telefone || "";
    driverForm.elements.namedItem("cpf").value = driver.cpf || "";
    driverForm.elements.namedItem("cnh").value = driver.cnh || "";
    driverForm.elements.namedItem("endereco").value = driver.endereco || "";
    driverForm.elements.namedItem("email").value = driver.email || "";
    driverForm.elements.namedItem("veiculo").value = driver.veiculo || "";
    driverForm.elements.namedItem("status").value = driver.status || "Ativo";
    driverForm.elements.namedItem("pixTipo").value = driver.pixTipo || "";
    driverForm.elements.namedItem("pixChave").value = driver.pixChave || "";
    document.querySelector("[data-driver-form-title]").textContent = "Editar entregador";
    driverForm.querySelector("[data-driver-submit]").textContent = "Salvar alteracoes";
    driverForm.querySelector("[data-driver-cancel]").hidden = false;
    driverForm.scrollIntoView({ behavior: "smooth", block: "start" });
    driverForm.elements.namedItem("nome").focus({ preventScroll: true });
}

function setupForms() {
    const loginForm = document.querySelector("#loginForm");
    if (loginForm) {
        loginForm.addEventListener("submit", async (event) => {
            event.preventDefault();
            if (!window.rmsSupabase.configured) {
                toast("Configure a URL e a chave publica do Supabase.");
                return;
            }
            const formData = new FormData(loginForm);
            const email = String(formData.get("email") || "").trim().toLowerCase();
            const password = String(formData.get("password") || "");
            const { error } = await window.rmsSupabase.signIn(email, password);
            if (error) {
                const errorCode = String(error.code || "").toLowerCase();
                const errorMessage = String(error.message || "").toLowerCase();
                let message = "E-mail ou senha incorretos. Use o e-mail cadastrado em Supabase > Authentication > Users.";
                if (errorCode === "email_not_confirmed" || errorMessage.includes("email not confirmed")) {
                    message = "Confirme o e-mail do usuario no Supabase Authentication antes de entrar.";
                } else if (errorMessage.includes("invalid api key") || errorCode === "invalid_api_key") {
                    message = "A chave publica do Supabase esta incorreta. Confira supabase-config.js.";
                } else if (errorMessage.includes("failed to fetch")) {
                    message = "Nao foi possivel conectar ao Supabase. Confira a URL e sua conexao.";
                }
                console.error("Falha no login Supabase:", error);
                toast(message);
                loginForm.elements.namedItem("password").value = "";
                return;
            }
            window.location.href = "dashboard.html";
        });
    }

    const driverForm = document.querySelector('[data-form="driver"]');
    if (driverForm) {
        driverForm.addEventListener("submit", (event) => {
            event.preventDefault();
            const data = Object.fromEntries(new FormData(driverForm));
            data.pixChave = data.pixChave.trim();
            const pixError = validatePixKey(data.pixTipo, data.pixChave);
            if (pixError) {
                toast(pixError);
                driverForm.elements.namedItem("pixChave").focus();
                return;
            }

            data.pixTipo = data.pixChave ? data.pixTipo : "";
            const driverId = data.driverId;
            delete data.driverId;
            const existingDriver = state.drivers.find((driver) => driver.id === driverId);
            if (driverId && !existingDriver) {
                toast("Entregador nao encontrado.");
                resetDriverForm(driverForm);
                return;
            }

            if (existingDriver) {
                Object.assign(existingDriver, data);
            } else {
                state.drivers.push({ id: makeId(), ...data });
            }
            saveData(state);
            resetDriverForm(driverForm);
            renderDrivers();
            fillDriverSelects();
            toast(existingDriver ? "Cadastro atualizado." : "Entregador cadastrado.");
        });
    }

    const routeForm = document.querySelector('[data-form="route"]');
    if (routeForm) {
        routeForm.data.value = today;
        routeForm.valorPacote.value = state.settings.valorPacote;
        routeForm.addEventListener("submit", async (event) => {
            event.preventDefault();
            const data = Object.fromEntries(new FormData(routeForm));
            if (!data.driverId) {
                toast("Cadastre um entregador ativo antes de registrar saida.");
                return;
            }

            const route = {
                id: makeId(),
                data: data.data,
                driverId: data.driverId,
                empresa: data.empresa.trim(),
                saida: Number(data.saida),
                valorPacote: Number(data.valorPacote),
                veiculo: getDriver(data.driverId)?.veiculo || "",
                observacao: data.observacao,
                status: "Aberto",
                entregues: 0,
                retornados: 0,
                desconto: 0,
                pagamento: "Pendente"
            };
            const submitButton = routeForm.querySelector('[type="submit"]');
            submitButton.disabled = true;
            try {
                const savedRoute = await window.rmsSupabase.createRoute(route);
                state.routes.push(savedRoute);
                routeForm.reset();
                routeForm.data.value = today;
                updateRoutePrice(routeForm);
                renderOpenRoutes();
                renderWarehouse();
                toast("Saida registrada.");
            } catch (error) {
                console.error("Falha ao registrar saida:", error);
                toast(error.message?.includes("Estoque insuficiente")
                    ? error.message
                    : "Nao foi possivel registrar a saida. Confira os dados e tente novamente.");
            } finally {
                submitButton.disabled = false;
            }
        });
        routeForm.elements.namedItem("driverId").addEventListener("change", () => updateRoutePrice(routeForm));
        routeForm.elements.namedItem("data").addEventListener("change", () => refreshStockForRoute(routeForm));
    }

    const closeForm = document.querySelector('[data-form="close-route"]');
    if (closeForm) {
        closeForm.addEventListener("input", () => updateClosurePreview(closeForm));
        closeForm.elements.namedItem("routeId").addEventListener("change", () => updateClosurePreview(closeForm));
        closeForm.addEventListener("submit", async (event) => {
            event.preventDefault();
            const data = Object.fromEntries(new FormData(closeForm));
            const route = state.routes.find((item) => item.id === data.routeId);
            if (!route || route.status !== "Aberto") {
                toast("Nenhuma saida em aberto selecionada.");
                return;
            }

            const retornados = Number(data.retornados);
            if (retornados > Number(route.saida)) {
                toast("Pacotes retornados nao podem superar os pacotes da saida.");
                return;
            }

            const desconto = Number(data.desconto || 0);
            const submitButton = closeForm.querySelector('[type="submit"]');
            submitButton.disabled = true;
            try {
                const result = await window.rmsSupabase.closeRoute(route.id, retornados, desconto);
                Object.assign(route, result.route);
                if (result.warehouse_entry) state.entradasGalpao.push(result.warehouse_entry);
                closeForm.reset();
                fillRouteSelects();
                updateClosurePreview(closeForm);
                renderClosedRoutes();
                renderDashboard();
                renderWeek();
                renderPayments();
                renderWarehouse();
                toast("Fechamento salvo.");
            } catch (error) {
                console.error("Falha ao fechar saida:", error);
                toast(error.message || "Nao foi possivel fechar a saida. Atualize os dados e tente novamente.");
            } finally {
                submitButton.disabled = false;
            }
        });
    }

    const warehouseForm = document.querySelector('[data-form="warehouse"]');
    if (warehouseForm) {
        warehouseForm.elements.namedItem("data").value = today;
        warehouseForm.addEventListener("submit", async (event) => {
            event.preventDefault();
            const data = Object.fromEntries(new FormData(warehouseForm));
            const entry = {
                id: makeId(),
                data: data.data,
                quantidade: Number(data.quantidade),
                observacao: String(data.observacao || "").trim()
            };
            const submitButton = warehouseForm.querySelector('[type="submit"]');
            submitButton.disabled = true;
            try {
                const savedEntry = await window.rmsSupabase.registerWarehouseEntry(entry);
                state.entradasGalpao.push(savedEntry);
                warehouseForm.reset();
                warehouseForm.elements.namedItem("data").value = today;
                renderWarehouse();
                toast("Entrada de pacotes registrada.");
            } catch (error) {
                console.error("Falha ao registrar entrada:", error);
                toast(error.message || "Nao foi possivel registrar a entrada.");
            } finally {
                submitButton.disabled = false;
            }
        });
        warehouseForm.elements.namedItem("data").addEventListener("change", () => renderWarehouse());
    }

    const settingsForm = document.querySelector('[data-form="settings"]');
    if (settingsForm) {
        settingsForm.addEventListener("submit", (event) => {
            event.preventDefault();
            const data = Object.fromEntries(new FormData(settingsForm));
            state.settings = {
                empresa: data.empresa,
                operador: data.operador,
                valorPacote: Number(data.valorMoto),
                empresas: [...new Set(data.empresas.split(/\r?\n/).map((company) => company.trim()).filter(Boolean))],
                valoresVeiculo: {
                    moto: Number(data.valorMoto),
                    carro: Number(data.valorCarro),
                    van: Number(data.valorVan)
                }
            };
            saveData(state);
            renderShell(document.body.dataset.page);
            fillCompanySelects();
            toast("Configuracoes salvas.");
        });
    }

    const monthFilter = document.querySelector("[data-fortnight-month]");
    const halfFilter = document.querySelector("[data-fortnight-half]");
    if (monthFilter && halfFilter) {
        monthFilter.value = today.slice(0, 7);
        halfFilter.value = Number(today.slice(8, 10)) <= 15 ? "1" : "2";
        monthFilter.addEventListener("change", renderFortnight);
        halfFilter.addEventListener("change", renderFortnight);
    }

    const receiptForm = document.querySelector('[data-form="receipt"]');
    if (receiptForm) {
        receiptForm.elements.namedItem("data").value = today;
        receiptForm.addEventListener("submit", (event) => {
            event.preventDefault();
            const data = Object.fromEntries(new FormData(receiptForm));
            state.recebimentos.push({
                id: makeId(),
                data: data.data,
                empresa: data.empresa,
                valor: Number(data.valor),
                observacao: String(data.observacao || "").trim()
            });
            saveData(state);
            receiptForm.reset();
            receiptForm.elements.namedItem("data").value = today;
            renderFortnight();
            toast("Recebimento registrado.");
        });
    }
}

function setupActions() {
    document.addEventListener("click", (event) => {
        if (event.target.closest("[data-logout]")) {
            window.rmsSupabase.signOut();
            window.location.href = "index.html";
            return;
        }

        const menuToggle = event.target.closest("[data-mobile-menu-toggle]");
        if (menuToggle) {
            setMobileMenuOpen(menuToggle.getAttribute("aria-expanded") !== "true");
            return;
        }

        if (event.target.closest("[data-mobile-menu-close]")) {
            setMobileMenuOpen(false);
            return;
        }

        if (event.target.closest(".menu a") && document.body.classList.contains("menu-open")) {
            setMobileMenuOpen(false);
        }

        const editDriverButton = event.target.closest("[data-edit-driver]");
        if (editDriverButton) {
            const driver = getDriver(editDriverButton.dataset.editDriver);
            const driverForm = document.querySelector('[data-form="driver"]');
            if (driver && driverForm) startDriverEdit(driverForm, driver);
        }

        const cancelDriverButton = event.target.closest("[data-driver-cancel]");
        if (cancelDriverButton) {
            const driverForm = document.querySelector('[data-form="driver"]');
            if (driverForm) resetDriverForm(driverForm);
        }

        const toggleDriverButton = event.target.closest("[data-toggle-driver]");
        if (toggleDriverButton) {
            const driver = getDriver(toggleDriverButton.dataset.toggleDriver);
            if (driver) {
                driver.status = driver.status === "Ativo" ? "Inativo" : "Ativo";
                saveData(state);
                renderDrivers();
                toast("Status atualizado.");
            }
        }

        const payButton = event.target.closest("[data-pay-route]");
        if (payButton) {
            const route = state.routes.find((item) => item.id === payButton.dataset.payRoute);
            if (route) {
                if (route.pagamento === "Pago") {
                    route.pagamento = "Pendente";
                    delete route.dataPagamento;
                } else {
                    route.pagamento = "Pago";
                    route.dataPagamento = today;
                }
                saveData(state);
                renderPayments();
                renderFortnight();
                toast("Pagamento atualizado.");
            }
        }

        const resetButton = event.target.closest("[data-reset-system]");
        if (resetButton && confirm("Deseja apagar todos os dados do sistema?")) {
            window.rmsSupabase.clearBusinessData().then(() => {
                window.location.href = "index.html";
            }).catch((error) => {
                console.error("Falha ao limpar os dados:", error);
                toast("Nao foi possivel limpar os dados.");
            });
            return;
        }

        const exportButton = event.target.closest("[data-export-history]");
        if (exportButton) {
            exportHistory();
        }
    });

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && document.body.classList.contains("menu-open")) {
            setMobileMenuOpen(false);
        }
    });

    const search = document.querySelector("[data-search-history]");
    if (search) {
        search.addEventListener("input", () => renderHistory(search.value));
    }
}

function exportHistory() {
    const header = ["Data", "Entregador", "Empresa", "Veiculo", "Saida", "Entregues", "Retornados", "Valor", "Status"];
    const rows = state.routes.map((route) => {
        const driver = getDriver(route.driverId);
        return [
            formatDate(route.data),
            driver?.nome || "Entregador removido",
            route.empresa || "",
            route.veiculo || driver?.veiculo || "",
            Number(route.saida || 0),
            Math.max(0, Number(route.saida || 0) - Number(route.retornados || 0)),
            Number(route.retornados || 0),
            Number(routeTotal(route).toFixed(2)),
            route.status
        ];
    });

    const escapeXml = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&apos;"
    })[character]);
    const spreadsheetRows = [header, ...rows].map((row, rowIndex) => `
        <Row>${row.map((value, columnIndex) => {
            const isNumber = rowIndex > 0 && [4, 5, 6, 7].includes(columnIndex);
            const style = rowIndex === 0 ? ' ss:StyleID="Header"' : columnIndex === 7 ? ' ss:StyleID="Currency"' : "";
            const type = isNumber ? "Number" : "String";
            return `<Cell${style}><Data ss:Type="${type}">${escapeXml(value)}</Data></Cell>`;
        }).join("")}</Row>`).join("");
    const workbook = `<?xml version="1.0" encoding="UTF-8"?>
        <?mso-application progid="Excel.Sheet"?>
        <Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
            xmlns:o="urn:schemas-microsoft-com:office:office"
            xmlns:x="urn:schemas-microsoft-com:office:excel"
            xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
            <Styles>
                <Style ss:ID="Header"><Font ss:Bold="1"/><Interior ss:Color="#D9EAF7" ss:Pattern="Solid"/></Style>
                <Style ss:ID="Currency"><NumberFormat ss:Format="&quot;R$&quot; #,##0.00"/></Style>
            </Styles>
            <Worksheet ss:Name="Historico"><Table>${spreadsheetRows}</Table></Worksheet>
        </Workbook>`;
    const blob = new Blob([workbook], { type: "application/vnd.ms-excel;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "historico-rmslogis.xls";
    link.click();
    URL.revokeObjectURL(url);
}

function renderPage() {
    const page = document.body.dataset.page;
    if (!ensureLogged(page)) return;
    renderShell(page);
    setupForms();
    setupActions();
    fillDriverSelects();
    fillCompanySelects();
    fillRouteSelects();
    renderDashboard();
    renderDrivers();
    renderOpenRoutes();
    renderClosedRoutes();
    renderHistory();
    renderWeek();
    renderPayments();
    renderFortnight();
    renderSettings();
    renderWarehouse();
    const routeForm = document.querySelector('[data-form="route"]');
    if (routeForm) updateRoutePrice(routeForm);
    const closeForm = document.querySelector('[data-form="close-route"]');
    if (closeForm) updateClosurePreview(closeForm);
}

async function initializeApp() {
    if (!window.rmsSupabase.configured) {
        renderPage();
        if (document.body.dataset.page === "login") {
            toast("Configure a URL e a chave publica do Supabase.");
        }
        return;
    }

    try {
        const { data: { session }, error } = await window.rmsSupabase.getSession();
        if (error) throw error;
        if (session) {
            const profile = await window.rmsSupabase.getProfile();
            if (!profile) throw new Error("Perfil de usuario nao encontrado.");
            state.user = profile.user.email;
            state.role = profile.role;
            const loaded = await window.rmsSupabase.loadState(state);
            state = { ...state, ...loaded };
        }
    } catch (error) {
        console.error("Sessao invalida ou expirada:", error);
        await window.rmsSupabase.signOut().catch(() => {});
        state.user = null;
        state.role = null;
    }
    renderPage();
}

document.addEventListener("DOMContentLoaded", () => {
    initializeApp().catch((error) => {
        console.error("Falha ao iniciar o sistema:", error);
        toast("Falha ao conectar ao Supabase. Confira a configuracao do banco.");
    });
});
