import { JobList } from "./JobList";

export function History() {
  return (
    <JobList
      title="History"
      empty="Nothing queued or skipped yet."
      intro="Queued applies, skips, and other non-inbox statuses. Submitted and failed have their own tabs."
    />
  );
}

export function Submitted() {
  return (
    <JobList
      title="Submitted"
      query="submitted"
      empty="No submitted applications yet."
      intro="Applications the agent sent, or that you marked submitted from a job’s detail page."
    />
  );
}

export function Failed() {
  return (
    <JobList
      title="Failed"
      query="failed"
      empty="No failed applications."
      intro="Extract, draft, or submit failures. Retry extract, or open a job to mark it submitted if you applied yourself."
    />
  );
}
