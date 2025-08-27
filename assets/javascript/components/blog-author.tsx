import * as React from "react";
import { formatDate, cn } from "@/lib/utils";
import { Image, Link } from "@/components/common/index";

export default function Author({
  name,
  image,
  twitterUsername,
  authorUsername,
  updatedAt,
  imageOnly,
}: {
  name: string;
  image: string;
  twitterUsername: string;
  authorUsername?: string;
  updatedAt?: string;
  imageOnly?: boolean;
}) {
  // Use authorUsername if available, otherwise fallback to twitterUsername
  const username = authorUsername || twitterUsername;
  if (imageOnly) {
    return (
      <Image
        src={image}
        alt={name}
        width={36}
        height={36}
        className="rounded-full transition-all group-hover:brightness-90"
      />
    );
  }

  if (updatedAt) {
    return (
      <div className="flex items-center space-x-3">
        <Image
          src={image}
          alt={name}
          width={36}
          height={36}
          className="rounded-full"
        />
        <div className="flex flex-col">
          <p className="text-sm text-gray-500">Written by {name}</p>
          <time
            dateTime={updatedAt}
            className="text-sm font-light text-gray-400"
          >
            Last updated {formatDate(updatedAt)}
          </time>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-3">
      <Image
        src={image}
        alt={name}
        width={40}
        height={40}
        className="rounded-full"
      />
      <div className="flex flex-col">
        <p className="font-semibold text-gray-700">{name}</p>
        {username && <p className="text-sm text-gray-500">@{username}</p>}
      </div>
    </div>
  );
}
