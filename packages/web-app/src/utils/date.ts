import {i18n} from '../../i18n.config';
import {Proposal} from 'utils/types';
/**
 * Note: This function will return a list of timestamp that we can use to categorize transfers
 * @return a object with milliseconds params
 */
export function getDateSections(): {
  lastWeek: number;
  lastMonth: number;
  lastYear: number;
} {
  const date = new Date();
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  const lastWeek: number = new Date(date.setDate(diff)).getTime();
  const lastMonth: number = new Date(
    date.getFullYear(),
    date.getMonth(),
    1
  ).getTime();
  const lastYear: number = new Date(date.getFullYear(), 0, 1).getTime();

  return {
    lastWeek,
    lastMonth,
    lastYear,
  };
}

/**
 * Note: This function will return the remaining time from input timestamp
 * to current time.
 * @param timestamp proposal creat/end timestamp must be greater than current timestamp
 * @returns remaining timestamp from now
 */
export function getRemainingTime(
  timestamp: number | string // in seconds
): number {
  const currentTimestamp = Math.floor(new Date().getTime() / 1000);
  return parseInt(`${timestamp}`) - currentTimestamp;
}

/**
 * Note: this function will convert the proposal's timestamp to proper string to show
 * as a alert message on proposals card
 * @param type return the message if the type was pending or active
 * @param timestamp proposal creat/end timestamp
 * @returns a message with i18 translation as proposal ends alert
 */
export function translateProposalDate(
  type: Proposal['type'],
  timestamp: number | string // in seconds
): string | null {
  let days: number, hours: number;
  if (['pending', 'active'].includes(type)) {
    const leftTimestamp = getRemainingTime(timestamp);
    days = Math.floor(leftTimestamp / 86400);
    hours = Math.floor((leftTimestamp % 86400) / 3600);
    return i18n.t(`governance.proposals.${type}`, {days, hours}) as string;
  }
  return null;
}
