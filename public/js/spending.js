(() => {
  "use strict";

  function getBreakdown(transactions) {
    if (!Array.isArray(transactions)) return [];

    const totals = {};

    transactions.forEach((transaction) => {
      if (String(transaction.type || "").toUpperCase() !== "EXPENSE") return;

      const amount = Number(transaction.amount);
      if (!Number.isFinite(amount) || amount <= 0) return;

      const category =
        String(transaction.category || "Uncategorized").trim() || "Uncategorized";

      totals[category] = (totals[category] || 0) + amount;
    });

    const total = Object.values(totals).reduce((sum, amount) => sum + amount, 0);
    if (!total) return [];

    return Object.entries(totals)
      .map(([category, amount]) => ({
        category,
        amount,
        share: (amount / total) * 100,
        saving: amount * 0.1
      }))
      .sort((a, b) => b.amount - a.amount);
  }

  function render(container, transactions) {
    if (!container) return;

    const rows = getBreakdown(transactions).slice(0, 6);

    if (!rows.length) {
      container.innerHTML = '<p class="spending-empty">No expenses recorded yet.</p>';
      return;
    }

    container.innerHTML = rows.map((item) => `
      <div class="spending-row">
        <div class="spending-top">
          <strong>${escapeHTML(item.category)}</strong>
          <span>${formatINR(item.amount)} &middot; ${item.share.toFixed(1)}%</span>
        </div>
        <div class="spending-track">
          <div class="spending-bar" style="width:${Math.min(item.share, 100)}%"></div>
        </div>
        <p>10% less would be ${formatINR(item.saving)}</p>
      </div>
    `).join("");
  }

  function formatINR(amount) {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0
    }).format(amount);
  }

  function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, (character) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[character]);
  }

  window.MonetraSpending = {
    getBreakdown,
    render
  };
})();
