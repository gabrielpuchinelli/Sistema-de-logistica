window.RMSUtils = (() => {
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

    function formatDate(value) {
        if (!value) return "-";
        const [year, month, day] = value.split("-");
        return `${day}/${month}/${year}`;
    }

    function sortedByName(list) {
        return list.slice().sort((a, b) => String(a.nome || "")
            .localeCompare(String(b.nome || ""), "pt-BR", { sensitivity: "base" }));
    }

    function vehicleKey(vehicle) {
        const normalized = String(vehicle || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
        return ["moto", "carro", "van"].includes(normalized) ? normalized : "moto";
    }

    function weekdayName(isoDate) {
        const [year, month, day] = isoDate.split("-").map(Number);
        const name = new Date(year, month - 1, day).toLocaleDateString("pt-BR", { weekday: "long" });
        return name.charAt(0).toUpperCase() + name.slice(1);
    }

    return {
        money,
        escapeHtml,
        formatDate,
        sortedByName,
        vehicleKey,
        weekdayName
    };
})();
