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

  /**
   * Note: This function will return a list of timestamp that we can use to categorize transfers
   * @return a object with milliseconds params
   */

  return {
    lastWeek,
    lastMonth,
    lastYear,
  };
}
