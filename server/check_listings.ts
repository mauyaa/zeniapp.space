import { connectDB, disconnectDB } from './src/config/db';
import { ListingModel } from './src/models/Listing';
import { UserModel } from './src/models/User';

async function check() {
    await connectDB();
    const listings = await ListingModel.find();
    console.log('Total listings:', listings.length);
    for (const l of listings) {
        const agent = await UserModel.findById(l.agentId);
        console.log(`- ${l.title} | Status: ${l.status} | Verified: ${l.verified} | Availability: ${l.availabilityStatus} | Agent: ${agent?.name || 'Unknown'}`);
    }
    await disconnectDB();
}

check().catch(console.error);
