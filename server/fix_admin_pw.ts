import { connectDB, disconnectDB } from './src/config/db';
import { UserModel } from './src/models/User';

async function run() {
    await connectDB();

    let admin = await UserModel.findOne({ emailOrPhone: 'zeniapp.ke@gmail.com' });
    if (!admin) {
        console.log("Admin not found normally. Let's create it properly.");
        admin = new UserModel({
            name: 'Zeni Admin',
            emailOrPhone: 'zeniapp.ke@gmail.com',
            email: 'zeniapp.ke@gmail.com',
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
