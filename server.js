const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static('public'));

let expenseData = {
  users: [
    { id: 'matt', name: 'Matt', color: 'bg-blue-500', connected: false, 
lastSeen: null },
    { id: 'eileen', name: 'Eileen', color: 'bg-pink-500', connected: 
false, lastSeen: null }
  ],
  transactions: [],
  createdAt: new Date().toISOString()
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({ storage: storage });

app.post('/api/connect/:userId', (req, res) => {
  const { userId } = req.params;
  
  if (userId !== 'matt' && userId !== 'eileen') {
    return res.status(400).json({ error: 'Invalid user' });
  }

  const user = expenseData.users.find(u => u.id === userId);
  if (user) {
    user.connected = true;
    user.lastSeen = new Date().toISOString();
  }

  res.json({
    success: true,
    user: user,
    data: expenseData,
    message: `Welcome ${user.name}!`
  });
});

app.get('/api/data', (req, res) => {
  res.json(expenseData);
});

app.post('/api/transactions', (req, res) => {
  const { userId, transactions } = req.body;

  if (userId !== 'matt' && userId !== 'eileen') {
    return res.status(400).json({ error: 'Invalid user' });
  }

  const newTransactions = transactions.map((t, index) => ({
    ...t,
    userId: userId,
    id: `${userId}-${Date.now()}-${index}`,
    uploadedAt: new Date().toISOString()
  }));

  expenseData.transactions.push(...newTransactions);

  res.json({
    success: true,
    message: `Added ${newTransactions.length} transactions`,
    transactions: newTransactions
  });
});

app.put('/api/transactions/:transactionId', (req, res) => {
  const { transactionId } = req.params;
  const { category, updatedBy } = req.body;

  const transaction = expenseData.transactions.find(t => t.id === 
transactionId);
  if (!transaction) {
    return res.status(404).json({ error: 'Transaction not found' });
  }

  transaction.category = category;
  transaction.updatedAt = new Date().toISOString();
  transaction.updatedBy = updatedBy;

  res.json({ success: true, transaction: transaction });
});

app.delete('/api/transactions/:transactionId', (req, res) => {
  const { transactionId } = req.params;
  const initialLength = expenseData.transactions.length;
  expenseData.transactions = expenseData.transactions.filter(t => t.id !== 
transactionId);

  if (expenseData.transactions.length === initialLength) {
    return res.status(404).json({ error: 'Transaction not found' });
  }

  res.json({ success: true, message: 'Transaction deleted' });
});

app.post('/api/reset', (req, res) => {
  expenseData.transactions = [];
  expenseData.users.forEach(u => {
    u.connected = false;
    u.lastSeen = null;
  });
  res.json({ success: true, message: 'All data cleared' });
});

app.post('/api/heartbeat/:userId', (req, res) => {
  const { userId } = req.params;
  const user = expenseData.users.find(u => u.id === userId);
  if (user) {
    user.lastSeen = new Date().toISOString();
  }
  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`💕 Matt and Eileen's Expense Tracker Server running on 
http://localhost:${PORT}`);
});

module.exports = app;
