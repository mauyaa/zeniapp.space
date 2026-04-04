import 'dotenv/config';
import { connectDB, disconnectDB } from './src/config/db';
import { UserModel } from './src/models/User';

async function reset() {
    await connectDB();
    const password = process.env.SEED_PASSWORD || 'ChangeMe123!';

    const adminEmail = process.env.ZENI_ADMIN_EMAIL || 'admin@zeni.test';
    const admin = await UserModel.findOne({ emailOrPhone: adminEmail });
    if (admin) {
        admin.password = password;
        admin.status = 'active';
        await admin.save();
        console.log(`Reset Admin: ${adminEmail}`);
    } else {
        console.log(`Admin ${adminEmail} not found`);
    }

    const agentEmail = process.env.AGENT_EMAIL || process.env.ZENI_AGENT_EMAIL || 'agent@zeni.test';
    const agent = await UserModel.findOne({ emailOrPhone: agentEmail });
    if (agent) {
        agent.password = password;
        agent.status = 'active';
        agent.agentVerification = 'verified';
        await agent.save();
        console.log(`Reset Agent: ${agentEmail}`);
    } else {
        console.log(`Agent ${agentEmail} not found`);
    }

    await disconnectDB();
}

reset().catch(console.error);
