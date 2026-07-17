require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Company = require('../models/Company');
const Office = require('../models/Office');
const Department = require('../models/Department');
const ItemCategory = require('../models/ItemCategory');
const Vendor = require('../models/Vendor');
const logger = require('./logger');
const orgConfig = require('../config/orgConfig');

const CATEGORY_NAMES = ['Laptop', 'Mouse', 'Keyboard', 'LCD', 'Docking Station', 'HDMI Cable', 'USB Cable', 'Power Adapter', 'SSD', 'HDD', 'UPS', 'Router'];

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  logger.info('Connected for seeding...');

  const company = await Company.findOneAndUpdate(
    { name: orgConfig.orgName },
    { name: orgConfig.orgName },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const office = await Office.findOneAndUpdate(
    { company: company._id, name: `${orgConfig.defaultLocation} Office` },
    { company: company._id, name: `${orgConfig.defaultLocation} Office`, location: orgConfig.defaultLocation },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const dept = await Department.findOneAndUpdate(
    { office: office._id, name: 'IT Department' },
    { name: 'IT Department', code: 'IT', office: office._id },
    { upsert: true, new: true, setDefaultsOnInsert: true }
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

  logger.info(`Seeded company "${company.name}" with office "${office.name}" (${office.location}) and department "${dept.name}"`);
  logger.info('Seeding complete. Add more offices/departments from the UI to match your real org structure.');
  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  logger.error(`Seed failed: ${err.message}`);
  process.exit(1);
});
