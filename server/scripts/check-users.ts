import 'dotenv/config';
import { connectDB, disconnectDB } from '../src/config/db';
import { UserModel } from '../src/models/User';

async function run() {
    await connectDB();
    const users = await UserModel.find({});
    console.log(`Total users: ${users.length}`);
    const emails = users.map(u => `${u.emailOrPhone} (${u.role})`).sort();
    console.log("Users:", emails);

    await disconnectDB();
    process.exit(0);
}

run().catch((err) => {
    console.error(err);
    process.exit(1);
});
