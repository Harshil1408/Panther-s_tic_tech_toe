// Database Adapter - Connects the existing UI with IndexedDB
// This adapter ensures the database works with the current UI without changing the interface

document.addEventListener("DOMContentLoaded", function() {
    // Initialize database
    if (typeof budgetDB === 'undefined') {
        console.error("Database not initialized. Make sure database.js is loaded first.");
        return;
    }

    // Get UI elements
    const transactionForm = document.getElementById("transaction-form");
    const transactionList = document.getElementById("transaction-list");
    const totalIncomeElement = document.getElementById("total-income");
    const totalExpensesElement = document.getElementById("total-expenses");
    const currentBalanceElement = document.getElementById("current-balance");
    const filterTransactions = document.getElementById("filter-transactions");
    const sortTransactions = document.getElementById("sort-transactions");

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
                name: name,
                amount: parseFloat(amount),
                date: date,
                category: category,
                type: type
            };
            
            // Add transaction to database
            budgetDB.addTransaction(transaction)
                .then(() => {
                    console.log("Transaction added successfully");
                    alert("Transaction added successfully!");
                    
                    // Reset form
                    transactionForm.reset();
                    
                    // Update UI
                    refreshTransactions();
                })
                .catch(error => {
                    console.error("Error adding transaction:", error);
                    alert("Error adding transaction: " + error);
                });
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
        
        budgetDB.getTransactions()
            .then(transactions => {
                // Apply filters
                if (filterTransactions && filterTransactions.value !== "all") {
                    transactions = transactions.filter(t => t.type === filterTransactions.value);
                }
                
                // Apply sorting
                if (sortTransactions) {
                    const sortOption = sortTransactions.value;
                    
                    switch (sortOption) {
                        case "date-desc":
                            transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
                            break;
                        case "date-asc":
                            transactions.sort((a, b) => new Date(a.date) - new Date(b.date));
                            break;
                        case "amount-desc":
                            transactions.sort((a, b) => b.amount - a.amount);
                            break;
                        case "amount-asc":
                            transactions.sort((a, b) => a.amount - b.amount);
                            break;
                    }
                }
                
                // Clear current list
                transactionList.innerHTML = "";
                
                if (transactions.length === 0) {
                    transactionList.innerHTML = `
                        <tr class="text-gray-500 dark:text-gray-400 text-center">
                            <td colspan="5" class="px-6 py-4">No transactions found</td>
                        </tr>
                    `;
                    return;
                }
                
                // Add transactions to list
                transactions.forEach(transaction => {
                    const row = document.createElement("tr");
                    
                    // Format date
                    const date = new Date(transaction.date);
                    const formattedDate = date.toLocaleDateString();
                    
                    // Format amount with + or - sign
                    const amountClass = transaction.type === "income" ? "text-green-500" : "text-red-500";
                    const amountPrefix = transaction.type === "income" ? "+" : "-";
                    
                    row.innerHTML = `
                        <td class="px-6 py-4 whitespace-nowrap">${formattedDate}</td>
                        <td class="px-6 py-4 whitespace-nowrap">${transaction.name}</td>
                        <td class="px-6 py-4 whitespace-nowrap">${transaction.category}</td>
                        <td class="px-6 py-4 whitespace-nowrap ${amountClass}">${amountPrefix}$${transaction.amount.toFixed(2)}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-right">
                            <button class="text-red-500 hover:text-red-700" onclick="deleteTransaction(${transaction.id})">
                                <i class="fas fa-trash"></i>
                            </button>
                        </td>
                    `;
                    
                    transactionList.appendChild(row);
                });
                
                // Update financial summary
                updateFinancialSummary();
            })
            .catch(error => {
                console.error("Error getting transactions:", error);
                transactionList.innerHTML = `
                    <tr class="text-gray-500 dark:text-gray-400 text-center">
                        <td colspan="5" class="px-6 py-4">Error loading transactions</td>
                    </tr>
                `;
            });
    }

    // Function to update financial summary
    function updateFinancialSummary() {
        budgetDB.getTransactionSummary()
            .then(summary => {
                if (totalIncomeElement) {
                    totalIncomeElement.textContent = `$${summary.income.toFixed(2)}`;
                }
                
                if (totalExpensesElement) {
                    totalExpensesElement.textContent = `$${summary.expenses.toFixed(2)}`;
                }
                
                if (currentBalanceElement) {
                    currentBalanceElement.textContent = `$${summary.balance.toFixed(2)}`;
                }
                
                // Update charts if they exist
                updateCharts();
            })
            .catch(error => {
                console.error("Error updating financial summary:", error);
            });
    }

    // Function to update charts
    function updateCharts() {
        budgetDB.getTransactions()
            .then(transactions => {
                // Update expense distribution chart
                updateExpenseChart(transactions);
                
                // Update income vs expense chart
                updateIncomeExpenseChart(transactions);
            })
            .catch(error => {
                console.error("Error updating charts:", error);
            });
    }

    // Function to update expense distribution chart
    function updateExpenseChart(transactions) {
        const expenseChartCanvas = document.getElementById("expense-chart");
        if (!expenseChartCanvas) return;
        
        // Get expense transactions
        const expenseTransactions = transactions.filter(t => t.type === "expense");
        
        // Group by category
        const expensesByCategory = {};
        expenseTransactions.forEach(transaction => {
            if (!expensesByCategory[transaction.category]) {
                expensesByCategory[transaction.category] = 0;
            }
            expensesByCategory[transaction.category] += transaction.amount;
        });
        
        // Prepare chart data
        const categories = Object.keys(expensesByCategory);
        const amounts = Object.values(expensesByCategory);
        
        // Create chart
        if (window.expenseChart) {
            window.expenseChart.destroy();
        }
        
        window.expenseChart = new Chart(expenseChartCanvas, {
            type: "pie",
            data: {
                labels: categories,
                datasets: [{
                    data: amounts,
                    backgroundColor: [
                        "#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0", 
                        "#9966FF", "#FF9F40", "#C9CBCF", "#7BC225"
                    ]
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: "right"
                    },
                    title: {
                        display: true,
                        text: "Expense Distribution"
                    }
                }
            }
        });
    }

    // Function to update income vs expense chart
    function updateIncomeExpenseChart(transactions) {
        const incomeExpenseChartCanvas = document.getElementById("income-expense-chart");
        if (!incomeExpenseChartCanvas) return;
        
        // Group by month
        const monthlyData = {};
        transactions.forEach(transaction => {
            const date = new Date(transaction.date);
            const month = date.toLocaleString("default", { month: "short" });
            const year = date.getFullYear();
            const key = `${month} ${year}`;
            
            if (!monthlyData[key]) {
                monthlyData[key] = { income: 0, expense: 0 };
            }
            
            if (transaction.type === "income") {
                monthlyData[key].income += transaction.amount;
            } else {
                monthlyData[key].expense += transaction.amount;
            }
        });
        
        // Sort by date
        const sortedKeys = Object.keys(monthlyData).sort((a, b) => {
            const dateA = new Date(a);
            const dateB = new Date(b);
            return dateA - dateB;
        });
        
        // Prepare chart data
        const labels = sortedKeys;
        const incomeData = sortedKeys.map(key => monthlyData[key].income);
        const expenseData = sortedKeys.map(key => monthlyData[key].expense);
        
        // Create chart
        if (window.incomeExpenseChart) {
            window.incomeExpenseChart.destroy();
        }
        
        window.incomeExpenseChart = new Chart(incomeExpenseChartCanvas, {
            type: "bar",
            data: {
                labels: labels,
                datasets: [
                    {
                        label: "Income",
                        data: incomeData,
                        backgroundColor: "rgba(75, 192, 192, 0.5)",
                        borderColor: "rgb(75, 192, 192)",
                        borderWidth: 1
                    },
                    {
                        label: "Expenses",
                        data: expenseData,
                        backgroundColor: "rgba(255, 99, 132, 0.5)",
                        borderColor: "rgb(255, 99, 132)",
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
                }
            }
        });
    }

    // Global function to delete transaction
    window.deleteTransaction = function(id) {
        if (confirm("Are you sure you want to delete this transaction?")) {
            budgetDB.deleteTransaction(id)
                .then(() => {
                    refreshTransactions();
                })
                .catch(error => {
                    console.error("Error deleting transaction:", error);
                    alert("Error deleting transaction: " + error);
                });
        }
    };

    // Initial load
    refreshTransactions();
});
