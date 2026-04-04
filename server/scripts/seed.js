"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = require("../src/config/db");
const User_1 = require("../src/models/User");
const Listing_1 = require("../src/models/Listing");
const Invoice_1 = require("../src/models/Invoice");
const Insight_1 = require("../src/models/Insight");
async function run() {
    await (0, db_1.connectDB)();
    await Promise.all([User_1.UserModel.deleteMany({}), Listing_1.ListingModel.deleteMany({}), Invoice_1.InvoiceModel.deleteMany({}), Insight_1.InsightModel.deleteMany({})]);
    const admin = await User_1.UserModel.create({
        name: 'Admin',
        emailOrPhone: 'admin@zeni.test',
        password: 'ChangeMe123!',
        role: 'admin'
    });
    const zeniSupport = await User_1.UserModel.create({
        name: 'Zeni Support',
        emailOrPhone: 'support@zeni.test',
        password: 'agent123',
        role: 'agent',
        agentVerification: 'verified'
    });
    const agent = await User_1.UserModel.create({
        name: 'Zeni Agent',
        emailOrPhone: 'agent@zeni.test',
        password: 'agent123',
        role: 'agent',
        agentVerification: 'verified'
    });
    const user = await User_1.UserModel.create({ name: 'Buyer Bob', emailOrPhone: 'user@zeni.test', password: 'user123', role: 'user' });
    await Listing_1.ListingModel.create({
        title: 'Modern 2BR in Kilimani',
        price: 25000,
        agentId: agent.id,
        status: 'live',
        location: { type: 'Point', coordinates: [36.789, -1.292], city: 'Kenya', area: 'Kilimani' },
        images: [{ url: 'https://picsum.photos/400', isPrimary: true }],
        verified: true
    });
    await Invoice_1.InvoiceModel.create({
        userId: user.id,
        roleScope: 'user',
        purpose: 'booking_fee',
        amount: 25000,
        status: 'unpaid',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        lineItems: [{ label: 'Booking fee', amount: 25000 }]
    });
    await Insight_1.InsightModel.create([
        {
            tag: 'Market Brief',
            title: 'Where demand is moving',
            desc: 'A snapshot of buyer activity by neighborhood and price band.',
            published: true
        },
        {
            tag: 'Design Notes',
            title: 'Layouts that hold value',
            desc: 'Natural light, storage, and circulation choices that age well.',
            published: true
        },
        {
            tag: 'Investor Lens',
            title: 'Rental yield signals',
            desc: 'Understand pricing spreads and long-term rental stability.',
            published: true
        }
    ]);
    console.log('Seed complete');
    process.exit(0);
}
run().catch((e) => {
    console.error(e);
    process.exit(1);
});
