export interface LoginScenario {
  description: string;
  username: string;
  password: string;
  shouldSucceed: boolean;
  expectedError?: string;
}

export const loginScenarios: LoginScenario[] = [
  {
    description: 'valid credentials',
    username: 'Admin',
    password: 'admin123',
    shouldSucceed: true,
  },
  {
    description: 'wrong password',
    username: 'Admin',
    password: 'wrongpass',
    shouldSucceed: false,
    expectedError: 'Invalid credentials',
  },
  {
    description: 'wrong username',
    username: 'FakeUser',
    password: 'admin123',
    shouldSucceed: false,
    expectedError: 'Invalid credentials',
  },
  {
    description: 'empty username',
    username: '',
    password: 'admin123',
    shouldSucceed: false,
    expectedError: 'Required',
  },
  {
    description: 'empty password',
    username: 'Admin',
    password: '',
    shouldSucceed: false,
    expectedError: 'Required',
  },
  {
    description: 'SQL injection attempt',
    username: "' OR 1=1 --",
    password: 'anything',
    shouldSucceed: false,
  },
];
