import { documentedGatesComplete } from "@/lib/domain";
import type { UseCaseDetail } from "@/server/use-case-queries";
import { Empty } from "@/components/record/empty";
import { GateToggle } from "@/components/record/gate-toggle";
import { InlineField } from "@/components/record/inline-field";

/** A read-only gate line, for viewers: the check, the text, the hover help. */
function Gate({
  ok,
  help,
  children,
}: {
  ok: boolean;
  help?: string;
  children: React.ReactNode;
}) {
  return (
    <li className="flex items-start gap-2 text-sm" title={help}>
      <span
        aria-hidden
        className={`mt-0.5 inline-flex size-4 items-center justify-center rounded-sm border text-[10px] ${
          ok
            ? "border-st-qualified bg-st-qualified text-white"
            : "border-hairline-strong text-transparent"
        }`}
      >
        ✓
      </span>
      <span className={ok ? "" : "text-ink-muted"}>
        {children}
        <span className="sr-only">{ok ? " — met" : " — not met"}</span>
      </span>
    </li>
  );
}

/** The four Documented gates: toggles for editors, checkmarks for viewers. */
export function RecordGates({
  uc,
  record,
  editable,
}: {
  uc: UseCaseDetail;
  record: { id: string; title: string };
  editable: boolean;
}) {
  const gates = documentedGatesComplete(uc);
  return (
    <div className="rounded-md border border-hairline bg-surface p-4">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-faint">
        Documented gates {gates ? "· all four met" : ""}
      </h2>
      <ul className="mt-3 space-y-2">
        {editable ? (
          <>
            <GateToggle
              id={uc.id}
              field="gateNamed"
              checked={uc.gateNamed}
              label="Named workflow, clear description"
              help="The title names one specific workflow and the description explains it in plain language."
            >
              Named workflow, clear description
            </GateToggle>
            <GateToggle
              id={uc.id}
              field="gateTool"
              checked={uc.gateTool}
              label="AI tool & approach identified"
              help="The record says which AI tool does the work, and how it is applied."
            >
              AI tool &amp; approach identified
            </GateToggle>
            <GateToggle
              id={uc.id}
              field="gateAdoption"
              checked={uc.gateAdoption}
              label="Adoption beyond the author(s)"
              help="Someone beyond the author(s) actively uses it."
            >
              Adoption beyond the author(s)
            </GateToggle>
            <InlineField
              record={record}
              field="adoptionEvidence"
              label="Adoption evidence"
              value={uc.adoptionEvidence}
              editor={{ kind: "textarea", rows: 3 }}
              canEdit={editable}
              className="pl-6"
            >
              <p className="text-xs text-ink-faint">
                {uc.adoptionEvidence ?? (
                  <Empty>Who uses it, and how do you know?</Empty>
                )}
              </p>
            </InlineField>
            <GateToggle
              id={uc.id}
              field="gateOwner"
              checked={uc.gateOwner}
              label="A named owner"
              help="One specific person is responsible for keeping it running."
            >
              A named owner
            </GateToggle>
          </>
        ) : (
          <>
            <Gate
              ok={uc.gateNamed}
              help="The title names one specific workflow and the description explains it in plain language."
            >
              Named workflow, clear description
            </Gate>
            <Gate
              ok={uc.gateTool}
              help="The record says which AI tool does the work, and how it is applied."
            >
              AI tool &amp; approach identified
            </Gate>
            <Gate
              ok={uc.gateAdoption}
              help="Someone beyond the author(s) actively uses it."
            >
              Adoption beyond the author(s)
              {uc.adoptionEvidence && (
                <span className="mt-0.5 block text-xs text-ink-faint">
                  {uc.adoptionEvidence}
                </span>
              )}
            </Gate>
            <Gate
              ok={uc.gateOwner}
              help="One specific person is responsible for keeping it running."
            >
              A named owner
            </Gate>
          </>
        )}
      </ul>
    </div>
  );
}
