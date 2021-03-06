import { PaginationType, prismaOffsetPagination } from '../../utils/paginator';
import { arg, intArg, objectType, stringArg } from '@nexus/schema';
import { Post } from './Post';
import { PostWhereInput } from '@prisma/client';
import { getUserId } from '../../utils';
import { paginationPostConnection as paginationConnection } from '../../utils/connection';

export const Profile = objectType({
  name: 'Profile',
  definition(t) {
    t.model.id();
    t.model.socialId();
    t.model.authType();
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
    t.model.verified();
    t.model.createdAt();
    t.model.updatedAt();
    t.model.deletedAt();
    t.model.profile();
    t.field('posts', {
      type: paginationConnection,
      args: {
        currentPage: intArg(),
        cursor: stringArg(),
        size: intArg(),
        buttonNum: intArg(),
        orderBy: stringArg(),
        orderDirection: stringArg({
          default: 'desc',
        }),
        where: arg({ type: 'JSON' }),
      },
      async resolve(_parent, {
        currentPage,
        cursor,
        size,
        buttonNum,
        orderBy,
        orderDirection,
        where,
      }, ctx):Promise<PaginationType> {
        const userId = getUserId(ctx);

        let whereExtra: PostWhereInput = {
          user: {
            id: userId,
          },
        };
        if (where) {
          whereExtra = { ...whereExtra, ...where };
        }

        const result = await prismaOffsetPagination({
          model: Post,
          currentPage,
          cursor,
          size,
          buttonNum,
          orderBy,
          // @ts-ignore -> TODO : Change orderDirection as unionType
          orderDirection,
          where: whereExtra,
          prisma: ctx.prisma,
        });
        return result;
      },
    });
  },
});
