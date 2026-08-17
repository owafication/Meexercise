import { PageIntro } from "@/components/page-intro";

export const metadata = {
  title: "Profile",
};

export default function ProfilePage() {
  return (
    <>
      <PageIntro eyebrow="Profile" title="Your context, preferences, and account">
        <p>
          Profile will hold the information you choose to provide for
          self-directed planning, together with goals, equipment, preferences,
          privacy, and account controls.
        </p>
      </PageIntro>

      <section className="card" aria-labelledby="profile-next-title">
        <p className="status-label">Coming next</p>
        <h2 id="profile-next-title">Profile setup is not active yet</h2>
        <p>
          Assessment, save-and-resume behavior, account boundaries, and
          private-data ownership belong to the next implementation phase and
          are not simulated by this shell.
        </p>
      </section>
    </>
  );
}
