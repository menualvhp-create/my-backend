const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'neighbor-share-demo-secret';

const users = [];
const equipmentCatalog = [];
const serviceProviders = [];
const bookings = [];
const serviceBookings = [];
const contactMessages = [];

const hashPassword = (password) => crypto.createHash('sha256').update(password).digest('hex');

const makeToken = (user) => {
  const payload = {
    userId: user.id,
    email: user.email,
    role: user.role,
  };

  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url');

  return `${header}.${body}.${signature}`;
};

const verifyToken = (token) => {
  if (!token || !token.startsWith('Bearer ')) {
    return null;
  }

  const rawToken = token.replace('Bearer ', '').trim();
  const parts = rawToken.split('.');

  if (parts.length !== 3) {
    return null;
  }

  const [header, body, signature] = parts;
  const expectedSignature = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url');

  if (signature !== expectedSignature) {
    return null;
  }

  return JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
};

const authRequired = (req, res, next) => {
  const token = req.headers.authorization;
  const payload = verifyToken(token);

  if (!payload) {
    return res.status(401).json({ message: 'Authentication required.' });
  }

  req.user = payload;
  next();
};

const adminRequired = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access only.' });
  }

  next();
};

users.push({
  id: 'user-admin-1',
  firstName: 'Admin',
  lastName: 'User',
  email: 'admin@neighbor-share.com',
  passwordHash: hashPassword('Password123!'),
  phone: '+94 77 123 4567',
  role: 'admin',
});

const seededEquipment = [
  { id: 'eq-1', name: 'Mini Excavator', category: 'Construction', dailyRate: 120, available: true, image: 'https://images.unsplash.com/photo-...' },
  { id: 'eq-2', name: 'Concrete Mixer', category: 'Construction', dailyRate: 85, available: true, image: 'https://images.unsplash.com/photo-...' },
  { id: 'eq-3', name: 'Lawn Mower', category: 'Gardening', dailyRate: 40, available: false, image: 'https://images.unsplash.com/photo-...' },
];

const seededServices = [
  { id: 'svc-1', name: 'Equipment Delivery', price: 20, provider: 'RoadRunner Logistics' },
  { id: 'svc-2', name: 'Operator Support', price: 45, provider: 'BuildCrew' },
];

equipmentCatalog.push(...seededEquipment);
serviceProviders.push(...seededServices);

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend Server is Running Successfully!' });
});

app.get('/', (req, res) => {
  res.send('Backend Server is Running Successfully!');
});

app.post('/api/register', (req, res) => {
  const { firstName, lastName, email, password, phone } = req.body;

  if (!firstName || !lastName || !email || !password) {
    return res.status(400).json({ message: 'Missing required fields.' });
  }

  const existingUser = users.find((user) => user.email.toLowerCase() === email.toLowerCase());
  if (existingUser) {
    return res.status(409).json({ message: 'Email already registered.' });
  }

  const newUser = {
    id: `user-${Date.now()}`,
    firstName,
    lastName,
    email,
    passwordHash: hashPassword(password),
    phone: phone || '',
    role: 'user',
  };

  users.push(newUser);
  const token = makeToken(newUser);

  res.status(201).json({
    message: 'Registration successful.',
    token,
    user: {
      id: newUser.id,
      firstName: newUser.firstName,
      lastName: newUser.lastName,
      email: newUser.email,
      phone: newUser.phone,
      role: newUser.role,
    },
  });
});

app.post('/api/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  const user = users.find((entry) => entry.email.toLowerCase() === email.toLowerCase());
  if (!user || user.passwordHash !== hashPassword(password)) {
    return res.status(401).json({ message: 'Invalid email or password.' });
  }

  const token = makeToken(user);
  res.json({
    message: 'Login successful.',
    token,
    user: {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      role: user.role,
    },
  });
});

app.get('/api/profile/:id', authRequired, (req, res) => {
  const { id } = req.params;
  const user = users.find((entry) => entry.id === id);

  if (!user) {
    return res.status(404).json({ message: 'User profile not found.' });
  }

  if (req.user.role !== 'admin' && req.user.userId !== id) {
    return res.status(403).json({ message: 'You can only view your own profile.' });
  }

  res.json({
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    phone: user.phone,
    role: user.role,
    bookings: bookings.filter((booking) => booking.userId === id),
  });
});

app.put('/api/profile/:id', authRequired, (req, res) => {
  const { id } = req.params;
  const user = users.find((entry) => entry.id === id);

  if (!user) {
    return res.status(404).json({ message: 'User profile not found.' });
  }

  if (req.user.role !== 'admin' && req.user.userId !== id) {
    return res.status(403).json({ message: 'You can only update your own profile.' });
  }

  user.firstName = req.body.firstName || user.firstName;
  user.lastName = req.body.lastName || user.lastName;
  user.phone = req.body.phone || user.phone;

  res.json({ message: 'Profile updated successfully.', user });
});

app.get('/api/admin/dashboard', authRequired, adminRequired, (req, res) => {
  res.json({
    totalUsers: users.length,
    totalBookings: bookings.length,
    totalEquipment: equipmentCatalog.length,
    totalContactMessages: contactMessages.length,
    recentUsers: users.map((user) => ({ id: user.id, email: user.email, role: user.role })),
    bookings,
  });
});

app.get('/api/equipment', (req, res) => {
  const { available, category } = req.query;
  let list = [...equipmentCatalog];

  if (available !== undefined) {
    list = list.filter((item) => item.available === (available === 'true'));
  }

  if (category) {
    list = list.filter((item) => item.category.toLowerCase() === category.toLowerCase());
  }

  res.json(list);
});

app.post('/api/equipment', authRequired, adminRequired, (req, res) => {
  const { name, category, dailyRate, available, image } = req.body;

  if (!name || !category || !dailyRate) {
    return res.status(400).json({ message: 'Equipment name, category and dailyRate are required.' });
  }

  const item = {
    id: `eq-${Date.now()}`,
    name,
    category,
    dailyRate,
    available: available ?? true,
    image: image || '',
  };

  equipmentCatalog.push(item);
  res.status(201).json({ message: 'Equipment added successfully.', equipment: item });
});

app.post('/api/bookings', authRequired, (req, res) => {
  const { equipmentId, startDate, endDate, totalCost } = req.body;

  const equipment = equipmentCatalog.find((item) => item.id === equipmentId);
  if (!equipment) {
    return res.status(404).json({ message: 'Equipment not found.' });
  }

  const booking = {
    id: `booking-${Date.now()}`,
    userId: req.user.userId,
    equipmentId,
    startDate,
    endDate,
    totalCost: totalCost || equipment.dailyRate,
    status: 'confirmed',
  };

  bookings.push(booking);
  res.status(201).json({ message: 'Booking created successfully.', booking });
});

app.get('/api/services', (req, res) => {
  res.json(serviceProviders);
});

app.post('/api/service-bookings', authRequired, (req, res) => {
  const { serviceId, date, notes } = req.body;
  const service = serviceProviders.find((item) => item.id === serviceId);

  if (!service) {
    return res.status(404).json({ message: 'Service not found.' });
  }

  const booking = {
    id: `service-booking-${Date.now()}`,
    userId: req.user.userId,
    serviceId,
    serviceName: service.name,
    date,
    notes: notes || '',
    status: 'pending',
  };

  serviceBookings.push(booking);
  res.status(201).json({ message: 'Service booking submitted successfully.', booking });
});

app.post('/api/contact', (req, res) => {
  const { firstName, lastName, email, phone, subject, message } = req.body;

  if (!firstName || !email || !message) {
    return res.status(400).json({ message: 'First name, email, and message are required.' });
  }

  const savedMessage = {
    id: `contact-${Date.now()}`,
    firstName,
    lastName: lastName || '',
    email,
    phone: phone || '',
    subject: subject || 'General Inquiry',
    message,
    createdAt: new Date().toISOString(),
  };

  contactMessages.push(savedMessage);
  res.status(201).json({ message: 'Contact message sent successfully.', contactMessage: savedMessage });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});