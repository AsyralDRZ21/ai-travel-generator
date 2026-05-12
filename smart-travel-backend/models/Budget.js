const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
  description: { type: String, required: true, trim: true },
  amount: { type: Number, required: true, min: 0 },
  category: {
    type: String,
    enum: ['accommodation', 'food', 'transport', 'activities', 'shopping', 'health', 'other'],
    default: 'other'
  },
  date: { type: Date, default: Date.now }
});

const budgetSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  tripName: {
    type: String,
    required: [true, 'Trip name is required'],
    trim: true
  },
  totalBudget: {
    type: Number,
    required: [true, 'Total budget is required'],
    min: 0
  },
  currency: {
    type: String,
    default: 'USD'
  },
  expenses: [expenseSchema]
}, { timestamps: true });

// Virtual: compute total spent
budgetSchema.virtual('totalSpent').get(function () {
  return this.expenses.reduce((sum, e) => sum + e.amount, 0);
});

budgetSchema.set('toJSON', { virtuals: true });
budgetSchema.set('toObject', { virtuals: true });

const Budget = mongoose.model('Budget', budgetSchema);
module.exports = Budget;
