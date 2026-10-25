
(() => {
  "use strict";

  function detectMoneyLeaks(transactions) {
    if (!Array.isArray(transactions)) return [];

    const expenses = transactions.filter((t) => {
      const type = String(t.type || "").toUpperCase();
      const amount = Number(t.amount);
      return type === "EXPENSE" && Number.isFinite(amount) && amount > 0;
    });

    const totals = {};

    expenses.forEach((t) => {
      const category = String(t.category || "Uncategorized").trim();
      totals[category] = (totals[category] || 0) + Number(t.amount);
    });

    const totalExpenses = Object.values(totals).reduce(
      (sum, amount) => sum + amount,
      0
    );

    return Object.entries(totals)
      .map(([category, amount]) => ({
        category,
        amount,
        percentage: totalExpenses ? (amount / totalExpenses) * 100 : 0,
        message:
          amount / (totalExpenses || 1) >= 0.3
            ? `A large share of your recorded expenses goes to ${category}.`
            : `${category} accounts for ${((amount / (totalExpenses || 1)) * 100).toFixed(1)}% of your recorded expenses.`
      }))
      .sort((a, b) => b.amount - a.amount);
  }

  function renderMoneyLeaks(container, transactions) {
    if (!container) return;

    const leaks = detectMoneyLeaks(transactions);

    if (!leaks.length) {
      container.innerHTML = `
        <div class="money-leak-empty">
          <h3>Money Leak Detector</h3>
          <p>Add some expense transactions to discover your spending patterns.</p>
        </div>`;
      return;
    }

    container.innerHTML = `
      <div class="money-leak-card">
        <h3>Money Leak Detector</h3>
        <p class="money-leak-subtitle">
          Your largest recorded expense categories, ranked by spending.
        </p>
        <div class="money-leak-list">
          ${leaks.map((item) => `
            <article class="money-leak-item">
              <div class="money-leak-heading">
                <strong>${escapeHTML(item.category)}</strong>
                <strong>${formatINR(item.amount)}</strong>
              </div>
              <div class="money-leak-track">
                <div class="money-leak-bar"
                     style="width:${Math.min(item.percentage, 100)}%">
                </div>
              </div>
              <p>${item.percentage.toFixed(1)}% of recorded expenses</p>
            </article>
          `).join("")}
        </div>
        <p class="money-leak-note">
          These are spending patterns, not proof of unnecessary spending.
          Review the categories to decide where you could save.
        </p>
      </div>`;
  }

  function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[char]);
  }

  function formatINR(amount) {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2
    }).format(amount);
  }

  window.MonetraMoneyLeaks = {
    detectMoneyLeaks,
    renderMoneyLeaks
  };
})();
