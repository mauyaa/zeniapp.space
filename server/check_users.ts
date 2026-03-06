import { connectDB, disconnectDB } from './src/config/db';
import { UserModel } from './src/models/User';
import { ListingModel } from './src/models/Listing';

async function check() {
    await connectDB();
    const users = await UserModel.find();
    console.log('Total users:', users.length);
    for (const u of users) {
        console.log(`- ${u.name} | Role: ${u.role} | Email: ${u.emailOrPhone} | ID: ${u._id}`);
    }

    const listings = await ListingModel.find();
    console.log('\nListings:');
    for (const l of listings) {
        console.log(`[${l._id}] ${l.title} -> agentId: ${l.agentId}`);
    }

    await disconnectDB();
}

check().catch(console.error);
