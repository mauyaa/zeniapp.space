import 'dotenv/config';
import fs from 'fs';
import { connectDB, disconnectDB } from '../src/config/db';
import { UserModel } from '../src/models/User';

async function run() {
    try {
        await connectDB();
        const users = await UserModel.find({}).lean();
        const emails = [];
        const duplicates = [];
        const seen = new Set();

        for (const u of users) {
            const email = u.emailOrPhone;
            emails.push(email);
            if (seen.has(email)) {
                duplicates.push(email);
            } else {
                seen.add(email);
            }
        }

        fs.writeFileSync('users_list.json', JSON.stringify({ emails, duplicates }, null, 2));
        console.log('done writing users_list.json');
    } catch (e) {
        fs.writeFileSync('users_error.txt', String(e));
    } finally {
        await disconnectDB();
        process.exit(0);
    }
}

run();
