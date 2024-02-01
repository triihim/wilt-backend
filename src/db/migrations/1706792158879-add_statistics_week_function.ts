import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStatisticsWeekFunction1706792158879 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        create or replace function public.get_learning_counts_in_week(
            owner_id UUID,
            from_date date
        ) returns table (date date, count bigint) as
        $$
        begin
        return query
            with dates as (
            select generate_series(
                from_date - '6 days'::interval,
                from_date,
                '1 days'::interval
            )::date AS date
        )
        select 
            d.date,
            count (l.id)
        from dates d left join public.learning l on d.date = DATE(l."createdAt") and l."ownerId" = owner_id
        group by d.date
        order by d.date;
        end;
        $$ language plpgsql;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        drop function if exists public.get_learning_counts_in_week;
    `);
  }
}
