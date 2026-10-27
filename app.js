const menuItems = [
    ["dashboard", "Dashboard", "dashboard.html"],
    ["entregadores", "Entregadores", "entregadores.html"],
    ["nova-saida", "Nova Saída", "nova_Saida.html"],
    ["fechamento", "Fechamento", "fechamento.html"],
    ["historico", "Historico", "historico.html"],
    ["relatorio-diario", "Relatório Diário", "relatorio_Diario.html"],
    ["fechamento-semanal", "Fechamento Semanal", "fechamento_Semanal.html"],
    ["fechamento-quinzenal", "Fechamento Quinzenal", "fechamento_Quinzenal.html"],
    ["pagamentos", "Pagamentos", "pagamentos.html"],
    ["funcionarios", "Funcionários", "funcionarios.html"],
    ["configuracoes", "Configurações", "configuracoes.html"]
];

const today = (() => {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${now.getFullYear()}-${month}-${day}`;
})();

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
    entradasGalpao: [],
    funcionarios: []
};

function loadData() {
    return JSON.parse(JSON.stringify(seedData));
}

function saveData(data) {
    return window.rmsSupabase.saveState(data, state.role).then(() => true).catch((error) => {
        console.error("Falha ao salvar no Supabase:", error);
        toast("ATENÇÃO: a alteração NÃO foi salva. Recarregue a página e tente novamente.", 8000);
        return false;
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

function sortedByName(list) {
    return list.slice().sort((a, b) => String(a.nome || "")
        .localeCompare(String(b.nome || ""), "pt-BR", { sensitivity: "base" }));
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

function dailyStock(date, company) {
    const matches = (item) => company === undefined || item.empresa === company;
    const received = state.entradasGalpao
        .filter((entry) => entry.data === date && matches(entry))
        .reduce((sum, entry) => sum + Number(entry.quantidade || 0), 0);
    const dispatched = state.routes
        .filter((route) => route.data === date && matches(route))
        .reduce((sum, route) => sum + Number(route.saida || 0), 0);
    return { received, dispatched, available: received - dispatched };
}

function setText(selector, value) {
    document.querySelectorAll(selector).forEach((element) => {
        element.textContent = value;
    });
}

function toast(message, duration = 2800) {
    const oldToast = document.querySelector(".toast");
    if (oldToast) oldToast.remove();

    const element = document.createElement("div");
    element.className = "toast";
    element.textContent = message;
    document.body.appendChild(element);
    setTimeout(() => element.remove(), duration);
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
            ? menuItems.filter(([key]) => ["dashboard", "entregadores", "nova-saida", "fechamento"].includes(key))
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

    const operatorPages = ["dashboard", "entregadores", "nova-saida", "fechamento"];
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
                <td>${escapeHtml(driver?.nome || "Entregador removido")}</td>
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

function driverDocumentsCell(driver) {
    const buttons = [];
    if (driver.docIdentidade) {
        buttons.push(`<button class="btn btn-small btn-muted" data-open-doc="${escapeHtml(driver.id)}" data-doc-kind="identidade" type="button">Identidade</button>`);
    }
    if (driver.docResidencia) {
        buttons.push(`<button class="btn btn-small btn-muted" data-open-doc="${escapeHtml(driver.id)}" data-doc-kind="residencia" type="button">Residência</button>`);
    }
    const missing = [
        !driver.docIdentidade && "identidade",
        !driver.docResidencia && "residência"
    ].filter(Boolean);
    const pending = missing.length ? `<span class="form-help">Pendente: ${missing.join(", ")}</span>` : "";
    return `<td class="table-actions" data-admin-only>${buttons.join("")}${buttons.length && pending ? "<br>" : ""}${pending}</td>`;
}

function renderDrivers() {
    const tbody = document.querySelector("[data-drivers-table]");
    if (!tbody) return;

    setText("[data-driver-count]", `${state.drivers.length} cadastrados`);

    if (!state.drivers.length) {
        renderEmpty(tbody, 9, "Nenhum entregador cadastrado.");
        return;
    }

    tbody.innerHTML = sortedByName(state.drivers).map((driver) => `
        <tr>
            <td>${escapeHtml(driver.nome)}</td>
            <td data-admin-only>${escapeHtml(driver.cpf || "-")}</td>
            <td>${escapeHtml(driver.telefone)}</td>
            <td data-admin-only>${escapeHtml(driver.email || "-")}</td>
            <td>${escapeHtml(driver.veiculo)}</td>
            <td data-admin-only>${driver.pixChave
                ? `<span class="pix-type">${escapeHtml(driver.pixTipo || "Chave")}</span><span class="pix-key">${escapeHtml(driver.pixChave)}</span>`
                : "Sem chave cadastrada"}</td>
            <td><span class="status ${driver.status === "Ativo" ? "status-ativo" : "status-inativo"}">${driver.status}</span></td>
            ${driverDocumentsCell(driver)}
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
        const activeDrivers = sortedByName(state.drivers.filter((driver) => driver.status === "Ativo"));
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
                <td>${escapeHtml(driver?.nome || "Entregador removido")}</td>
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
                <td>${escapeHtml(driver?.nome || "Entregador removido")}</td>
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
    const sortKey = document.querySelector("[data-sort-history]")?.value || "date-desc";
    const nameOf = (route) => getDriver(route.driverId)?.nome || "";
    const compareText = (a, b) => String(a).localeCompare(String(b), "pt-BR", { sensitivity: "base" });
    const compareDate = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
    const sorters = {
        "date-desc": (a, b) => compareDate(b.route.data, a.route.data) || b.index - a.index,
        "date-asc": (a, b) => compareDate(a.route.data, b.route.data) || a.index - b.index,
        "driver-asc": (a, b) => compareText(nameOf(a.route), nameOf(b.route)) || compareDate(b.route.data, a.route.data),
        "driver-desc": (a, b) => compareText(nameOf(b.route), nameOf(a.route)) || compareDate(b.route.data, a.route.data),
        "company-asc": (a, b) => compareText(a.route.empresa || "", b.route.empresa || "") || compareDate(b.route.data, a.route.data),
        "value-desc": (a, b) => routeTotal(b.route) - routeTotal(a.route) || b.index - a.index,
        "value-asc": (a, b) => routeTotal(a.route) - routeTotal(b.route) || b.index - a.index,
        "packages-desc": (a, b) => Number(b.route.saida || 0) - Number(a.route.saida || 0) || b.index - a.index,
        "packages-asc": (a, b) => Number(a.route.saida || 0) - Number(b.route.saida || 0) || b.index - a.index
    };

    const rows = state.routes
        .map((route, index) => ({ route, index }))
        .filter(({ route }) => {
            const driver = getDriver(route.driverId);
            const text = `${driver?.nome || ""} ${route.empresa || ""} ${route.data} ${route.status}`.toLowerCase();
            return text.includes(term);
        })
        .sort(sorters[sortKey] || sorters["date-desc"])
        .map(({ route }) => route);

    setText("[data-history-count]", `${rows.length} registros`);

    if (!rows.length) {
        renderEmpty(tbody, 9, "Nenhum registro encontrado.");
        return;
    }

    tbody.innerHTML = rows.map((route) => {
        const driver = getDriver(route.driverId);
        const statusClass = route.status === "Fechado" ? "status-fechado" : "status-aberto";
        return `
            <tr>
                <td>${formatDate(route.data)}</td>
                <td>${escapeHtml(driver?.nome || "Entregador removido")}</td>
                <td>${escapeHtml(route.empresa || "-")}</td>
                <td>${route.saida}</td>
                <td>${Math.max(0, Number(route.saida || 0) - Number(route.retornados || 0))}</td>
                <td>${route.retornados || 0}</td>
                <td>${money(routeTotal(route))}</td>
                <td><span class="status ${statusClass}">${route.status}</span>${route.edicoes?.length ? ' <span class="form-help">editada</span>' : ""}</td>
                <td class="table-actions">${route.pagamento === "Pago"
                    ? '<span class="form-help">Pago</span>'
                    : `<button class="btn btn-small btn-secondary" data-edit-route="${escapeHtml(route.id)}" type="button">Editar</button>
                       <button class="btn btn-small btn-danger" data-delete-route="${escapeHtml(route.id)}" type="button">Excluir</button>`}</td>
            </tr>
        `;
    }).join("");
}

async function removeRoute(routeId) {
    try {
        const result = await window.rmsSupabase.deleteRoute(routeId);
        state.routes = state.routes.filter((route) => route.id !== routeId);
        if (result.removed_entry_id) {
            state.entradasGalpao = state.entradasGalpao.filter((entry) => entry.id !== result.removed_entry_id);
        }
        const editForm = document.querySelector('[data-form="route-edit"]');
        if (editForm && editForm.elements.namedItem("routeId").value === routeId) closeRouteEdit();
        renderHistory(document.querySelector("[data-search-history]")?.value || "");
        toast("Saída excluída.");
    } catch (error) {
        console.error("Falha ao excluir saída:", error);
        toast(error.code === "P0001"
            ? error.message
            : "Não foi possível excluir a saída. Tente novamente.", 6000);
    }
}

const XLSX_STYLE = { header: 1, money: 2, date: 3, bold: 4, boldMoney: 5 };

function xlsxColumnName(index) {
    let name = "";
    let number = index + 1;
    while (number > 0) {
        const remainder = (number - 1) % 26;
        name = String.fromCharCode(65 + remainder) + name;
        number = Math.floor((number - 1) / 26);
    }
    return name;
}

function xlsxEscape(value) {
    return String(value ?? "")
        .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
        .replace(/[&<>"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[character]);
}

function xlsxDateSerial(isoDate) {
    const [year, month, day] = String(isoDate).split("-").map(Number);
    return Math.round((Date.UTC(year, month - 1, day) - Date.UTC(1899, 11, 30)) / 86400000);
}

function xlsxCell(input, columnIndex, rowIndex) {
    const ref = `${xlsxColumnName(columnIndex)}${rowIndex + 1}`;
    const cell = input !== null && typeof input === "object" ? input : { value: input };
    const style = cell.style ? ` s="${XLSX_STYLE[cell.style]}"` : "";
    const value = cell.value;
    if (value === null || value === undefined || value === "") {
        return style ? `<c r="${ref}"${style}/>` : "";
    }
    if (cell.style === "date") return `<c r="${ref}"${style}><v>${xlsxDateSerial(value)}</v></c>`;
    if (typeof value === "number") return `<c r="${ref}"${style}><v>${value}</v></c>`;
    return `<c r="${ref}"${style} t="inlineStr"><is><t xml:space="preserve">${xlsxEscape(value)}</t></is></c>`;
}

function xlsxSheetXml(sheet) {
    const columns = (sheet.widths || [])
        .map((width, index) => `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`)
        .join("");
    const rows = sheet.rows
        .map((row, rowIndex) => `<row r="${rowIndex + 1}">${row.map((cell, columnIndex) => xlsxCell(cell, columnIndex, rowIndex)).join("")}</row>`)
        .join("");
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>`
        + `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">`
        + `<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>`
        + (columns ? `<cols>${columns}</cols>` : "")
        + `<sheetData>${rows}</sheetData></worksheet>`;
}

const XLSX_STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>`
    + `<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">`
    + `<numFmts count="2"><numFmt numFmtId="164" formatCode="&quot;R$&quot; #,##0.00"/><numFmt numFmtId="165" formatCode="dd/mm/yyyy"/></numFmts>`
    + `<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>`
    + `<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>`
    + `<fill><patternFill patternType="solid"><fgColor rgb="FFD9EAF7"/><bgColor indexed="64"/></patternFill></fill></fills>`
    + `<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>`
    + `<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>`
    + `<cellXfs count="6">`
    + `<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>`
    + `<xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/>`
    + `<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>`
    + `<xf numFmtId="165" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>`
    + `<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>`
    + `<xf numFmtId="164" fontId="1" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyFont="1"/>`
    + `</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;

const CRC_TABLE = (() => {
    const table = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
        table[n] = c >>> 0;
    }
    return table;
})();

function crc32(bytes) {
    let crc = 0xFFFFFFFF;
    for (let i = 0; i < bytes.length; i++) crc = CRC_TABLE[(crc ^ bytes[i]) & 0xFF] ^ (crc >>> 8);
    return (crc ^ 0xFFFFFFFF) >>> 0;
}

function zipStore(files, mimeType) {
    const encoder = new TextEncoder();
    const u16 = (value) => [value & 255, (value >>> 8) & 255];
    const u32 = (value) => [value & 255, (value >>> 8) & 255, (value >>> 16) & 255, (value >>> 24) & 255];
    const dosDate = ((2024 - 1980) << 9) | (1 << 5) | 1;
    const chunks = [];
    const central = [];
    let offset = 0;

    for (const file of files) {
        const name = encoder.encode(file.name);
        const data = encoder.encode(file.content);
        const crc = crc32(data);
        const header = new Uint8Array([
            ...u32(0x04034b50), ...u16(20), ...u16(0x0800), ...u16(0), ...u16(0), ...u16(dosDate),
            ...u32(crc), ...u32(data.length), ...u32(data.length), ...u16(name.length), ...u16(0)
        ]);
        chunks.push(header, name, data);
        central.push({ name, crc, size: data.length, offset });
        offset += header.length + name.length + data.length;
    }

    const centralStart = offset;
    for (const entry of central) {
        const header = new Uint8Array([
            ...u32(0x02014b50), ...u16(20), ...u16(20), ...u16(0x0800), ...u16(0), ...u16(0), ...u16(dosDate),
            ...u32(entry.crc), ...u32(entry.size), ...u32(entry.size), ...u16(entry.name.length),
            ...u16(0), ...u16(0), ...u16(0), ...u16(0), ...u32(0), ...u32(entry.offset)
        ]);
        chunks.push(header, entry.name);
        offset += header.length + entry.name.length;
    }
    chunks.push(new Uint8Array([
        ...u32(0x06054b50), ...u16(0), ...u16(0), ...u16(central.length), ...u16(central.length),
        ...u32(offset - centralStart), ...u32(centralStart), ...u16(0)
    ]));
    return new Blob(chunks, { type: mimeType });
}

function buildXlsxBlob(sheets) {
    const safeName = (name, index) => (String(name || `Planilha${index + 1}`).replace(/[\[\]:*?\/\\]/g, " ").slice(0, 31));
    const files = [
        {
            name: "[Content_Types].xml",
            content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>`
                + `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">`
                + `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>`
                + `<Default Extension="xml" ContentType="application/xml"/>`
                + `<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>`
                + sheets.map((_, index) => `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("")
                + `<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>`
                + `</Types>`
        },
        {
            name: "_rels/.rels",
            content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>`
                + `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">`
                + `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>`
                + `</Relationships>`
        },
        {
            name: "xl/workbook.xml",
            content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>`
                + `<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">`
                + `<sheets>${sheets.map((sheet, index) => `<sheet name="${xlsxEscape(safeName(sheet.name, index))}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`).join("")}</sheets>`
                + `</workbook>`
        },
        {
            name: "xl/_rels/workbook.xml.rels",
            content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>`
                + `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">`
                + sheets.map((_, index) => `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`).join("")
                + `<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>`
                + `</Relationships>`
        },
        { name: "xl/styles.xml", content: XLSX_STYLES },
        ...sheets.map((sheet, index) => ({ name: `xl/worksheets/sheet${index + 1}.xml`, content: xlsxSheetXml(sheet) }))
    ];
    return zipStore(files, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
}

function downloadXlsx(filename, sheets) {
    const url = URL.createObjectURL(buildXlsxBlob(sheets));
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function shiftDate(isoDate, days) {
    const [year, month, day] = isoDate.split("-").map(Number);
    const date = new Date(year, month - 1, day + days);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function pixCell(driver) {
    return driver?.pixChave
        ? `<span class="pix-type">${escapeHtml(driver.pixTipo || "Chave")}</span><span class="pix-key">${escapeHtml(driver.pixChave)}</span>`
        : "Sem chave cadastrada";
}

function weekRange() {
    const startInput = document.querySelector("[data-week-start]");
    const endInput = document.querySelector("[data-week-end]");
    const weekday = new Date(`${today}T00:00:00`).getDay();
    const mondayOffset = weekday === 0 ? -6 : 1 - weekday;
    let start = startInput?.value || "";
    let end = endInput?.value || "";

    if (!start && !end) {
        start = shiftDate(today, mondayOffset);
        end = shiftDate(start, 6);
    } else if (!start) {
        start = shiftDate(end, -6);
    } else if (!end) {
        end = shiftDate(start, 6);
    }
    return { start, end };
}

function weekdayName(isoDate) {
    const [year, month, day] = isoDate.split("-").map(Number);
    const name = new Date(year, month - 1, day).toLocaleDateString("pt-BR", { weekday: "long" });
    return name.charAt(0).toUpperCase() + name.slice(1);
}

function weekData() {
    const range = weekRange();
    const compareText = (a, b) => String(a).localeCompare(String(b), "pt-BR", { sensitivity: "base" });
    const routes = state.routes.filter((route) => (
        route.status === "Fechado" && route.data >= range.start && route.data <= range.end
    ));

    const groups = new Map();
    routes.forEach((route) => {
        const key = `${route.driverId}|${route.empresa || ""}`;
        const item = groups.get(key) || {
            key, driverId: route.driverId, empresa: route.empresa || "-", dates: new Set(),
            saidas: 0, entregues: 0, retornados: 0, total: 0
        };
        item.dates.add(route.data);
        item.saidas += Number(route.saida || 0);
        item.entregues += Math.max(0, Number(route.saida || 0) - Number(route.retornados || 0));
        item.retornados += Number(route.retornados || 0);
        item.total += routeTotal(route);
        groups.set(key, item);
    });

    const summary = [...groups.values()]
        .map((item) => ({ ...item, driver: getDriver(item.driverId), dates: [...item.dates].sort() }))
        .sort((a, b) => compareText(a.driver?.nome || "", b.driver?.nome || "") || compareText(a.empresa, b.empresa));
    const detail = routes.slice().sort((a, b) => (
        (a.data < b.data ? -1 : a.data > b.data ? 1 : 0)
        || compareText(getDriver(a.driverId)?.nome || "", getDriver(b.driverId)?.nome || "")
    ));

    const days = [];
    for (let date = range.start; date <= range.end; date = shiftDate(date, 1)) {
        const dayRoutes = routes.filter((route) => route.data === date);
        days.push({
            date,
            weekday: weekdayName(date),
            saidas: dayRoutes.reduce((sum, route) => sum + Number(route.saida || 0), 0),
            entregues: dayRoutes.reduce((sum, route) => sum + Math.max(0, Number(route.saida || 0) - Number(route.retornados || 0)), 0),
            retornados: dayRoutes.reduce((sum, route) => sum + Number(route.retornados || 0), 0),
            valor: dayRoutes.reduce((sum, route) => sum + routeTotal(route), 0)
        });
    }
    return { range, routes, summary, detail, days };
}

function renderWeek() {
    const { range, routes, summary, detail, days } = weekData();

    setText("[data-week-period]", `${formatDate(range.start)} a ${formatDate(range.end)}`);
    setText('[data-week="delivered"]', routes.reduce((sum, route) => sum + Number(route.entregues || 0), 0));
    setText('[data-week="returned"]', routes.reduce((sum, route) => sum + Number(route.retornados || 0), 0));
    setText('[data-week="value"]', money(routes.reduce((sum, route) => sum + routeTotal(route), 0)));
    setText('[data-week="drivers"]', new Set(routes.map((route) => route.driverId)).size);

    const tbody = document.querySelector("[data-week-table]");
    if (tbody) {
        if (!summary.length) {
            renderEmpty(tbody, 8, "Nenhum fechamento neste período.");
        } else {
            tbody.innerHTML = summary.map((item) => `
                <tr>
                    <td>${escapeHtml(item.driver?.nome || "Entregador removido")}</td>
                    <td>${pixCell(item.driver)}</td>
                    <td>${escapeHtml(item.empresa)}</td>
                    <td>${item.dates.map(formatDate).join(", ")}</td>
                    <td>${item.saidas}</td>
                    <td>${item.entregues}</td>
                    <td>${item.retornados}</td>
                    <td>${money(item.total)}</td>
                </tr>
            `).join("");
        }
    }

    const daysBody = document.querySelector("[data-week-days-table]");
    if (daysBody) {
        const totalOf = (field) => days.reduce((sum, day) => sum + day[field], 0);
        daysBody.innerHTML = days.map((day) => `
            <tr>
                <td>${formatDate(day.date)}</td>
                <td>${day.weekday}</td>
                <td>${day.saidas}</td>
                <td>${day.entregues}</td>
                <td>${day.retornados}</td>
                <td>${money(day.valor)}</td>
            </tr>
        `).join("") + `
            <tr>
                <td><strong>Total</strong></td>
                <td></td>
                <td><strong>${totalOf("saidas")}</strong></td>
                <td><strong>${totalOf("entregues")}</strong></td>
                <td><strong>${totalOf("retornados")}</strong></td>
                <td><strong>${money(totalOf("valor"))}</strong></td>
            </tr>
        `;
    }

    const detailBody = document.querySelector("[data-week-routes-table]");
    if (detailBody) {
        if (!detail.length) {
            renderEmpty(detailBody, 9, "Nenhum fechamento neste período.");
        } else {
            detailBody.innerHTML = detail.map((route) => {
                const driver = getDriver(route.driverId);
                const isPaid = route.pagamento === "Pago";
                return `
                <tr>
                    <td>${formatDate(route.data)}</td>
                    <td>${escapeHtml(driver?.nome || "Entregador removido")}</td>
                    <td>${pixCell(driver)}</td>
                    <td>${escapeHtml(route.empresa || "-")}</td>
                    <td>${route.saida}</td>
                    <td>${Math.max(0, Number(route.saida || 0) - Number(route.retornados || 0))}</td>
                    <td>${route.retornados || 0}</td>
                    <td>${money(routeTotal(route))}</td>
                    <td><span class="status ${isPaid ? "status-pago" : "status-pendente"}">${isPaid ? "Pago" : "Pendente"}</span></td>
                </tr>`;
            }).join("");
        }
    }
}

function dailyMatrix(summary, routes, days, pick) {
    const dayHeader = (day) => `${day.date.slice(8)}/${day.date.slice(5, 7)} ${day.weekday.slice(0, 3).toLowerCase()}`;
    const header = ["Entregador", "Empresa", ...days.map(dayHeader), "Total"]
        .map((value) => ({ value, style: "header" }));
    const rows = summary.map((item) => {
        const values = days.map((day) => {
            const items = routes.filter((route) => `${route.driverId}|${route.empresa || ""}` === item.key && route.data === day.date);
            return items.length ? items.reduce((sum, route) => sum + pick(route), 0) : "";
        });
        const total = values.reduce((sum, value) => sum + (value === "" ? 0 : value), 0);
        return [item.driver?.nome || "Entregador removido", item.empresa, ...values, { value: total, style: "bold" }];
    });
    const totals = days.map((_, index) => rows.reduce((sum, row) => sum + (row[index + 2] === "" ? 0 : row[index + 2]), 0));
    return [
        header,
        ...rows,
        [
            { value: "Total", style: "bold" }, "",
            ...totals.map((value) => ({ value, style: "bold" })),
            { value: totals.reduce((sum, value) => sum + value, 0), style: "bold" }
        ]
    ];
}

function exportWeek() {
    const { range, summary, detail, days } = weekData();
    if (!detail.length) {
        toast("Não há fechamentos neste período para exportar.");
        return;
    }
    const header = (labels) => labels.map((value) => ({ value, style: "header" }));
    const sum = (list, pick) => list.reduce((total, item) => total + pick(item), 0);

    const dailyHeaders = days.map((day) => `Pacotes ${day.date.slice(8)}/${day.date.slice(5, 7)}`);
    const summaryRows = [
        header(["Entregador", "Tipo da chave Pix", "Chave Pix", "Empresa", "Datas das rotas", ...dailyHeaders, "Saídas no período", "Entregues", "Retornados", "Total (R$)"]),
        ...summary.map((item) => {
            const itemRoutes = detail.filter((route) => `${route.driverId}|${route.empresa || ""}` === item.key);
            const dailyPackages = days.map((day) => itemRoutes
                .filter((route) => route.data === day.date)
                .reduce((total, route) => total + Number(route.saida || 0), 0));
            return [
                item.driver?.nome || "Entregador removido",
                item.driver?.pixTipo || "",
                item.driver?.pixChave || "",
                item.empresa,
                item.dates.map(formatDate).join(", "),
                ...dailyPackages,
                item.saidas,
                item.entregues,
                item.retornados,
                { value: Number(item.total.toFixed(2)), style: "money" }
            ];
        }),
        [
            { value: "Total", style: "bold" }, "", "", "", "",
            ...days.map((day) => ({ value: day.saidas, style: "bold" })),
            { value: sum(summary, (item) => item.saidas), style: "bold" },
            { value: sum(summary, (item) => item.entregues), style: "bold" },
            { value: sum(summary, (item) => item.retornados), style: "bold" },
            { value: Number(sum(summary, (item) => item.total).toFixed(2)), style: "boldMoney" }
        ]
    ];
    const daysSum = (field) => days.reduce((total, day) => total + day[field], 0);
    const daysRows = [
        header(["Data", "Dia da semana", "Saídas", "Entregues", "Retornados", "Valor (R$)"]),
        ...days.map((day) => [
            { value: day.date, style: "date" },
            day.weekday,
            day.saidas,
            day.entregues,
            day.retornados,
            { value: Number(day.valor.toFixed(2)), style: "money" }
        ]),
        [
            { value: "Total", style: "bold" }, "",
            { value: daysSum("saidas"), style: "bold" },
            { value: daysSum("entregues"), style: "bold" },
            { value: daysSum("retornados"), style: "bold" },
            { value: Number(daysSum("valor").toFixed(2)), style: "boldMoney" }
        ]
    ];

    const detailRows = [
        header(["Data", "Entregador", "Tipo da chave Pix", "Chave Pix", "Empresa", "Saída", "Entregues", "Retornados", "Desconto (R$)", "Valor (R$)", "Pagamento"]),
        ...detail.map((route) => {
            const driver = getDriver(route.driverId);
            return [
                { value: route.data, style: "date" },
                driver?.nome || "Entregador removido",
                driver?.pixTipo || "",
                driver?.pixChave || "",
                route.empresa || "",
                Number(route.saida || 0),
                Math.max(0, Number(route.saida || 0) - Number(route.retornados || 0)),
                Number(route.retornados || 0),
                { value: Number(Number(route.desconto || 0).toFixed(2)), style: "money" },
                { value: Number(routeTotal(route).toFixed(2)), style: "money" },
                route.pagamento === "Pago" ? "Pago" : "Pendente"
            ];
        })
    ];

    const delivered = (route) => Math.max(0, Number(route.saida || 0) - Number(route.retornados || 0));
    const dispatched = (route) => Number(route.saida || 0);

    downloadXlsx(`fechamento-semanal-${range.start}-a-${range.end}.xlsx`, [
        { name: "Resumo por entregador", widths: [28, 18, 30, 24, 44, ...days.map(() => 13), 14, 11, 12, 14], rows: summaryRows },
        { name: "Total por dia", widths: [12, 16, 10, 11, 12, 14], rows: daysRows },
        { name: "Entregues por dia", widths: [28, 24, ...days.map(() => 11), 11], rows: dailyMatrix(summary, detail, days, delivered) },
        { name: "Saidas por dia", widths: [28, 24, ...days.map(() => 11), 11], rows: dailyMatrix(summary, detail, days, dispatched) },
        { name: "Rotas", widths: [12, 28, 18, 30, 24, 9, 11, 12, 14, 14, 12], rows: detailRows }
    ]);
}

function paymentFilter() {
    return {
        from: document.querySelector("[data-pay-from]")?.value || "",
        to: document.querySelector("[data-pay-to]")?.value || "",
        status: document.querySelector("[data-pay-status]")?.value || ""
    };
}

function updatePaymentSelection() {
    const boxes = [...document.querySelectorAll("[data-select-route]")];
    const checked = boxes.filter((box) => box.checked);
    const total = checked.reduce((sum, box) => {
        const route = state.routes.find((item) => item.id === box.value);
        return sum + (route ? routeTotal(route) : 0);
    }, 0);
    setText("[data-pay-selected]", `${checked.length} selecionada(s) - ${money(total)}`);
    const selectAll = document.querySelector("[data-pay-select-all]");
    if (selectAll) {
        selectAll.checked = boxes.length > 0 && checked.length === boxes.length;
        selectAll.indeterminate = checked.length > 0 && checked.length < boxes.length;
    }
}

function renderPayments() {
    const tbody = document.querySelector("[data-payments-table]");
    if (!tbody) return;

    const { from, to, status } = paymentFilter();
    const closedRoutes = state.routes.filter((route) => (
        route.status === "Fechado"
        && (!from || route.data >= from)
        && (!to || route.data <= to)
    ));
    const pending = closedRoutes.filter((route) => route.pagamento !== "Pago");
    const paid = closedRoutes.filter((route) => route.pagamento === "Pago");

    setText('[data-payments="pending"]', money(pending.reduce((sum, route) => sum + routeTotal(route), 0)));
    setText('[data-payments="paid"]', money(paid.reduce((sum, route) => sum + routeTotal(route), 0)));

    const rows = closedRoutes
        .filter((route) => !status || (status === "pago") === (route.pagamento === "Pago"))
        .map((route, index) => ({ route, index }))
        .sort((a, b) => (a.route.data < b.route.data ? 1 : a.route.data > b.route.data ? -1 : 0) || b.index - a.index)
        .map(({ route }) => route);

    setText("[data-payment-count]", `${rows.length} itens`);

    if (!rows.length) {
        renderEmpty(tbody, 7, "Nenhum fechamento encontrado para este filtro.");
        updatePaymentSelection();
        return;
    }

    tbody.innerHTML = rows.map((route) => {
        const driver = getDriver(route.driverId);
        const isPaid = route.pagamento === "Pago";
        return `
            <tr>
                <td><input type="checkbox" data-select-route value="${escapeHtml(route.id)}" aria-label="Selecionar saída"></td>
                <td>${formatDate(route.data)}</td>
                <td>${escapeHtml(driver?.nome || "Entregador removido")}</td>
                <td>${pixCell(driver)}</td>
                <td>${money(routeTotal(route))}</td>
                <td><span class="status ${isPaid ? "status-pago" : "status-pendente"}">${isPaid ? "Pago" : "Pendente"}</span>${isPaid && route.dataPagamento ? `<span class="pix-type">em ${formatDate(route.dataPagamento)}</span>` : ""}</td>
                <td class="table-actions">
                    <button class="btn btn-small ${isPaid ? "btn-muted" : "btn-primary"}" data-pay-route="${escapeHtml(route.id)}" type="button">
                        ${isPaid ? "Desfazer" : "Marcar pago"}
                    </button>
                </td>
            </tr>
        `;
    }).join("");
    updatePaymentSelection();
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

function renderCompanyStock(date) {
    const tbody = document.querySelector("[data-company-stock-table]");
    if (!tbody) return;
    setText("[data-company-stock-date]", formatDate(date));

    const entries = state.entradasGalpao.filter((entry) => entry.data === date);
    const routes = state.routes.filter((route) => route.data === date);
    const names = [...new Set([
        ...(state.settings.empresas || []),
        ...entries.map((entry) => entry.empresa),
        ...routes.map((route) => route.empresa)
    ].filter(Boolean))];
    const rows = names.map((name) => ({ name, ...dailyStock(date, name) }));

    const noCompanyReceived = entries
        .filter((entry) => !entry.empresa)
        .reduce((sum, entry) => sum + Number(entry.quantidade || 0), 0);
    const noCompanyDispatched = routes
        .filter((route) => !route.empresa)
        .reduce((sum, route) => sum + Number(route.saida || 0), 0);
    if (noCompanyReceived > 0 || noCompanyDispatched > 0) {
        rows.push({
            name: "Sem empresa",
            received: noCompanyReceived,
            dispatched: noCompanyDispatched,
            available: noCompanyReceived - noCompanyDispatched
        });
    }

    if (!rows.length) {
        renderEmpty(tbody, 4, "Nenhuma empresa cadastrada. Cadastre em Configurações.");
        return;
    }

    const total = rows.reduce((sum, row) => ({
        received: sum.received + row.received,
        dispatched: sum.dispatched + row.dispatched,
        available: sum.available + row.available
    }), { received: 0, dispatched: 0, available: 0 });

    tbody.innerHTML = rows.map((row) => `
        <tr>
            <td>${escapeHtml(row.name)}</td>
            <td>${row.received}</td>
            <td>${row.dispatched}</td>
            <td>${row.available}</td>
        </tr>
    `).join("") + `
        <tr>
            <td><strong>Total</strong></td>
            <td><strong>${total.received}</strong></td>
            <td><strong>${total.dispatched}</strong></td>
            <td><strong>${total.available}</strong></td>
        </tr>
    `;
}

function renderWarehouse() {
    const dateInput = document.querySelector('[data-form="warehouse"]')?.elements.namedItem("data");
    const date = dateInput?.value || today;
    renderCompanyStock(date);
    setText("[data-stock-date]", formatDate(date));
    const stock = dailyStock(date);
    setText("[data-stock-received]", stock.received);
    setText("[data-stock-dispatched]", stock.dispatched);
    setText("[data-stock-available]", stock.available);

    const tbody = document.querySelector("[data-warehouse-table]");
    if (!tbody) return;
    const entries = state.entradasGalpao.filter((entry) => entry.data === date).slice().reverse();
    if (!entries.length) {
        renderEmpty(tbody, 5, "Nenhuma entrada registrada para esta data.");
        return;
    }
    tbody.innerHTML = entries.map((entry) => {
        const manual = !entry.origem && !entry.routeId;
        return `
        <tr>
            <td>${escapeHtml(entry.empresa || "Sem empresa")}</td>
            <td>${entry.quantidade}</td>
            <td>${manual ? "Manual" : "Retorno de rota"}</td>
            <td>${escapeHtml(entry.observacao || "-")}</td>
            <td class="table-actions">${manual
                ? `<button class="btn btn-small btn-secondary" data-edit-entry="${escapeHtml(entry.id)}" type="button">Editar</button>
                   <button class="btn btn-small btn-danger" data-delete-entry="${escapeHtml(entry.id)}" type="button">Excluir</button>`
                : '<span class="form-help">Edite pela saída no Histórico</span>'}</td>
        </tr>`;
    }).join("");
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
    const company = routeForm.elements.namedItem("empresa").value;
    const stock = dailyStock(date, company);
    const quantity = routeForm.elements.namedItem("saida");
    quantity.removeAttribute("max");
    setText("[data-route-stock]", stock.available);

    const warning = document.querySelector("[data-stock-warning]");
    const entryLink = document.querySelector("[data-stock-entry-link]");
    if (!company) {
        if (warning) warning.hidden = true;
        if (entryLink) entryLink.hidden = true;
        return;
    }
    if (warning) {
        warning.hidden = stock.available > 0;
        warning.textContent = stock.received > 0
            ? `O saldo de ${company} nesta data já foi totalmente liberado em outras saídas.`
            : `Nenhuma entrada de pacotes foi registrada para ${company} nesta data.`;
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

const PRIVATE_DRIVER_FIELDS = ["cpf", "cnh", "endereco", "email", "pixTipo", "pixChave", "arquivoIdentidade", "arquivoResidencia"];

function setDriverPrivateFields(driverForm, visible) {
    for (const name of PRIVATE_DRIVER_FIELDS) {
        const field = driverForm.elements.namedItem(name);
        if (!field) continue;
        if (field.dataset.wasRequired === undefined) field.dataset.wasRequired = field.required ? "1" : "0";
        const label = field.closest("label");
        if (label) label.style.display = visible ? "" : "none";
        field.required = visible && field.dataset.wasRequired === "1";
    }
}

const DOCUMENT_FIELDS = [
    ["identidade", "docIdentidade", "arquivoIdentidade"],
    ["residencia", "docResidencia", "arquivoResidencia"]
];
const DOCUMENT_TYPES = ["image/jpeg", "image/png", "application/pdf"];
const DOCUMENT_MAX_BYTES = 2 * 1024 * 1024;
const DOCUMENT_MAX_SIDE = 1600;

function documentError(message) {
    const error = new Error(message);
    error.userMessage = message;
    return error;
}

function loadImageFile(file) {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const image = new Image();
        image.onload = () => {
            URL.revokeObjectURL(url);
            resolve(image);
        };
        image.onerror = () => {
            URL.revokeObjectURL(url);
            reject(documentError("Não foi possível ler a imagem. Tente outro arquivo (JPG, PNG ou PDF)."));
        };
        image.src = url;
    });
}

function canvasToBlob(canvas, type, quality) {
    return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

async function prepareDocument(file) {
    if (!DOCUMENT_TYPES.includes(file.type)) {
        throw documentError("Formato não aceito. Envie PDF, JPG ou PNG.");
    }
    if (file.type === "application/pdf") {
        if (file.size > DOCUMENT_MAX_BYTES) {
            throw documentError("O PDF passa de 2 MB. Reduza o arquivo ou envie uma foto do documento.");
        }
        return { blob: file, type: "application/pdf", ext: "pdf" };
    }

    const image = await loadImageFile(file);
    const scale = Math.min(1, DOCUMENT_MAX_SIDE / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext("2d");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    let quality = 0.8;
    let blob = await canvasToBlob(canvas, "image/jpeg", quality);
    while (blob && blob.size > DOCUMENT_MAX_BYTES && quality > 0.4) {
        quality -= 0.1;
        blob = await canvasToBlob(canvas, "image/jpeg", quality);
    }
    if (!blob || blob.size > DOCUMENT_MAX_BYTES) {
        throw documentError("Não foi possível reduzir a imagem. Tente uma foto menor.");
    }
    return { blob, type: "image/jpeg", ext: "jpg" };
}

async function openDriverDocument(path) {
    const target = window.open("", "_blank");
    try {
        const url = await window.rmsSupabase.getDriverDocumentUrl(path);
        if (target) {
            target.opener = null;
            target.location.href = url;
        } else {
            window.location.href = url;
        }
    } catch (error) {
        console.error("Falha ao abrir documento:", error);
        if (target) target.close();
        toast("Não foi possível abrir o documento.");
    }
}

function updateDocumentHints(driverForm, driver) {
    for (const [kind, field] of DOCUMENT_FIELDS) {
        const hint = driverForm.querySelector(`[data-doc-status="${kind}"]`);
        if (!hint) continue;
        hint.textContent = !driver ? "" : driver[field]
            ? "Já enviado. Escolha outro arquivo para substituir."
            : "Nenhum arquivo enviado.";
    }
}

function resetDriverForm(driverForm) {
    driverForm.reset();
    driverForm.elements.namedItem("driverId").value = "";
    document.querySelector("[data-driver-form-title]").textContent = "Novo entregador";
    driverForm.querySelector("[data-driver-submit]").textContent = "Cadastrar";
    driverForm.querySelector("[data-driver-cancel]").hidden = true;
    updateDocumentHints(driverForm, null);
    setDriverPrivateFields(driverForm, true);
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
    updateDocumentHints(driverForm, driver);
    setDriverPrivateFields(driverForm, state.role !== "operador");
    driverForm.scrollIntoView({ behavior: "smooth", block: "start" });
    driverForm.elements.namedItem("nome").focus({ preventScroll: true });
}

function percentLabel(part, total) {
    if (!total) return "-";
    return `${((part / total) * 100).toFixed(1).replace(".", ",")}%`;
}

function summarizeReport(routes) {
    const summary = { out: 0, delivered: 0, failed: 0, open: 0, openRoutes: 0 };
    for (const route of routes) {
        const quantity = Number(route.saida || 0);
        summary.out += quantity;
        if (route.status === "Fechado") {
            const failed = Number(route.retornados || 0);
            summary.failed += failed;
            summary.delivered += Math.max(0, quantity - failed);
        } else {
            summary.open += quantity;
            summary.openRoutes += 1;
        }
    }
    return summary;
}

function groupRoutes(routes, keyOf) {
    const groups = new Map();
    for (const route of routes) {
        const key = keyOf(route);
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(route);
    }
    return groups;
}

function reportCells(summary) {
    return `
        <td>${summary.out}</td>
        <td>${summary.delivered}</td>
        <td>${summary.failed}</td>
        <td>${percentLabel(summary.failed, summary.delivered + summary.failed)}</td>
        <td>${summary.open}</td>`;
}

function fortnightOf(isoDate) {
    const [year, month, day] = isoDate.split("-").map(Number);
    const prefix = isoDate.slice(0, 7);
    if (day <= 15) return { start: `${prefix}-01`, end: `${prefix}-15` };
    const lastDay = new Date(year, month, 0).getDate();
    return { start: `${prefix}-16`, end: `${prefix}-${String(lastDay).padStart(2, "0")}` };
}

function performanceLabel(routes) {
    const summary = summarizeReport(routes);
    return percentLabel(summary.delivered, summary.delivered + summary.failed);
}

function renderPerformance(date) {
    if (!document.querySelector("[data-perf]")) return;

    const periods = {
        day: { start: date, end: date },
        week: { start: shiftDate(date, -6), end: date },
        fortnight: fortnightOf(date)
    };
    const inPeriod = (route, period) => route.data >= period.start && route.data <= period.end;

    for (const [key, period] of Object.entries(periods)) {
        const summary = summarizeReport(state.routes.filter((route) => inPeriod(route, period)));
        setText(`[data-perf="${key}"]`, percentLabel(summary.delivered, summary.delivered + summary.failed));
        setText(`[data-perf-detail="${key}"]`, `${summary.delivered} entregues e ${summary.failed} insucessos`
            + (key === "day" ? "" : ` (${formatDate(period.start)} a ${formatDate(period.end)})`));
    }

    const scope = state.routes.filter((route) => inPeriod(route, periods.week) || inPeriod(route, periods.fortnight));
    const byName = (a, b) => a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" });
    const perfRow = (name, items) => `
        <tr>
            <td>${escapeHtml(name)}</td>
            <td>${performanceLabel(items.filter((route) => inPeriod(route, periods.day)))}</td>
            <td>${performanceLabel(items.filter((route) => inPeriod(route, periods.week)))}</td>
            <td>${performanceLabel(items.filter((route) => inPeriod(route, periods.fortnight)))}</td>
        </tr>`;

    const companyBody = document.querySelector("[data-perf-company-table]");
    if (companyBody) {
        const groups = [...groupRoutes(scope, (route) => route.empresa || "Sem empresa").entries()]
            .map(([name, items]) => ({ name, items }))
            .sort(byName);
        if (!groups.length) renderEmpty(companyBody, 4, "Nenhuma saída no período.");
        else companyBody.innerHTML = groups.map((group) => perfRow(group.name, group.items)).join("");
    }

    const driverBody = document.querySelector("[data-perf-driver-table]");
    if (driverBody) {
        const groups = [...groupRoutes(scope, (route) => route.driverId).entries()]
            .map(([driverId, items]) => ({ name: getDriver(driverId)?.nome || "Entregador removido", items }))
            .sort(byName);
        if (!groups.length) renderEmpty(driverBody, 4, "Nenhuma saída no período.");
        else driverBody.innerHTML = groups.map((group) => perfRow(group.name, group.items)).join("");
    }
}

function renderDailyReport() {
    const dateInput = document.querySelector("[data-report-date]");
    if (!dateInput) return;
    const date = dateInput.value || today;
    renderPerformance(date);
    const routes = state.routes.filter((route) => route.data === date);
    const total = summarizeReport(routes);

    setText("[data-report-title]", `Relatório diário - ${formatDate(date)}`);
    setText('[data-report="out"]', total.out);
    setText('[data-report="delivered"]', total.delivered);
    setText('[data-report="failed"]', total.failed);
    setText('[data-report="rate"]', percentLabel(total.failed, total.delivered + total.failed));

    const note = document.querySelector("[data-report-note]");
    if (note) {
        note.hidden = total.openRoutes === 0;
        note.textContent = `${total.openRoutes} saída(s) com ${total.open} pacote(s) ainda em aberto: entram em "Saída" e "Em aberto", mas só contam como entregues ou insucessos depois do fechamento.`;
    }

    const byName = (a, b) => a.localeCompare(b, "pt-BR", { sensitivity: "base" });

    const companyBody = document.querySelector("[data-report-company-table]");
    if (companyBody) {
        const groups = [...groupRoutes(routes, (route) => route.empresa || "Sem empresa").entries()]
            .sort(([a], [b]) => byName(a, b));
        if (!groups.length) {
            renderEmpty(companyBody, 6, "Nenhuma saída registrada nesta data.");
        } else {
            companyBody.innerHTML = groups.map(([name, items]) => `
                <tr>
                    <td>${escapeHtml(name)}</td>${reportCells(summarizeReport(items))}
                </tr>
            `).join("");
        }
    }

    const driverBody = document.querySelector("[data-report-driver-table]");
    if (driverBody) {
        const groups = [...groupRoutes(routes, (route) => route.driverId).entries()]
            .map(([driverId, items]) => ({
                name: getDriver(driverId)?.nome || "Entregador removido",
                companies: [...new Set(items.map((route) => route.empresa).filter(Boolean))].join(", "),
                items
            }))
            .sort((a, b) => byName(a.name, b.name));
        if (!groups.length) {
            renderEmpty(driverBody, 7, "Nenhuma saída registrada nesta data.");
        } else {
            driverBody.innerHTML = groups.map((group) => `
                <tr>
                    <td>${escapeHtml(group.name)}</td>
                    <td>${escapeHtml(group.companies || "-")}</td>${reportCells(summarizeReport(group.items))}
                </tr>
            `).join("");
        }
    }
}

function renderEmployees() {
    const tbody = document.querySelector("[data-employees-table]");
    if (!tbody) return;

    const list = sortedByName(state.funcionarios || []);
    const active = list.filter((employee) => employee.status === "Ativo");
    setText("[data-employee-count]", `${list.length} cadastrados`);
    setText('[data-employee-metric="active"]', active.length);
    setText('[data-employee-metric="payroll"]', money(active.reduce((sum, employee) => sum + Number(employee.remuneracao || 0), 0)));

    if (!list.length) {
        renderEmpty(tbody, 8, "Nenhum funcionário cadastrado.");
        return;
    }

    tbody.innerHTML = list.map((employee) => `
        <tr>
            <td>${escapeHtml(employee.nome)}</td>
            <td>${escapeHtml(employee.cpf || "-")}</td>
            <td>${escapeHtml(employee.cargo || "-")}</td>
            <td>${escapeHtml(employee.vinculo || "-")}</td>
            <td>${formatDate(employee.admissao)}</td>
            <td>${employee.remuneracao == null ? "-" : money(employee.remuneracao)}</td>
            <td><span class="status ${employee.status === "Ativo" ? "status-ativo" : "status-inativo"}">${escapeHtml(employee.status)}</span></td>
            <td class="table-actions">
                <button class="btn btn-small btn-secondary" data-edit-employee="${escapeHtml(employee.id)}" type="button">Editar</button>
                <button class="btn btn-small btn-muted" data-toggle-employee="${escapeHtml(employee.id)}" type="button">
                    ${employee.status === "Ativo" ? "Inativar" : "Ativar"}
                </button>
            </td>
        </tr>
    `).join("");
}

function resetEmployeeForm(employeeForm) {
    employeeForm.reset();
    employeeForm.elements.namedItem("employeeId").value = "";
    document.querySelector("[data-employee-form-title]").textContent = "Novo funcionário";
    employeeForm.querySelector("[data-employee-submit]").textContent = "Cadastrar";
    employeeForm.querySelector("[data-employee-cancel]").hidden = true;
}

function startEmployeeEdit(employeeForm, employee) {
    employeeForm.elements.namedItem("employeeId").value = employee.id;
    for (const field of ["nome", "cpf", "cargo", "vinculo", "admissao", "telefone", "email", "endereco", "observacao"]) {
        employeeForm.elements.namedItem(field).value = employee[field] || "";
    }
    employeeForm.elements.namedItem("remuneracao").value = employee.remuneracao == null ? "" : employee.remuneracao;
    employeeForm.elements.namedItem("status").value = employee.status || "Ativo";
    document.querySelector("[data-employee-form-title]").textContent = "Editar funcionário";
    employeeForm.querySelector("[data-employee-submit]").textContent = "Salvar alterações";
    employeeForm.querySelector("[data-employee-cancel]").hidden = false;
    employeeForm.scrollIntoView({ behavior: "smooth", block: "start" });
    employeeForm.elements.namedItem("nome").focus({ preventScroll: true });
}

function resetEntryForm(form) {
    const keepDate = form.elements.namedItem("data").value || today;
    form.reset();
    form.elements.namedItem("data").value = keepDate;
    form.elements.namedItem("entryId").value = "";
    form.querySelector("[data-entry-submit]").textContent = "Registrar entrada";
    form.querySelector("[data-entry-cancel]").hidden = true;
    setText("[data-entry-title]", "Entrada de pacotes");
}

function startEntryEdit(entry) {
    const form = document.querySelector('[data-form="warehouse"]');
    if (!form) return;
    form.elements.namedItem("entryId").value = entry.id;
    form.elements.namedItem("data").value = entry.data;
    const select = form.elements.namedItem("empresa");
    if (entry.empresa && ![...select.options].some((option) => option.value === entry.empresa)) {
        select.add(new Option(entry.empresa, entry.empresa));
    }
    select.value = entry.empresa || "";
    form.elements.namedItem("quantidade").value = entry.quantidade;
    form.querySelector("[data-entry-submit]").textContent = "Salvar alteração";
    form.querySelector("[data-entry-cancel]").hidden = false;
    setText("[data-entry-title]", "Editar entrada de pacotes");
    renderWarehouse();
    form.scrollIntoView({ behavior: "smooth", block: "start" });
}

async function saveEntryEdit(form, data) {
    const changes = {
        data: data.data,
        empresa: String(data.empresa || "").trim(),
        quantidade: Number(data.quantidade)
    };
    if (!Number.isInteger(changes.quantidade) || changes.quantidade < 1) {
        toast("Informe uma quantidade de pacotes válida.");
        return;
    }
    const submitButton = form.querySelector("[data-entry-submit]");
    submitButton.disabled = true;
    try {
        const updated = await window.rmsSupabase.updateWarehouseEntry(data.entryId, changes);
        const index = state.entradasGalpao.findIndex((entry) => entry.id === updated.id);
        if (index >= 0) state.entradasGalpao[index] = updated;
        resetEntryForm(form);
        renderWarehouse();
        toast("Entrada atualizada.");
    } catch (error) {
        console.error("Falha ao editar entrada:", error);
        toast(error.code === "P0001"
            ? error.message
            : "Não foi possível salvar a alteração. Tente novamente.", 6000);
    } finally {
        submitButton.disabled = false;
    }
}

async function removeWarehouseEntry(entryId) {
    try {
        await window.rmsSupabase.deleteWarehouseEntry(entryId);
        state.entradasGalpao = state.entradasGalpao.filter((entry) => entry.id !== entryId);
        const form = document.querySelector('[data-form="warehouse"]');
        if (form && form.elements.namedItem("entryId").value === entryId) resetEntryForm(form);
        renderWarehouse();
        toast("Entrada excluída.");
    } catch (error) {
        console.error("Falha ao excluir entrada:", error);
        toast(error.code === "P0001"
            ? error.message
            : "Não foi possível excluir a entrada. Tente novamente.", 6000);
    }
}

function closeRouteEdit() {
    const panel = document.querySelector("[data-route-edit-panel]");
    const form = document.querySelector('[data-form="route-edit"]');
    if (form) form.reset();
    if (panel) panel.hidden = true;
}

function startRouteEdit(route) {
    const panel = document.querySelector("[data-route-edit-panel]");
    const form = document.querySelector('[data-form="route-edit"]');
    if (!panel || !form) return;

    form.elements.namedItem("routeId").value = route.id;
    form.elements.namedItem("data").value = route.data || "";

    const driverSelect = form.elements.namedItem("driverId");
    const drivers = sortedByName(state.drivers.filter((driver) => driver.status === "Ativo" || driver.id === route.driverId));
    driverSelect.innerHTML = drivers.map((driver) => `<option value="${escapeHtml(driver.id)}">${escapeHtml(driver.nome)} - ${escapeHtml(driver.veiculo)}</option>`).join("");
    driverSelect.value = route.driverId;

    const companySelect = form.elements.namedItem("empresa");
    const companies = [...new Set([...(state.settings.empresas || []), route.empresa].filter(Boolean))];
    companySelect.innerHTML = companies.map((company) => `<option value="${escapeHtml(company)}">${escapeHtml(company)}</option>`).join("");
    companySelect.value = route.empresa || "";

    form.elements.namedItem("saida").value = route.saida;
    form.elements.namedItem("observacao").value = route.observacao || "";

    const closed = route.status === "Fechado";
    form.querySelectorAll("[data-route-edit-closed]").forEach((element) => {
        element.style.display = closed ? "" : "none";
    });
    form.elements.namedItem("retornados").value = closed ? (route.retornados || 0) : "";
    form.elements.namedItem("desconto").value = closed ? (route.desconto || 0) : "";
    form.elements.namedItem("retornados").required = closed;

    setText("[data-route-edit-title]", `Editar saída de ${formatDate(route.data)}`);
    const edits = route.edicoes || [];
    const last = edits[edits.length - 1];
    setText("[data-route-edit-info]", last
        ? `Editada ${edits.length} vez(es). Última edição em ${formatDate(String(last.em).slice(0, 10))} por ${last.por}.`
        : "");

    panel.hidden = false;
    panel.scrollIntoView({ behavior: "smooth", block: "start" });
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

    const reportDate = document.querySelector("[data-report-date]");
    if (reportDate) {
        reportDate.value = today;
        reportDate.addEventListener("change", renderDailyReport);
    }
    const weekStart = document.querySelector("[data-week-start]");
    const weekEnd = document.querySelector("[data-week-end]");
    if (weekStart && weekEnd) {
        const selectedRange = weekRange();
        weekStart.value = selectedRange.start;
        weekEnd.value = selectedRange.end;
        const updateWeek = (changedInput) => {
            if (weekStart.value > weekEnd.value) {
                if (changedInput === weekStart) weekEnd.value = weekStart.value;
                else weekStart.value = weekEnd.value;
            }
            renderWeek();
        };
        weekStart.addEventListener("change", () => updateWeek(weekStart));
        weekEnd.addEventListener("change", () => updateWeek(weekEnd));
    }
    const printReport = document.querySelector("[data-print-report]");
    if (printReport) printReport.addEventListener("click", () => window.print());

    const employeeForm = document.querySelector('[data-form="employee"]');
    if (employeeForm) {
        employeeForm.addEventListener("submit", async (event) => {
            event.preventDefault();
            const data = Object.fromEntries(new FormData(employeeForm));
            const employeeId = data.employeeId;
            delete data.employeeId;
            for (const key of Object.keys(data)) {
                if (typeof data[key] === "string") data[key] = data[key].trim();
            }
            if (validatePixKey("cpf", data.cpf)) {
                toast("Informe um CPF válido.");
                employeeForm.elements.namedItem("cpf").focus();
                return;
            }
            const cpfDigits = data.cpf.replace(/\D/g, "");
            const duplicate = state.funcionarios.find((employee) => employee.id !== employeeId
                && String(employee.cpf || "").replace(/\D/g, "") === cpfDigits);
            if (duplicate) {
                toast("Já existe um funcionário com este CPF.");
                return;
            }
            data.remuneracao = data.remuneracao === "" ? null : Number(data.remuneracao);

            const existing = state.funcionarios.find((employee) => employee.id === employeeId);
            if (employeeId && !existing) {
                toast("Funcionário não encontrado.");
                resetEmployeeForm(employeeForm);
                return;
            }
            if (existing) {
                Object.assign(existing, data);
            } else {
                state.funcionarios.push({ id: makeId(), ...data });
            }
            const saved = await saveData(state);
            resetEmployeeForm(employeeForm);
            renderEmployees();
            if (saved) toast(existing ? "Cadastro atualizado." : "Funcionário cadastrado.");
        });
    }

    const routeEditForm = document.querySelector('[data-form="route-edit"]');
    if (routeEditForm) {
        routeEditForm.addEventListener("submit", async (event) => {
            event.preventDefault();
            const data = Object.fromEntries(new FormData(routeEditForm));
            const route = state.routes.find((item) => item.id === data.routeId);
            if (!route) {
                toast("Saída não encontrada.");
                closeRouteEdit();
                return;
            }

            const closed = route.status === "Fechado";
            const changes = {
                data: data.data,
                driverId: data.driverId,
                empresa: String(data.empresa || "").trim(),
                saida: Number(data.saida),
                observacao: String(data.observacao || "").trim()
            };
            if (!Number.isInteger(changes.saida) || changes.saida < 1) {
                toast("Informe uma quantidade de pacotes válida.");
                return;
            }
            if (closed) {
                changes.retornados = Number(data.retornados || 0);
                changes.desconto = Number(data.desconto || 0);
                if (!Number.isInteger(changes.retornados) || changes.retornados < 0 || changes.retornados > changes.saida) {
                    toast("Os pacotes retornados devem ser um número entre 0 e o total da saída.");
                    return;
                }
                if (!(changes.desconto >= 0)) {
                    toast("O desconto não pode ser negativo.");
                    return;
                }
            }

            const submitButton = routeEditForm.querySelector('[type="submit"]');
            submitButton.disabled = true;
            try {
                const result = await window.rmsSupabase.updateRoute(route.id, changes);
                const index = state.routes.findIndex((item) => item.id === route.id);
                state.routes[index] = result.route;
                if (result.removed_entry_id) {
                    state.entradasGalpao = state.entradasGalpao.filter((entry) => entry.id !== result.removed_entry_id);
                }
                if (result.warehouse_entry) {
                    const entryIndex = state.entradasGalpao.findIndex((entry) => entry.id === result.warehouse_entry.id);
                    if (entryIndex >= 0) state.entradasGalpao[entryIndex] = result.warehouse_entry;
                    else state.entradasGalpao.push(result.warehouse_entry);
                }
                closeRouteEdit();
                renderHistory(document.querySelector("[data-search-history]")?.value || "");
                toast("Saída atualizada.");
            } catch (error) {
                console.error("Falha ao editar saída:", error);
                toast(error.code === "P0001"
                    ? error.message
                    : "Não foi possível salvar a alteração. Confira os dados e tente novamente.", 6000);
            } finally {
                submitButton.disabled = false;
            }
        });
    }

    const driverForm = document.querySelector('[data-form="driver"]');
    if (driverForm) {
        driverForm.addEventListener("submit", async (event) => {
            event.preventDefault();
            const data = Object.fromEntries(new FormData(driverForm));
            delete data.arquivoIdentidade;
            delete data.arquivoResidencia;
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

            const submitButton = driverForm.querySelector("[data-driver-submit]");
            if (state.role === "operador" && driverId) {
                submitButton.disabled = true;
                try {
                    const savedDriver = await window.rmsSupabase.updateDriver(driverId, {
                        nome: String(data.nome || "").trim(),
                        telefone: String(data.telefone || "").trim(),
                        veiculo: data.veiculo,
                        status: data.status
                    });
                    const driverIndex = state.drivers.findIndex((item) => item.id === driverId);
                    if (driverIndex >= 0) state.drivers[driverIndex] = savedDriver;
                    resetDriverForm(driverForm);
                    renderDrivers();
                    fillDriverSelects();
                    toast("Cadastro atualizado.");
                } catch (error) {
                    console.error("Falha ao editar entregador:", error);
                    toast(error.code === "P0001"
                        ? error.message
                        : "Não foi possível salvar a alteração. Confira os dados e tente novamente.", 6000);
                } finally {
                    submitButton.disabled = false;
                }
                return;
            }

            const targetId = existingDriver ? existingDriver.id : makeId();
            const documentPaths = {};
            const replacedPaths = [];
            submitButton.disabled = true;
            try {
                for (const [kind, field, inputName] of DOCUMENT_FIELDS) {
                    const file = driverForm.elements.namedItem(inputName).files[0];
                    if (!file) continue;
                    const prepared = await prepareDocument(file);
                    documentPaths[field] = await window.rmsSupabase.uploadDriverDocument(targetId, kind, prepared);
                    if (existingDriver && existingDriver[field]) replacedPaths.push(existingDriver[field]);
                }
            } catch (error) {
                console.error("Falha ao enviar documento:", error);
                toast(error.userMessage || "Não foi possível enviar os documentos. Tente novamente.");
                submitButton.disabled = false;
                return;
            }

            let succeeded = true;
            try {
                if (state.role === "operador") {
                    const savedDriver = await window.rmsSupabase.registerDriver({ id: targetId, ...data, ...documentPaths });
                    state.drivers.push(savedDriver);
                } else if (existingDriver) {
                    Object.assign(existingDriver, data, documentPaths);
                    succeeded = await saveData(state);
                    if (succeeded && replacedPaths.length) {
                        window.rmsSupabase.removeDriverDocuments(replacedPaths)
                            .catch((error) => console.error("Falha ao remover documento antigo:", error));
                    }
                } else {
                    state.drivers.push({ id: targetId, ...data, ...documentPaths });
                    succeeded = await saveData(state);
                }
                resetDriverForm(driverForm);
                renderDrivers();
                fillDriverSelects();
                if (succeeded) toast(existingDriver ? "Cadastro atualizado." : "Entregador cadastrado.");
            } catch (error) {
                console.error("Falha ao cadastrar entregador:", error);
                toast("Não foi possível cadastrar o entregador. Confira os dados e tente novamente.");
            } finally {
                submitButton.disabled = false;
            }
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
                toast(error.message?.includes("Estoque insuficiente") || error.message?.includes("Empresa nao cadastrada")
                    ? error.message
                    : "Nao foi possivel registrar a saida. Confira os dados e tente novamente.");
            } finally {
                submitButton.disabled = false;
            }
        });
        routeForm.elements.namedItem("driverId").addEventListener("change", () => updateRoutePrice(routeForm));
        routeForm.elements.namedItem("data").addEventListener("change", () => refreshStockForRoute(routeForm));
        routeForm.elements.namedItem("empresa").addEventListener("change", () => refreshStockForRoute(routeForm));
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
        warehouseForm.elements.namedItem("data").max = today;
        warehouseForm.addEventListener("submit", async (event) => {
            event.preventDefault();
            const data = Object.fromEntries(new FormData(warehouseForm));
            if (data.entryId) {
                await saveEntryEdit(warehouseForm, data);
                return;
            }
            const entry = {
                id: makeId(),
                data: data.data,
                quantidade: Number(data.quantidade),
                empresa: String(data.empresa || "").trim(),
                observacao: String(data.observacao || "").trim()
            };
            const submitButton = warehouseForm.querySelector('[type="submit"]');
            submitButton.disabled = true;
            try {
                const savedEntry = await window.rmsSupabase.registerWarehouseEntry(entry);
                state.entradasGalpao.push(savedEntry);
                warehouseForm.reset();
                warehouseForm.elements.namedItem("data").value = entry.data;
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
                ...state.settings,
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

        const openDocButton = event.target.closest("[data-open-doc]");
        if (openDocButton) {
            const driver = getDriver(openDocButton.dataset.openDoc);
            const field = openDocButton.dataset.docKind === "identidade" ? "docIdentidade" : "docResidencia";
            if (driver && driver[field]) openDriverDocument(driver[field]);
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
                const nextStatus = driver.status === "Ativo" ? "Inativo" : "Ativo";
                if (state.role === "operador") {
                    window.rmsSupabase.updateDriver(driver.id, {
                        nome: driver.nome,
                        telefone: driver.telefone || "",
                        veiculo: driver.veiculo,
                        status: nextStatus
                    }).then((savedDriver) => {
                        const driverIndex = state.drivers.findIndex((item) => item.id === driver.id);
                        if (driverIndex >= 0) state.drivers[driverIndex] = savedDriver;
                        renderDrivers();
                        fillDriverSelects();
                        toast("Status atualizado.");
                    }).catch((error) => {
                        console.error("Falha ao atualizar status:", error);
                        toast("Não foi possível atualizar o status.", 6000);
                    });
                } else {
                    driver.status = nextStatus;
                    saveData(state);
                    renderDrivers();
                    toast("Status atualizado.");
                }
            }
        }

        const editEntryButton = event.target.closest("[data-edit-entry]");
        if (editEntryButton) {
            const entry = state.entradasGalpao.find((item) => item.id === editEntryButton.dataset.editEntry);
            if (entry) startEntryEdit(entry);
        }

        if (event.target.closest("[data-entry-cancel]")) {
            const entryForm = document.querySelector('[data-form="warehouse"]');
            if (entryForm) resetEntryForm(entryForm);
        }

        const deleteEntryButton = event.target.closest("[data-delete-entry]");
        if (deleteEntryButton) {
            const entry = state.entradasGalpao.find((item) => item.id === deleteEntryButton.dataset.deleteEntry);
            if (entry && window.confirm(`Excluir a entrada de ${entry.quantidade} pacote(s) de ${entry.empresa || "empresa não informada"} em ${formatDate(entry.data)}? Esta ação não pode ser desfeita.`)) {
                removeWarehouseEntry(entry.id);
            }
        }

        const editRouteButton = event.target.closest("[data-edit-route]");
        if (editRouteButton) {
            const route = state.routes.find((item) => item.id === editRouteButton.dataset.editRoute);
            if (route) startRouteEdit(route);
        }

        if (event.target.closest("[data-route-edit-cancel]")) closeRouteEdit();

        const editEmployeeButton = event.target.closest("[data-edit-employee]");
        if (editEmployeeButton) {
            const employee = state.funcionarios.find((item) => item.id === editEmployeeButton.dataset.editEmployee);
            const employeeForm = document.querySelector('[data-form="employee"]');
            if (employee && employeeForm) startEmployeeEdit(employeeForm, employee);
        }

        if (event.target.closest("[data-employee-cancel]")) {
            const employeeForm = document.querySelector('[data-form="employee"]');
            if (employeeForm) resetEmployeeForm(employeeForm);
        }

        const toggleEmployeeButton = event.target.closest("[data-toggle-employee]");
        if (toggleEmployeeButton) {
            const employee = state.funcionarios.find((item) => item.id === toggleEmployeeButton.dataset.toggleEmployee);
            if (employee) {
                employee.status = employee.status === "Ativo" ? "Inativo" : "Ativo";
                saveData(state);
                renderEmployees();
                toast("Status atualizado.");
            }
        }

        const deleteRouteButton = event.target.closest("[data-delete-route]");
        if (deleteRouteButton) {
            const route = state.routes.find((item) => item.id === deleteRouteButton.dataset.deleteRoute);
            if (route) {
                const driver = getDriver(route.driverId);
                const hasReturn = route.status === "Fechado" && Number(route.retornados || 0) > 0;
                const message = `Excluir a saída de ${formatDate(route.data)} de ${driver?.nome || "entregador removido"} `
                    + `(${route.empresa || "sem empresa"}, ${route.saida} pacote(s))?`
                    + (hasReturn ? "\n\nA entrada de retorno gerada por ela também será removida." : "")
                    + "\n\nEsta ação não pode ser desfeita.";
                if (window.confirm(message)) removeRoute(route.id);
            }
        }

        if (event.target.closest("[data-export-week]")) exportWeek();

        if (event.target.closest("[data-pay-clear]")) {
            document.querySelectorAll("[data-pay-from], [data-pay-to], [data-pay-status]").forEach((field) => { field.value = ""; });
            renderPayments();
        }

        const markButton = event.target.closest("[data-pay-mark]");
        if (markButton) {
            const target = markButton.dataset.payMark;
            const selectedIds = [...document.querySelectorAll("[data-select-route]:checked")].map((box) => box.value);
            const routes = selectedIds
                .map((id) => state.routes.find((route) => route.id === id))
                .filter((route) => route && (route.pagamento === "Pago") !== (target === "pago"));
            if (!selectedIds.length) {
                toast("Selecione ao menos uma saída.");
            } else if (!routes.length) {
                toast(target === "pago" ? "As saídas selecionadas já estão pagas." : "As saídas selecionadas já estão pendentes.");
            } else {
                const total = routes.reduce((sum, route) => sum + routeTotal(route), 0);
                const message = `Marcar ${routes.length} saída(s), no total de ${money(total)}, como ${target === "pago" ? "pagas" : "pendentes"}?`;
                if (window.confirm(message)) {
                    routes.forEach((route) => {
                        if (target === "pago") {
                            route.pagamento = "Pago";
                            route.dataPagamento = today;
                        } else {
                            route.pagamento = "Pendente";
                            delete route.dataPagamento;
                        }
                    });
                    saveData(state);
                    renderPayments();
                    renderFortnight();
                    toast(target === "pago" ? "Pagamentos marcados como pagos." : "Pagamentos desfeitos.");
                }
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

    const sortHistory = document.querySelector("[data-sort-history]");
    if (sortHistory) {
        sortHistory.addEventListener("change", () => renderHistory(search ? search.value : ""));
    }

    ["[data-pay-from]", "[data-pay-to]", "[data-pay-status]"].forEach((selector) => {
        const field = document.querySelector(selector);
        if (field) field.addEventListener("change", renderPayments);
    });

    document.addEventListener("change", (event) => {
        if (event.target.matches("[data-pay-select-all]")) {
            document.querySelectorAll("[data-select-route]").forEach((box) => { box.checked = event.target.checked; });
            updatePaymentSelection();
        } else if (event.target.matches("[data-select-route]")) {
            updatePaymentSelection();
        }
    });
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
    renderDailyReport();
    renderEmployees();
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
