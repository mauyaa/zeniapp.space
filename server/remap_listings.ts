import mongoose from 'mongoose';
import { connectDB, disconnectDB } from './src/config/db';
import { ListingModel } from './src/models/Listing';

async function remap() {
    await connectDB();
    const zeniAgentId = new mongoose.Types.ObjectId('69a429fe6f4e611251b110ed'); // zeniagent.ke@gmail.com
    const updated = await ListingModel.updateMany(
        {}, // all listings
        { $set: { agentId: zeniAgentId } }
    );
    console.log(`Remapped ${updated.modifiedCount} listings to agent Zeni Agent.`);
    await disconnectDB();
}

remap().catch(console.error);
