// BudgetBuddy Database - IndexedDB implementation
// This file provides CRUD operations for the budget application without changing the UI

// Database configuration
const DB_NAME = "budgetBuddyDB";
const DB_VERSION = 1;
const TRANSACTION_STORE = "transactions";
const BUDGET_STORE = "budgets";

// Database class for handling all operations
class BudgetDatabase {
    constructor() {
        this.db = null;
        this.init();
    }

    // Initialize the database
    init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);
            
            request.onerror = (event) => {
                console.error("Database error:", event.target.error);
                reject("Could not open database");
            };
            
            request.onsuccess = (event) => {
                this.db = event.target.result;
                console.log("Database opened successfully");
                resolve(this.db);
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // Create transactions store if it doesn't exist
                if (!db.objectStoreNames.contains(TRANSACTION_STORE)) {
                    const transactionStore = db.createObjectStore(TRANSACTION_STORE, { 
                        keyPath: "id", 
                        autoIncrement: true 
                    });
                    
                    // Create indexes for faster queries
                    transactionStore.createIndex("userId", "userId", { unique: false });
                    transactionStore.createIndex("type", "type", { unique: false });
                    transactionStore.createIndex("date", "date", { unique: false });
                    transactionStore.createIndex("category", "category", { unique: false });
                }
                
                // Create budgets store if it doesn't exist
                if (!db.objectStoreNames.contains(BUDGET_STORE)) {
                    const budgetStore = db.createObjectStore(BUDGET_STORE, { 
                        keyPath: "id", 
                        autoIncrement: true 
                    });
                    
                    // Create indexes for faster queries
                    budgetStore.createIndex("userId", "userId", { unique: false });
                    budgetStore.createIndex("category", "category", { unique: false });
                }
            };
        });
    }

    // Add a new transaction
    addTransaction(transaction) {
        return new Promise((resolve, reject) => {
            const userId = sessionStorage.getItem("loggedInUser");
            if (!userId) {
                reject("User not logged in");
                return;
            }
            
            // Prepare transaction data
            const transactionData = {
                ...transaction,
                userId: userId,
                date: transaction.date || new Date().toISOString().split('T')[0],
                timestamp: Date.now()
            };
            
            const tx = this.db.transaction(TRANSACTION_STORE, "readwrite");
            const store = tx.objectStore(TRANSACTION_STORE);
            
            const request = store.add(transactionData);
            
            request.onsuccess = () => {
                resolve(request.result);
            };
            
            request.onerror = () => {
                reject("Error adding transaction");
            };
        });
    }

    // Get all transactions for current user
    getTransactions() {
        return new Promise((resolve, reject) => {
            const userId = sessionStorage.getItem("loggedInUser");
            if (!userId) {
                reject("User not logged in");
                return;
            }
            
            const tx = this.db.transaction(TRANSACTION_STORE, "readonly");
            const store = tx.objectStore(TRANSACTION_STORE);
            const index = store.index("userId");
            
            const request = index.getAll(userId);
            
            request.onsuccess = () => {
                resolve(request.result);
            };
            
            request.onerror = () => {
                reject("Error getting transactions");
            };
        });
    }

    // Update an existing transaction
    updateTransaction(id, updatedData) {
        return new Promise((resolve, reject) => {
            const userId = sessionStorage.getItem("loggedInUser");
            if (!userId) {
                reject("User not logged in");
                return;
            }
            
            const tx = this.db.transaction(TRANSACTION_STORE, "readwrite");
            const store = tx.objectStore(TRANSACTION_STORE);
            
            // First get the existing transaction
            const getRequest = store.get(id);
            
            getRequest.onsuccess = () => {
                const transaction = getRequest.result;
                
                // Check if transaction exists and belongs to current user
                if (!transaction) {
                    reject("Transaction not found");
                    return;
                }
                
                if (transaction.userId !== userId) {
                    reject("Not authorized to update this transaction");
                    return;
                }
                
                // Update transaction with new data
                const updatedTransaction = {
                    ...transaction,
                    ...updatedData
                };
                
                const updateRequest = store.put(updatedTransaction);
                
                updateRequest.onsuccess = () => {
                    resolve(updateRequest.result);
                };
                
                updateRequest.onerror = () => {
                    reject("Error updating transaction");
                };
            };
            
            getRequest.onerror = () => {
                reject("Error retrieving transaction");
            };
        });
    }

    // Delete a transaction
    deleteTransaction(id) {
        return new Promise((resolve, reject) => {
            const userId = sessionStorage.getItem("loggedInUser");
            if (!userId) {
                reject("User not logged in");
                return;
            }
            
            const tx = this.db.transaction(TRANSACTION_STORE, "readwrite");
            const store = tx.objectStore(TRANSACTION_STORE);
            
            // First get the transaction to check ownership
            const getRequest = store.get(id);
            
            getRequest.onsuccess = () => {
                const transaction = getRequest.result;
                
                // Check if transaction exists and belongs to current user
                if (!transaction) {
                    reject("Transaction not found");
                    return;
                }
                
                if (transaction.userId !== userId) {
                    reject("Not authorized to delete this transaction");
                    return;
                }
                
                // Delete the transaction
                const deleteRequest = store.delete(id);
                
                deleteRequest.onsuccess = () => {
                    resolve();
                };
                
                deleteRequest.onerror = () => {
                    reject("Error deleting transaction");
                };
            };
            
            getRequest.onerror = () => {
                reject("Error retrieving transaction");
            };
        });
    }

    // Get transaction summary (total income, expenses, balance)
    getTransactionSummary() {
        return new Promise((resolve, reject) => {
            this.getTransactions()
                .then(transactions => {
                    const summary = {
                        income: 0,
                        expenses: 0,
                        balance: 0
                    };
                    
                    transactions.forEach(transaction => {
                        const amount = parseFloat(transaction.amount);
                        
                        if (transaction.type === "income") {
                            summary.income += amount;
                        } else {
                            summary.expenses += amount;
                        }
                    });
                    
                    summary.balance = summary.income - summary.expenses;
                    resolve(summary);
                })
                .catch(error => {
                    reject(error);
                });
        });
    }

    // Add or update a budget
    setBudget(category, amount) {
        return new Promise((resolve, reject) => {
            const userId = sessionStorage.getItem("loggedInUser");
            if (!userId) {
                reject("User not logged in");
                return;
            }
            
            const tx = this.db.transaction(BUDGET_STORE, "readwrite");
            const store = tx.objectStore(BUDGET_STORE);
            const index = store.index("category");
            
            // Check if budget already exists for this category
            const getRequest = index.get([userId, category]);
            
            getRequest.onsuccess = () => {
                const budget = getRequest.result;
                
                if (budget) {
                    // Update existing budget
                    budget.amount = amount;
                    store.put(budget);
                    resolve(budget.id);
                } else {
                    // Create new budget
                    const newBudget = {
                        userId: userId,
                        category: category,
                        amount: amount
                    };
                    
                    const addRequest = store.add(newBudget);
                    
                    addRequest.onsuccess = () => {
                        resolve(addRequest.result);
                    };
                    
                    addRequest.onerror = () => {
                        reject("Error adding budget");
                    };
                }
            };
            
            getRequest.onerror = () => {
                reject("Error retrieving budget");
            };
        });
    }

    // Get all budgets for current user
    getBudgets() {
        return new Promise((resolve, reject) => {
            const userId = sessionStorage.getItem("loggedInUser");
            if (!userId) {
                reject("User not logged in");
                return;
            }
            
            const tx = this.db.transaction(BUDGET_STORE, "readonly");
            const store = tx.objectStore(BUDGET_STORE);
            const index = store.index("userId");
            
            const request = index.getAll(userId);
            
            request.onsuccess = () => {
                resolve(request.result);
            };
            
            request.onerror = () => {
                reject("Error getting budgets");
            };
        });
    }
}

// Initialize the database
const budgetDB = new BudgetDatabase();

// Add event listeners when the DOM is loaded
document.addEventListener("DOMContentLoaded", function() {
    // Initialize the database
    budgetDB.init().then(() => {
        console.log("Database initialized");
        
        // Add transaction form submission handler
        const transactionForm = document.getElementById("transaction-form");
        if (transactionForm) {
            transactionForm.addEventListener("submit", function(e) {
                e.preventDefault();
                
                // Get form data
                const name = document.getElementById("transaction-name").value;
                const amount = document.getElementById("transaction-amount").value;
                const date = document.getElementById("transaction-date").value;
                const category = document.getElementById("transaction-category").value;
                const type = document.getElementById("transaction-type").value;
                
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
                    .then(id => {
                        console.log("Transaction added with ID:", id);
                        alert("Transaction added successfully!");
                        
                        // Reset form
                        transactionForm.reset();
                        
                        // Update UI
                        updateTransactionList();
                        updateSummary();
                    })
                    .catch(error => {
                        console.error("Error adding transaction:", error);
                        alert("Error adding transaction: " + error);
                    });
            });
        }
        
        // Initial UI update
        updateTransactionList();
        updateSummary();
    }).catch(error => {
        console.error("Error initializing database:", error);
    });
});

// Update transaction list in the UI
function updateTransactionList() {
    const transactionList = document.getElementById("transaction-list");
    if (!transactionList) return;
    
    // Clear current list
    transactionList.innerHTML = "";
    
    // Get transactions from database
    budgetDB.getTransactions()
        .then(transactions => {
            // Sort transactions by date (newest first)
            transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
            
            if (transactions.length === 0) {
                transactionList.innerHTML = "<tr><td colspan='4' class='text-center py-4'>No transactions found</td></tr>";
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
                    <td class="py-3 px-4 border-b">${formattedDate}</td>
                    <td class="py-3 px-4 border-b">${transaction.name}</td>
                    <td class="py-3 px-4 border-b">${transaction.category}</td>
                    <td class="py-3 px-4 border-b ${amountClass} font-medium">${amountPrefix}$${transaction.amount.toFixed(2)}</td>
                    <td class="py-3 px-4 border-b">
                        <button class="text-red-500 hover:text-red-700" onclick="deleteTransaction(${transaction.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                `;
                
                transactionList.appendChild(row);
            });
        })
        .catch(error => {
            console.error("Error getting transactions:", error);
            transactionList.innerHTML = "<tr><td colspan='4' class='text-center py-4'>Error loading transactions</td></tr>";
        });
}

// Update financial summary in the UI
function updateSummary() {
    budgetDB.getTransactionSummary()
        .then(summary => {
            // Update income
            const incomeElement = document.getElementById("total-income");
            if (incomeElement) {
                incomeElement.textContent = `$${summary.income.toFixed(2)}`;
            }
            
            // Update expenses
            const expensesElement = document.getElementById("total-expenses");
            if (expensesElement) {
                expensesElement.textContent = `$${summary.expenses.toFixed(2)}`;
            }
            
            // Update balance
            const balanceElement = document.getElementById("current-balance");
            if (balanceElement) {
                balanceElement.textContent = `$${summary.balance.toFixed(2)}`;
            }
        })
        .catch(error => {
            console.error("Error updating summary:", error);
        });
}

// Delete transaction function (global for onclick access)
window.deleteTransaction = function(id) {
    if (confirm("Are you sure you want to delete this transaction?")) {
        budgetDB.deleteTransaction(id)
            .then(() => {
                console.log("Transaction deleted");
                updateTransactionList();
                updateSummary();
            })
            .catch(error => {
                console.error("Error deleting transaction:", error);
                alert("Error deleting transaction: " + error);
            });
    }
};
