import 'dotenv/config';
import fs from 'fs';
import { connectDB, disconnectDB } from '../src/config/db';
import { UserModel } from '../src/models/User';

type UserJsonRow = {
  _id: unknown;
  emailOrPhone?: string;
  name?: string;
  role?: string;
  createdAt?: Date;
};

async function run() {
  await connectDB();
  const users = await UserModel.find({}).lean<UserJsonRow[]>();
  const list = users.map((u) => ({
    id: u._id,
    email: u.emailOrPhone,
    name: u.name,
    role: u.role,
    createdAt: u.createdAt,
  }));
  fs.writeFileSync('users.json', JSON.stringify(list, null, 2));
  console.log('Saved to users.json');
  await disconnectDB();
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
