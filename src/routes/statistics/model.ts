import { t } from 'elysia';

// 通用时间范围和分组参数
export const StatisticsQuery = t.Object({
  startDate: t.Optional(t.String()),
  endDate: t.Optional(t.String()),
  groupBy: t.Optional(t.Union([
    t.Literal('day'),
    t.Literal('week'),
    t.Literal('month')
  ]))
});

export const StatisticsModels = {
  StatisticsQuery
}; 