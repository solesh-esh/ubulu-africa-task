/**
 * Leave Application — test data in test-data/leave-scenarios.json
 *
 * Date math stays in helpers/date.helper.ts (relative offsets computed at runtime).
 */
import { test, expect } from '../../fixtures/base.fixture';
import { LeavePage } from '../../pages/LeavePage';
import {
  getFutureDate,
  getPastDate,
  getFutureWorkingDayRange,
  toOrangeHrmDateRange,
} from '../../helpers/date.helper';
import { loadLeaveCaseById, loadLeaveScenarios } from '../../helpers/test-data-loader';

const leaveConfig = loadLeaveScenarios();

function uniqueLeaveOffset(): number {
  const { baseDays, moduloDays } = leaveConfig.uniqueOffset;
  return baseDays + (Date.now() % moduloDays);
}

function resolveOffset(caseId: string): number {
  const leaveCase = loadLeaveCaseById(caseId);
  if (leaveCase.offsetDays === 'uniquePlusListExtra') {
    return uniqueLeaveOffset() + leaveConfig.uniqueOffset.listExtraDays;
  }
  return uniqueLeaveOffset();
}

test.describe('Leave Application', () => {
  let leavePage: LeavePage;

  test.beforeEach(async ({ page }) => {
    leavePage = new LeavePage(page);
  });

  test(`should ${loadLeaveCaseById('LEAVE-01').description}`, async () => {
    const leaveCase = loadLeaveCaseById('LEAVE-01');
    const offset = resolveOffset('LEAVE-01');
    const { from: fromDate, to: toDate } = getFutureWorkingDayRange(offset, leaveCase.durationDays!);
    const reason = `${leaveCase.reasonPrefix} ${Date.now()}`;

    await leavePage.navigateToApplyLeave();

    const balance = await leavePage.getDisplayedLeaveBalance();
    test.skip(balance <= 0, 'Shared demo: employee leave balance is 0 — success path unavailable');

    await leavePage.selectLeaveType(leaveConfig.leaveType);
    await leavePage.setFromDate(fromDate);
    await leavePage.setToDate(toDate);
    await leavePage.setReason(reason);
    await leavePage.submitLeaveApplication();

    const message = await leavePage.getSuccessMessage();
    expect(message).toMatch(/Successfully Saved/i);
  });

  test(`should ${loadLeaveCaseById('LEAVE-02').description}`, async () => {
    const leaveCase = loadLeaveCaseById('LEAVE-02');
    const fromDate = getPastDate(Math.abs(leaveCase.fromDateOffsetDays!));
    const toDate = getPastDate(Math.abs(leaveCase.toDateOffsetDays!));

    await leavePage.navigateToApplyLeave();
    await leavePage.selectLeaveType(leaveConfig.leaveType);
    await leavePage.setFromDate(fromDate);
    await leavePage.setToDate(toDate);
    await leavePage.setReason(leaveCase.reason!);
    await leavePage.submitLeaveApplication();

    const message = await leavePage.getSuccessMessage();
    const errors = await leavePage.getValidationErrors();
    expect(message).not.toMatch(/Successfully Saved/i);
    expect(
      message.toLowerCase().match(/failed|error|invalid|warning/) !== null ||
        errors.length > 0 ||
        (await leavePage.remainsOnApplyLeavePage()),
    ).toBe(true);
  });

  test(`should ${loadLeaveCaseById('LEAVE-03').description}`, async () => {
    const leaveCase = loadLeaveCaseById('LEAVE-03');
    const fromDate = getFutureDate(leaveCase.fromDateOffsetDays!);
    const toDate = getFutureDate(leaveCase.toDateOffsetDays!);

    await leavePage.navigateToApplyLeave();
    await leavePage.selectLeaveType(leaveConfig.leaveType);
    await leavePage.setFromDate(fromDate);
    await leavePage.setToDate(toDate);
    await leavePage.setReason(leaveCase.reason!);
    await leavePage.submitLeaveApplication();

    const errors = await leavePage.getValidationErrors();
    expect(errors.join(' ')).toMatch(new RegExp(leaveCase.expectedErrorPattern!, 'i'));
    expect(await leavePage.remainsOnApplyLeavePage()).toBe(true);
  });

  test(`should ${loadLeaveCaseById('LEAVE-04').description}`, async () => {
    const leaveCase = loadLeaveCaseById('LEAVE-04');
    const offset = resolveOffset('LEAVE-04');
    const { from: fromDate, to: toDate } = getFutureWorkingDayRange(offset, leaveCase.durationDays!);
    const expectedRange = toOrangeHrmDateRange(fromDate, toDate);
    const reason = `${leaveCase.reasonPrefix} ${Date.now()}`;

    await leavePage.navigateToApplyLeave();

    const balance = await leavePage.getDisplayedLeaveBalance();
    test.skip(balance <= 0, 'Shared demo: employee leave balance is 0 — cannot verify list entry');

    await leavePage.selectLeaveType(leaveConfig.leaveType);
    await leavePage.setFromDate(fromDate);
    await leavePage.setToDate(toDate);
    await leavePage.setReason(reason);
    await leavePage.submitLeaveApplication();

    expect(await leavePage.getSuccessMessage()).toMatch(/Successfully Saved/i);

    await leavePage.navigateToMyLeaveList();

    const rowIndex = await leavePage.findRowIndexByDateRange(expectedRange);
    expect(rowIndex).toBeGreaterThanOrEqual(0);

    const status = await leavePage.getLeaveStatus(rowIndex);
    expect(status.length).toBeGreaterThan(0);
  });
});
