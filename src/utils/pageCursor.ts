import { PostDelegate, PostWhereInput } from '@prisma/client';
import { stringify } from 'querystring';

// In most cases Service caps the pagination results to 100 pages
// and we may not want to return more than that
const PAGE_NUMBER_CAP = 100;

// Returns an opaque cursor for a page.
async function pageToCursorObject(page, pageInfo, prismaModel, where) {
  const { currentPage, size, cursor } = pageInfo;
  const distance = (page - currentPage) * size;
  const findManyArgs = {
    take: distance < 0 ? -1 : 1,
    skip: distance < 0 ? distance * -1 : distance,
  };
  const result = await prismaModel.findMany({
    where: {
      ...where,
    },
    cursor: {
      id: cursor,
    },
    ...findManyArgs,
  });
  return {
    cursor: result[0].id,
    page,
    isCurrent: currentPage === page,
  };
}

// Returns an array of PageCursor objects
// from start to end (page numbers).
async function pageCursorsToArray(start, end, pageInfo, prismaModel, where) {
  let page;
  const cursors = [];
  for (page = start; page <= end; page++) {
    const cursorResult = await pageToCursorObject(
      page,
      pageInfo,
      prismaModel,
      where,
    );
    cursors.push(cursorResult);
  }
  return cursors;
}

// Returns the total number of pagination results capped to PAGE_NUMBER_CAP.
export function computeTotalPages(totalRecords:number, size: number): number {
  return Math.min(Math.ceil(totalRecords / size), PAGE_NUMBER_CAP);
}

interface pageCursorsArg {
  pageInfo: {
    currentPage: number,
    size: number,
    cursor: number,
    buttonNum: number,
  },
  totalRecords: number,
  prismaModel: PostDelegate,
  where: PostWhereInput,
}

interface pageCursor {
  cursor: number,
  page: number,
  isCurrent: boolean,
}

interface pageCursors {
  first: pageCursor,
  around: [pageCursor],
  last: pageCursor,
}

export async function createPageCursors({
  pageInfo: { currentPage, size, cursor, buttonNum },
  totalRecords,
  prismaModel,
  where,
}: pageCursorsArg): Promise<pageCursors> {
  // If buttonNum is even, bump it up by 1, and log out a warning.
  if (buttonNum % 2 === 0) {
    console.log(`Max of ${buttonNum} passed to page cursors, using ${buttonNum + 1}`);
    buttonNum = buttonNum + 1;
  }

  let pageCursors;
  const totalPages = computeTotalPages(totalRecords, size);
  const pageInfo = { currentPage, size, cursor };

  // Degenerate case of no records found. 1 / 1 / 1
  if (totalPages === 0) {
    // pageCursors = { around: [pageToCursorObject(1, 1, size, prismaModel, where)] };
    pageCursors = {
      around: [],
    };
  } else if (totalPages <= buttonNum) {
    // Collection is short, and `around` includes page 1 and the last page. 1 / 1 2 3 / 7
    const around = await pageCursorsToArray(1, totalPages, pageInfo, prismaModel, where);
    pageCursors = {
      around,
    };
  } else if (currentPage <= Math.floor(buttonNum / 2) + 1) {
    // We are near the beginning, and `around` will include page 1. 1 / 1 2 3 / 7
    const last = await pageToCursorObject(totalPages, pageInfo, prismaModel, where);
    const around = await pageCursorsToArray(1, buttonNum - 1, pageInfo, prismaModel, where);
    pageCursors = {
      last,
      around,
    };
  } else if (currentPage >= totalPages - Math.floor(buttonNum / 2)) {
    // We are near the end, and `around` will include the last page. 1 / 5 6 7 / 7
    const first = await pageToCursorObject(1, pageInfo, prismaModel, where);
    const around = await pageCursorsToArray(
      totalPages - buttonNum + 2,
      totalPages,
      pageInfo,
      prismaModel,
      where,
    );
    pageCursors = {
      first,
      around,
    };
  } else {
    // We are in the middle, and `around` doesn't include the first or last page. 1 / 4 5 6 / 7
    const first = await pageToCursorObject(1, pageInfo, prismaModel, where);
    const last = await pageToCursorObject(totalPages, pageInfo, prismaModel, where);
    const offset = Math.floor((buttonNum - 3) / 2);
    const around = await pageCursorsToArray(
      currentPage - offset,
      currentPage + offset,
      pageInfo,
      prismaModel,
      where,
    );
    pageCursors = {
      first,
      around,
      last,
    };
  }
  if (currentPage > 1 && totalPages > 1) {
    const previous = await pageToCursorObject(
      currentPage - 1,
      pageInfo,
      prismaModel,
      where,
    );
    pageCursors.previous = previous;
  }
  return pageCursors;
}
