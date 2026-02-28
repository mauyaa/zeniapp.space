"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const env_1 = require("../src/config/env");
async function run() {
    await mongoose_1.default.connect(env_1.env.mongoUri);
    const result = await mongoose_1.default.connection.db.collection('users').dropIndex('email_1').catch((e) => e);
    console.log('drop index email_1:', result);
    await mongoose_1.default.disconnect();
}
run().catch((e) => {
    console.error(e);
    process.exit(1);
});
