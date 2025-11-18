import * as React from "react";
import { Post } from "@/lib/blog";
import { formatDate, cn } from "@/lib/utils";
import { Image, Link } from "@/components/common/index";
import { useTranslation } from "@/lib/useTranslation";

export default function BlogCard({
  data,
  priority,
}: {
  data: Post;
  priority?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <div className="bg-background rounded-lg p-4 mb-4 border hover:shadow-sm transition-shadow duration-200">
        {data.image && (
          <Image
            className="rounded-t-lg object-cover border"
            src={data.image}
            width={1200}
            height={630}
            alt={data.title}
            priority={priority}
          />
        )}
        {!data.image && <div className="bg-gray-200 h-[180px] mb-4 rounded" />}
        <p className="mb-2">
          <time
            dateTime={data.publishedAt}
            className="text-sm text-muted-foreground"
          >
            {formatDate(
              data.publishedAt,
              navigator.language,
              {
                today: t('today', 'Today'),
                days_ago: t('days_ago', 'd ago'),
                weeks_ago: t('weeks_ago', 'w ago'),
                months_ago: t('months_ago', 'mo ago'),
                years_ago: t('years_ago', 'y ago')
              }
            )}
          </time>
        </p>
        <h3 className="text-xl font-semibold mb-2">
          <Link href={`/blog/${data.slug}`} className="hover:underline">
            {data.title}
          </Link>
        </h3>
        <p className="text-foreground mb-4">{data.summary}</p>
      </div>
  );
}
