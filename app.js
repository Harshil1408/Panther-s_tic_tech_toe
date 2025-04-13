// BudgetBuddy - Expense Tracker App

// DOM Elements
const themeToggle = document.getElementById("theme-toggle");
const currencySelector = document.getElementById("currency-selector");
const transactionForm = document.getElementById("transaction-form");
const transactionTableBody = document.getElementById("transactions-table-body");
const currentBalanceEl = document.getElementById("current-balance");
const totalIncomeEl = document.getElementById("total-income");
const totalExpensesEl = document.getElementById("total-expenses");
const filterTransactions = document.getElementById("filter-transactions");

// Transaction statistics functions
function getTransactionStats() {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const stats = {
    yearToDate: { income: 0, expenses: 0 },
    averageByCategory: {},
    monthlyTrends: Array(12).fill().map(() => ({ income: 0, expenses: 0 }))
  };

  // Calculate months between dates
  function monthsBetween(d1, d2) {
    return (d2.getFullYear() - d1.getFullYear()) * 12 + d2.getMonth() - d1.getMonth();
  }

  transactions.forEach(transaction => {
    const date = new Date(transaction.date);
    const amount = Math.abs(transaction.amount);
    const isExpense = transaction.amount < 0;
    const monthsAgo = monthsBetween(date, now);

    // Year to date calculations
    if (date >= startOfYear) {
      if (isExpense) {
        stats.yearToDate.expenses += amount;
      } else {
        stats.yearToDate.income += amount;
      }
    }

    // Average by category for expenses
    if (isExpense) {
      const category = getCategoryLabel(transaction.category);
      if (!stats.averageByCategory[category]) {
        stats.averageByCategory[category] = { total: 0, count: 0 };
      }
      stats.averageByCategory[category].total += amount;
      stats.averageByCategory[category].count++;
    }

    // Monthly trends (last 12 months)
    if (monthsAgo < 12) {
      const monthIndex = 11 - monthsAgo;
      if (isExpense) {
        stats.monthlyTrends[monthIndex].expenses += amount;
      } else {
        stats.monthlyTrends[monthIndex].income += amount;
      }
    }
  });

  // Calculate averages
  Object.keys(stats.averageByCategory).forEach(category => {
    const { total, count } = stats.averageByCategory[category];
    stats.averageByCategory[category] = total / count;
  });

  return stats;
}

// Chart helper functions
function getChartThemeColors() {
  const isDark = document.documentElement.classList.contains('dark');
  return {
    text: isDark ? '#F9FAFB' : '#1F2937',
    grid: isDark ? '#374151' : '#E5E7EB',
    border: isDark ? '#1F2937' : '#FFFFFF'
  };
}

function formatPercentageChange(current, previous) {
  if (!previous) return '';
  const change = ((current - previous) / previous) * 100;
  return change !== 0 ? ` (${change > 0 ? '+' : ''}${change.toFixed(1)}% vs prev)` : '';
}

function getChartOptions(type) {
  const colors = getChartThemeColors();
  
  const baseOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 1000,
      easing: 'easeInOutQuart'
    }
  };

  if (type === 'pie') {
    return {
      ...baseOptions,
      plugins: {
        legend: {
          position: 'right',
          labels: {
            color: colors.text,
            padding: 15,
            font: { size: 12 },
            generateLabels: function(chart) {
              const data = chart.data;
              const total = data.datasets[0].data.reduce((sum, value) => sum + value, 0);
              return data.labels.map((label, i) => ({
                text: `${label} (${Math.round(data.datasets[0].data[i] / total * 100)}%)`,
                fillStyle: data.datasets[0].backgroundColor[i],
                hidden: isNaN(data.datasets[0].data[i]),
                index: i,
                strokeStyle: colors.border
              }));
            }
          }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const value = context.raw;
              const total = context.dataset.data.reduce((sum, val) => sum + val, 0);
              const percentage = Math.round((value / total) * 100);
              return `${context.label}: ${formatAmount(value)} (${percentage}%)`;
            }
          }
        }
      }
    };
  }

  return {
    ...baseOptions,
    interaction: {
      intersect: false,
      mode: 'index'
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          color: colors.text,
          callback: value => formatAmount(value)
        },
        grid: { color: colors.grid }
      },
      x: {
        ticks: { color: colors.text },
        grid: { color: colors.grid }
      }
    },
    plugins: {
      legend: {
        labels: {
          color: colors.text,
          padding: 15,
          font: { size: 12 }
        }
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const value = context.raw;
            const datasetIndex = context.datasetIndex;
            const dataIndex = context.dataIndex;
            const dataset = context.chart.data.datasets[datasetIndex];
            
            const changeText = dataIndex > 0 
              ? formatPercentageChange(value, dataset.data[dataIndex - 1])
              : '';
            
            return `${context.dataset.label}: ${formatAmount(value)}${changeText}`;
          }
        }
      }
    }
  };
}
const sortTransactions = document.getElementById("sort-transactions");
const exportDataBtn = document.getElementById("export-data");
const importDataBtn = document.getElementById("import-data");
const importBtn = document.getElementById("import-btn");
const clearDataBtn = document.getElementById("clear-data");
const addBudgetBtn = document.getElementById("add-budget-btn");
const budgetModal = document.getElementById("budget-modal");
const closeBudgetModal = document.getElementById("close-budget-modal");
const budgetForm = document.getElementById("budget-form");
const budgetsContainer = document.getElementById("budgets-container");
const noBudgetsMessage = document.getElementById("no-budgets-message");
const transactionDetailModal = document.getElementById(
  "transaction-detail-modal"
);
const closeTransactionModal = document.getElementById(
  "close-transaction-modal"
);
const transactionDetails = document.getElementById("transaction-details");

// App State
let transactions = [];
let budgets = [];
let currentCurrency = "USD";
let currencySymbols = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  JPY: "¥",
  INR: "₹",
};

// Chart instances
let expenseChart = null;
let incomeExpensesChart = null;

// Initialize the app
function initApp() {
  loadFromLocalStorage();
  setInitialTheme();
  setCurrentDate();
  renderTransactions();
  updateSummary();
  renderBudgets();
  setupEventListeners();
  initializeCharts();
  updateCharts();
}

// Initialize charts
function initializeCharts() {
  // Initialize Expense Distribution Chart (Pie Chart)
  const expenseCtx = document.getElementById('expense-chart').getContext('2d');
  expenseChart = new Chart(expenseCtx, {
    type: 'pie',
    data: {
      labels: [],
      datasets: [{
        data: [],
        backgroundColor: [
          '#EF4444', '#F59E0B', '#10B981', '#3B82F6',
          '#6366F1', '#8B5CF6', '#EC4899', '#14B8A6'
        ]
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
          labels: {
            color: document.documentElement.classList.contains('dark') ? '#F9FAFB' : '#1F2937'
          }
        }
      }
    }
  });

  // Initialize Income vs Expenses Chart (Bar Chart)
  const incomeExpensesCtx = document.getElementById('income-expenses-chart').getContext('2d');
  incomeExpensesChart = new Chart(incomeExpensesCtx, {
    type: 'bar',
    data: {
      labels: ['Last 6 Months'],
      datasets: [
        {
          label: 'Income',
          data: [],
          backgroundColor: '#10B981',
          borderRadius: 6,
          borderSkipped: false,
          hoverOffset: 4
        },
        {
          label: 'Expenses',
          data: [],
          backgroundColor: '#EF4444',
          borderRadius: 6,
          borderSkipped: false,
          hoverOffset: 4
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: 1000,
        easing: 'easeInOutQuart'
      },
      interaction: {
        intersect: false,
        mode: 'index'
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            color: document.documentElement.classList.contains('dark') ? '#F9FAFB' : '#1F2937',
            callback: function(value) {
              return formatAmount(value);
            }
          },
          grid: {
            color: document.documentElement.classList.contains('dark') ? '#374151' : '#E5E7EB'
          }
        },
        x: {
          ticks: {
            color: document.documentElement.classList.contains('dark') ? '#F9FAFB' : '#1F2937'
          },
          grid: {
            color: document.documentElement.classList.contains('dark') ? '#374151' : '#E5E7EB'
          }
        }
      },
      plugins: {
        legend: {
          labels: {
            color: document.documentElement.classList.contains('dark') ? '#F9FAFB' : '#1F2937',
            padding: 15,
            font: {
              size: 12
            }
          }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const value = context.raw;
              const datasetIndex = context.datasetIndex;
              const dataIndex = context.dataIndex;
              const dataset = context.chart.data.datasets[datasetIndex];
              
              // Calculate percentage change from previous month
              let percentageChange = 0;
              if (dataIndex > 0 && dataset.data[dataIndex - 1] !== 0) {
                percentageChange = ((value - dataset.data[dataIndex - 1]) / dataset.data[dataIndex - 1]) * 100;
              }
              
              const changeText = percentageChange !== 0
                ? ` (${percentageChange > 0 ? '+' : ''}${percentageChange.toFixed(1)}% vs prev month)`
                : '';
              
              return `${context.dataset.label}: ${formatAmount(value)}${changeText}`;
            }
          }
        }
      }
    }
  });
}

// Initialize charts
function initializeCharts() {
  // Initialize Expense Distribution Chart (Pie Chart)
  const expenseCtx = document.getElementById('expense-chart').getContext('2d');
  expenseChart = new Chart(expenseCtx, {
    type: 'pie',
    data: {
      labels: [],
      datasets: [{
        data: [],
        backgroundColor: [
          '#EF4444', '#F59E0B', '#10B981', '#3B82F6',
          '#6366F1', '#8B5CF6', '#EC4899', '#14B8A6'
        ]
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
          labels: {
            color: document.documentElement.classList.contains('dark') ? '#F9FAFB' : '#1F2937'
          }
        }
      }
    }
  });

  // Initialize Income vs Expenses Chart (Bar Chart)
  const incomeExpensesCtx = document.getElementById('income-expenses-chart').getContext('2d');
  incomeExpensesChart = new Chart(incomeExpensesCtx, {
    type: 'bar',
    data: {
      labels: ['Last 6 Months'],
      datasets: [
        {
          label: 'Income',
          data: [],
          backgroundColor: '#10B981'
        },
        {
          label: 'Expenses',
          data: [],
          backgroundColor: '#EF4444'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            color: document.documentElement.classList.contains('dark') ? '#F9FAFB' : '#1F2937'
          },
          grid: {
            color: document.documentElement.classList.contains('dark') ? '#374151' : '#E5E7EB'
          }
        },
        x: {
          ticks: {
            color: document.documentElement.classList.contains('dark') ? '#F9FAFB' : '#1F2937'
          },
          grid: {
            color: document.documentElement.classList.contains('dark') ? '#374151' : '#E5E7EB'
          }
        }
      },
      plugins: {
        legend: {
          labels: {
            color: document.documentElement.classList.contains('dark') ? '#F9FAFB' : '#1F2937'
          }
        }
      }
    }
  });
}

// Set the current date in the date input
function setCurrentDate() {
  const today = new Date().toISOString().split("T")[0];
  document.getElementById("transaction-date").value = today;
}

// Load data from localStorage
function loadFromLocalStorage() {
  // Load transactions
  const savedTransactions = localStorage.getItem("budgetBuddy_transactions");
  if (savedTransactions) {
    transactions = JSON.parse(savedTransactions);
  }

  // Load budgets
  const savedBudgets = localStorage.getItem("budgetBuddy_budgets");
  if (savedBudgets) {
    budgets = JSON.parse(savedBudgets);
  }

  // Load currency
  const savedCurrency = localStorage.getItem("budgetBuddy_currency");
  if (savedCurrency) {
    currentCurrency = savedCurrency;
    currencySelector.value = currentCurrency;
  }

  // Load theme
  const savedTheme = localStorage.getItem("budgetBuddy_theme");
  if (savedTheme === "dark") {
    document.documentElement.classList.add("dark");
  }
}

// Set initial theme based on user preference or system preference
function setInitialTheme() {
  const savedTheme = localStorage.getItem("budgetBuddy_theme");
  if (
    savedTheme === "dark" ||
    (!savedTheme && window.matchMedia("(prefers-color-scheme: dark)").matches)
  ) {
    document.documentElement.classList.add("dark");
  }
}

// Setup event listeners
function setupEventListeners() {
  // Theme toggle
  themeToggle.addEventListener("click", toggleTheme);

  // Currency selector
  currencySelector.addEventListener("change", changeCurrency);

  // Transaction form
  transactionForm.addEventListener("submit", addTransaction);

  // Filter and sort
  filterTransactions.addEventListener("change", renderTransactions);
  sortTransactions.addEventListener("change", renderTransactions);

  // Data management
  exportDataBtn.addEventListener("click", exportData);
  importBtn.addEventListener("click", () => importDataBtn.click());
  importDataBtn.addEventListener("change", importData);
  clearDataBtn.addEventListener("click", confirmClearData);

  // Budget management
  addBudgetBtn.addEventListener("click", openBudgetModal);
  closeBudgetModal.addEventListener("click", closeBudgetModalFn);
  budgetForm.addEventListener("submit", addBudget);

  // Transaction modal
  closeTransactionModal.addEventListener("click", closeTransactionModalFn);

  // Category selection based on transaction type
  const transactionTypeRadios = document.querySelectorAll(
    'input[name="transaction-type"]'
  );
  transactionTypeRadios.forEach((radio) => {
    radio.addEventListener("change", updateCategoryOptions);
  });
}

// Toggle between light and dark theme
function toggleTheme() {
  const isDark = document.documentElement.classList.toggle("dark");
  localStorage.setItem("budgetBuddy_theme", isDark ? "dark" : "light");

  // Update chart colors
  if (expenseChart) {
    expenseChart.options = getChartOptions('pie');
    expenseChart.data.datasets[0].borderColor = getChartThemeColors().border;
    expenseChart.update();
  }

  if (incomeExpensesChart) {
    incomeExpensesChart.options = getChartOptions('bar');
    incomeExpensesChart.update();
  }
}

// Change currency
function changeCurrency(e) {
  currentCurrency = e.target.value;
  localStorage.setItem("budgetBuddy_currency", currentCurrency);
  updateSummary();
  renderTransactions();
  renderBudgets();
}

// Format amount with currency symbol
function formatAmount(amount) {
  const symbol = currencySymbols[currentCurrency] || "$";
  return `${symbol}${Math.abs(amount).toFixed(2)}`;
}

// Add a new transaction
// Add a new transaction
function addTransaction(e) {
  e.preventDefault();

  const name = document.getElementById("transaction-name").value;
  const amount = parseFloat(
    document.getElementById("transaction-amount").value
  );
  const date = document.getElementById("transaction-date").value;
  const category = document.getElementById("transaction-category").value;
  const type = document.querySelector(
    'input[name="transaction-type"]:checked'
  ).value;
  const notes = document.getElementById("transaction-notes").value;

  // Create transaction object
  const transaction = {
    id: Date.now().toString(),
    name,
    amount: type === "income" ? Math.abs(amount) : -Math.abs(amount),
    date,
    category,
    type,
    notes,
  };

  // Add to transactions array
  transactions.unshift(transaction);

  // Save to localStorage
  saveTransactions();

  // Update UI
  renderTransactions();
  updateSummary();
  updateBudgetProgress();

  // Reset form
  transactionForm.reset();
  setCurrentDate();

  // Show success message
  showToast("Transaction added successfully!", "success");
}

// Update category options based on transaction type
function updateCategoryOptions() {
  const transactionType = document.querySelector(
    'input[name="transaction-type"]:checked'
  ).value;
  const categorySelect = document.getElementById("transaction-category");
  const currentCategory = categorySelect.value;

  // Clear current options
  categorySelect.innerHTML = '<option value="">Select a category</option>';

  // Add appropriate options based on type
  if (transactionType === "income") {
    const incomeCategories = [
      { value: "salary", label: "Salary" },
      { value: "freelance", label: "Freelance" },
      { value: "investment", label: "Investment" },
      { value: "gift", label: "Gift" },
      { value: "other-income", label: "Other Income" },
    ];

    const incomeGroup = document.createElement("optgroup");
    incomeGroup.label = "Income";

    incomeCategories.forEach((category) => {
      const option = document.createElement("option");
      option.value = category.value;
      option.textContent = category.label;
      incomeGroup.appendChild(option);
    });

    categorySelect.appendChild(incomeGroup);
  } else {
    const expenseCategories = [
      { value: "food", label: "Food & Dining" },
      { value: "transportation", label: "Transportation" },
      { value: "housing", label: "Housing & Rent" },
      { value: "utilities", label: "Utilities" },
      { value: "entertainment", label: "Entertainment" },
      { value: "shopping", label: "Shopping" },
      { value: "health", label: "Health & Medical" },
      { value: "education", label: "Education" },
      { value: "personal", label: "Personal Care" },
      { value: "travel", label: "Travel" },
      { value: "debt", label: "Debt Payment" },
      { value: "other-expense", label: "Other Expense" },
    ];

    const expenseGroup = document.createElement("optgroup");
    expenseGroup.label = "Expense";

    expenseCategories.forEach((category) => {
      const option = document.createElement("option");
      option.value = category.value;
      option.textContent = category.label;
      expenseGroup.appendChild(option);
    });

    categorySelect.appendChild(expenseGroup);
  }

  // Try to restore previous selection if it exists in new options
  if (currentCategory) {
    const option = categorySelect.querySelector(
      `option[value="${currentCategory}"]`
    );
    if (option) {
      option.selected = true;
    }
  }
}

// Save transactions to localStorage
function saveTransactions() {
  localStorage.setItem(
    "budgetBuddy_transactions",
    JSON.stringify(transactions)
  );
}

// Save budgets to localStorage
function saveBudgets() {
  localStorage.setItem("budgetBuddy_budgets", JSON.stringify(budgets));
}

// Render transactions in the table
function renderTransactions() {
  // Get filter and sort values
  const filter = filterTransactions.value;
  const sort = sortTransactions.value;

  // Filter transactions
  let filteredTransactions = [...transactions];
  if (filter !== "all") {
    filteredTransactions = filteredTransactions.filter(
      (t) => t.type === filter
    );
  }

  // Sort transactions
  filteredTransactions.sort((a, b) => {
    switch (sort) {
      case "date-desc":
        return new Date(b.date) - new Date(a.date);
      case "date-asc":
        return new Date(a.date) - new Date(b.date);
      case "amount-desc":
        return b.amount - a.amount;
      case "amount-asc":
        return a.amount - b.amount;
      default:
        return new Date(b.date) - new Date(a.date);
    }
  });

  // Clear table
  transactionTableBody.innerHTML = "";

  // Check if there are transactions
  if (filteredTransactions.length === 0) {
    transactionTableBody.innerHTML = `
            <tr class="text-gray-500 dark:text-gray-400 text-center">
                <td colspan="5" class="px-6 py-4">No transactions found</td>
            </tr>
        `;
    return;
  }

  // Add transactions to table
  filteredTransactions.forEach((transaction) => {
    const row = document.createElement("tr");
    row.className = "transaction-item hover:bg-gray-50 dark:hover:bg-gray-700";
    if (transaction.id === "new") {
      row.classList.add("new-transaction");
      setTimeout(() => {
        transaction.id = Date.now().toString();
        saveTransactions();
      }, 500);
    }

    // Format date
    const date = new Date(transaction.date);
    const formattedDate = date.toLocaleDateString();

    // Get category label
    const categoryLabel = getCategoryLabel(transaction.category);

    row.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">${formattedDate}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">${
              transaction.name
            }</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">${categoryLabel}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium ${
              transaction.amount >= 0
                ? "text-green-600 dark:text-green-400"
                : "text-red-600 dark:text-red-400"
            }">${formatAmount(transaction.amount)}</td>
            <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <button class="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 mr-3 view-transaction" data-id="${
                  transaction.id
                }">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 delete-transaction" data-id="${
                  transaction.id
                }">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </td>
        `;

    transactionTableBody.appendChild(row);
  });

  // Add event listeners to view and delete buttons
  document.querySelectorAll(".view-transaction").forEach((button) => {
    button.addEventListener("click", viewTransaction);
  });

  document.querySelectorAll(".delete-transaction").forEach((button) => {
    button.addEventListener("click", deleteTransaction);
  });
}

// Get category label from category value
function getCategoryLabel(categoryValue) {
  const allCategories = {
    salary: "Salary",
    freelance: "Freelance",
    investment: "Investment",
    gift: "Gift",
    "other-income": "Other Income",
    food: "Food & Dining",
    transportation: "Transportation",
    housing: "Housing & Rent",
    utilities: "Utilities",
    entertainment: "Entertainment",
    shopping: "Shopping",
    health: "Health & Medical",
    education: "Education",
    personal: "Personal Care",
    travel: "Travel",
    debt: "Debt Payment",
    "other-expense": "Other Expense",
  };

  return allCategories[categoryValue] || categoryValue;
}

// View transaction details
function viewTransaction(e) {
  const id = e.currentTarget.getAttribute("data-id");
  const transaction = transactions.find((t) => t.id === id);

  if (transaction) {
    // Format date
    const date = new Date(transaction.date);
    const formattedDate = date.toLocaleDateString();

    // Get category label
    const categoryLabel = getCategoryLabel(transaction.category);

    // Populate transaction details
    transactionDetails.innerHTML = `
            <div class="mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
                <h4 class="text-lg font-semibold text-gray-800 dark:text-white mb-1">${
                  transaction.name
                }</h4>
                <p class="text-sm text-gray-600 dark:text-gray-400">${formattedDate}</p>
            </div>
            <div class="grid grid-cols-2 gap-4 mb-4">
                <div>
                    <p class="text-sm text-gray-600 dark:text-gray-400">Amount</p>
                    <p class="text-lg font-semibold ${
                      transaction.amount >= 0
                        ? "text-green-600 dark:text-green-400"
                        : "text-red-600 dark:text-red-400"
                    }">${formatAmount(transaction.amount)}</p>
                </div>
                <div>
                    <p class="text-sm text-gray-600 dark:text-gray-400">Category</p>
                    <p class="text-lg font-semibold text-gray-800 dark:text-white">${categoryLabel}</p>
                </div>
            </div>
            <div class="mb-4">
                <p class="text-sm text-gray-600 dark:text-gray-400">Type</p>
                <p class="text-lg font-semibold text-gray-800 dark:text-white">${
                  transaction.type.charAt(0).toUpperCase() +
                  transaction.type.slice(1)
                }</p>
            </div>
            ${
              transaction.notes
                ? `
                <div class="mb-4">
                    <p class="text-sm text-gray-600 dark:text-gray-400">Notes</p>
                    <p class="text-gray-800 dark:text-white">${transaction.notes}</p>
                </div>
            `
                : ""
            }
            <div class="flex justify-end mt-6">
                <button class="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors delete-from-modal" data-id="${
                  transaction.id
                }">Delete</button>
            </div>
        `;

    // Add event listener to delete button
    document
      .querySelector(".delete-from-modal")
      .addEventListener("click", (e) => {
        const id = e.currentTarget.getAttribute("data-id");
        deleteTransaction({ currentTarget: { getAttribute: () => id } });
        closeTransactionModalFn();
      });

    // Show modal
    transactionDetailModal.classList.remove("hidden");
  }
}

// Close transaction detail modal
function closeTransactionModalFn() {
  transactionDetailModal.classList.add("hidden");
}

// Delete transaction
function deleteTransaction(e) {
  const id = e.currentTarget.getAttribute("data-id");

  // Confirm deletion
  if (confirm("Are you sure you want to delete this transaction?")) {
    // Remove transaction from array
    transactions = transactions.filter((t) => t.id !== id);

    // Save to localStorage
    saveTransactions();

    // Update UI
    renderTransactions();
    updateSummary();
    updateBudgetProgress();

    // Show success message
    showToast("Transaction deleted successfully!", "success");
  }
}

// Update summary (balance, income, expenses)
function updateSummary() {
  // Calculate totals
  const income = transactions
    .filter((t) => t.amount > 0)
    .reduce((total, t) => total + t.amount, 0);

  const expenses = transactions
    .filter((t) => t.amount < 0)
    .reduce((total, t) => total + Math.abs(t.amount), 0);

  const balance = income - expenses;

  // Update UI
  currentBalanceEl.textContent = formatAmount(balance);
  totalIncomeEl.textContent = formatAmount(income);
  totalExpensesEl.textContent = formatAmount(expenses);
}

// Open budget modal
function openBudgetModal() {
  budgetModal.classList.remove("hidden");
}

// Close budget modal
function closeBudgetModalFn() {
  budgetModal.classList.add("hidden");
  budgetForm.reset();
}

// Add a new budget
function addBudget(e) {
  e.preventDefault();

  const category = document.getElementById("budget-category").value;
  const amount = parseFloat(document.getElementById("budget-amount").value);
  const period = document.getElementById("budget-period").value;

  // Check if budget for this category already exists
  const existingBudgetIndex = budgets.findIndex((b) => b.category === category);

  if (existingBudgetIndex !== -1) {
    // Update existing budget
    budgets[existingBudgetIndex].amount = amount;
    budgets[existingBudgetIndex].period = period;
  } else {
    // Create new budget
    const budget = {
      id: Date.now().toString(),
      category,
      amount,
      period,
      spent: 0,
    };

    budgets.push(budget);
  }

  // Save to localStorage
  saveBudgets();

  // Update UI
  renderBudgets();
  updateBudgetProgress();

  // Close modal
  closeBudgetModalFn();

  // Show success message
  showToast("Budget saved successfully!", "success");
}

// Render budgets
// Render budgets
function renderBudgets() {
  // Check if there are budgets
  if (budgets.length === 0) {
    noBudgetsMessage.classList.remove("hidden");
    budgetsContainer.innerHTML = "";
    return;
  }

  // Hide no budgets message
  noBudgetsMessage.classList.add("hidden");

  // Clear container
  budgetsContainer.innerHTML = "";

  // Add budgets to container
  budgets.forEach((budget) => {
    const categoryLabel = getCategoryLabel(budget.category);
    const periodLabel =
      budget.period.charAt(0).toUpperCase() + budget.period.slice(1);

    // Calculate percentage
    const percentage =
      budget.spent > budget.amount ? 100 : (budget.spent / budget.amount) * 100;

    // Determine color based on percentage
    let colorClass = "bg-green-500";
    if (percentage >= 85) {
      colorClass = "bg-red-500";
    } else if (percentage >= 70) {
      colorClass = "bg-yellow-500";
    }

    const budgetItem = document.createElement("div");
    budgetItem.className =
      "bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 mb-4";
    budgetItem.innerHTML = `
            <div class="flex justify-between items-center mb-2">
                <h3 class="text-lg font-semibold text-gray-700 dark:text-gray-200">${categoryLabel}</h3>
                <button class="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 delete-budget" data-id="${
                  budget.id
                }">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </div>
            <div class="flex justify-between items-center mb-1">
                <p class="text-sm text-gray-600 dark:text-gray-400">${periodLabel} Budget</p>
                <p class="text-sm font-medium text-gray-700 dark:text-gray-300">${formatAmount(
                  budget.spent
                )} / ${formatAmount(budget.amount)}</p>
            </div>
            <div class="budget-progress bg-gray-200 dark:bg-gray-700 mb-2">
                <div class="budget-progress-bar ${colorClass}" style="width: ${percentage}%"></div>
            </div>
            <p class="text-xs text-right text-gray-600 dark:text-gray-400">${percentage.toFixed(
              1
            )}% used</p>
        `;

    budgetsContainer.appendChild(budgetItem);
  });

  // Add event listeners to delete buttons
  document.querySelectorAll(".delete-budget").forEach((button) => {
    button.addEventListener("click", deleteBudget);
  });
}

// Update budget progress based on transactions
function updateBudgetProgress() {
  // Reset spent amounts
  budgets.forEach((budget) => {
    budget.spent = 0;
  });

  // Calculate spent amounts for each budget
  transactions.forEach((transaction) => {
    // Only consider expenses
    if (transaction.amount < 0) {
      const budget = budgets.find((b) => b.category === transaction.category);
      if (budget) {
        budget.spent += Math.abs(transaction.amount);
      }
    }
  });

  // Save updated budgets
  saveBudgets();

  // Render updated budgets
  renderBudgets();
}

// Delete budget
function deleteBudget(e) {
  const id = e.currentTarget.getAttribute("data-id");

  // Confirm deletion
  if (confirm("Are you sure you want to delete this budget?")) {
    // Remove budget from array
    budgets = budgets.filter((b) => b.id !== id);

    // Save to localStorage
    saveBudgets();

    // Update UI
    renderBudgets();

    // Show success message
    showToast("Budget deleted successfully!", "success");
  }
}

// Export data to JSON file
function exportData() {
  const data = {
    transactions,
    budgets,
    currency: currentCurrency,
  };

  const dataStr = JSON.stringify(data, null, 2);
  const dataUri =
    "data:application/json;charset=utf-8," + encodeURIComponent(dataStr);

  const exportFileName = `budgetbuddy_export_${
    new Date().toISOString().split("T")[0]
  }.json`;

  const linkElement = document.createElement("a");
  linkElement.setAttribute("href", dataUri);
  linkElement.setAttribute("download", exportFileName);
  linkElement.click();

  showToast("Data exported successfully!", "success");
}

// Import data from JSON file
function importData(e) {
  const file = e.target.files[0];

  if (file) {
    const reader = new FileReader();

    reader.onload = function (e) {
      try {
        const data = JSON.parse(e.target.result);

        // Validate data structure
        if (
          !data.transactions ||
          !Array.isArray(data.transactions) ||
          !data.budgets ||
          !Array.isArray(data.budgets)
        ) {
          throw new Error("Invalid data format");
        }

        // Confirm import
        if (confirm("This will replace your current data. Continue?")) {
          // Update data
          transactions = data.transactions;
          budgets = data.budgets;

          // Update currency if available
          if (data.currency && currencySymbols[data.currency]) {
            currentCurrency = data.currency;
            currencySelector.value = currentCurrency;
          }

          // Save to localStorage
          saveTransactions();
          saveBudgets();
          localStorage.setItem("budgetBuddy_currency", currentCurrency);

          // Update UI
          renderTransactions();
          updateSummary();
          renderBudgets();

          showToast("Data imported successfully!", "success");
        }
      } catch (error) {
        showToast("Error importing data: Invalid format", "error");
        console.error("Import error:", error);
      }

      // Reset file input
      e.target.value = "";
    };

    reader.readAsText(file);
  }
}

// Confirm clear data
function confirmClearData() {
  if (
    confirm("Are you sure you want to clear all data? This cannot be undone.")
  ) {
    // Clear data
    transactions = [];
    budgets = [];

    // Save to localStorage
    saveTransactions();
    saveBudgets();

    // Update UI
    renderTransactions();
    updateSummary();
    renderBudgets();

    showToast("All data cleared successfully!", "success");
  }
}

// Show toast notification
function showToast(message, type = "success") {
  // Remove existing toasts
  const existingToasts = document.querySelectorAll(".toast");
  existingToasts.forEach((toast) => {
    toast.remove();
  });

  // Create toast element
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.textContent = message;

  // Add to document
  document.body.appendChild(toast);

  // Remove after 3 seconds
  setTimeout(() => {
    toast.remove();
  }, 3000);
}

// Initialize expense chart
function initExpenseChart() {
  const ctx = document.getElementById("expense-chart").getContext("2d");

  // Get expense data by category
  const expenseData = {};

  transactions.forEach((transaction) => {
    if (transaction.amount < 0) {
      const category = transaction.category;
      const amount = Math.abs(transaction.amount);

      if (expenseData[category]) {
        expenseData[category] += amount;
      } else {
        expenseData[category] = amount;
      }
    }
  });

  // Prepare chart data
  const categories = Object.keys(expenseData);
  const amounts = Object.values(expenseData);
  const categoryLabels = categories.map(getCategoryLabel);

  // Chart colors
  const colors = [
    "#4F46E5",
    "#10B981",
    "#F59E0B",
    "#EF4444",
    "#8B5CF6",
    "#EC4899",
    "#06B6D4",
    "#F97316",
    "#84CC16",
    "#6366F1",
    "#14B8A6",
    "#D946EF",
    "#F43F5E",
    "#0EA5E9",
    "#22D3EE",
  ];

  // Create chart
  const expenseChart = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: categoryLabels,
      datasets: [
        {
          data: amounts,
          backgroundColor: colors.slice(0, categories.length),
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "right",
          labels: {
            color: document.documentElement.classList.contains("dark")
              ? "#E5E7EB"
              : "#4B5563",
            font: {
              size: 12,
            },
            padding: 15,
          },
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              const label = context.label || "";
              const value = context.raw || 0;
              const total = context.dataset.data.reduce((a, b) => a + b, 0);
              const percentage = Math.round((value / total) * 100);
              return `${label}: ${formatAmount(value)} (${percentage}%)`;
            },
          },
        },
      },
      cutout: "70%",
    },
  });

  // Update chart when theme changes
  themeToggle.addEventListener("click", () => {
    expenseChart.options.plugins.legend.labels.color =
      document.documentElement.classList.contains("dark")
        ? "#E5E7EB"
        : "#4B5563";
    expenseChart.update();
  });

  return expenseChart;
}

// Initialize income chart
function initIncomeChart() {
  const ctx = document.getElementById("income-chart").getContext("2d");

  // Get income data by category
  const incomeData = {};

  transactions.forEach((transaction) => {
    if (transaction.amount > 0) {
      const category = transaction.category;
      const amount = transaction.amount;

      if (incomeData[category]) {
        incomeData[category] += amount;
      } else {
        incomeData[category] = amount;
      }
    }
  });

  // Prepare chart data
  const categories = Object.keys(incomeData);
  const amounts = Object.values(incomeData);
  const categoryLabels = categories.map(getCategoryLabel);

  // Chart colors
  const colors = [
    "#10B981",
    "#4F46E5",
    "#F59E0B",
    "#8B5CF6",
    "#EF4444",
    "#06B6D4",
    "#EC4899",
    "#F97316",
    "#6366F1",
    "#84CC16",
    "#D946EF",
    "#14B8A6",
    "#F43F5E",
    "#0EA5E9",
    "#22D3EE",
  ];

  // Create chart
  const incomeChart = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: categoryLabels,
      datasets: [
        {
          data: amounts,
          backgroundColor: colors.slice(0, categories.length),
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "right",
          labels: {
            color: document.documentElement.classList.contains("dark")
              ? "#E5E7EB"
              : "#4B5563",
            font: {
              size: 12,
            },
            padding: 15,
          },
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              const label = context.label || "";
              const value = context.raw || 0;
              const total = context.dataset.data.reduce((a, b) => a + b, 0);
              const percentage = Math.round((value / total) * 100);
              return `${label}: ${formatAmount(value)} (${percentage}%)`;
            },
          },
        },
      },
      cutout: "70%",
    },
  });

  // Update chart when theme changes
  themeToggle.addEventListener("click", () => {
    incomeChart.options.plugins.legend.labels.color =
      document.documentElement.classList.contains("dark")
        ? "#E5E7EB"
        : "#4B5563";
    incomeChart.update();
  });

  return incomeChart;
}

// Update charts
function updateCharts() {
  updateExpenseChart();
  updateIncomeExpensesChart();
}

// Update the expense distribution pie chart
function updateExpenseChart() {
  if (!expenseChart) return;

  // Get expenses grouped by category
  const expensesByCategory = {};
  transactions.forEach(transaction => {
    if (transaction.amount < 0) { // Only expenses
      const category = getCategoryLabel(transaction.category);
      expensesByCategory[category] = (expensesByCategory[category] || 0) + Math.abs(transaction.amount);
    }
  });

  // Convert to arrays for the chart
  const labels = Object.keys(expensesByCategory);
  const data = Object.values(expensesByCategory);

  // Update chart data
  expenseChart.data.labels = labels;
  expenseChart.data.datasets[0].data = data;
  expenseChart.update();
}

// Update the income vs expenses bar chart
function updateIncomeExpensesChart() {
  if (!incomeExpensesChart) return;

  // Get last 6 months
  const today = new Date();
  const months = [];
  const incomeData = [];
  const expenseData = [];

  for (let i = 5; i >= 0; i--) {
    const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const monthYear = date.toLocaleDateString('default', { month: 'short', year: '2-digit' });
    months.push(monthYear);

    // Calculate income and expenses for this month
    let income = 0;
    let expenses = 0;
    transactions.forEach(transaction => {
      const transDate = new Date(transaction.date);
      if (transDate.getMonth() === date.getMonth() && 
          transDate.getFullYear() === date.getFullYear()) {
        if (transaction.amount > 0) {
          income += transaction.amount;
        } else {
          expenses += Math.abs(transaction.amount);
        }
      }
    });

    incomeData.push(income);
    expenseData.push(expenses);
  }

  // Update chart data
  incomeExpensesChart.data.labels = months;
  incomeExpensesChart.data.datasets[0].data = incomeData;
  incomeExpensesChart.data.datasets[1].data = expenseData;
  incomeExpensesChart.update();
}

// Update charts with enhanced data
function updateCharts() {
  const stats = getTransactionStats();
  
  // Update expense chart
  if (expenseChart) {
    const expensesByCategory = {};
    transactions.forEach(transaction => {
      if (transaction.amount < 0) {
        const category = getCategoryLabel(transaction.category);
        expensesByCategory[category] = (expensesByCategory[category] || 0) + Math.abs(transaction.amount);
      }
    });

    expenseChart.data.labels = Object.keys(expensesByCategory).map(category => {
      const average = stats.averageByCategory[category];
      return `${category}\n(avg: ${formatAmount(average)})`;
    });
    expenseChart.data.datasets[0].data = Object.values(expensesByCategory);
    expenseChart.update();
  }

  // Update income vs expenses chart
  if (incomeExpensesChart) {
    const months = stats.monthlyTrends.map((_, index) => {
      const date = new Date();
      date.setMonth(date.getMonth() - (11 - index));
      return date.toLocaleString('default', { month: 'short' });
    });

    incomeExpensesChart.data.labels = months;
    incomeExpensesChart.data.datasets[0].data = stats.monthlyTrends.map(m => m.income);
    incomeExpensesChart.data.datasets[1].data = stats.monthlyTrends.map(m => m.expenses);

    // Add year-to-date summary to tooltip
    incomeExpensesChart.options.plugins.tooltip.callbacks.footer = (tooltipItems) => [
      `Year to Date:`,
      `Income: ${formatAmount(stats.yearToDate.income)}`,
      `Expenses: ${formatAmount(stats.yearToDate.expenses)}`,
      `Net: ${formatAmount(stats.yearToDate.income - stats.yearToDate.expenses)}`
    ];

    incomeExpensesChart.update();
  }
}

// Initialize the app when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  initApp();

  // Add event listeners for chart updates
  transactionForm.addEventListener("submit", () => {
    setTimeout(() => {
      if (expenseChart) expenseChart.destroy();
      if (incomeExpensesChart) incomeExpensesChart.destroy();
      initializeCharts();
      updateCharts();
    }, 100);
  });

  document.querySelectorAll(".delete-transaction").forEach((button) => {
    button.addEventListener("click", () => {
      setTimeout(updateChartsOnChange, 100);
    });
  });

  importDataBtn.addEventListener("change", () => {
    setTimeout(updateChartsOnChange, 500);
  });

  clearDataBtn.addEventListener("click", () => {
    setTimeout(updateChartsOnChange, 100);
  });

  // Update category options on load
  updateCategoryOptions();
});
