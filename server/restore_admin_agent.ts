import 'dotenv/config';
import { connectDB, disconnectDB } from './src/config/db';
import { UserModel } from './src/models/User';

async function restore() {
    await connectDB();
    const password = process.env.SEED_PASSWORD || 'ChangeMe123!';

    const adminEmail = process.env.ZENI_ADMIN_EMAIL || 'admin@zeni.test';
    let admin = await UserModel.findOne({ emailOrPhone: adminEmail });
    if (!admin) {
        admin = await UserModel.create({
            name: 'Zeni Admin',
            email: adminEmail,
            emailOrPhone: adminEmail,
            password,
            role: 'admin',
            status: 'active',
            agentVerification: 'verified'
        });
        console.log(`Restored Admin: ${adminEmail}`);
    } else {
        console.log(`Admin ${adminEmail} already exists`);
    }

    const agentEmail = process.env.AGENT_EMAIL || process.env.ZENI_AGENT_EMAIL || 'zeniagent.ke@gmail.com';
    let agent = await UserModel.findOne({ emailOrPhone: agentEmail });
    if (!agent) {
        agent = await UserModel.create({
            name: 'Zeni Agent',
            email: agentEmail,
            emailOrPhone: agentEmail,
            password,
            role: 'agent',
            status: 'active',
            agentVerification: 'verified'
        });
        console.log(`Restored Agent: ${agentEmail}`);
    } else {
        console.log(`Agent ${agentEmail} already exists`);
    }

    await disconnectDB();
}

restore().catch(console.error);
