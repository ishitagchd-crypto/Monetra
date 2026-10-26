
(() => {
    "use strict";

    function getRecommendations(transactions) {
        if (!Array.isArray(transactions)) return [];

        const expenses = transactions.filter((transaction) =>
            String(transaction.type || "").toUpperCase() === "EXPENSE" &&
            Number.isFinite(Number(transaction.amount)) &&
            Number(transaction.amount) > 0
        );

        const totals = {};

        expenses.forEach((transaction) => {
            const category = String(
                transaction.category || "Uncategorized"
            ).trim();

            totals[category] =
                (totals[category] || 0) + Number(transaction.amount);
        });

        const totalExpenses = Object.values(totals).reduce(
            (sum, amount) => sum + amount,
            0
        );

        if (totalExpenses <= 0) return [];

        const savingRates = [0.10, 0.15, 0.20];

        return Object.entries(totals)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([category, amount], index) => {
                const rate = savingRates[index] || 0.10;
                const potentialSaving = amount * rate;

                return {
                    category,
                    amount,
                    rate: rate * 100,
                    potentialSaving,
                    message:
                        `If you reduce ${category} spending by ${rate * 100}%, ` +
                        `you could save ${formatINR(potentialSaving)} ` +
                        `over a comparable period.`
                };
            });
    }

    function renderRecommendations(container, transactions) {
        if (!container) return;

        const recommendations = getRecommendations(transactions);

        if (!recommendations.length) {
            container.innerHTML = `
                <div class="saving-empty">
                    <h3>Your saving plan starts here</h3>
                    <p>
                        Add expense transactions to receive personalized
                        saving estimates.
                    </p>
                </div>
            `;
            return;
        }

        const totalPotential = recommendations.reduce(
            (sum, item) => sum + item.potentialSaving,
            0
        );

        container.innerHTML = `
            <div class="saving-summary">
                <span class="saving-eyebrow">POTENTIAL SAVINGS</span>
                <h3>${formatINR(totalPotential)}</h3>
                <p>
                    Estimated savings if you meet each suggested reduction.
                    These are targets, not guaranteed savings.
                </p>
            </div>

            <div class="saving-recommendation-list">
                ${recommendations.map((item) => `
                    <article class="saving-recommendation">
                        <div class="saving-recommendation-top">
                            <div>
                                <span class="saving-category">
                                    ${escapeHTML(item.category)}
                                </span>
                                <p>
                                    Recorded spending:
                                    ${formatINR(item.amount)}
                                </p>
                            </div>
                            <span class="saving-rate">
                                ${item.rate}% less
                            </span>
                        </div>

                        <p class="saving-message">
                            ${escapeHTML(item.message)}
                        </p>
                    </article>
                `).join("")}
            </div>
        `;
    }

    function formatINR(amount) {
        return new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 2
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

    window.MonetraSavings = {
        getRecommendations,
        renderRecommendations
    };
})();
