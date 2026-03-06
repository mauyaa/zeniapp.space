import 'dotenv/config';
import fs from 'fs';
import { connectDB, disconnectDB } from '../src/config/db';
import { ListingModel } from '../src/models/Listing';

async function run() {
    await connectDB();
    const count = await ListingModel.countDocuments();
    console.log(`Total listings: ${count}`);

    const listings = await ListingModel.find({}).limit(500).select('title description agentId price createdAt');
    fs.writeFileSync('listings.json', JSON.stringify({ count, listings }, null, 2));

    await disconnectDB();
    process.exit(0);
}

run().catch((err) => {
    console.error(err);
    process.exit(1);
});
