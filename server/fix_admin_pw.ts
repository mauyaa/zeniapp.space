import { connectDB, disconnectDB } from './src/config/db';
import { UserModel } from './src/models/User';

async function run() {
    await connectDB();

    let admin = await UserModel.findOne({ emailOrPhone: 'admin@zeni.test' });
    if (!admin) {
        console.log("Admin not found normally. Let's create it properly.");
        admin = new UserModel({
            name: 'Zeni Admin',
            emailOrPhone: 'admin@zeni.test',
            email: 'admin@zeni.test',
            role: 'admin',
            status: 'active',
            password: 'ChangeMe123!' // will be hashed by pre-save
        });
    } else {
        admin.password = 'ChangeMe123!';
    }

    await admin.save();
    console.log('Admin password fixed properly');
    await disconnectDB();
}

run().catch(console.error);
