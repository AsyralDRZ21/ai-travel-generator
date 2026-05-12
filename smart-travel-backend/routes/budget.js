const express = require('express');
const router = express.Router();
const { createBudget, getBudgets, addExpense, deleteExpense, deleteBudget } = require('../controllers/budgetController');
const { protect } = require('../middleware/authMiddleware');

router.post('/', protect, createBudget);
router.get('/', protect, getBudgets);
router.post('/:id/expense', protect, addExpense);
router.delete('/:id/expense/:expenseId', protect, deleteExpense);
router.delete('/:id', protect, deleteBudget);

module.exports = router;
