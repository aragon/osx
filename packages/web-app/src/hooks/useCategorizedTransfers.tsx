// import {getDateSections} from 'utils/date';

export type TransferSectionsType = {
  week: number[];
  month: number[];
  year: number[];
};

export default function useCategorizedTransfers(): TransferSectionsType {
  // const sections = getDateSections(); // Sections will dynamically set based on today date

  /**
   * Note: In this Hook we should split the transfer data
   *
   * @params is a list of transfers
   *
   * @return should be a object with params with list of transfers for each section. Also
   * It's possible to save data directly on context api
   *
   */

  return {
    week: [1, 2, 3],
    month: [1, 2, 3],
    year: [1, 2, 3],
  };
}
