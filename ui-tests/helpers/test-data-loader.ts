import fs from 'fs';
import path from 'path';

const TEST_DATA_DIR = path.join(__dirname, '../test-data');

function readJsonFile<T>(filename: string): T {
  const filePath = path.join(TEST_DATA_DIR, filename);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Test data file not found: ${filePath}`);
  }

  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as T;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Invalid JSON in ${filename}: ${message}`);
  }
}

// ─── Login ───────────────────────────────────────────────────────────────────

export interface LoginScenario {
  id: string;
  description: string;
  username?: string;
  password?: string;
  useEnvCredentials?: boolean;
  shouldSucceed: boolean;
  expectedError?: string;
  emptyField?: 'username' | 'password';
  tags?: string[];
}

interface LoginScenariosFile {
  scenarios: LoginScenario[];
}

export function loadLoginScenarios(filter?: { tag?: string }): LoginScenario[] {
  const data = readJsonFile<LoginScenariosFile>('login-scenarios.json');

  if (!Array.isArray(data.scenarios) || data.scenarios.length === 0) {
    throw new Error('login-scenarios.json must contain a non-empty "scenarios" array');
  }

  for (const scenario of data.scenarios) {
    if (!scenario.id || !scenario.description || typeof scenario.shouldSucceed !== 'boolean') {
      throw new Error(`Invalid login scenario: ${JSON.stringify(scenario)}`);
    }
  }

  if (filter?.tag) {
    const tag = filter.tag;
    return data.scenarios.filter((s) => s.tags?.includes(tag));
  }

  return data.scenarios;
}

export function loadLoginScenarioById(id: string): LoginScenario {
  const scenario = loadLoginScenarios().find((s) => s.id === id);
  if (!scenario) {
    throw new Error(`Login scenario not found: ${id}`);
  }
  return scenario;
}

// ─── Employee ────────────────────────────────────────────────────────────────

export interface EmployeeData {
  firstName: string;
  lastName: string;
  employeeId: string;
}

export interface EmployeeValidationCase {
  id: string;
  description: string;
  firstName?: string;
  lastName?: string;
  employeeId?: string;
  invalidFirstName?: string;
  lastNamePrefix?: string;
  clearFirstName?: boolean;
  clearLastName?: boolean;
  useGeneratedNames?: boolean;
  useUniqueLastName?: boolean;
  expectedField?: 'firstName' | 'lastName';
  expectedError?: string;
  expectedErrorPattern?: string;
}

interface EmployeeScenariosFile {
  existingEmployeeId: string;
  validationCases: EmployeeValidationCase[];
}

export function loadEmployeeScenarios(): EmployeeScenariosFile {
  const data = readJsonFile<EmployeeScenariosFile>('employee-scenarios.json');

  if (!data.existingEmployeeId || !Array.isArray(data.validationCases)) {
    throw new Error('employee-scenarios.json must define existingEmployeeId and validationCases');
  }

  return data;
}

export interface EmployeeTemplate {
  firstNamePrefix: string;
  lastNamePrefix: string;
  employeeIdMin: number;
  employeeIdMax: number;
}

export function loadEmployeeTemplate(): EmployeeTemplate {
  const data = readJsonFile<EmployeeTemplate>('employee-templates.json');

  if (!data.firstNamePrefix || !data.lastNamePrefix) {
    throw new Error('employee-templates.json must define firstNamePrefix and lastNamePrefix');
  }

  return data;
}

// ─── Leave ───────────────────────────────────────────────────────────────────

export interface LeaveScenarioCase {
  id: string;
  description: string;
  dateStrategy: 'futureWorkingDayRange' | 'pastRange' | 'invalidRange';
  offsetDays?: 'unique' | 'uniquePlusListExtra';
  durationDays?: number;
  fromDateOffsetDays?: number;
  toDateOffsetDays?: number;
  reason?: string;
  reasonPrefix?: string;
  skipIfBalanceZero?: boolean;
  expectSuccess?: boolean;
  expectedErrorPattern?: string;
  verifyList?: boolean;
}

interface LeaveScenariosFile {
  leaveType: string;
  leaveTypeFallback?: string;
  uniqueOffset: { baseDays: number; moduloDays: number; listExtraDays: number };
  cases: LeaveScenarioCase[];
}

export function loadLeaveScenarios(): LeaveScenariosFile {
  const data = readJsonFile<LeaveScenariosFile>('leave-scenarios.json');

  if (!data.leaveType || !Array.isArray(data.cases) || data.cases.length === 0) {
    throw new Error('leave-scenarios.json must define leaveType and a non-empty cases array');
  }

  return data;
}

export function loadLeaveCaseById(id: string): LeaveScenarioCase {
  const leaveCase = loadLeaveScenarios().cases.find((c) => c.id === id);
  if (!leaveCase) {
    throw new Error(`Leave scenario not found: ${id}`);
  }
  return leaveCase;
}

// ─── Environment ─────────────────────────────────────────────────────────────

export interface EnvironmentConfig {
  assignLeaveFallback: { searchTerm: string; employeeName: string };
  credentialsDefaults: { username: string; password: string };
}

export function loadEnvironmentConfig(): EnvironmentConfig {
  return readJsonFile<EnvironmentConfig>('environment.json');
}

// ─── Known bugs ──────────────────────────────────────────────────────────────

export interface KnownBug {
  id: string;
  title: string;
  severity: string;
  dateFound: string;
  description: string;
  invalidFirstName?: string;
  lastNamePrefix?: string;
  applyLeavePath?: string | null;
  noLeaveTypesMessage?: string;
}

interface KnownBugsFile {
  bugs: KnownBug[];
}

export function loadKnownBugs(): KnownBug[] {
  const data = readJsonFile<KnownBugsFile>('known-bugs.json');

  if (!Array.isArray(data.bugs) || data.bugs.length === 0) {
    throw new Error('known-bugs.json must contain a non-empty "bugs" array');
  }

  return data.bugs;
}

export function loadKnownBugById(id: string): KnownBug {
  const bug = loadKnownBugs().find((b) => b.id === id);
  if (!bug) {
    throw new Error(`Known bug not found: ${id}`);
  }
  return bug;
}
