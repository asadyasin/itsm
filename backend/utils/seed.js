require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Department = require('../models/Department');
const ItemCategory = require('../models/ItemCategory');
const Vendor = require('../models/Vendor');
const logger = require('./logger');

const CATEGORY_NAMES = ['Laptop', 'Mouse', 'Keyboard', 'LCD', 'Docking Station', 'HDMI Cable', 'USB Cable', 'Power Adapter', 'SSD', 'HDD', 'UPS', 'Router'];

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  logger.info('Connected for seeding...');

  const dept = await Department.findOneAndUpdate(
    { name: 'IT Department' },
    { name: 'IT Department', code: 'IT' },
    { upsert: true, new: true }
  );

  const adminEmail = 'admin@company.com';
  const existingAdmin = await User.findOne({ email: adminEmail });
  if (!existingAdmin) {
    await User.create({
      name: 'System Administrator',
      email: adminEmail,
      password: 'Admin@12345',
      role: 'admin',
      department: dept._id,
      designation: 'IT Administrator'
    });
    logger.info(`Created default admin: ${adminEmail} / Admin@12345 (change this password immediately)`);
  }

  for (const name of CATEGORY_NAMES) {
    await ItemCategory.findOneAndUpdate({ name }, { name }, { upsert: true });
  }
  logger.info(`Seeded ${CATEGORY_NAMES.length} item categories`);

  await Vendor.findOneAndUpdate(
    { name: 'Sample Vendor Co.' },
    { name: 'Sample Vendor Co.', contactPerson: 'Vendor Contact', email: 'sales@samplevendor.example' },
    { upsert: true }
  );

  logger.info('Seeding complete.');
  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  logger.error(`Seed failed: ${err.message}`);
  process.exit(1);
});
