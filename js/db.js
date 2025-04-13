// Database initialization
const dbName = "budgetBuddyDB";
const dbVersion = 1;

// Database schema and operations
class BudgetDatabase {
    constructor() {
        this.db = null;
        this.initDB();
    }

    // Initialize the database
    initDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(dbName, dbVersion);

            request.onerror = (event) => {
                reject("Database error: " + event.target.error);
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Create transactions store
                if (!db.objectStoreNames.contains('transactions')) {
                    const transactionStore = db.createObjectStore('transactions', { keyPath: 'id', autoIncrement: true });
                    transactionStore.createIndex('date', 'date');
                    transactionStore.createIndex('type', 'type');
                    transactionStore.createIndex('category', 'category');
                    transactionStore.createIndex('userId', 'userId');
                }

                // Create budgets store
                if (!db.objectStoreNames.contains('budgets')) {
                    const budgetStore = db.createObjectStore('budgets', { keyPath: 'id', autoIncrement: true });
                    budgetStore.createIndex('category', 'category');
                    budgetStore.createIndex('userId', 'userId');
                }
            };
        });
    }

    // Add a new transaction
    async addTransaction(transaction) {
        const userId = sessionStorage.getItem('loggedInUser');
        if (!userId) throw new Error('User not logged in');

        return new Promise((resolve, reject) => {
            const tx = this.db.transaction('transactions', 'readwrite');
            const store = tx.objectStore('transactions');

            const request = store.add({
                ...transaction,
                userId,
                date: new Date(transaction.date || Date.now())
            });

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // Get all transactions for the logged-in user
    async getTransactions() {
        const userId = sessionStorage.getItem('loggedInUser');
        if (!userId) throw new Error('User not logged in');

        return new Promise((resolve, reject) => {
            const tx = this.db.transaction('transactions', 'readonly');
            const store = tx.objectStore('transactions');
            const request = store.getAll();

            request.onsuccess = () => {
                const transactions = request.result.filter(t => t.userId === userId);
                resolve(transactions);
            };
            request.onerror = () => reject(request.error);
        });
    }

    // Update a transaction
    async updateTransaction(id, updatedData) {
        const userId = sessionStorage.getItem('loggedInUser');
        if (!userId) throw new Error('User not logged in');

        return new Promise((resolve, reject) => {
            const tx = this.db.transaction('transactions', 'readwrite');
            const store = tx.objectStore('transactions');
            
            const getRequest = store.get(id);
            getRequest.onsuccess = () => {
                const transaction = getRequest.result;
                if (transaction.userId !== userId) {
                    reject(new Error('Unauthorized to update this transaction'));
                    return;
                }

                const updateRequest = store.put({
                    ...transaction,
                    ...updatedData,
                    id
                });

                updateRequest.onsuccess = () => resolve(updateRequest.result);
                updateRequest.onerror = () => reject(updateRequest.error);
            };
        });
    }

    // Delete a transaction
    async deleteTransaction(id) {
        const userId = sessionStorage.getItem('loggedInUser');
        if (!userId) throw new Error('User not logged in');

        return new Promise((resolve, reject) => {
            const tx = this.db.transaction('transactions', 'readwrite');
            const store = tx.objectStore('transactions');

            const getRequest = store.get(id);
            getRequest.onsuccess = () => {
                const transaction = getRequest.result;
                if (transaction.userId !== userId) {
                    reject(new Error('Unauthorized to delete this transaction'));
                    return;
                }

                const deleteRequest = store.delete(id);
                deleteRequest.onsuccess = () => resolve();
                deleteRequest.onerror = () => reject(deleteRequest.error);
            };
        });
    }

    // Add or update a budget
    async setBudget(budget) {
        const userId = sessionStorage.getItem('loggedInUser');
        if (!userId) throw new Error('User not logged in');

        return new Promise((resolve, reject) => {
            const tx = this.db.transaction('budgets', 'readwrite');
            const store = tx.objectStore('budgets');

            const request = store.put({
                ...budget,
                userId
            });

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // Get all budgets for the logged-in user
    async getBudgets() {
        const userId = sessionStorage.getItem('loggedInUser');
        if (!userId) throw new Error('User not logged in');

        return new Promise((resolve, reject) => {
            const tx = this.db.transaction('budgets', 'readonly');
            const store = tx.objectStore('budgets');
            const request = store.getAll();

            request.onsuccess = () => {
                const budgets = request.result.filter(b => b.userId === userId);
                resolve(budgets);
            };
            request.onerror = () => reject(request.error);
        });
    }

    // Get transactions summary (total income and expenses)
    async getTransactionsSummary() {
        const transactions = await this.getTransactions();
        return transactions.reduce((summary, transaction) => {
            if (transaction.type === 'income') {
                summary.totalIncome += Number(transaction.amount);
            } else if (transaction.type === 'expense') {
                summary.totalExpenses += Number(transaction.amount);
            }
            return summary;
        }, { totalIncome: 0, totalExpenses: 0 });
    }

    // Get transactions by date range
    async getTransactionsByDateRange(startDate, endDate) {
        const transactions = await this.getTransactions();
        return transactions.filter(transaction => {
            const transactionDate = new Date(transaction.date);
            return transactionDate >= startDate && transactionDate <= endDate;
        });
    }

    // Get transactions by category
    async getTransactionsByCategory(category) {
        const transactions = await this.getTransactions();
        return transactions.filter(transaction => transaction.category === category);
    }
}

// Create and export database instance
const budgetDB = new BudgetDatabase();
