const axios = require('axios');

const BASE_URL = 'http://localhost:4000/api';

async function login(email, password) {
  try {
    const res = await axios.post(`${BASE_URL}/auth/login`, { emailOrPhone: email, password });
    return res.data.token;
  } catch (e) {
    console.error('Login failed:', e.response?.data || e.message);
    return null;
  }
}

async function register(name, email, password) {
  try {
    const res = await axios.post(`${BASE_URL}/auth/register`, { name, emailOrPhone: email, password });
    console.log('Register response:', res.data);
    return res.data;
  } catch (e) {
    console.error('Register failed:', e.response?.data || e.message);
    return null;
  }
}

async function getUsers(token) {
  try {
    const res = await axios.get(`${BASE_URL}/admin/users`, { headers: { Authorization: `Bearer ${token}` } });
    return res.data;
  } catch (e) {
    console.error('Get users failed:', e.response?.data || e.message);
    return null;
  }
}

async function updateUserStatus(token, userId, status) {
  try {
    const res = await axios.patch(`${BASE_URL}/admin/users/${userId}/status`, { status }, { headers: { Authorization: `Bearer ${token}` } });
    console.log('Update status response:', res.data);
    return res.data;
  } catch (e) {
    console.error('Update status failed:', e.response?.data || e.message);
    return null;
  }
}

async function deleteUser(token, userId) {
  try {
    const res = await axios.delete(`${BASE_URL}/admin/users/${userId}`, { headers: { Authorization: `Bearer ${token}` } });
    console.log('Delete user response:', res.status);
    return res.status;
  } catch (e) {
    console.error('Delete user failed:', e.response?.data || e.message);
    return null;
  }
}

async function testLoginAsUser(email, password) {
  try {
    const token = await login(email, password);
    if (!token) return false;
    console.log(`Login as ${email} successful`);
    return true;
  } catch (e) {
    console.log(`Login as ${email} failed:`, e.response?.data || e.message);
    return false;
  }
}

async function runTest() {
  console.log('Starting user flow test...\n');

  // Step 1: Register admin
  console.log('1. Registering admin...');
  await register('Admin User', 'admin@zeni.test', 'ChangeMe123!');

  // Step 2: Register test user
  console.log('2. Registering test user "Test Test"...');
  await register('Test Test', 'test@zeni.test', 'TestPass123!');

  // Step 3: Login as admin
  console.log('3. Logging in as admin...');
  const adminToken = await login('admin@zeni.test', 'ChangeMe123!');
  if (!adminToken) {
    console.error('Admin login failed, cannot proceed');
    return;
  }

  // Step 4: Get users to find test user ID
  console.log('4. Getting list of users...');
  const users = await getUsers(adminToken);
  if (!users) return;
  const testUser = users.find(u => u.name === 'Test Test');
  if (!testUser) {
    console.error('Test user not found');
    return;
  }
  console.log('Test user ID:', testUser._id);

  // Step 5: Test login as test user (should work initially)
  console.log('5. Testing login as test user (should work)...');
  let canLogin = await testLoginAsUser('test@zeni.test', 'TestPass123!');
  console.log('Can login:', canLogin);

  // Step 6: Deactivate user (suspend)
  console.log('6. Deactivating (suspending) test user...');
  await updateUserStatus(adminToken, testUser._id, 'suspended');

  // Step 7: Test login as suspended user (should fail)
  console.log('7. Testing login as suspended user (should fail)...');
  canLogin = await testLoginAsUser('test@zeni.test', 'TestPass123!');
  console.log('Can login:', canLogin);

  // Step 8: Reactivate user
  console.log('8. Reactivating test user...');
  await updateUserStatus(adminToken, testUser._id, 'active');

  // Step 9: Test login as active user (should work)
  console.log('9. Testing login as active user (should work)...');
  canLogin = await testLoginAsUser('test@zeni.test', 'TestPass123!');
  console.log('Can login:', canLogin);

  // Step 10: Delete user
  console.log('10. Deleting test user...');
  await deleteUser(adminToken, testUser._id);

  // Step 11: Test login as deleted user (should fail)
  console.log('11. Testing login as deleted user (should fail)...');
  canLogin = await testLoginAsUser('test@zeni.test', 'TestPass123!');
  console.log('Can login:', canLogin);

  console.log('\nTest completed.');
}

runTest().catch(console.error);
