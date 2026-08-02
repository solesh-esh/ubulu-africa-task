/**
 * # Leave Application — High-Risk Flow Notes
 *
 * ## Why this flow is high risk (business perspective)
 * Leave touches payroll, staffing coverage, and compliance. Incorrect date handling
 * can deduct wrong balances, approve overlapping absences, or pay employees for
 * time not worked. Multi-step approval and entitlement rules make regressions costly
 * and hard to spot without dedicated HR test data.
 *
 * ## Flakiness encountered — date picker handling
 * OrangeHRM exposes date fields as text inputs with a calendar icon, but clicking
 * the overlay calendar is flaky on the shared demo (animations, viewport clipping,
 * Monday-first vs Sunday-first grids, and stale month views under parallel load).
 * **Mitigation:** we bypass the widget and use Playwright `fill()` after select-all,
 * then press `Tab` to trigger blur validation. Inputs accept typed yyyy-dd-mm values
 * directly. This is faster, headless-safe, and avoids coordinate clicks on the popup.
 * We also skip weekend-only ranges via getFutureWorkingDayRange() — the demo rejects
 * them with "No Working Days Selected" (another shared-env quirk).
 *
 * ## Dedicated test environment (what we'd do differently)
 * - Seed a user with known leave entitlements (e.g. 10 days Annual Leave) instead of
 *   relying on whatever types exist on the public demo (Admin only has CAN - Bereavement).
 * - Reset leave balances and cancel test applications via API in afterEach.
 * - Freeze "today" with a clock stub so date-boundary tests are deterministic.
 * - Run as multiple roles (employee submit → manager approve) with separate auth fixtures.
 */
import { test, expect } from '../../fixtures/base.fixture';
import { LeavePage } from '../../pages/LeavePage';
import { getFutureDate, getPastDate, getFutureWorkingDayRange, toOrangeHrmDateRange } from '../../helpers/date.helper';

/** Public demo exposes CAN - Bereavement for Admin; used in place of "Annual Leave". */
const LEAVE_TYPE = 'CAN - Bereavement';

/** Unique far-future offset to avoid overlapping leave on the shared demo. */
function uniqueLeaveOffset(): number {
  return 60 + (Date.now() % 80);
}

test.describe('Leave Application', () => {
  let leavePage: LeavePage;

  test.beforeEach(async ({ page }) => {
    leavePage = new LeavePage(page);
  });

  test('should apply for annual leave successfully', async () => {
    const offset = uniqueLeaveOffset();
    const { from: fromDate, to: toDate } = getFutureWorkingDayRange(offset, 2);
    const reason = `Annual leave request ${Date.now()}`;

    await leavePage.navigateToApplyLeave();
    await leavePage.selectLeaveType(LEAVE_TYPE);
    await leavePage.setFromDate(fromDate);
    await leavePage.setToDate(toDate);
    await leavePage.setReason(reason);
    await leavePage.submitLeaveApplication();

    const message = await leavePage.getSuccessMessage();
    expect(message).toMatch(/Successfully Saved/i);
  });

  test('should reject leave application with past dates', async () => {
    const fromDate = getPastDate(10);
    const toDate = getPastDate(8);

    await leavePage.navigateToApplyLeave();
    await leavePage.selectLeaveType(LEAVE_TYPE);
    await leavePage.setFromDate(fromDate);
    await leavePage.setToDate(toDate);
    await leavePage.setReason('Past leave attempt');
    await leavePage.submitLeaveApplication();

    const message = await leavePage.getSuccessMessage();
    // OrangeHRM quirk: past dates show a "Warning" toast (e.g. no entitlement / invalid period), not inline errors.
    expect(message).not.toMatch(/Successfully Saved/i);
    expect(message.toLowerCase()).toMatch(/failed|error|invalid|warning/);
    expect(await leavePage.remainsOnApplyLeavePage()).toBe(true);
  });

  test('should reject leave when from date is after to date', async () => {
    const fromDate = getFutureDate(25);
    const toDate = getFutureDate(20);

    await leavePage.navigateToApplyLeave();
    await leavePage.selectLeaveType(LEAVE_TYPE);
    await leavePage.setFromDate(fromDate);
    await leavePage.setToDate(toDate);
    await leavePage.setReason('Invalid date range');
    await leavePage.submitLeaveApplication();

    const errors = await leavePage.getValidationErrors();
    expect(errors.join(' ')).toMatch(/To date should be after from date/i);
    expect(await leavePage.remainsOnApplyLeavePage()).toBe(true);
  });

  test('should show leave in My Leave list after application', async () => {
    const offset = uniqueLeaveOffset() + 15;
    const { from: fromDate, to: toDate } = getFutureWorkingDayRange(offset, 2);
    const expectedRange = toOrangeHrmDateRange(fromDate, toDate);
    const reason = `List verification ${Date.now()}`;

    await leavePage.navigateToApplyLeave();
    await leavePage.selectLeaveType(LEAVE_TYPE);
    await leavePage.setFromDate(fromDate);
    await leavePage.setToDate(toDate);
    await leavePage.setReason(reason);
    await leavePage.submitLeaveApplication();

    expect(await leavePage.getSuccessMessage()).toMatch(/Successfully Saved/i);

    await leavePage.navigateToMyLeaveList();

    const rowIndex = await leavePage.findRowIndexByDateRange(expectedRange);
    expect(rowIndex).toBeGreaterThanOrEqual(0);

    const status = await leavePage.getLeaveStatus(rowIndex);
    // Status varies on shared demo (Pending Approval, Scheduled, etc.) — assert row exists with a status.
    expect(status.length).toBeGreaterThan(0);
  });
});
