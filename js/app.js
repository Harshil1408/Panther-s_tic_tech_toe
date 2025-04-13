// App.js - Handle transactions and data management without a database

document.addEventListener("DOMContentLoaded", function() {
    // Currency conversion rates (relative to USD)
    const conversionRates = {
        USD: 1,
        EUR: 0.92,
        GBP: 0.80,
        JPY: 134.50,
        INR: 82.50
    };

    // Currency symbols
    const currencySymbols = {
        USD: '$',
        EUR: '€',
        GBP: '£',
        JPY: '¥',
        INR: '₹'
    };

    let selectedCurrency = 'USD';

    // Add currency selector event listener
    const currencySelector = document.getElementById('currency-selector');
    if (currencySelector) {
        currencySelector.addEventListener('change', function(e) {
            selectedCurrency = e.target.value;
            refreshTransactions();
            updateFinancialSummary();
            updateCharts();
        });
    }

    // Function to convert amount to selected currency
    function convertAmount(amount, fromCurrency = 'USD', toCurrency = selectedCurrency) {
        const inUSD = amount / conversionRates[fromCurrency];
        return inUSD * conversionRates[toCurrency];
    }

    // Function to format amount with currency symbol
    function formatAmount(amount) {
        const converted = convertAmount(amount);
        const symbol = currencySymbols[selectedCurrency];
        return `${symbol}${converted.toFixed(2)}`;
    }
    // Store chart instances
    let expenseChart = null;
    let incomeExpenseChart = null;
    // Get UI elements
    const transactionForm = document.getElementById("transaction-form");
    const transactionList = document.getElementById("transactions-table-body");
    const totalIncomeElement = document.getElementById("total-income");
    const totalExpensesElement = document.getElementById("total-expenses");
    const currentBalanceElement = document.getElementById("current-balance");
    const filterTransactions = document.getElementById("filter-transactions");
    const sortTransactions = document.getElementById("sort-transactions");

    // Temporary storage for transactions
    let transactions = [];

    // Add transaction form submission handler
    if (transactionForm) {
        transactionForm.addEventListener("submit", function(e) {
            e.preventDefault();
            
            // Get form data
            const name = document.getElementById("transaction-name")?.value;
            const amount = document.getElementById("transaction-amount")?.value;
            const date = document.getElementById("transaction-date")?.value;
            const category = document.getElementById("transaction-category")?.value;
            const type = category?.includes("income") || category === "salary" || 
                       category === "freelance" || category === "investment" || 
                       category === "gift" ? "income" : "expense";
            
            if (!name || !amount || !date || !category) {
                alert("Please fill in all required fields");
                return;
            }
            
            // Create transaction object
            const transaction = {
                id: Date.now(),
                name: name,
                amount: parseFloat(amount),
                date: date,
                category: category,
                type: type
            };
            
            // Add transaction to temporary storage
            transactions.push(transaction);
            
            // Update UI
            refreshTransactions();
            updateFinancialSummary();

            // Reset form
            transactionForm.reset();
        });
    }

    // Add filter and sort event listeners
    if (filterTransactions) {
        filterTransactions.addEventListener("change", refreshTransactions);
    }
    
    if (sortTransactions) {
        sortTransactions.addEventListener("change", refreshTransactions);
    }

    // Function to refresh transactions list
    function refreshTransactions() {
        if (!transactionList) return;
        
        // Apply filters
        let filteredTransactions = transactions;
        if (filterTransactions && filterTransactions.value !== "all") {
            filteredTransactions = transactions.filter(t => t.type === filterTransactions.value);
        }
        
        // Apply sorting
        if (sortTransactions) {
            const sortOption = sortTransactions.value;
            
            switch (sortOption) {
                case "date-desc":
                    filteredTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));
                    break;
                case "date-asc":
                    filteredTransactions.sort((a, b) => new Date(a.date) - new Date(b.date));
                    break;
                case "amount-desc":
                    filteredTransactions.sort((a, b) => b.amount - a.amount);
                    break;
                case "amount-asc":
                    filteredTransactions.sort((a, b) => a.amount - b.amount);
                    break;
            }
        }
        
        // Clear current list
        transactionList.innerHTML = "";
        
        if (filteredTransactions.length === 0) {
            transactionList.innerHTML = `
                <tr class="text-gray-500 dark:text-gray-400 text-center">
                    <td colspan="5" class="px-6 py-4">No transactions found</td>
                </tr>
            `;
            return;
        }
        
        // Add transactions to list
        filteredTransactions.forEach(transaction => {
            const row = document.createElement("tr");
            
            // Format date
            const date = new Date(transaction.date);
            const formattedDate = date.toLocaleDateString();
            
            // Format amount with + or - sign
            const amountClass = transaction.type === "income" ? "text-green-500" : "text-red-500";
            const amountPrefix = transaction.type === "income" ? "+" : "-";
            const formattedAmount = formatAmount(transaction.amount).replace('-', '');
            
            row.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap">${formattedDate}</td>
                <td class="px-6 py-4 whitespace-nowrap">${transaction.name}</td>
                <td class="px-6 py-4 whitespace-nowrap">${transaction.category}</td>
                <td class="px-6 py-4 whitespace-nowrap ${amountClass}">${amountPrefix}${formattedAmount}</td>
                <td class="px-6 py-4 whitespace-nowrap text-right">
                    <button class="text-red-500 hover:text-red-700" onclick="deleteTransaction(${transaction.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            
            transactionList.appendChild(row);
        });
        
        updateCharts();
    }

    // Function to update financial summary
    function updateFinancialSummary() {
        const summary = transactions.reduce((acc, transaction) => {
            if (transaction.type === "income") {
                acc.income += transaction.amount;
            } else {
                acc.expenses += transaction.amount;
            }
            return acc;
        }, { income: 0, expenses: 0 });

        const balance = summary.income - summary.expenses;

        if (totalIncomeElement) {
            totalIncomeElement.textContent = formatAmount(summary.income);
        }
        
        if (totalExpensesElement) {
            totalExpensesElement.textContent = formatAmount(summary.expenses);
        }
        
        if (currentBalanceElement) {
            currentBalanceElement.textContent = formatAmount(balance);
            currentBalanceElement.className = balance >= 0 ? 'text-green-500' : 'text-red-500';
        }
    }

    // Function to update charts
    function updateCharts() {
        // Destroy existing charts
        if (expenseChart) expenseChart.destroy();
        if (incomeExpenseChart) incomeExpenseChart.destroy();

        // Expense Distribution Chart
        const expenseCtx = document.getElementById('expense-chart')?.getContext('2d');
        if (expenseCtx) {
            const expenseData = transactions
                .filter(t => t.type === 'expense')
                .reduce((acc, t) => {
                    acc[t.category] = (acc[t.category] || 0) + t.amount;
                    return acc;
                }, {});

            expenseChart = new Chart(expenseCtx, {
                type: 'doughnut',
                data: {
                    labels: Object.keys(expenseData),
                    datasets: [{
                        data: Object.values(expenseData),
                        backgroundColor: [
                            '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', 
                            '#9966FF', '#FF9F40', '#8AC24A', '#FF5722'
                        ]
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { 
                            position: 'bottom',
                            labels: {
                                boxWidth: 12,
                                padding: 15
                            }
                        },
                        title: { display: true, text: 'Expense Breakdown' }
                    }
                }
            });
        }

        // Income vs Expense Chart
        const incomeExpenseCtx = document.getElementById('income-expense-chart')?.getContext('2d');
        if (incomeExpenseCtx) {
            const monthlyData = transactions.reduce((acc, t) => {
                const month = new Date(t.date).toLocaleString('default', { month: 'short' });
                if (!acc[month]) {
                    acc[month] = { income: 0, expenses: 0 };
                }
                if (t.type === 'income') {
                    acc[month].income += t.amount;
                } else {
                    acc[month].expenses += t.amount;
                }
                return acc;
            }, {});

            const months = Object.keys(monthlyData);
            const income = months.map(m => monthlyData[m].income);
            const expenses = months.map(m => monthlyData[m].expenses);

            incomeExpenseChart = new Chart(incomeExpenseCtx, {
                type: 'bar',
                data: {
                    labels: months,
                    datasets: [
                        {
                            label: 'Income',
                            data: income,
                            backgroundColor: '#4BC0C0'
                        },
                        {
                            label: 'Expenses',
                            data: expenses,
                            backgroundColor: '#FF6384'
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { 
                            position: 'bottom',
                            labels: {
                                boxWidth: 12,
                                padding: 15
                            }
                        },
                        title: { display: true, text: 'Income vs Expenses' }
                    },
                    scales: {
                        y: { beginAtZero: true }
                    }
                }
            });
        }
    }

    // Global function to delete transaction
    window.deleteTransaction = function(id) {
        transactions = transactions.filter(transaction => transaction.id !== id);
        refreshTransactions();
        updateFinancialSummary();
    };

    // Function to export data as PDF
    window.exportData = function() {
        const exportType = prompt('Choose export format (Enter 1 for PDF, 2 for Excel):', '1');
        
        if (!exportType) return;

        const currentDate = new Date().toLocaleDateString();
        const username = sessionStorage.getItem('loggedInUser');

        if (exportType === '1') {
            // Export as PDF
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();

            // Add title and metadata
            doc.setFontSize(20);
            doc.text('BudgetBuddy Report', 20, 20);
            doc.setFontSize(12);
            doc.text(`Generated on: ${currentDate}`, 20, 30);
            doc.text(`User: ${username}`, 20, 40);

            // Add financial summary
            doc.setFontSize(16);
            doc.text('Financial Summary', 20, 55);
            doc.setFontSize(12);
            doc.text(`Current Balance: $${(transactions.reduce((acc, t) => acc + (t.type === 'income' ? t.amount : -t.amount), 0)).toFixed(2)}`, 20, 65);
            doc.text(`Total Income: $${(transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0)).toFixed(2)}`, 20, 75);
            doc.text(`Total Expenses: $${(transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0)).toFixed(2)}`, 20, 85);

            // Add transactions table
            const tableData = transactions.map(t => [
                new Date(t.date).toLocaleDateString(),
                t.name,
                t.category,
                t.type,
                `$${t.amount.toFixed(2)}`
            ]);

            doc.autoTable({
                startY: 95,
                head: [['Date', 'Description', 'Category', 'Type', 'Amount']],
                body: tableData,
                theme: 'grid',
                styles: { fontSize: 10 },
                headStyles: { fillColor: [66, 139, 202] }
            });

            // Save PDF
            doc.save(`budget-buddy-report-${new Date().toISOString().split('T')[0]}.pdf`);
        } else if (exportType === '2') {
            // Export as Excel
            const wb = XLSX.utils.book_new();
            
            // Create transactions worksheet
            const transactionData = transactions.map(t => ({
                Date: new Date(t.date).toLocaleDateString(),
                Description: t.name,
                Category: t.category,
                Type: t.type,
                Amount: t.amount.toFixed(2)
            }));
            
            const ws = XLSX.utils.json_to_sheet(transactionData);
            XLSX.utils.book_append_sheet(wb, ws, 'Transactions');

            // Create summary worksheet
            const summaryData = [{
                'Report Date': currentDate,
                'User': username,
                'Current Balance': (transactions.reduce((acc, t) => acc + (t.type === 'income' ? t.amount : -t.amount), 0)).toFixed(2),
                'Total Income': (transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0)).toFixed(2),
                'Total Expenses': (transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0)).toFixed(2)
            }];
            
            const wsSummary = XLSX.utils.json_to_sheet(summaryData);
            XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

            // Save Excel file
            XLSX.writeFile(wb, `budget-buddy-report-${new Date().toISOString().split('T')[0]}.xlsx`);
        }
    };

    // Function to clear data
    window.clearData = function() {
        if (confirm('Are you sure you want to clear all transaction data? This cannot be undone!')) {
            transactions = [];
            refreshTransactions();
            updateFinancialSummary();
            updateCharts();
            alert('All transaction data has been cleared.');
        }
    };

    // Initial load
    refreshTransactions();
    updateFinancialSummary();
    updateCharts();
});
