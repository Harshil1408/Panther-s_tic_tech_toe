// Transaction UI Handler
class TransactionUI {
    constructor() {
        this.initializeEventListeners();
        this.loadTransactions();
    }

    initializeEventListeners() {
        // Add transaction form submission
        const transactionForm = document.getElementById('transaction-form');
        if (transactionForm) {
            transactionForm.addEventListener('submit', (e) => this.handleAddTransaction(e));
        }

        // Transaction type toggle (income/expense)
        const typeSelect = document.getElementById('transaction-type');
        if (typeSelect) {
            typeSelect.addEventListener('change', () => this.updateCategoryOptions());
        }
    }

    // Load and display all transactions
    async loadTransactions() {
        try {
            const transactions = await budgetDB.getTransactions();
            const summary = await budgetDB.getTransactionsSummary();
            
            this.updateTransactionsList(transactions);
            this.updateSummary(summary);
            this.updateCharts(transactions);
        } catch (error) {
            console.error('Error loading transactions:', error);
            alert('Error loading transactions. Please try again.');
        }
    }

    // Handle adding new transaction
    async handleAddTransaction(e) {
        e.preventDefault();

        const transaction = {
            date: document.getElementById('transaction-date').value,
            type: document.getElementById('transaction-type').value,
            category: document.getElementById('transaction-category').value,
            amount: parseFloat(document.getElementById('transaction-amount').value),
            description: document.getElementById('transaction-description').value,
            notes: document.getElementById('transaction-notes').value
        };

        try {
            await budgetDB.addTransaction(transaction);
            this.loadTransactions(); // Refresh the display
            e.target.reset();
            alert('Transaction added successfully!');
        } catch (error) {
            console.error('Error adding transaction:', error);
            alert('Error adding transaction. Please try again.');
        }
    }

    // Update transaction list display
    updateTransactionsList(transactions) {
        const container = document.getElementById('recent-transactions');
        if (!container) return;

        container.innerHTML = transactions.length ? '' : '<p>No transactions found.</p>';

        transactions.sort((a, b) => new Date(b.date) - new Date(a.date))
            .forEach(transaction => {
                const element = this.createTransactionElement(transaction);
                container.appendChild(element);
            });
    }

    // Create HTML element for a transaction
    createTransactionElement(transaction) {
        const div = document.createElement('div');
        div.className = 'transaction-item bg-white dark:bg-gray-700 p-4 rounded-lg shadow mb-4';
        
        const amountClass = transaction.type === 'income' ? 'text-green-500' : 'text-red-500';
        const amountPrefix = transaction.type === 'income' ? '+' : '-';

        div.innerHTML = `
            <div class="flex justify-between items-center">
                <div>
                    <h3 class="font-semibold text-gray-700 dark:text-gray-200">${transaction.category}</h3>
                    <p class="text-sm text-gray-500 dark:text-gray-400">${transaction.description}</p>
                    <p class="text-xs text-gray-400">${new Date(transaction.date).toLocaleDateString()}</p>
                </div>
                <div class="text-right">
                    <p class="text-lg font-bold ${amountClass}">${amountPrefix}$${transaction.amount.toFixed(2)}</p>
                    <button onclick="transactionUI.deleteTransaction(${transaction.id})" 
                            class="text-red-500 hover:text-red-700 text-sm">
                        Delete
                    </button>
                </div>
            </div>
        `;
        return div;
    }

    // Update financial summary display
    updateSummary(summary) {
        const incomeElement = document.getElementById('total-income');
        const expenseElement = document.getElementById('total-expenses');
        const balanceElement = document.getElementById('current-balance');

        if (incomeElement) {
            incomeElement.textContent = `$${summary.totalIncome.toFixed(2)}`;
        }
        if (expenseElement) {
            expenseElement.textContent = `$${summary.totalExpenses.toFixed(2)}`;
        }
        if (balanceElement) {
            const balance = summary.totalIncome - summary.totalExpenses;
            balanceElement.textContent = `$${balance.toFixed(2)}`;
            balanceElement.className = balance >= 0 ? 'text-green-500' : 'text-red-500';
        }
    }

    // Update category options based on transaction type
    updateCategoryOptions() {
        const typeSelect = document.getElementById('transaction-type');
        const categorySelect = document.getElementById('transaction-category');
        
        if (!typeSelect || !categorySelect) return;

        const incomeCategories = ['Salary', 'Freelance', 'Investments', 'Other Income'];
        const expenseCategories = ['Food', 'Transportation', 'Housing', 'Utilities', 'Entertainment', 'Healthcare', 'Shopping', 'Other'];

        const categories = typeSelect.value === 'income' ? incomeCategories : expenseCategories;

        categorySelect.innerHTML = categories
            .map(category => `<option value="${category}">${category}</option>`)
            .join('');
    }

    // Handle transaction deletion
    async deleteTransaction(id) {
        if (!confirm('Are you sure you want to delete this transaction?')) return;

        try {
            await budgetDB.deleteTransaction(id);
            this.loadTransactions();
            alert('Transaction deleted successfully!');
        } catch (error) {
            console.error('Error deleting transaction:', error);
            alert('Error deleting transaction. Please try again.');
        }
    }

    // Update charts with transaction data
    updateCharts(transactions) {
        this.updateExpensePieChart(transactions);
        this.updateIncomeExpenseChart(transactions);
    }

    // Update expense distribution pie chart
    updateExpensePieChart(transactions) {
        const ctx = document.getElementById('expense-chart');
        if (!ctx) return;

        const expensesByCategory = transactions
            .filter(t => t.type === 'expense')
            .reduce((acc, t) => {
                acc[t.category] = (acc[t.category] || 0) + t.amount;
                return acc;
            }, {});

        if (window.expenseChart) {
            window.expenseChart.destroy();
        }

        window.expenseChart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: Object.keys(expensesByCategory),
                datasets: [{
                    data: Object.values(expensesByCategory),
                    backgroundColor: [
                        '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0',
                        '#9966FF', '#FF9F40', '#FF6384', '#36A2EB'
                    ]
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'right',
                    },
                    title: {
                        display: true,
                        text: 'Expense Distribution'
                    }
                }
            }
        });
    }

    // Update income vs expense bar chart
    updateIncomeExpenseChart(transactions) {
        const ctx = document.getElementById('income-expense-chart');
        if (!ctx) return;

        const monthlyData = transactions.reduce((acc, t) => {
            const date = new Date(t.date);
            const monthYear = `${date.getMonth() + 1}/${date.getFullYear()}`;
            
            if (!acc[monthYear]) {
                acc[monthYear] = { income: 0, expense: 0 };
            }
            
            if (t.type === 'income') {
                acc[monthYear].income += t.amount;
            } else {
                acc[monthYear].expense += t.amount;
            }
            
            return acc;
        }, {});

        const labels = Object.keys(monthlyData).sort();
        const incomeData = labels.map(month => monthlyData[month].income);
        const expenseData = labels.map(month => monthlyData[month].expense);

        if (window.incomeExpenseChart) {
            window.incomeExpenseChart.destroy();
        }

        window.incomeExpenseChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Income',
                        data: incomeData,
                        backgroundColor: 'rgba(75, 192, 192, 0.5)',
                        borderColor: 'rgb(75, 192, 192)',
                        borderWidth: 1
                    },
                    {
                        label: 'Expenses',
                        data: expenseData,
                        backgroundColor: 'rgba(255, 99, 132, 0.5)',
                        borderColor: 'rgb(255, 99, 132)',
                        borderWidth: 1
                    }
                ]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                },
                plugins: {
                    title: {
                        display: true,
                        text: 'Monthly Income vs Expenses'
                    }
                }
            }
        });
    }
}

// Initialize transaction UI when document is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.transactionUI = new TransactionUI();
});
