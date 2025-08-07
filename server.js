const express = require('express');
const cors = require('cors');
const multer = require('multer');
const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  }
});

// In-memory storage for expenses (in production, you'd use a database)
let expenses = [];
let nextId = 1;

// Root route
app.get('/', (req, res) => {
  res.json({ 
    message: "💕 Matt and Eileen's Expense Tracker Server is running!",
    endpoints: [
      'GET /api/expenses - Get all expenses',
      'POST /api/expenses - Add new expense',
      'PUT /api/expenses/:id - Update expense',
      'DELETE /api/expenses/:id - Delete expense',
      'POST /api/upload-csv - Upload CSV file'
    ]
  });
});

// Get all expenses
app.get('/api/expenses', (req, res) => {
  res.json(expenses);
});

// Add new expense
app.post('/api/expenses', (req, res) => {
  const { user, amount, description, date, category } = req.body;
  
  // Validate required fields
  if (!user || !amount || !description || !date) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  // Validate user
  if (user !== 'Matt' && user !== 'Eileen') {
    return res.status(400).json({ error: 'Invalid user. Only Matt and Eileen are allowed.' });
  }
  
  const expense = {
    id: nextId++,
    user,
    amount: parseFloat(amount),
    description,
    date,
    category: category || 'Other',
    createdAt: new Date().toISOString()
  };
  
  expenses.push(expense);
  res.status(201).json(expense);
});

// Update expense
app.put('/api/expenses/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const { user, amount, description, date, category } = req.body;
  
  const expenseIndex = expenses.findIndex(exp => exp.id === id);
  
  if (expenseIndex === -1) {
    return res.status(404).json({ error: 'Expense not found' });
  }
  
  // Validate user
  if (user && user !== 'Matt' && user !== 'Eileen') {
    return res.status(400).json({ error: 'Invalid user. Only Matt and Eileen are allowed.' });
  }
  
  // Update expense
  if (user) expenses[expenseIndex].user = user;
  if (amount) expenses[expenseIndex].amount = parseFloat(amount);
  if (description) expenses[expenseIndex].description = description;
  if (date) expenses[expenseIndex].date = date;
  if (category) expenses[expenseIndex].category = category;
  
  expenses[expenseIndex].updatedAt = new Date().toISOString();
  
  res.json(expenses[expenseIndex]);
});

// Delete expense
app.delete('/api/expenses/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const expenseIndex = expenses.findIndex(exp => exp.id === id);
  
  if (expenseIndex === -1) {
    return res.status(404).json({ error: 'Expense not found' });
  }
  
  const deletedExpense = expenses.splice(expenseIndex, 1)[0];
  res.json(deletedExpense);
});

// Upload CSV
app.post('/api/upload-csv', upload.single('file'), (req, res) => {
  const { user } = req.body;
  
  if (!user || (user !== 'Matt' && user !== 'Eileen')) {
    return res.status(400).json({ error: 'Invalid user. Only Matt and Eileen are allowed.' });
  }
  
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  
  // Convert buffer to string
  const csvData = req.file.buffer.toString('utf8');
  
  // Basic CSV parsing (in production, you might want to use a proper CSV parser)
  const lines = csvData.split('\n').filter(line => line.trim());
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
  
  let addedExpenses = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
    
    if (values.length >= headers.length) {
      // Try to find amount, description, and date columns
      let amount, description, date, category = 'Imported';
      
      // Look for common column names
      headers.forEach((header, index) => {
        const lowerHeader = header.toLowerCase();
        if (lowerHeader.includes('amount') || lowerHeader.includes('debit') || lowerHeader.includes('withdrawal')) {
          amount = parseFloat(values[index]) || 0;
        }
        if (lowerHeader.includes('description') || lowerHeader.includes('merchant') || lowerHeader.includes('payee')) {
          description = values[index];
        }
        if (lowerHeader.includes('date') || lowerHeader.includes('transaction date')) {
          date = values[index];
        }
        if (lowerHeader.includes('category') || lowerHeader.includes('type')) {
          category = values[index] || 'Imported';
        }
      });
      
      if (amount && description && date) {
        const expense = {
          id: nextId++,
          user,
          amount: Math.abs(amount), // Make sure amount is positive
          description,
          date,
          category,
          createdAt: new Date().toISOString()
        };
        
        expenses.push(expense);
        addedExpenses.push(expense);
      }
    }
  }
  
  res.json({
    message: `Successfully imported ${addedExpenses.length} expenses`,
    expenses: addedExpenses
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`💕 Matt and Eileen's Expense Tracker Server running on port ${PORT}`);
});
