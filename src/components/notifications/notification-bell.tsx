import { fmtDate } from "@/lib/format";
import { HoverMenu } from "@/components/hover-menu";
import {
  listNotifications,
  unreadNotificationCount,
  type NotificationRow,
} from "@/server/notification-queries";
import {
  markAllNotificationsReadAction,
  openNotificationAction,
} from "@/server/actions-notifications";

/**
 * The header bell. Rendered per request like everything else in the layout —
 * no polling, no sockets: it refreshes on every navigation, which is right
 * for a program this size.
 */
export async function NotificationBell({
  userId,
  isAdmin = false,
}: {
  userId: string;
  /** Only admins hear about newly logged records, so only they are promised it. */
  isAdmin?: boolean;
}) {
  const [items, unread] = await Promise.all([
    listNotifications(userId),
    unreadNotificationCount(userId),
  ]);

  return (
    <HoverMenu
      className="relative"
      triggerLabel={
        unread > 0 ? `Notifications, ${unread} unread` : "Notifications"
      }
      triggerClassName="relative flex cursor-pointer items-center text-ink-muted hover:text-ink"
      /* A 20rem panel hung off this bell would run past the left edge of a
         phone, so below md it spans the header instead. */
      panelClassName="fixed inset-x-4 top-14 z-20 rounded-md border border-hairline bg-surface p-3 shadow-sm md:absolute md:inset-x-auto md:right-0 md:top-auto md:mt-2 md:w-80"
      trigger={
        <>
          <svg
            aria-hidden
            viewBox="0 0 20 20"
            className="size-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M10 3a4.5 4.5 0 0 0-4.5 4.5c0 3-1.2 4.2-1.7 4.7a.5.5 0 0 0 .35.85h11.7a.5.5 0 0 0 .35-.85c-.5-.5-1.7-1.7-1.7-4.7A4.5 4.5 0 0 0 10 3Z" />
            <path d="M8.4 16.2a1.8 1.8 0 0 0 3.2 0" />
          </svg>
          {unread > 0 && (
            <span className="absolute -right-1.5 -top-1 min-w-4 rounded-full bg-accent px-1 text-center text-[10px] font-medium leading-4 text-white">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </>
      }
    >
      <div>
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-xs uppercase tracking-wide text-ink-faint">
            Notifications
          </p>
          {unread > 0 && (
            <form action={markAllNotificationsReadAction}>
              <button
                type="submit"
                className="text-xs text-ink-muted hover:text-accent"
              >
                Mark all read
              </button>
            </form>
          )}
        </div>
        {items.length === 0 ? (
          <p className="mt-3 text-sm text-ink-muted">
            Nothing yet. Comments and links on your records land here.
            {isAdmin && " So does every use case as it's logged."}
          </p>
        ) : (
          <ul className="mt-2 max-h-96 divide-y divide-hairline overflow-y-auto">
            {items.map((n) => (
              <li key={n.id}>
                <form action={openNotificationAction.bind(null, n.id)}>
                  <button
                    type="submit"
                    className="flex w-full items-start gap-2 py-2 text-left text-sm hover:text-accent"
                  >
                    <span
                      aria-hidden
                      className={`mt-1.5 size-1.5 shrink-0 rounded-full ${
                        n.readAt ? "bg-transparent" : "bg-accent"
                      }`}
                    />
                    <span className={n.readAt ? "text-ink-muted" : ""}>
                      <span className={n.readAt ? "" : "font-medium"}>
                        {line(n)}
                      </span>
                      <span className="mt-0.5 block text-xs text-ink-faint">
                        {fmtDate(n.createdAt)}
                        {!n.readAt && <span className="sr-only"> · unread</span>}
                      </span>
                    </span>
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </div>
    </HoverMenu>
  );
}

/** One line per kind, naming who and where. */
function line(n: NotificationRow): string {
  const actor = n.actorName ?? "Someone";
  switch (n.kind) {
    case "reply":
      return `${actor} replied to your comment on ${n.useCaseTitle}`;
    case "mention":
      return `${actor} mentioned you on ${n.useCaseTitle}`;
    case "link":
      return `${actor} linked ${n.linkedTitle ?? "another workflow"} to ${n.useCaseTitle}`;
    case "new_use_case":
      return `${actor} logged ${n.useCaseTitle}`;
    default:
      return `${actor} commented on ${n.useCaseTitle}`;
  }
}
