import { db } from '../../utils/db';

export class TextBookService {
  /**
   * 创建 TextBook
   */
  static async createTextBook(data: {
    name: string;
    typeName?: string;
    stageName?: string;
    // units: {
    //   name: string;
    //   words: string[];
    // }[];
  }) {
    // 检查是否存在同名教材
    const existingTextBook = await db.textBook.findFirst({
      where: { name: data.name }
    });

    if (existingTextBook) {
      throw new Error('已存在同名教材，请使用不同的名称');
    }

    // 创建教材
    const textBook = await db.textBook.create({
      data: {
        name: data.name,
        typeName: data.typeName,
        stageName: data.stageName,
        // units: {
        //   create: data.units.map(unit => ({
        //     name: unit.name,
        //     words: unit.words
        //   }))
        // }
      }
    });

    return {
      id: textBook.id,
      name: textBook.name,
      typeName: textBook.typeName,
      stageName: textBook.stageName,
      createdAt: textBook.createdAt
    };
  }

  static async createUnit(data: {
    textBookId: string;
    name: string;
    words: string[];
  }) {
    const unit = await db.unit.create({ data });
    return unit;
  }

  /**
   * 获取 TextBook 列表
   */
  static async getTextBookList(
  ) {
    const where: any = {};
    const textBooks = await db.textBook.findMany({
      where,
      include: {
        _count: {
          select: { units: true }
        }
      },
      orderBy: { createdAt: 'desc' },
    });

    const formattedTextBooks = textBooks.map(textBook => ({
      id: textBook.id,
      name: textBook.name,
      typeName: textBook.typeName,
      stageName: textBook.stageName,
      unitsCount: textBook._count.units,
      createdAt: textBook.createdAt,
      updatedAt: textBook.updatedAt
    }));

    return formattedTextBooks;
  }

  /**
   * 获取 TextBook 详情
   */
  static async getTextBookDetail(id: string) {
    // 获取教材基本信息
    const textBook = await db.textBook.findUnique({
      where: { id },
      include: {
        units: {
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    if (!textBook) {
      throw new Error('教材不存在');
    }

    return {
      id: textBook.id,
      name: textBook.name,
      typeName: textBook.typeName,
      stageName: textBook.stageName,
      units: textBook.units.map(unit => ({
        id: unit.id,
        name: unit.name,
        words: unit.words,
        createdAt: unit.createdAt,
        updatedAt: unit.updatedAt
      })),
      createdAt: textBook.createdAt,
      updatedAt: textBook.updatedAt
    };
  }

  /**
   * 获取所有教材类型
   */
  static async getTextBookTypes() {
    const types = await db.textBook.groupBy({
      by: ['typeName'],
      where: {
        typeName: { not: null }
      },
      _count: true
    });

    return types.map(type => ({
      typeName: type.typeName,
      count: type._count
    }));
  }

  /**
   * 获取所有学习阶段
   */
  static async getTextBookStages() {
    const stages = await db.textBook.groupBy({
      by: ['stageName'],
      where: {
        stageName: { not: null }
      },
      _count: true
    });

    return stages.map(stage => ({
      stageName: stage.stageName,
      count: stage._count
    }));
  }
}
