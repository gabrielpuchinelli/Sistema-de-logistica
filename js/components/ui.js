window.RMSUI = (() => {
    function setText(selector, value) {
        document.querySelectorAll(selector).forEach((element) => {
            element.textContent = value;
        });
    }

    function renderEmpty(tbody, columns, message) {
        tbody.innerHTML = `<tr><td class="empty-row" colspan="${columns}">${message}</td></tr>`;
    }

    return {
        setText,
        renderEmpty
    };
})();
