const Budget = require('../models/Budget');

// @route   POST /api/budget
// @desc    Create a new budget for a trip
// @access  Private
exports.createBudget = async (req, res) => {
  try {
    const { tripName, totalBudget, currency } = req.body;
    if (!tripName || !totalBudget) {
      return res.status(400).json({ message: 'Trip name and total budget are required' });
    }
    const budget = new Budget({
      userId: req.user.userId,
      tripName,
      totalBudget,
      currency: currency || 'USD',
      expenses: []
    });
    await budget.save();
    res.status(201).json({ message: 'Budget created!', budget });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @route   GET /api/budget
// @desc    Get all budgets for the logged-in user
// @access  Private
exports.getBudgets = async (req, res) => {
  try {
    const budgets = await Budget.find({ userId: req.user.userId }).sort({ createdAt: -1 });
    res.json(budgets);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @route   POST /api/budget/:id/expense
// @desc    Add expense to a budget
// @access  Private
exports.addExpense = async (req, res) => {
  try {
    const { description, amount, category, date } = req.body;
    if (!description || amount === undefined) {
      return res.status(400).json({ message: 'Description and amount are required' });
    }
    const budget = await Budget.findOne({ _id: req.params.id, userId: req.user.userId });
    if (!budget) return res.status(404).json({ message: 'Budget not found' });

    budget.expenses.push({ description, amount, category, date });
    await budget.save();
    res.json({ message: 'Expense added!', budget });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @route   DELETE /api/budget/:id/expense/:expenseId
// @desc    Delete an expense from a budget
// @access  Private
exports.deleteExpense = async (req, res) => {
  try {
    const budget = await Budget.findOne({ _id: req.params.id, userId: req.user.userId });
    if (!budget) return res.status(404).json({ message: 'Budget not found' });

    budget.expenses = budget.expenses.filter(e => e._id.toString() !== req.params.expenseId);
    await budget.save();
    res.json({ message: 'Expense deleted!', budget });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @route   DELETE /api/budget/:id
// @desc    Delete a budget
// @access  Private
exports.deleteBudget = async (req, res) => {
  try {
    const budget = await Budget.findOneAndDelete({ _id: req.params.id, userId: req.user.userId });
    if (!budget) return res.status(404).json({ message: 'Budget not found' });
    res.json({ message: 'Budget deleted!' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
