import { intArg, objectType, stringArg } from '@nexus/schema';
import { Post } from './Post';
import { createPageCursors } from '../../utils/pageCursor';
import { getUserId } from '../../utils';

// const UserPostEdge = objectType({
//   name: 'UserPostEdge',
//   definition(t) {
//     t.field('node', {
//       type: Post,
//     });
//     t.string('cursor');
//   },
// });

// const UserPostConnection = objectType({
//   name: 'UserPostConnection',
//   definition(t) {
//     t.list.field('edges', {
//       type: UserPostEdge,
//     });
//   },
// });

const pageConnection = objectType({
  name: 'pageConnection',
  definition(t) {
    t.string('cursor');
    t.int('page');
    t.boolean('isCurrent');
  },
});

const pageCursorsConnection = objectType({
  name: 'pageCursorsConnection',
  definition(t) {
    t.field('previous', {
      type: pageConnection,
      nullable: true,
    });
    t.field('first', {
      type: pageConnection,
      nullable: true,
    });
    t.field('last', {
      type: pageConnection,
      nullable: true,
    });
    t.list.field('around', {
      type: pageConnection,
      nullable: true,
    });
  },
});

const edgesConnection = objectType({
  name: 'edgesConnection',
  definition(t) {
    t.string('cursor');
    t.int('node');
  },
});

const paginationConnection = objectType({
  name: 'paginationConnection',
  definition(t) {
    t.list.field('edges', {
      type: edgesConnection,
      nullable: true,
    });
    t.field('pageCursors', {
      type: pageCursorsConnection,
      nullable: true,
    });
  },
});

export const Profile = objectType({
  name: 'Profile',
  definition(t) {
    t.model.id();
    t.model.socialId();
    t.model.authType();
    t.model.verified();
  },
});

export const User = objectType({
  name: 'User',
  definition(t) {
    t.model.id();
    t.model.email();
    t.model.name();
    t.model.nickname();
    t.model.thumbURL();
    t.model.photoURL();
    t.model.birthDay();
    t.model.gender();
    t.model.phone();
    t.model.createdAt();
    t.model.updatedAt();
    t.model.deletedAt();
    t.model.profile({
      type: 'Profile',
    });
    t.field('posts', {
      type: paginationConnection,
      args: {
        currentPage: intArg(),
        // cursor: stringArg(),
        cursor: intArg(),
        size: intArg(),
        buttonNum: intArg(),
      },
      async resolve(_parent, args, ctx) {
        const { currentPage, cursor, size, buttonNum } = args;
        const userId = getUserId(ctx);

        let where = {
          user: {
            id: userId,
          },
        };

        // if (cursor) {
        // const cursorNum = Number((Buffer.from(cursor, 'base64').toString('ascii')).slice(4)) / 1000;
        // console.log(4, { cursorNum });
        // findManyArgs = { ...findManyArgs, cursor: { id: cursorNum } };
        // }
        // if (limit) {
        //   findManyArgs = { ...findManyArgs, take: limit };
        // }
        // if (skip) {
        //   findManyArgs = { ...findManyArgs, skip: skip };
        // }

        const posts = await ctx.prisma.post.findMany({
          where: {
            ...where,
          },
          cursor: {
            id: cursor,
          },
          take: size,
        });
        const edges = posts.map((post) => ({
          node: post.id,
          cursor: Buffer.from('saltysalt'.concat(String(post.id))).toString('base64'),
        }));
        const postsAll = await ctx.prisma.post.findMany({
          where: {
            ...where,
          },
        });
        const pageCursors = createPageCursors({
          pageInfo: {
            currentPage,
            size,
            cursor,
            buttonNum,
          },
          totalRecords: postsAll.length,
          prismaModel: ctx.prisma.post,
          where,
        });
        return {
          edges,
          pageCursors,
        };
      },
    });
  },
});
