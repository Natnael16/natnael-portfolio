import assert from "node:assert/strict";
import { test } from "node:test";
import { boardFromUrl, canonicalJobUrl } from "../src/sources/atsUrl.js";
import { linkedInJob, parseLinkedInDetail, parseLinkedInSearch } from "../src/sources/feeds/linkedin.js";
import {
  mapHimalayasJob,
  mapJobicyJob,
  mapRemoteOkJob,
  mapRemotiveJob,
  parseWeWorkRemotelyRss,
} from "../src/sources/feeds/remoteBoards.js";
import { mapGreenhouseJob } from "../src/sources/greenhouse.js";
import { mapLeverPosting } from "../src/sources/lever.js";
import { htmlToText, normalizeEmploymentType, toIsoDate } from "../src/lib/text.js";

test("htmlToText reads Greenhouse's entity-escaped HTML and keeps list breaks", () => {
  const text = htmlToText("&lt;p&gt;We build &amp;amp; ship.&lt;/p&gt;&lt;ul&gt;&lt;li&gt;Node.js&lt;/li&gt;&lt;li&gt;React&lt;/li&gt;&lt;/ul&gt;");
  assert.equal(text, "We build & ship.\n\n• Node.js\n• React");
});

test("normalizeEmploymentType maps board spellings", () => {
  assert.equal(normalizeEmploymentType("full_time"), "FullTime");
  assert.equal(normalizeEmploymentType(["Full-Time"]), "FullTime");
  assert.equal(normalizeEmploymentType("Contractor"), "Contract");
  assert.equal(normalizeEmploymentType("freelance"), "Contract");
  assert.equal(normalizeEmploymentType("Part Time"), "PartTime");
  assert.equal(normalizeEmploymentType("Internship"), "Intern");
  assert.equal(normalizeEmploymentType("other"), null);
});

test("toIsoDate handles zoneless ISO, SQL-style, RFC 822 and epoch values", () => {
  assert.equal(toIsoDate("2026-10-20T08:30:00"), "2026-10-20T08:30:00.000Z");
  assert.equal(toIsoDate("2026-10-20 08:30:00"), "2026-10-20T08:30:00.000Z");
  assert.equal(toIsoDate("Tue, 20 Oct 2026 08:30:00 +0000"), "2026-10-20T08:30:00.000Z");
  assert.equal(toIsoDate(1792485000), new Date(1792485000 * 1000).toISOString());
  assert.equal(toIsoDate("2026-10-20T08:30:00+02:00"), "2026-10-20T06:30:00.000Z");
  assert.equal(toIsoDate("not a date"), null);
});

test("Remotive jobs map to remote NormalizedJobs", () => {
  const job = mapRemotiveJob({
    id: 1912345,
    url: "https://remotive.com/remote-jobs/software-dev/senior-full-stack-engineer-1912345",
    title: "Senior Full Stack Engineer",
    company_name: "Acme",
    job_type: "full_time",
    publication_date: "2026-10-20T09:00:00",
    candidate_required_location: "Worldwide",
    salary: "$80k - $110k",
    description: "<p>TypeScript, Node.js and React.</p>",
  });
  assert.equal(job.source, "remotive");
  assert.equal(job.sourceJobId, "1912345");
  assert.equal(job.companySlug, "acme");
  assert.equal(job.isRemote, true);
  assert.equal(job.location, "Worldwide");
  assert.equal(job.employmentType, "FullTime");
  assert.equal(job.publishedAt, "2026-10-20T09:00:00.000Z");
  assert.equal(job.description, "TypeScript, Node.js and React.");
});

test("RemoteOK jobs decode entities and carry the salary range", () => {
  const job = mapRemoteOkJob({
    id: "1098765",
    slug: "remote-backend-engineer-acme-1098765",
    epoch: 1792485000,
    company: "Acme &amp; Sons",
    position: "Backend Engineer",
    location: "Worldwide",
    salary_min: 90000,
    salary_max: 120000,
    description: "<p>Python and Django</p>",
    url: "https://remoteok.com/remote-jobs/remote-backend-engineer-acme-1098765",
  });
  assert.equal(job.companyName, "Acme & Sons");
  assert.equal(job.compensation, "90,000-120,000 USD per year");
  assert.equal(job.publishedAt, new Date(1792485000 * 1000).toISOString());
});

test("We Work Remotely RSS splits 'Company: Role' and keeps the region", () => {
  const xml = `<?xml version="1.0"?><rss><channel>
    <item>
      <title><![CDATA[Acme: Senior Full-Stack Developer]]></title>
      <region>Anywhere in the World</region>
      <country>🌎</country>
      <type>Full-Time</type>
      <description><![CDATA[<p>Next.js &amp; NestJS</p>]]></description>
      <pubDate>Tue, 20 Oct 2026 08:30:00 +0000</pubDate>
      <guid>https://weworkremotely.com/remote-jobs/acme-senior-full-stack-developer</guid>
      <link>https://weworkremotely.com/remote-jobs/acme-senior-full-stack-developer</link>
    </item>
  </channel></rss>`;
  const [job] = parseWeWorkRemotelyRss(xml);
  assert.equal(job.companyName, "Acme");
  assert.equal(job.title, "Senior Full-Stack Developer");
  assert.match(job.location ?? "", /^Anywhere in the World/);
  assert.equal(job.employmentType, "FullTime");
  assert.equal(job.description, "Next.js & NestJS");
  assert.equal(job.sourceJobId, "/remote-jobs/acme-senior-full-stack-developer");
});

test("Himalayas treats an empty location restriction list as worldwide", () => {
  const open = mapHimalayasJob({
    guid: "https://himalayas.app/companies/acme/jobs/ai-engineer",
    title: "AI Engineer",
    companyName: "Acme",
    employmentType: "Full Time",
    locationRestrictions: [],
    description: "<p>LLM and RAG work</p>",
    pubDate: 1792485000,
    applicationLink: "https://himalayas.app/companies/acme/jobs/ai-engineer/apply",
  });
  assert.equal(open.location, "Worldwide");
  const usOnly = mapHimalayasJob({ guid: "g2", title: "AI Engineer", locationRestrictions: ["United States", "Canada"] });
  assert.equal(usOnly.location, "United States, Canada");
});

test("Jobicy maps geo, type and annual salary", () => {
  const job = mapJobicyJob({
    id: 98765,
    url: "https://jobicy.com/jobs/98765-full-stack-engineer",
    jobTitle: "Full Stack Engineer",
    companyName: "Acme",
    jobType: ["Full-Time"],
    jobGeo: "EMEA",
    jobDescription: "<p>React and Node</p>",
    pubDate: "2026-10-20 08:30:00",
    annualSalaryMin: "70000",
    annualSalaryMax: "90000",
    salaryCurrency: "USD",
  });
  assert.equal(job.location, "EMEA");
  assert.equal(job.employmentType, "FullTime");
  assert.equal(job.compensation, "70,000-90,000 USD per year");
  assert.equal(job.publishedAt, "2026-10-20T08:30:00.000Z");
});

test("Greenhouse jobs are remote when the location or an office says so", () => {
  const board = { slug: "acme", name: "Acme" };
  const remote = mapGreenhouseJob(board, {
    id: 4455667,
    title: "Software Engineer, Platform",
    first_published: "2026-10-19T12:00:00-04:00",
    updated_at: "2026-10-20T12:00:00-04:00",
    absolute_url: "https://job-boards.greenhouse.io/acme/jobs/4455667",
    location: { name: "Remote - EMEA" },
    content: "&lt;p&gt;Go and Postgres&lt;/p&gt;",
    departments: [{ name: "Engineering" }],
  });
  assert.equal(remote.sourceJobId, "acme:4455667");
  assert.equal(remote.isRemote, true);
  assert.equal(remote.publishedAt, "2026-10-19T12:00:00-04:00");
  assert.equal(remote.description, "Go and Postgres");
  const office = mapGreenhouseJob(board, { id: 1, title: "SWE", location: { name: "Berlin" } });
  assert.equal(office.isRemote, false);
});

test("Lever postings map workplace type, commitment and lists", () => {
  const job = mapLeverPosting(
    { slug: "acme", name: "Acme" },
    {
      id: "0b1c2d3e-aaaa-bbbb-cccc-1234567890ab",
      text: "Senior Backend Engineer",
      hostedUrl: "https://jobs.lever.co/acme/0b1c2d3e-aaaa-bbbb-cccc-1234567890ab",
      applyUrl: "https://jobs.lever.co/acme/0b1c2d3e-aaaa-bbbb-cccc-1234567890ab/apply",
      createdAt: 1792485000000,
      workplaceType: "remote",
      categories: { commitment: "Full-time", location: "Worldwide", team: "Platform" },
      descriptionPlain: "We run Node services.",
      lists: [{ text: "Requirements", content: "<li>5+ years TypeScript</li>" }],
      salaryRange: { min: 6000, max: 8000, currency: "USD", interval: "per-month-salary" },
    },
  );
  assert.equal(job.isRemote, true);
  assert.equal(job.employmentType, "FullTime");
  assert.equal(job.compensation, "6,000-8,000 USD per month");
  assert.match(job.description, /Requirements\n• 5\+ years TypeScript/);
});

test("boardFromUrl recognises Ashby, Greenhouse and Lever links", () => {
  assert.deepEqual(boardFromUrl("https://jobs.ashbyhq.com/acme/0b1c2d3e-aaaa-bbbb-cccc-1234567890ab/application?src=LinkedIn"), {
    source: "ashby",
    slug: "acme",
  });
  assert.deepEqual(boardFromUrl("https://boards.greenhouse.io/acme/jobs/4455667?gh_src=abc"), { source: "greenhouse", slug: "acme" });
  assert.deepEqual(boardFromUrl("https://job-boards.greenhouse.io/acme/jobs/4455667"), { source: "greenhouse", slug: "acme" });
  assert.deepEqual(boardFromUrl("https://boards.greenhouse.io/embed/job_app?for=acme&token=4455667"), {
    source: "greenhouse",
    slug: "acme",
  });
  assert.deepEqual(boardFromUrl("https://jobs.lever.co/acme/0b1c2d3e-aaaa"), { source: "lever", slug: "acme" });
  assert.equal(boardFromUrl("https://acme.com/careers/123"), null);
  assert.equal(boardFromUrl("not a url"), null);
});

test("canonicalJobUrl ignores tracking params and the /application suffix", () => {
  assert.equal(
    canonicalJobUrl("https://jobs.ashbyhq.com/acme/0b1c/application?utm_source=x"),
    canonicalJobUrl("https://jobs.ashbyhq.com/Acme/0b1c?src=LinkedIn"),
  );
  assert.equal(
    canonicalJobUrl("https://job-boards.greenhouse.io/acme/jobs/1"),
    canonicalJobUrl("https://boards.greenhouse.io/acme/jobs/1?gh_src=li"),
  );
});

const SEARCH_HTML = `
<li>
  <div class="base-card relative w-full base-card--link base-search-card base-search-card--link job-search-card" data-entity-urn="urn:li:jobPosting:4012345678" data-impression-id="jobs-search-result-0">
    <a class="base-card__full-link absolute" href="https://www.linkedin.com/jobs/view/senior-full-stack-engineer-at-acme-4012345678?position=1&amp;pageNum=0">
      <span class="sr-only">Senior Full Stack Engineer</span>
    </a>
    <div class="base-search-card__info">
      <h3 class="base-search-card__title">
            Senior Full Stack Engineer
      </h3>
      <h4 class="base-search-card__subtitle">
        <a class="hidden-nested-link" href="https://www.linkedin.com/company/acme?trk=public_jobs">
          Acme &amp; Co
        </a>
      </h4>
      <div class="base-search-card__metadata">
        <span class="job-search-card__location">
          Worldwide
        </span>
        <span class="job-search-card__salary-info">$90K - $120K</span>
        <time class="job-search-card__listdate--new" datetime="2026-10-20">1 day ago</time>
      </div>
    </div>
  </div>
</li>
<li>
  <div class="base-card base-search-card job-search-card">
    <a class="base-card__full-link" href="https://www.linkedin.com/jobs/view/backend-engineer-at-beta-4012345999?position=2"></a>
    <h3 class="base-search-card__title">Backend Engineer</h3>
    <h4 class="base-search-card__subtitle"><a href="#">Beta</a></h4>
    <span class="job-search-card__location">United States</span>
    <time class="job-search-card__listdate" datetime="2026-10-19">2 days ago</time>
  </div>
</li>`;

const DETAIL_HTML = `
<section class="core-section-container my-3 description">
  <div class="description__text description__text--rich">
    <section class="show-more-less-html" data-max-lines="5">
      <div class="show-more-less-html__markup show-more-less-html__markup--clamp-after-5 relative overflow-hidden">
        <strong>About us</strong><br><br>We hire worldwide as contractors.<ul><li>5+ years TypeScript</li><li>Node.js and React</li></ul>
      </div>
      <button class="show-more-less-html__button show-more-less-button" aria-label="Show more">Show more</button>
    </section>
  </div>
  <ul class="description__job-criteria-list">
    <li class="description__job-criteria-item">
      <h3 class="description__job-criteria-subheader">Seniority level</h3>
      <span class="description__job-criteria-text description__job-criteria-text--criteria">Mid-Senior level</span>
    </li>
    <li class="description__job-criteria-item">
      <h3 class="description__job-criteria-subheader">Employment type</h3>
      <span class="description__job-criteria-text description__job-criteria-text--criteria">Contract</span>
    </li>
  </ul>
</section>
<code id="applyUrl" style="display: none"><!--"https://www.linkedin.com/jobs/view/externalApply/4012345678?url=https%3A%2F%2Fjobs%2Elever%2Eco%2Facme%2Fabc-123%3Flever-source%3DLinkedIn&amp;urlHash=AbCd"--></code>`;

test("LinkedIn search cards parse id, title, company, location, date and salary", () => {
  const cards = parseLinkedInSearch(SEARCH_HTML);
  assert.equal(cards.length, 2);
  assert.deepEqual(cards[0], {
    id: "4012345678",
    title: "Senior Full Stack Engineer",
    company: "Acme & Co",
    location: "Worldwide",
    postedAt: "2026-10-20T00:00:00.000Z",
    salary: "$90K - $120K",
    url: "https://www.linkedin.com/jobs/view/4012345678/",
  });
  assert.equal(cards[1].id, "4012345999");
  assert.equal(cards[1].location, "United States");
});

test("LinkedIn detail parses description, criteria and the off-site apply link", () => {
  const detail = parseLinkedInDetail(DETAIL_HTML);
  assert.match(detail.description, /We hire worldwide as contractors\./);
  assert.match(detail.description, /• 5\+ years TypeScript/);
  assert.doesNotMatch(detail.description, /Show more/);
  assert.equal(detail.employmentType, "Contract");
  assert.equal(detail.seniority, "Mid-Senior level");
  assert.equal(detail.externalApplyUrl, "https://jobs.lever.co/acme/abc-123?lever-source=LinkedIn");

  const job = linkedInJob(parseLinkedInSearch(SEARCH_HTML)[0], detail);
  assert.equal(job.applyUrl, "https://jobs.lever.co/acme/abc-123?lever-source=LinkedIn");
  assert.equal(job.employmentType, "Contract");
  assert.deepEqual(boardFromUrl(job.applyUrl), { source: "lever", slug: "acme" });
});

test("LinkedIn Easy Apply jobs keep the LinkedIn link", () => {
  const detail = parseLinkedInDetail(DETAIL_HTML.replace(/<code[\s\S]*<\/code>/, ""));
  assert.equal(detail.externalApplyUrl, null);
  const job = linkedInJob(parseLinkedInSearch(SEARCH_HTML)[0], detail);
  assert.equal(job.applyUrl, "https://www.linkedin.com/jobs/view/4012345678/");
});
