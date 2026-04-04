import 'dotenv/config';
import { connectDB, disconnectDB } from '../src/config/db';
import { UserModel } from '../src/models/User';
import { ListingModel } from '../src/models/Listing';

async function run() {
    await connectDB();

    console.log('--- Cleaning Up Fake Listings ---');
    const fakeListingTitles = [
        'Riverside Suites - Corner 3BR',
        'Valley View Studio',
        'Zeni Support',
        'Modern 2BR in Kilimani'
    ];
    const listingRes = await ListingModel.deleteMany({ title: { $in: fakeListingTitles } });
    console.log(`Deleted ${listingRes.deletedCount} fake listings.`);

    console.log('--- Cleaning Up Fake Users ---');
    const fakeEmails = [
        'admin@zeni.test',
        'pay-init@zeni.test',
        'pay-approver@zeni.test',
        'agent@zeni.test',
        'agent-pending@zeni.test',
        'user-basic@zeni.test',
        'user-suspended@zeni.test',
        'support@zeni.test',
        'admin@zeni.test',
        'agent@zeni.test',
        'zeni-admin-system-1771410274268@zeni.test',
        'user@zeni.test'
    ];
    const userRes = await UserModel.deleteMany({ emailOrPhone: { $in: fakeEmails } });
    console.log(`Deleted ${userRes.deletedCount} fake users/agents.`);

    // verification
    const remainingListings = await ListingModel.countDocuments();
    const remainingUsers = await UserModel.countDocuments();
    console.log(`\nRemaining Listings: ${remainingListings}`);
    console.log(`Remaining Users: ${remainingUsers}`);

    await disconnectDB();
    process.exit(0);
}

run().catch((err) => {
    console.error(err);
    process.exit(1);
});
