import React, { useState, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Plus, X, DollarSign, RefreshCw, Edit } from 'lucide-react';
import './App.css'

export default function FinancialCalendar() {
    // Helper function to format date as YYYY-MM-DD in local timezone
    const formatDateToYYYYMMDD = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    // State for managing the calendar
    const [currentDate, setCurrentDate] = useState(new Date());
    const [startingBalance, setStartingBalance] = useState(() => {
        const savedBalance = localStorage.getItem('startingBalance');
        return savedBalance ? parseFloat(savedBalance) : 1000;
    });
    const [transactions, setTransactions] = useState(() => {
        const savedTransactions = localStorage.getItem('transactions');
        return savedTransactions ? JSON.parse(savedTransactions) : [];
    });
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingTransaction, setEditingTransaction] = useState(null);
    const [selectedDate, setSelectedDate] = useState(null);
    const [newTransaction, setNewTransaction] = useState({
        date: formatDateToYYYYMMDD(new Date()),
        description: '',
        amount: '',
        isExpense: true,
        recurring: 'none',
        id: Date.now()
    });

    // Calculate days in month
    const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();

    // Get day of week for first day of month (0 = Sunday, 1 = Monday, etc.)
    const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

    // Navigate to previous month
    const prevMonth = () => {
        setCurrentDate(prev => {
            const newDate = new Date(prev);
            newDate.setMonth(newDate.getMonth() - 1);
            return newDate;
        });
    };

    // Navigate to next month
    const nextMonth = () => {
        setCurrentDate(prev => {
            const newDate = new Date(prev);
            newDate.setMonth(newDate.getMonth() + 1);
            return newDate;
        });
    };

    // Reset to current month
    const resetToCurrentMonth = () => {
        setCurrentDate(new Date());
    };

    // Format date for display
    const formatDate = (date) => {
        const options = { month: 'long', year: 'numeric' };
        return date.toLocaleDateString('en-US', options);
    };

    // Save data to localStorage whenever it changes
    useEffect(() => {
        localStorage.setItem('startingBalance', startingBalance);
        localStorage.setItem('transactions', JSON.stringify(transactions));
    }, [startingBalance, transactions]);

    // Handle transaction form changes
    const handleTransactionChange = (e) => {
        const { name, value, type, checked } = e.target;

        // Special handling for date field to ensure consistent format
        if (name === 'date') {
            // Create a Date object from the input value and format it consistently
            const dateObj = new Date(value + 'T00:00:00');
            const formattedDate = formatDateToYYYYMMDD(dateObj);

            if (editingTransaction) {
                setEditingTransaction(prev => ({
                    ...prev,
                    [name]: formattedDate
                }));
            } else {
                setNewTransaction(prev => ({
                    ...prev,
                    [name]: formattedDate
                }));
            }
        } else {
            // Handle other form fields normally
            if (editingTransaction) {
                setEditingTransaction(prev => ({
                    ...prev,
                    [name]: type === 'checkbox' ? checked : value
                }));
            } else {
                setNewTransaction(prev => ({
                    ...prev,
                    [name]: type === 'checkbox' ? checked : value
                }));
            }
        }
    };

    // Open modal to add transaction on specific date
    const openAddTransactionForDate = (year, month, day) => {
        const selectedDate = new Date(year, month, day);
        const formattedDate = formatDateToYYYYMMDD(selectedDate);

        setSelectedDate(selectedDate);
        setNewTransaction(prev => ({
            ...prev,
            date: formattedDate
        }));
        setEditingTransaction(null);
        setShowAddModal(true);
    };

    // Open modal to edit existing transaction
    const openEditTransaction = (transaction) => {
        // Create a copy with the correct sign for the form
        const isExpense = transaction.amount < 0;
        const editableTrans = {
            ...transaction,
            amount: Math.abs(transaction.amount).toString(),
            isExpense
        };

        setEditingTransaction(editableTrans);
        setShowAddModal(true);
    };

    // Save transaction (new or edited)
    const saveTransaction = () => {
        const transactionData = editingTransaction || newTransaction;

        // Validate inputs
        if (!transactionData.description || !transactionData.amount || !transactionData.date) {
            alert("Please fill in all fields");
            return;
        }

        const amount = parseFloat(transactionData.amount);
        if (isNaN(amount) || amount <= 0) {
            alert("Please enter a valid amount");
            return;
        }

        const finalAmount = transactionData.isExpense ? -amount : amount;

        // Ensure date is in the correct format
        const formattedDate = transactionData.date;

        if (editingTransaction) {
            // Update existing transaction
            setTransactions(prev =>
                prev.map(t => t.id === editingTransaction.id ?
                    { ...editingTransaction, amount: finalAmount, date: formattedDate } : t
                )
            );
        } else {
            // Add new transaction
            const transaction = {
                ...transactionData,
                amount: finalAmount,
                date: formattedDate,
                id: Date.now()
            };

            setTransactions(prev => [...prev, transaction]);
        }

        // Reset and close modal
        setShowAddModal(false);
        setEditingTransaction(null);
        setNewTransaction({
            date: formatDateToYYYYMMDD(new Date()),
            description: '',
            amount: '',
            isExpense: true,
            recurring: 'none',
            id: Date.now()
        });
    };

    // Remove transaction
    const removeTransaction = (id) => {
        setTransactions(prev => prev.filter(t => t.id !== id));
    };

    // Get all applicable transactions for a specific date
    const getTransactionsForDate = (year, month, day) => {
        const targetDate = new Date(year, month, day);
        const formattedTargetDate = formatDateToYYYYMMDD(targetDate);

        // Get one-time transactions for this date
        const oneTimeTransactions = transactions.filter(t => {
            return t.recurring === 'none' && t.date === formattedTargetDate;
        });

        // Calculate recurring transactions
        const recurringTransactions = transactions.filter(t => {
            if (t.recurring === 'none') return false;

            // Add time component to ensure consistent parsing
            const transactionDate = new Date(t.date + 'T00:00:00');

            // Skip if transaction starts after target date
            if (transactionDate > targetDate) return false;

            // Create dates with the same time component for accurate comparison
            const transactionDay = transactionDate.getDate();
            const transactionMonth = transactionDate.getMonth();
            const transactionYear = transactionDate.getFullYear();

            const targetDay = targetDate.getDate();
            const targetMonth = targetDate.getMonth();
            const targetYear = targetDate.getFullYear();

            switch (t.recurring) {
                case 'weekly':
                    // Check if days since transaction is divisible by 7
                    const daysSinceWeekly = Math.floor((targetDate - transactionDate) / (1000 * 60 * 60 * 24));
                    return daysSinceWeekly % 7 === 0;

                case 'biweekly':
                    const daysSinceBiweekly = Math.floor((targetDate - transactionDate) / (1000 * 60 * 60 * 24));
                    return daysSinceBiweekly % 14 === 0;

                case 'monthly':
                    return transactionDay === targetDay;

                case 'quarterly':
                    const monthDiff = (targetYear - transactionYear) * 12 +
                        targetMonth - transactionMonth;
                    return monthDiff % 3 === 0 && transactionDay === targetDay;

                case 'annually':
                    return transactionDay === targetDay &&
                        transactionMonth === targetMonth;

                default:
                    return false;
            }
        });

        return [...oneTimeTransactions, ...recurringTransactions];
    };

    // Calculate running balance up to a specific date
    const getRunningBalanceForDate = (year, month, day) => {
        let balance = startingBalance;
        const targetDate = new Date(year, month, day);

        // Get all transactions up to and including the target date
        const allTransactions = [];

        // Loop through all transactions and check if they apply to any date up to the target date
        transactions.forEach(transaction => {
            const transactionDate = new Date(transaction.date + 'T00:00:00'); // Add time to ensure consistent parsing

            // For one-time transactions, just check if they're on or before the target date
            if (transaction.recurring === 'none') {
                if (transactionDate <= targetDate) {
                    allTransactions.push(transaction);
                }
                return;
            }

            // For recurring transactions, calculate all occurrences up to the target date
            let currentDate = new Date(transactionDate);

            while (currentDate <= targetDate) {
                // Add this occurrence
                allTransactions.push({...transaction, calculatedDate: new Date(currentDate)});

                // Move to next occurrence based on recurrence type
                switch (transaction.recurring) {
                    case 'weekly':
                        currentDate.setDate(currentDate.getDate() + 7);
                        break;
                    case 'biweekly':
                        currentDate.setDate(currentDate.getDate() + 14);
                        break;
                    case 'monthly':
                        currentDate.setMonth(currentDate.getMonth() + 1);
                        break;
                    case 'quarterly':
                        currentDate.setMonth(currentDate.getMonth() + 3);
                        break;
                    case 'annually':
                        currentDate.setFullYear(currentDate.getFullYear() + 1);
                        break;
                }
            }
        });

        // Apply all transactions to the balance
        allTransactions.forEach(transaction => {
            balance += transaction.amount;
        });

        return balance;
    };

    // Build calendar grid
    const buildCalendarGrid = () => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const daysInMonth = getDaysInMonth(year, month);
        const firstDayOfMonth = getFirstDayOfMonth(year, month);

        // Create grid with empty spots for preceding days
        const grid = Array(firstDayOfMonth).fill(null);

        // Fill in days of the month
        for (let day = 1; day <= daysInMonth; day++) {
            grid.push(day);
        }

        return grid;
    };

    return (
        <div className="flex flex-col h-screen max-w-4xl mx-auto p-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">
                    <Calendar className="mr-2 text-blue-600" />
                    <h1 className="text-2xl font-bold text-gray-800">Financial Calendar</h1>
                </div>
                <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2">
                        <span className="font-medium text-gray-700">Starting Balance:</span>
                        <div className="relative">
                            <span className="absolute left-2 top-2 text-gray-500">$</span>
                            <input
                                type="number"
                                value={startingBalance}
                                onChange={(e) => setStartingBalance(parseFloat(e.target.value) || 0)}
                                className="pl-6 p-1 border rounded w-32"
                            />
                        </div>
                    </label>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="bg-blue-600 text-white px-4 py-2 rounded-md flex items-center"
                    >
                        <Plus className="mr-1" size={16} />
                        Add Transaction
                    </button>
                </div>
            </div>

            {/* Calendar Navigation */}
            <div className="flex items-center justify-between mb-4">
                <button onClick={prevMonth} className="p-2 rounded-full hover:bg-gray-100">
                    <ChevronLeft size={20} />
                </button>
                <div className="flex items-center">
                    <h2 className="text-xl font-semibold">{formatDate(currentDate)}</h2>
                    <button
                        onClick={resetToCurrentMonth}
                        className="ml-2 text-blue-600 hover:text-blue-800"
                    >
                        <RefreshCw size={16} />
                    </button>
                </div>
                <button onClick={nextMonth} className="p-2 rounded-full hover:bg-gray-100">
                    <ChevronRight size={20} />
                </button>
            </div>

            {/* Calendar Grid */}
            <div className="flex-grow">
                {/* Days of Week Header */}
                <div className="grid grid-cols-7 gap-1 mb-1 text-center">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                        <div key={day} className="font-medium text-gray-500 py-2">
                            {day}
                        </div>
                    ))}
                </div>

                {/* Calendar Days */}
                <div className="grid grid-cols-7 gap-1 flex-grow">
                    {buildCalendarGrid().map((day, index) => {
                        if (day === null) {
                            return <div key={`empty-${index}`} className="border rounded-md bg-gray-50"></div>;
                        }

                        const year = currentDate.getFullYear();
                        const month = currentDate.getMonth();
                        const dayDate = new Date(year, month, day);
                        const isToday = new Date().toDateString() === dayDate.toDateString();
                        const dateTransactions = getTransactionsForDate(year, month, day);
                        const runningBalance = getRunningBalanceForDate(year, month, day);

                        return (
                            <div
                                key={`day-${day}`}
                                className={`border rounded-md p-1 h-28 overflow-y-auto ${
                                    isToday ? 'border-blue-500 border-2' : ''
                                } hover:border-blue-300 cursor-pointer transition-colors`}
                                onClick={() => openAddTransactionForDate(year, month, day)}
                            >
                                <div className="flex justify-between items-center">
                                    <span className={`text-sm font-medium ${isToday ? 'text-blue-600' : ''}`}>{day}</span>
                                    <div className="flex items-center">
                                        {runningBalance !== startingBalance && (
                                            <span className={`text-xs font-medium ${
                                                runningBalance >= 0 ? 'text-green-600' : 'text-red-600'
                                            }`}>
                        ${runningBalance.toFixed(2)}
                      </span>
                                        )}
                                        <button
                                            className="ml-1 text-gray-400 hover:text-blue-500 p-1"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                openAddTransactionForDate(year, month, day);
                                            }}
                                        >
                                            <Plus size={12} />
                                        </button>
                                    </div>
                                </div>

                                {/* Transactions for this day */}
                                <div className="mt-1">
                                    {dateTransactions.map(transaction => (
                                        <div
                                            key={transaction.id}
                                            className={`text-xs p-1 mb-1 rounded ${
                                                transaction.amount >= 0 ? 'bg-green-100' : 'bg-red-100'
                                            } flex justify-between items-center hover:brightness-95 transition-all`}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                openEditTransaction(transaction);
                                            }}
                                        >
                                            <div className="flex-grow">
                                                <div className="font-medium truncate">{transaction.description}</div>
                                                <div className="flex items-center">
                          <span className={transaction.amount >= 0 ? 'text-green-600' : 'text-red-600'}>
                            ${Math.abs(transaction.amount).toFixed(2)}
                          </span>
                                                    {transaction.recurring !== 'none' && (
                                                        <span className="ml-1 text-gray-500">
                              <RefreshCw size={10} />
                            </span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        openEditTransaction(transaction);
                                                    }}
                                                    className="text-gray-500 hover:text-blue-500 mr-1"
                                                >
                                                    <Edit size={12} />
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        removeTransaction(transaction.id);
                                                    }}
                                                    className="text-gray-500 hover:text-red-500"
                                                >
                                                    <X size={12} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Add/Edit Transaction Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-10">
                    <div className="bg-white p-6 rounded-lg w-full max-w-md">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold">
                                {editingTransaction ? 'Edit Transaction' : 'Add Transaction'}
                            </h3>
                            <button
                                onClick={() => {
                                    setShowAddModal(false);
                                    setEditingTransaction(null);
                                }}
                                className="text-gray-500 hover:text-gray-700"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                                <input
                                    type="date"
                                    name="date"
                                    value={editingTransaction ? editingTransaction.date : newTransaction.date}
                                    onChange={handleTransactionChange}
                                    className="w-full p-2 border rounded"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                <input
                                    type="text"
                                    name="description"
                                    value={editingTransaction ? editingTransaction.description : newTransaction.description}
                                    onChange={handleTransactionChange}
                                    className="w-full p-2 border rounded"
                                    placeholder="Rent, Groceries, Salary, etc."
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                                <div className="relative">
                                    <span className="absolute left-2 top-2 text-gray-500">$</span>
                                    <input
                                        type="number"
                                        name="amount"
                                        value={editingTransaction ? editingTransaction.amount : newTransaction.amount}
                                        onChange={handleTransactionChange}
                                        className="w-full p-2 pl-6 border rounded"
                                        placeholder="0.00"
                                        min="0.01"
                                        step="0.01"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center">
                                <label className="inline-flex items-center mr-6">
                                    <input
                                        type="radio"
                                        name="isExpense"
                                        checked={editingTransaction ? editingTransaction.isExpense : newTransaction.isExpense}
                                        onChange={() => {
                                            if (editingTransaction) {
                                                setEditingTransaction(prev => ({ ...prev, isExpense: true }));
                                            } else {
                                                setNewTransaction(prev => ({ ...prev, isExpense: true }));
                                            }
                                        }}
                                        className="mr-2"
                                    />
                                    <span className="text-red-600">Expense</span>
                                </label>
                                <label className="inline-flex items-center">
                                    <input
                                        type="radio"
                                        name="isExpense"
                                        checked={editingTransaction ? !editingTransaction.isExpense : !newTransaction.isExpense}
                                        onChange={() => {
                                            if (editingTransaction) {
                                                setEditingTransaction(prev => ({ ...prev, isExpense: false }));
                                            } else {
                                                setNewTransaction(prev => ({ ...prev, isExpense: false }));
                                            }
                                        }}
                                        className="mr-2"
                                    />
                                    <span className="text-green-600">Income</span>
                                </label>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Recurring</label>
                                <select
                                    name="recurring"
                                    value={editingTransaction ? editingTransaction.recurring : newTransaction.recurring}
                                    onChange={handleTransactionChange}
                                    className="w-full p-2 border rounded"
                                >
                                    <option value="none">One-time</option>
                                    <option value="weekly">Weekly</option>
                                    <option value="biweekly">Biweekly</option>
                                    <option value="monthly">Monthly</option>
                                    <option value="quarterly">Quarterly</option>
                                    <option value="annually">Annually</option>
                                </select>
                            </div>

                            <button
                                onClick={saveTransaction}
                                className="w-full bg-blue-600 text-white p-2 rounded-md hover:bg-blue-700"
                            >
                                {editingTransaction ? 'Save Changes' : 'Add Transaction'}
                            </button>

                            {editingTransaction && (
                                <button
                                    onClick={() => removeTransaction(editingTransaction.id)}
                                    className="w-full bg-red-100 text-red-600 p-2 rounded-md hover:bg-red-200 mt-2"
                                >
                                    Delete Transaction
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
