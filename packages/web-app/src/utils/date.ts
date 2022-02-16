import {i18n} from '../../i18n.config';

import {ProposalData, VotingData} from './types';
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

export function daysToMills(days: number): number {
  return days * 24 * 60 * 60 * 1000;
}

export function hoursToMills(hours: number): number {
  return hours * 60 * 60 * 1000;
}

export function minutesToMills(minutes: number): number {
  return minutes * 60 * 1000;
}

type Offset = {
  days?: number;
  hours?: number;
  minutes?: number;
};

function offsetToMills(offset: Offset) {
  return (
    (offset.days ? daysToMills(offset.days) : 0) +
    (offset.hours ? hoursToMills(offset.hours) : 0) +
    (offset.minutes ? minutesToMills(offset.minutes) : 0)
  );
}

/**
 * Returns the either:
 *
 *  - the current date
 *  - or the current date + the number of days passed as offset
 *
 * as a string with the following format: "yyyy-mm-dd".
 *
 * Note that the offset may be negative. This will return a date in the past.
 *
 * This date format is necessary when working with html inputs of type "date".
 */
export function getCanonicalDate(offset?: Offset): string {
  const currDate = new Date();

  //add offset
  const offsetMills = offset ? offsetToMills(offset) : 0;
  const offsetTime = currDate.getTime() + offsetMills;
  const offsetDateTime = new Date(offsetTime);

  //format date
  const month = offsetDateTime.getMonth() + 1;
  const formattedMonth = month > 9 ? '' + month : '0' + month;
  const day = offsetDateTime.getDate();
  const formattedDay = day > 9 ? '' + day : '0' + day;
  return (
    '' +
    offsetDateTime.getFullYear() +
    '-' +
    formattedMonth +
    '-' +
    formattedDay
  );
}

/**
 * Returns the current time as a string with the following format:
 * "hh:mm".
 *
 * This time format is necessary when working with html inputs of type "time".
 */
export function getCanonicalTime(offset?: Offset): string {
  const currDate = new Date();

  //add offset
  const offsetMills = offset ? offsetToMills(offset) : 0;
  const offsetTime = currDate.getTime() + offsetMills;
  const offsetDateTime = new Date(offsetTime);

  //format time
  const currHours = offsetDateTime.getHours();
  const currMinutes = offsetDateTime.getMinutes();
  const formattedHours = currHours > 9 ? '' + currHours : '0' + currHours;
  const formattedMinutes =
    currMinutes > 9 ? '' + currMinutes : '0' + currMinutes;

  return '' + formattedHours + ':' + formattedMinutes;
}

/**
 * This method returns a UTC offset with the following format:
 * "[+|-]hh:mm".
 *
 * This format is necessary to construct dates based on a particular timezone
 * offset using the date-fns library.
 *
 * If a formatted offset is provided, it will be mapped to its canonical form.
 * If none is provided, the current timezone offset will be used.
 */
export function getCanonicalUtcOffset(formattedUtcOffset?: string): string {
  const formattedOffset = formattedUtcOffset || getFormattedUtcOffset();
  const noLettersOffset = formattedOffset.slice(3);
  const sign = noLettersOffset.slice(0, 1);
  const time = noLettersOffset.slice(1);
  let canonicalOffset;
  if (time.includes(':')) {
    // if colon present only hours might need padding
    const [hours, minutes] = time.split(':');
    canonicalOffset = (hours.length === 1 && '0') + hours + ':' + minutes;
  } else {
    // if no colon, need to add :00 and maybe padding to hours
    canonicalOffset = (time.length === 1 && '0') + time + ':00';
  }
  return sign + canonicalOffset;
}

/**
 * This method returns the user's UTC offset with the following format:
 * "UTC[+|-](h)?h(:mm)?" (E.g., either UTC+10, UTC-9:30).
 *
 * This format is used to display offsets in the UI.
 */
export function getFormattedUtcOffset(): string {
  const currDate = new Date();
  let decimalOffset = currDate.getTimezoneOffset() / 60;
  const isNegative = decimalOffset < 0;
  decimalOffset = Math.abs(decimalOffset);
  const hourOffset = Math.floor(decimalOffset);
  const minuteOffset = Math.round((decimalOffset - hourOffset) * 60);
  let formattedOffset = 'UTC' + (isNegative ? '+' : '-') + hourOffset;
  formattedOffset += minuteOffset > 0 ? ':' + minuteOffset : '';
  return formattedOffset;
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
 * @param voteData proposal's voting data, containing the timestamps (in UTC
 * seconds) of the start and end of vote.
 * @returns a message with i18 translation as proposal ends alert
 */
export function translateProposalDate(
  type: ProposalData['type'],
  voteData: VotingData
): string | null {
  let leftTimestamp;
  if (type === 'pending') {
    leftTimestamp = getRemainingTime(voteData.start);
  } else if (type === 'active') {
    leftTimestamp = getRemainingTime(voteData.end);
  } else {
    return null;
  }
  const days = Math.floor(leftTimestamp / 86400);
  const hours = Math.floor((leftTimestamp % 86400) / 3600);
  return i18n.t(`governance.proposals.${type}`, {days, hours}) as string;
}
