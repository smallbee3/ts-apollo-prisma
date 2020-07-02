import { Post } from '../types/models';

interface PageInfo {
    startCursor: string
    endCursor: string
    hasNextPage: boolean
    hasPreviousPage: boolean
}

function getPageInfo<Schema extends typeof Post>({
  first,
  last,
  after,
  before,
  firstRow,
  lastRow,
  results,
}: {
  first: number;
  last: number;
  after: string;
  before: string;
  firstRow: Schema;
  lastRow: Schema;
  results: Array<Schema>;
}): PageInfo {
  const pageInfo = {
    startCursor: null,
    hasPreviousPage: false,
    endCursor: null,
    hasNextPage: false,
  };
  if (results.length === 0) {
    return pageInfo;
  }

  const startEdge = new Date(Number(results[0].createdAt)).getTime();
  const endEdge = new Date(
    Number(results[results.length - 1].createdAt),
  ).getTime();
  const firstRowCreatedAtDt = new Date(firstRow.createdAt).getTime();
  const lastRowCreatedAtDt = new Date(lastRow.createdAt).getTime();
  pageInfo.startCursor = startEdge;
  pageInfo.endCursor = endEdge;

  if (last) {
    pageInfo.hasPreviousPage = startEdge < firstRowCreatedAtDt;
    if (before) {
      pageInfo.hasNextPage = endEdge > lastRowCreatedAtDt;
    }
  } else {
    pageInfo.hasNextPage = endEdge > lastRowCreatedAtDt;
    if (after) {
      pageInfo.hasPreviousPage = startEdge < firstRowCreatedAtDt;
    }
  }

  return pageInfo;
}

export { getPageInfo };
