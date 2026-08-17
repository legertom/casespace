import { requireUser } from "@/lib/current-user";
import { STATUSES } from "@/lib/domain";
import { getProgramCounts } from "@/server/dashboard-queries";
import { GraphGallery } from "@/components/graphs/graph-gallery";

export const metadata = { title: "Pipeline drawings" };

export default async function GraphsPage() {
  await requireUser();
  const counts = await getProgramCounts();
  const live = STATUSES.map((s) => counts.byStatus[s]);

  return (
    <div>
      <h1 className="font-serif text-4xl">Pipeline drawings</h1>
      <p className="mt-2 max-w-prose text-ink-muted">
        Twenty-one drawings of the same seven counts: the bar chart this
        replaced, the fifteen the current one was chosen from, and five we
        have not built yet. Every drawing reads the live casebook — switch the
        data at the top and they all redraw together, which is how they were
        compared in the first place.
      </p>
      <div className="mt-10">
        <GraphGallery live={live} />
      </div>
    </div>
  );
}
