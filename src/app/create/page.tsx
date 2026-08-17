import { PageIntro } from "@/components/page-intro";

export const metadata = {
  title: "Create",
};

export default function CreatePage() {
  return (
    <>
      <PageIntro eyebrow="Create" title="Build something that fits">
        <p>
          Routine creation will use approved exercise content and your
          preferences, equipment, schedule, and constraints.
        </p>
      </PageIntro>

      <section className="card" aria-labelledby="create-foundation-title">
        <p className="status-label">Foundation first</p>
        <h2 id="create-foundation-title">Routine builder not active yet</h2>
        <p>
          The application shell is ready, but profile assessment and exercise
          content are prerequisites before a real routine can be created
          safely. No placeholder routine data is generated here.
        </p>
      </section>
    </>
  );
}
